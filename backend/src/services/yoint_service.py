import logging
import uuid
import re
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional, Dict, Any, Tuple, List
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import or_

from src.core.config import settings
from src.models.user import User
from src.models.withdrawal import Withdrawal, WithdrawalStatus
from src.models.yoint_dispersion import YointDispersion
from src.models.yoint_payin import YointPayin
from src.models.investment_request import InvestmentRequest, InvestmentRequestStatus
from src.models.wallet_recharge import WalletRecharge
from src.models.data_bank import DataBank
from src.models.wallet import Wallet, WalletTransaction
from src.models.credit import Credit
from src.services.company_wallet_service import CompanyWalletService

logger = logging.getLogger(__name__)

class YointService:
    """
    Servicio de integración con la API v2 de Pagos y Dispersiones de Yoint.
    Maneja el mapeo de entidades financieras (data_bancks), envío de dispersiones,
    autenticación OAuth2 Client Credentials (AWS Cognito), idempotencia y persistencia.
    """

    _cached_token: Optional[str] = None
    _token_expires_at: Optional[datetime] = None

    @classmethod
    async def get_oauth_token(cls) -> Optional[str]:
        """
        Obtiene o renueva el Bearer JWT Token usando client_id y client_secret
        a través del servidor de autenticación OAuth2 de Yoint (AWS Cognito).
        """
        if not settings.YOINT_CLIENT_ID or not settings.YOINT_CLIENT_SECRET:
            return None

        # Validar si el token en caché en memoria sigue vigente
        now = datetime.utcnow()
        if cls._cached_token and cls._token_expires_at and now < cls._token_expires_at:
            return cls._cached_token

        # Solicitar nuevo token con grant_type=client_credentials
        auth_url = getattr(settings, "YOINT_AUTH_URL", "https://payments-dev.auth.us-east-1.amazoncognito.com/oauth2/token")
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        data = {
            "grant_type": "client_credentials",
            "client_id": settings.YOINT_CLIENT_ID.strip(),
            "client_secret": settings.YOINT_CLIENT_SECRET.strip()
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                logger.info(f"Solicitando token OAuth2 a Yoint Cognito ({auth_url})...")
                res = await client.post(auth_url, data=data, headers=headers)
                if res.status_code == 200:
                    res_json = res.json()
                    token = res_json.get("access_token")
                    expires_in = int(res_json.get("expires_in", 3600))
                    
                    cls._cached_token = token
                    # Margen de seguridad: renovar 5 minutos antes de expirar
                    cls._token_expires_at = now + timedelta(seconds=max(60, expires_in - 300))
                    logger.info("✅ Token Bearer OAuth2 de Yoint obtenido exitosamente de Cognito.")
                    return token
                else:
                    logger.error(f"Error autenticando con Yoint OAuth2 (HTTP {res.status_code}): {res.text}")
                    return None
        except Exception as e:
            logger.error(f"Excepción al solicitar token OAuth2 a Yoint: {e}")
            return None

    @classmethod
    async def get_access_token(cls) -> Optional[str]:
        """Alias retrocompatible para get_oauth_token"""
        return await cls.get_oauth_token()

    @classmethod
    async def _get_headers(cls, idempotency_key: str) -> Dict[str, str]:
        """
        Construye headers requeridos por Yoint v2 con autenticación automática.
        - Authorization: Bearer <token_jwt_cognito> (ÚNICAMENTE si es token OAuth de Cognito)
        - x-api-key: <api_key> (NUNCA como Bearer)
        """
        headers = {
            "Content-Type": "application/json",
            "X-Idempotency-Key": idempotency_key
        }

        # 1. Obtener Bearer Token de Cognito
        oauth_token = await cls.get_oauth_token()
        if oauth_token:
            headers["Authorization"] = f"Bearer {oauth_token}"

        # 2. Si se configuró YOINT_API_KEY, se coloca en x-api-key (NUNCA en Authorization)
        if settings.YOINT_API_KEY:
            headers["x-api-key"] = settings.YOINT_API_KEY.strip()

        return headers

    @staticmethod
    def _normalize_account_type(raw_type: Optional[str]) -> str:
        """
        Normaliza el tipo de cuenta al estándar de Yoint:
        SAVINGS, CHECKING, WALLET, BREB.
        """
        if not raw_type:
            return "SAVINGS"
        t = raw_type.upper().strip()
        if "CORRIENTE" in t or "CHECKING" in t:
            return "CHECKING"
        if "DAVIPLATA" in t or "NEQUI" in t or "WALLET" in t or "BILLETERA" in t:
            return "WALLET"
        if "BRE" in t or "BRE-B" in t:
            return "BREB"
        return "SAVINGS"

    @staticmethod
    def _clean_phone(raw_phone: Optional[str]) -> str:
        """
        Limpia el teléfono asegurando formato colombiano de 10 dígitos (inicia con 3).
        """
        if not raw_phone:
            return "3000000000"
        digits = re.sub(r"\D", "", raw_phone)
        if len(digits) == 10 and digits.startswith("3"):
            return digits
        if len(digits) > 10 and digits.startswith("573"):
            return digits[2:12]
        if len(digits) >= 10:
            return digits[-10:]
        return "3000000000"

    @staticmethod
    def _clean_document(raw_doc: Optional[str]) -> Tuple[str, str]:
        """
        Retorna (tipo_documento, numero_documento).
        """
        if not raw_doc:
            return "CC", "00000000"
        doc_str = str(raw_doc).strip().upper()
        # Detectar tipo si viene prefijado (ej: CC 123456)
        for prefix in ["CC", "CE", "NIT", "PP", "TI"]:
            if doc_str.startswith(prefix):
                return prefix, re.sub(r"\D", "", doc_str)
        # Por defecto Cédula de Ciudadanía
        return "CC", re.sub(r"\D", "", doc_str)

    @staticmethod
    async def resolve_bank_entity(db: AsyncSession, raw_bank_name: Optional[str]) -> Tuple[str, str]:
        """
        Busca en data_bancks el código ACH oficial (code_banck) y nombre oficial.
        """
        default_code = "1007"
        default_name = "BANCOLOMBIA"

        if not raw_bank_name:
            return default_code, default_name

        bank_query = raw_bank_name.strip()

        # 1. Búsqueda por código exacto si el usuario guardó el código
        code_res = await db.execute(
            select(DataBank).where(DataBank.code_banck == bank_query)
        )
        found = code_res.scalars().first()
        if found:
            return found.code_banck, found.banck

        # 2. Búsqueda por nombre insensible a mayúsculas
        name_res = await db.execute(
            select(DataBank).where(DataBank.banck.ilike(f"%{bank_query}%"))
        )
        found = name_res.scalars().first()
        if found:
            return found.code_banck, found.banck

        # 3. Casos comunes
        b_up = bank_query.upper()
        if "BANCOLOMBIA" in b_up:
            return "1007", "BANCOLOMBIA"
        if "DAVIVIENDA" in b_up:
            return "1051", "BANCO DAVIVIENDA"
        if "BOGOTA" in b_up or "BOGOTÁ" in b_up:
            return "1001", "BANCO DE BOGOTA"
        if "NEQUI" in b_up:
            return "1507", "NEQUI"
        if "DAVIPLATA" in b_up:
            return "1551", "DAVIPLATA"
        if "NU" in b_up:
            return "1809", "NU BANK"

        return default_code, bank_query.upper()

    @classmethod
    async def build_dispersion_payload(
        cls, 
        db: AsyncSession, 
        withdrawal: Withdrawal, 
        user: User
    ) -> Dict[str, Any]:
        """
        Construye el payload exacto para POST /api/payments/v2/dispersions.
        """
        bank_code, bank_name = await cls.resolve_bank_entity(db, withdrawal.banco)
        account_type = cls._normalize_account_type(withdrawal.tipo_cuenta)
        doc_type, doc_num = cls._clean_document(user.document_id)
        phone = cls._clean_phone(user.phone_number)
        
        # Referencia única de pago (máximo 20 caracteres según spec de Yoint)
        payment_ref = f"RET-{withdrawal.id}"[:20]

        # Monto neto a dispersar (monto solicitado menos 3.2% de impuesto)
        net_amount = float(withdrawal.monto_neto if withdrawal.monto_neto else withdrawal.monto)

        item = {
            "bankAccount": {
                "type": account_type,
                "number": str(withdrawal.numero_cuenta or "").strip(),
                "financialEntity": {
                    "id": bank_code,
                    "name": bank_name
                }
            },
            "name": str(user.name or "Inversionista Gloint")[:100],
            "documentType": doc_type,
            "documentNumber": doc_num,
            "amount": net_amount,
            "paymentReference": payment_ref,
            "phoneNumber": phone,
            "email": str(user.email or "notificaciones@gloint.com.co")
        }

        return {
            "dispersions": [item]
        }

    @classmethod
    def _extract_order_id(cls, data: Any) -> Optional[str]:
        """
        Extrae recursivamente el identificador único de la dispersión de cualquier estructura JSON de Yoint.
        """
        if not data:
            return None
        if isinstance(data, (int, str)):
            val = str(data).strip()
            return val if val else None
        if isinstance(data, dict):
            for k in ["orderId", "order_id", "id", "dispersionId", "dispersion_id", "referenceId"]:
                val = data.get(k)
                if isinstance(val, list) and val:
                    return str(val[0]).strip()
                elif val is not None and str(val).strip():
                    return str(val).strip()
            
            # Revisar dentro de dispersions list
            if isinstance(data.get("dispersions"), list) and data["dispersions"]:
                for item in data["dispersions"]:
                    found = cls._extract_order_id(item)
                    if found:
                        return found
            
            # Revisar dentro de data
            if "data" in data:
                found = cls._extract_order_id(data["data"])
                if found:
                    return found

        elif isinstance(data, list) and data:
            for item in data:
                found = cls._extract_order_id(item)
                if found:
                    return found
        return None

    @classmethod
    async def send_dispersion(
        cls, 
        db: AsyncSession, 
        withdrawal: Withdrawal, 
        user: User
    ) -> YointDispersion:
        """
        Envía la dispersión a la API de Yoint y registra la trazabilidad completa.
        """
        idempotency_key = f"gloint-ret-{withdrawal.id}-{int(datetime.utcnow().timestamp())}"
        payment_ref = f"RET-{withdrawal.id}"[:20]
        net_amount = Decimal(str(withdrawal.monto_neto if withdrawal.monto_neto else withdrawal.monto))
        tax_amount = Decimal(str(withdrawal.impuesto or 0))

        bank_code, bank_name = await cls.resolve_bank_entity(db, withdrawal.banco)
        account_type = cls._normalize_account_type(withdrawal.tipo_cuenta)
        doc_type, doc_num = cls._clean_document(user.document_id)
        phone = cls._clean_phone(user.phone_number)

        payload = await cls.build_dispersion_payload(db, withdrawal, user)

        # Crear registro inicial de dispersión
        dispersion = YointDispersion(
            withdrawal_id=withdrawal.id,
            idempotency_key=idempotency_key,
            payment_reference=payment_ref,
            status="PENDING",
            amount=net_amount,
            tax_amount=tax_amount,
            financial_entity_id=bank_code,
            financial_entity_name=bank_name,
            account_number=str(withdrawal.numero_cuenta or ""),
            account_type=account_type,
            recipient_name=user.name,
            recipient_document=f"{doc_type} {doc_num}",
            recipient_email=user.email,
            recipient_phone=phone,
            request_payload=payload
        )
        db.add(dispersion)
        await db.flush()

        # Si las credenciales no están configuradas aún, se deja en cola de forma segura
        if not settings.YOINT_API_KEY and not (settings.YOINT_CLIENT_ID and settings.YOINT_CLIENT_SECRET):
            dispersion.status = "QUEUED_PENDING_CONFIG"
            dispersion.error_message = "Credenciales de Yoint (client_id y client_secret) pendientes de configurar en backend/.env"
            logger.warning(f"Yoint API credentials no configuradas. Retiro #{withdrawal.id} encolado para dispersión.")
            await db.commit()
            return dispersion

        # Realizar la petición HTTP a Yoint v2
        endpoint = f"{settings.YOINT_API_URL.rstrip('/')}/api/payments/v2/dispersions"
        headers = await cls._get_headers(idempotency_key)

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                logger.info(f"Enviando dispersión Yoint para Retiro #{withdrawal.id} a {endpoint}")
                response = await client.post(endpoint, json=payload, headers=headers)
                status_code = response.status_code
                
                try:
                    res_json = response.json()
                except Exception:
                    res_json = {"raw_text": response.text}

                dispersion.response_payload = res_json

                if 200 <= status_code < 300:
                    # Éxito: Extraer orderId con el extractor robusto
                    order_id_val = cls._extract_order_id(res_json) or ""
                    
                    dispersion.order_id = order_id_val
                    dispersion.status = "PROCESSING"
                    
                    # Actualizar retiro en Gloint
                    withdrawal.estado = WithdrawalStatus.PROCESSED
                    withdrawal.comprobante_pago = f"YOINT-ORDER-{order_id_val}" if order_id_val else f"YOINT-REF-{payment_ref}"
                    logger.info(f"Dispersión Yoint exitosa para Retiro #{withdrawal.id}. OrderId: {order_id_val or payment_ref}")
                else:
                    dispersion.status = "FAILED"
                    dispersion.error_message = f"HTTP {status_code}: {res_json}"
                    logger.error(f"Fallo al dispersar en Yoint para Retiro #{withdrawal.id}: {res_json}")

        except Exception as e:
            dispersion.status = "FAILED"
            dispersion.error_message = f"Error de conexión con Yoint: {str(e)}"
            logger.error(f"Excepción al llamar a Yoint para Retiro #{withdrawal.id}: {str(e)}")

        await db.commit()
        return dispersion

    @classmethod
    async def send_credit_dispersion(
        cls, 
        db: AsyncSession, 
        credit: Credit, 
        user: User
    ) -> YointDispersion:
        """
        Envía la dispersión del desembolso de un crédito a la API de Yoint
        hacia la cuenta bancaria registrada por el cliente.
        """
        idempotency_key = f"gloint-cred-{credit.id}-{int(datetime.utcnow().timestamp())}"
        payment_ref = f"CRED-{credit.id}"[:20]
        net_amount = Decimal(str(credit.approved_amount or credit.requested_amount))
        tax_amount = Decimal("0.00")

        bank_code, bank_name = await cls.resolve_bank_entity(db, credit.banco)
        account_type = cls._normalize_account_type(credit.tipo_cuenta)
        doc_type, doc_num = cls._clean_document(user.document_id)
        phone = cls._clean_phone(user.phone_number)

        payload = {
            "financial_entity_id": bank_code,
            "account_number": str(credit.numero_cuenta or ""),
            "account_type": account_type,
            "amount": float(net_amount),
            "currency": "COP",
            "concept": f"Desembolso Credito #{credit.id} Gloint",
            "payment_reference": payment_ref,
            "beneficiary": {
                "name": user.name,
                "identification_type": doc_type,
                "identification_number": doc_num,
                "email": user.email,
                "phone": phone
            }
        }

        # Crear registro de dispersión
        dispersion = YointDispersion(
            credit_id=credit.id,
            idempotency_key=idempotency_key,
            payment_reference=payment_ref,
            status="PENDING",
            amount=net_amount,
            tax_amount=tax_amount,
            financial_entity_id=bank_code,
            financial_entity_name=bank_name,
            account_number=str(credit.numero_cuenta or ""),
            account_type=account_type,
            recipient_name=user.name,
            recipient_document=f"{doc_type} {doc_num}",
            recipient_email=user.email,
            recipient_phone=phone,
            request_payload=payload
        )
        db.add(dispersion)
        await db.flush()

        # Si las credenciales no están configuradas aún, se deja en cola de forma segura
        if not settings.YOINT_API_KEY and not (settings.YOINT_CLIENT_ID and settings.YOINT_CLIENT_SECRET):
            dispersion.status = "QUEUED_PENDING_CONFIG"
            dispersion.error_message = "Credenciales de Yoint (client_id y client_secret) pendientes de configurar en backend/.env"
            logger.warning(f"Yoint API credentials no configuradas. Crédito #{credit.id} encolado para dispersión.")
            credit.disbursement_reference = payment_ref
            await db.commit()
            return dispersion

        # Realizar la petición HTTP a Yoint v2
        endpoint = f"{settings.YOINT_API_URL.rstrip('/')}/api/payments/v2/dispersions"
        headers = await cls._get_headers(idempotency_key)

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                logger.info(f"Enviando dispersión Yoint para Crédito #{credit.id} a {endpoint}")
                response = await client.post(endpoint, json=payload, headers=headers)
                status_code = response.status_code
                
                try:
                    res_json = response.json()
                except Exception:
                    res_json = {"raw_text": response.text}

                dispersion.response_payload = res_json

                if 200 <= status_code < 300:
                    order_id_val = cls._extract_order_id(res_json) or ""
                    dispersion.order_id = order_id_val
                    dispersion.status = "PROCESSING"
                    credit.disbursement_reference = f"YOINT-ORDER-{order_id_val}" if order_id_val else f"YOINT-REF-{payment_ref}"
                    logger.info(f"Dispersión Yoint exitosa para Crédito #{credit.id}. OrderId: {order_id_val or payment_ref}")
                else:
                    dispersion.status = "FAILED"
                    dispersion.error_message = f"HTTP {status_code}: {res_json}"
                    logger.error(f"Fallo al dispersar en Yoint para Crédito #{credit.id}: {res_json}")

        except Exception as e:
            dispersion.status = "FAILED"
            dispersion.error_message = f"Error de conexión con Yoint: {str(e)}"
            logger.error(f"Excepción al llamar a Yoint para Crédito #{credit.id}: {str(e)}")

        await db.commit()
        return dispersion

    @classmethod
    async def process_status_transition(
        cls, 
        db: AsyncSession, 
        order_id: str, 
        new_status: str, 
        payload: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Maneja la transición de estado (desde Webhook o Polling).
        - APPROVED / COMPLETED / EXITOSA: Marca retiro como aprobado.
        - REJECTED / FAILED / RECHAZADA: Marca retiro como rechazado, devuelve fondos a la wallet y revierte el 3.2% de impuesto.
        """
        clean_id = str(order_id).strip()

        # 1. Verificar primero si el identificador corresponde a un Recaudo / Payin (Inversión o Recarga)
        payin_conditions = [
            YointPayin.order_id == clean_id,
            YointPayin.transaction_id == clean_id,
            YointPayin.idempotency_key == clean_id,
            YointPayin.payment_reference == clean_id
        ]
        if clean_id.upper().startswith("INV-"):
            try:
                inv_id = int(clean_id.upper().replace("INV-", ""))
                payin_conditions.append(YointPayin.investment_request_id == inv_id)
            except Exception:
                pass
        elif clean_id.upper().startswith("REC-"):
            try:
                rec_id = int(clean_id.upper().replace("REC-", ""))
                payin_conditions.append(YointPayin.wallet_recharge_id == rec_id)
            except Exception:
                pass

        payin_q = select(YointPayin).where(or_(*payin_conditions)).order_by(YointPayin.id.desc())
        payin_res = await db.execute(payin_q)
        payin = payin_res.scalars().first()
        if payin:
            return await cls.process_payin_status_transition(
                db=db, payin=payin, new_status=new_status, payload=payload
            )

        # 2. Si no es un Payin, buscar en Dispersiones (Retiros / Payouts)
        conditions = [
            YointDispersion.order_id == clean_id,
            YointDispersion.payment_reference == clean_id,
            YointDispersion.idempotency_key == clean_id
        ]
        if clean_id.upper().startswith("RET-"):
            try:
                w_id = int(clean_id.upper().replace("RET-", ""))
                conditions.append(YointDispersion.withdrawal_id == w_id)
            except Exception:
                pass
        elif clean_id.isdigit():
            conditions.append(YointDispersion.withdrawal_id == int(clean_id))

        q = select(YointDispersion).where(or_(*conditions)).order_by(YointDispersion.id.desc())
        res = await db.execute(q)
        dispersion = res.scalars().first()

        if not dispersion:
            logger.warning(f"No se encontró YointDispersion para identificador={order_id}")
            return False

        # Guardar payload del webhook si viene
        if payload:
            dispersion.webhook_payload = payload

        status_upper = new_status.upper().strip()

        # Buscar el retiro
        w_res = await db.execute(
            select(Withdrawal)
            .options(selectinload(Withdrawal.user))
            .where(Withdrawal.id == dispersion.withdrawal_id)
        )
        withdrawal = w_res.scalars().first()
        if not withdrawal:
            return False

        # Clasificación de estado con tolerancia a variantes de Yoint (ej: 'SUCCESS', 'Exitoso', 'No Exitoso', 'Aprobada')
        is_success = (
            any(ok_word in status_upper for ok_word in [
                "SUCCES", "EXITOS", "APPROV", "COMPLET", "PAID", "PAGAD", "TRANSF", "DISPERS", "LIQUID", "OK"
            ])
            and not any(neg in status_upper for neg in ["NO", "NOT", "FAIL", "REJECT", "ERROR", "DECLIN", "CANCEL"])
        )
        
        is_failed = (
            any(fail_word in status_upper for fail_word in [
                "NO EXITOS", "RECHAZ", "FAIL", "REJECT", "DEVUELT", "ERROR", "DECLIN", "CANCEL", "FALLI", "DENI"
            ])
        )

        # 1. Casos de ÉXITO / APROBADO (ej. 'Exitoso', 'Aprobada', 'Transferred')
        if is_success:
            dispersion.status = "APPROVED"
            withdrawal.estado = WithdrawalStatus.APPROVED
            withdrawal.fecha_aprobacion = datetime.utcnow()
            withdrawal.comprobante_pago = f"YOINT-PAID-{dispersion.order_id or clean_id}"
            
            # Notificar al usuario
            try:
                from src.services.push_notification_service import PushNotificationService
                formatted_amount = f"${float(withdrawal.monto_neto):,.0f}" if withdrawal.monto_neto else "$0"
                if withdrawal.origen == "investment_capital":
                    notif_title = "¡Pago de Retiro de Capital Exitoso!"
                    notif_msg = f"Tu retiro de capital #{withdrawal.id} por {formatted_amount} COP ha sido pagado y transferido exitosamente a tu cuenta bancaria."
                    notif_link = f"/dashboard/investments/{withdrawal.investor_id}"
                else:
                    notif_title = "¡Pago de Retiro Exitoso!"
                    notif_msg = f"Tu retiro #{withdrawal.id} por {formatted_amount} COP ha sido pagado y acreditado a tu cuenta bancaria."
                    notif_link = "/dashboard/wallet"

                await PushNotificationService.create_and_send_notification(
                    db=db,
                    user_id=withdrawal.user_id,
                    title=notif_title,
                    message=notif_msg,
                    type="retiro",
                    link=notif_link
                )
            except Exception as e:
                logger.warning(f"Error notificando aprobación Yoint retiro #{withdrawal.id}: {e}")

            logger.info(f"Retiro #{withdrawal.id} (Yoint {clean_id}) completado y APROBADO.")

        # 2. Casos de RECHAZO O FALLO (ej. 'No Exitoso', 'Rechazado', 'Failed')
        elif is_failed:
            dispersion.status = "REJECTED"
            motivo = (payload.get("message") if isinstance(payload, dict) else None) or (payload.get("error") if isinstance(payload, dict) else None) or "Dispersión no exitosa reportada por el banco"
            dispersion.error_message = str(motivo)

            withdrawal.estado = WithdrawalStatus.REJECTED
            withdrawal.motivo_rechazo = str(motivo)

            # Revertir fondos a la wallet del usuario SOLO si proviene de wallet (en capital el saldo se restaura automáticamente en la inversión)
            if withdrawal.origen != "investment_capital":
                user_wallet_res = await db.execute(
                    select(Wallet).where(Wallet.user_id == withdrawal.user_id)
                )
                user_wallet = user_wallet_res.scalars().first()
                if user_wallet:
                    user_wallet.balance += withdrawal.monto
                    tx = WalletTransaction(
                        wallet_id=user_wallet.id,
                        amount=withdrawal.monto,
                        type="withdrawal_rejection",
                        description=f"Devolución por rechazo bancario #{order_id}: {motivo}",
                        balance_after=user_wallet.balance,
                        reference_type="withdrawal",
                        reference_id=withdrawal.id
                    )
                    db.add(tx)

            # Revertir el 3.2% de retención de la Billetera Corporativa
            await CompanyWalletService.refund_tax_retention(db, withdrawal)

            # Notificar al usuario
            try:
                from src.services.push_notification_service import PushNotificationService
                if withdrawal.origen == "investment_capital":
                    notif_msg = f"Tu solicitud de retiro de capital #{withdrawal.id} no pudo ser completada por el banco ({motivo}). El capital liberado ha sido restituido en tu contrato de inversión."
                    notif_link = f"/dashboard/investments/{withdrawal.investor_id}"
                else:
                    notif_msg = f"Tu solicitud de retiro #{withdrawal.id} no pudo ser completada por el banco ({motivo}). Los fondos han sido reintegrados a tu saldo."
                    notif_link = "/dashboard/wallet"

                await PushNotificationService.create_and_send_notification(
                    db=db,
                    user_id=withdrawal.user_id,
                    title="Aviso sobre tu Retiro",
                    message=notif_msg,
                    type="retiro",
                    link=notif_link
                )
            except Exception as e:
                logger.warning(f"Error notificando rechazo Yoint retiro #{withdrawal.id}: {e}")

            logger.warning(f"Retiro #{withdrawal.id} (Yoint {clean_id}) RECHAZADO.")

        await db.commit()
        return True

    @classmethod
    async def query_order_status(cls, db: AsyncSession, dispersion: YointDispersion) -> Dict[str, Any]:
        """
        Consulta en tiempo real el estado de una dispersión a Yoint usando los endpoints oficiales:
        1. GET /api/payments/v1/dispersions/idempotency-key/{idempotency-key}
        2. Fallback: GET /api/payments/v1/list-dispersion?ids={order_id}
        """
        # Si order_id está vacío, intentar recuperarlo de response_payload
        target_id = dispersion.order_id
        if not target_id and dispersion.response_payload:
            target_id = cls._extract_order_id(dispersion.response_payload)
            if target_id:
                dispersion.order_id = target_id
                db.add(dispersion)
                await db.commit()

        if not target_id and not dispersion.idempotency_key and not dispersion.payment_reference:
            return {"status": dispersion.status, "message": "Orden sin orderId ni idempotency_key"}

        if not settings.YOINT_API_KEY and not (settings.YOINT_CLIENT_ID and settings.YOINT_CLIENT_SECRET):
            return {"status": dispersion.status, "message": "Credenciales Yoint no configuradas"}

        base_url = settings.YOINT_API_URL.rstrip('/')
        headers = await cls._get_headers(idempotency_key=dispersion.idempotency_key or str(uuid.uuid4()))

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = None
                used_endpoint = None

                # 1. Estrategia Principal: Consultar por Idempotency Key (Oficial en Yoint API Docs)
                if dispersion.idempotency_key:
                    used_endpoint = f"{base_url}/api/payments/v1/dispersions/idempotency-key/{dispersion.idempotency_key}"
                    logger.info(f"[YointService] Consultando por idempotency-key para Retiro #{dispersion.withdrawal_id}: {used_endpoint}")
                    res = await client.get(used_endpoint, headers=headers)
                    logger.info(f"[YointService] Respuesta idempotency-key: HTTP {res.status_code} -> {res.text[:300]}")

                # 2. Estrategia Secundaria: Consultar por lista de IDs (GET /api/payments/v1/list-dispersion?ids=...)
                if (not res or res.status_code not in [200, 202]) and target_id:
                    used_endpoint = f"{base_url}/api/payments/v1/list-dispersion?ids={target_id}"
                    logger.info(f"[YointService] Consultando list-dispersion por ID para Retiro #{dispersion.withdrawal_id}: {used_endpoint}")
                    res = await client.get(used_endpoint, headers=headers)
                    logger.info(f"[YointService] Respuesta list-dispersion: HTTP {res.status_code} -> {res.text[:300]}")

                if not res:
                    return {"status": dispersion.status, "message": "No se pudo consultar ningún endpoint válido"}

                if res.status_code == 200:
                    data = res.json()
                    new_status = None
                    if isinstance(data, dict):
                        operations = data.get("operations") if isinstance(data.get("operations"), list) else []
                        if operations:
                            # Buscar la operación específica por ID o tomar la primera
                            matching_op = None
                            if target_id:
                                for op in operations:
                                    if str(op.get("id")) == str(target_id):
                                        matching_op = op
                                        break
                            if not matching_op and operations:
                                matching_op = operations[0]
                            
                            if matching_op:
                                new_status = matching_op.get("status")
                                # Si no teníamos order_id y la operación trae id, guardarlo
                                if not dispersion.order_id and matching_op.get("id"):
                                    dispersion.order_id = str(matching_op["id"])
                                    db.add(dispersion)

                        if not new_status:
                            new_status = (
                                data.get("status") 
                                or data.get("state") 
                                or data.get("estado")
                            )

                    if new_status:
                        await cls.process_status_transition(
                            db=db, 
                            order_id=dispersion.order_id or dispersion.payment_reference or str(dispersion.withdrawal_id), 
                            new_status=str(new_status), 
                            payload=data if isinstance(data, dict) else {"raw": data}
                        )
                    return data
                else:
                    return {"http_code": res.status_code, "body": res.text, "endpoint": used_endpoint}
        except Exception as e:
            logger.error(f"[YointService] Error consultando orden {dispersion.order_id or dispersion.payment_reference}: {e}")
            return {"error": str(e)}

    @classmethod
    async def process_payin_status_transition(
        cls,
        db: AsyncSession,
        payin: YointPayin,
        new_status: str,
        payload: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Procesa la transición de estado de un recaudo/payin (Inversión o Recarga de Billetera).
        - SUCCESS / APROBADO:
            * INVESTMENT_REQUEST -> Aprueba automáticamente la inversión, crea el Investor y su contrato.
            * WALLET_TOPUP -> Acredita el saldo a la billetera y registra la transacción de ingreso.
        - FAILED / REJECTED:
            * INVESTMENT_REQUEST -> Rechaza automáticamente la solicitud con el motivo de la pasarela.
            * WALLET_TOPUP -> Marca la recarga como rechazada/fallida.
        """
        if payload:
            payin.webhook_payload = payload

        status_upper = new_status.upper().strip()
        is_success = (
            any(ok_word in status_upper for ok_word in [
                "SUCCES", "EXITOS", "APPROV", "COMPLET", "PAID", "PAGAD", "CONFIRM", "OK"
            ])
            and not any(neg in status_upper for neg in ["NO", "NOT", "FAIL", "REJECT", "ERROR", "DECLIN", "CANCEL"])
        )

        is_failed = (
            any(fail_word in status_upper for fail_word in [
                "NO EXITOS", "RECHAZ", "FAIL", "REJECT", "DEVUELT", "ERROR", "DECLIN", "CANCEL", "FALLI", "DENI", "EXPI"
            ])
        )

        if not is_success and not is_failed:
            logger.info(f"[YointService] Payin #{payin.id} status update: {new_status} (en espera)")
            payin.status = new_status
            await db.commit()
            return True

        if is_success:
            # Si ya fue marcado como SUCCESS previamente, verificar si la inversión o recarga realmente quedó aprobada
            if payin.status == "SUCCESS":
                if payin.payin_type == "INVESTMENT_REQUEST" and payin.investment_request_id:
                    chk_res = await db.execute(
                        select(InvestmentRequest.status).where(InvestmentRequest.id == payin.investment_request_id)
                    )
                    if chk_res.scalar_one_or_none() == InvestmentRequestStatus.approved:
                        return True
                elif payin.payin_type == "WALLET_TOPUP" and payin.wallet_recharge_id:
                    chk_wr = await db.execute(
                        select(WalletRecharge.status).where(WalletRecharge.id == payin.wallet_recharge_id)
                    )
                    if chk_wr.scalar_one_or_none() == "approved":
                        return True
                else:
                    return True

            payin.status = "SUCCESS"
            logger.info(f"✅ [YointService] Payin #{payin.id} confirmado EXITOSO ({payin.payin_type}, monto: {payin.amount})")

            # 1. Caso: Solicitud de Inversión
            if payin.payin_type == "INVESTMENT_REQUEST" and payin.investment_request_id:
                from src.services.investment_request_service import InvestmentRequestService
                req_res = await db.execute(
                    select(InvestmentRequest).where(InvestmentRequest.id == payin.investment_request_id)
                )
                inv_req = req_res.scalars().first()
                if inv_req and inv_req.status == InvestmentRequestStatus.pending:
                    # Encontrar usuario admin para registrar la revisión
                    admin_res = await db.execute(
                        select(User.id).where(User.is_superuser == True).order_by(User.id.asc()).limit(1)
                    )
                    admin_id = admin_res.scalar_one_or_none() or 1

                    # Agregar trazabilidad en extra_data
                    extra = dict(inv_req.extra_data or {})
                    extra["yoint_payin_id"] = payin.id
                    extra["yoint_order_id"] = payin.order_id
                    extra["yoint_payment_method"] = payin.payment_method
                    extra["auto_approved_by"] = "YOINT_GATEWAY"
                    extra["approved_at"] = datetime.utcnow().isoformat()
                    inv_req.extra_data = extra
                    db.add(inv_req)
                    await db.flush()

                    # Llamar al servicio de aprobación automática
                    try:
                        await InvestmentRequestService.approve_request(
                            db=db,
                            request_id=inv_req.id,
                            user_id=admin_id
                        )
                        logger.info(f"🎉 [YointService] Solicitud de inversión #{inv_req.id} APROBADA AUTOMÁTICAMENTE por confirmación de pago Yoint.")
                    except Exception as app_err:
                        logger.error(f"[YointService] Error aprobando automáticamente solicitud #{inv_req.id}: {app_err}")

            # 2. Caso: Recarga de Billetera
            elif payin.payin_type == "WALLET_TOPUP":
                # Buscar o crear billetera
                w_res = await db.execute(select(Wallet).where(Wallet.user_id == payin.user_id))
                wallet = w_res.scalars().first()
                if not wallet:
                    wallet = Wallet(user_id=payin.user_id, balance=Decimal("0.00"), currency="COP")
                    db.add(wallet)
                    await db.flush()

                payin_amount = Decimal(str(payin.amount))
                wallet.balance = Decimal(str(wallet.balance)) + payin_amount

                # Transacción en wallet
                tx = WalletTransaction(
                    wallet_id=wallet.id,
                    amount=payin_amount,
                    type="wallet_recharge",
                    reference_type="yoint_payin",
                    reference_id=payin.id,
                    description=f"Recarga en línea Yoint ({payin.payment_method})",
                    balance_after=wallet.balance
                )
                db.add(tx)

                # Si existía WalletRecharge asociada, actualizarla a approved
                if payin.wallet_recharge_id:
                    wr_res = await db.execute(select(WalletRecharge).where(WalletRecharge.id == payin.wallet_recharge_id))
                    wr = wr_res.scalars().first()
                    if wr and wr.status == "pending":
                        wr.status = "approved"
                        wr.reviewed_at = datetime.utcnow()
                        wr.admin_notes = f"Aprobada automáticamente por pasarela Yoint ({payin.order_id})"
                        db.add(wr)

                # Notificación al usuario
                try:
                    from src.services.push_notification_service import PushNotificationService
                    await PushNotificationService.create_and_send_notification(
                        db=db,
                        user_id=payin.user_id,
                        title="¡Recarga de Saldo Exitosa!",
                        message=f"Tu billetera ha sido recargada con éxito por valor de ${float(payin_amount):,.0f} COP vía {payin.payment_method}.",
                        type="recarga",
                        link="/dashboard/wallet"
                    )
                except Exception as notif_err:
                    logger.warning(f"Error enviando notificación de recarga Yoint: {notif_err}")

                # Correo corporativo al inversionista
                try:
                    u_res = await db.execute(select(User).where(User.id == payin.user_id))
                    u_obj = u_res.scalars().first()
                    if u_obj and u_obj.email:
                        from src.services.email_service import EmailService
                        EmailService.send_wallet_recharge_confirmed_email(
                            to_email=u_obj.email,
                            user_name=u_obj.name or "Inversionista",
                            amount=float(payin_amount),
                            new_balance=float(wallet.balance),
                            payment_method=f"Yoint ({payin.payment_method})",
                            reference_id=payin.order_id or payin.payment_reference or f"REC-{payin.id}"
                        )
                except Exception as mail_err:
                    logger.warning(f"Error enviando correo corporativo de recarga Yoint confirmada: {mail_err}")

        elif is_failed:
            payin.status = "FAILED"
            logger.warning(f"❌ [YointService] Payin #{payin.id} RECHAZADO / FALLIDO ({new_status})")

            # 1. Caso Solicitud de Inversión
            if payin.payin_type == "INVESTMENT_REQUEST" and payin.investment_request_id:
                from src.services.investment_request_service import InvestmentRequestService
                req_res = await db.execute(
                    select(InvestmentRequest).where(InvestmentRequest.id == payin.investment_request_id)
                )
                inv_req = req_res.scalars().first()
                if inv_req and inv_req.status == InvestmentRequestStatus.pending:
                    admin_res = await db.execute(
                        select(User.id).where(User.is_superuser == True).order_by(User.id.asc()).limit(1)
                    )
                    admin_id = admin_res.scalar_one_or_none() or 1

                    try:
                        await InvestmentRequestService.reject_request(
                            db=db,
                            request_id=inv_req.id,
                            user_id=admin_id,
                            reason=f"Pago rechazado o expirado en la pasarela ({new_status})"
                        )
                        logger.warning(f"[YointService] Solicitud de inversión #{inv_req.id} RECHAZADA AUTOMÁTICAMENTE debido a pago fallido.")
                    except Exception as rej_err:
                        logger.error(f"[YointService] Error rechazando automáticamente solicitud #{inv_req.id}: {rej_err}")

            # 2. Caso Recarga de Billetera
            elif payin.payin_type == "WALLET_TOPUP" and payin.wallet_recharge_id:
                wr_res = await db.execute(select(WalletRecharge).where(WalletRecharge.id == payin.wallet_recharge_id))
                wr = wr_res.scalars().first()
                if wr and wr.status == "pending":
                    wr.status = "rejected"
                    wr.reviewed_at = datetime.utcnow()
                    wr.admin_notes = f"Pago rechazado o expirado en Yoint ({new_status})"
                    db.add(wr)

        await db.commit()
        return True

    @classmethod
    async def create_payin_order(
        cls,
        db: AsyncSession,
        user: User,
        amount: Decimal,
        payment_method: str, # "NEQUI", "BOTON_BANCOLOMBIA", "PSE"
        payin_type: str,     # "WALLET_TOPUP", "INVESTMENT_REQUEST"
        investment_request_id: Optional[int] = None,
        wallet_recharge_id: Optional[int] = None,
        phone_nequi: Optional[str] = None,
        redirect_url: Optional[str] = None,
        bank_id: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Crea una orden de recaudo (Payin) en la API de Yoint y registra el objeto YointPayin.
        Soporta Nequi, Botón Bancolombia y PSE.
        """
        method_upper = payment_method.upper().strip()
        doc_type, doc_num = cls._clean_document(user.document_id)
        phone = cls._clean_phone(phone_nequi or user.phone_number)
        payer_name = str(user.name or "Inversionista Gloint")[:60]
        payer_email = str(user.email or "notificaciones@gloint.com.co")[:60]

        idempotency_key = f"payin-{payin_type.lower()[:3]}-{uuid.uuid4().hex[:12]}"
        reference_code = f"GLO-{payin_type[:3]}-{int(datetime.utcnow().timestamp())}"

        default_return_url = f"{getattr(settings, 'FRONTEND_URL', 'https://app.gloint.co').rstrip('/')}/dashboard/wallet"
        final_redirect_url = redirect_url or default_return_url

        headers = await cls._get_headers(idempotency_key=idempotency_key)
        base_url = settings.YOINT_API_URL.rstrip('/')

        order_id = None
        transaction_id = None
        checkout_redirect_url = None
        request_payload: Dict[str, Any] = {}
        response_payload: Dict[str, Any] = {}
        error_message = None

        async with httpx.AsyncClient(timeout=25.0) as client:
            try:
                if method_upper in ["NEQUI", "BOTON_BANCOLOMBIA"]:
                    # POST /api/payments/v2/payments
                    endpoint_url = f"{base_url}/api/payments/v2/payments"
                    
                    if method_upper == "NEQUI":
                        payment_details = {
                            "phoneNumber": {
                                "countryCode": "57",
                                "number": phone[-10:]
                            }
                        }
                    else: # BOTON_BANCOLOMBIA
                        payment_details = {
                            "redirectUrl": final_redirect_url
                        }

                    request_payload = {
                        "amount": float(amount),
                        "paymentMethod": method_upper,
                        "description": f"Gloint {payin_type}".strip(),
                        "payer": {
                            "fullName": payer_name,
                            "identityDocument": {
                                "type": doc_type,
                                "number": doc_num[:15]
                            },
                            "email": payer_email,
                            "phoneNumber": {
                                "countryCode": "57",
                                "number": phone[-10:]
                            }
                        },
                        "paymentDetails": payment_details
                    }

                    logger.info(f"[YointService] Enviando Payin {method_upper} ({amount} COP) a {endpoint_url}...")
                    res = await client.post(endpoint_url, json=request_payload, headers=headers)
                    logger.info(f"[YointService] Respuesta {method_upper}: HTTP {res.status_code} -> {res.text[:300]}")

                    if res.status_code in [200, 201]:
                        response_payload = res.json()
                        order_id = str(response_payload.get("id") or "")
                        metadata_list = response_payload.get("metadata") or []
                        for meta in metadata_list:
                            k = meta.get("key")
                            v = meta.get("value")
                            if k == "async_payment_url":
                                checkout_redirect_url = v
                            elif k == "transactionId":
                                transaction_id = v
                    else:
                        error_message = f"Error Yoint HTTP {res.status_code}: {res.text}"
                        logger.error(f"[YointService] {error_message}")

                elif method_upper == "PSE":
                    # POST /api/payments/v1/payment-pse
                    endpoint_url = f"{base_url}/api/payments/v1/payment-pse"
                    request_payload = {
                        "amount": float(amount),
                        "personType": "0",
                        "url": final_redirect_url,
                        "address": "Colombia",
                        "ip": ip_address or "127.0.0.1",
                        "financialEntity": {
                            "id": str(bank_id or "1007")
                        },
                        "payer": {
                            "payerFullName": payer_name,
                            "identityDocument": {
                                "type": doc_type,
                                "number": doc_num[:15]
                            },
                            "email": payer_email,
                            "phoneNumber": phone[-10:]
                        }
                    }

                    logger.info(f"[YointService] Enviando Payin PSE ({amount} COP, Banco: {bank_id}) a {endpoint_url}...")
                    res = await client.post(endpoint_url, json=request_payload, headers=headers)
                    logger.info(f"[YointService] Respuesta PSE: HTTP {res.status_code} -> {res.text[:300]}")

                    if res.status_code in [200, 201]:
                        response_payload = res.json()
                        order_id = str(response_payload.get("orderId") or "")
                        checkout_redirect_url = response_payload.get("url")
                    else:
                        error_message = f"Error Yoint PSE HTTP {res.status_code}: {res.text}"
                        logger.error(f"[YointService] {error_message}")
                else:
                    error_message = f"Método de pago no soportado: {payment_method}"

            except Exception as e:
                error_message = f"Excepción de conexión con Yoint: {str(e)}"
                logger.error(f"[YointService] {error_message}")

        # Guardar registro en la base de datos
        payin = YointPayin(
            user_id=user.id,
            payin_type=payin_type,
            investment_request_id=investment_request_id,
            wallet_recharge_id=wallet_recharge_id,
            payment_method=method_upper,
            order_id=order_id,
            transaction_id=transaction_id,
            idempotency_key=idempotency_key,
            payment_reference=reference_code,
            status="PENDING" if not error_message else "FAILED",
            amount=amount,
            currency="COP",
            description=f"Gloint {payin_type}",
            redirect_url=checkout_redirect_url,
            return_url=final_redirect_url,
            payer_name=payer_name,
            payer_email=payer_email,
            payer_document_type=doc_type,
            payer_document_number=doc_num,
            payer_phone=phone,
            financial_entity_id=str(bank_id) if bank_id else None,
            request_payload=request_payload,
            response_payload=response_payload,
            error_message=error_message
        )
        db.add(payin)
        await db.commit()
        await db.refresh(payin)

        if error_message:
            return {
                "success": False,
                "payin_id": payin.id,
                "error": error_message,
                "status": "FAILED"
            }

        return {
            "success": True,
            "payin_id": payin.id,
            "order_id": order_id,
            "transaction_id": transaction_id,
            "redirect_url": checkout_redirect_url,
            "payment_method": method_upper,
            "status": "PENDING"
        }

    @classmethod
    async def query_payin_status(cls, db: AsyncSession, payin: YointPayin) -> Dict[str, Any]:
        """
        Consulta el estado de una orden de recaudo ante Yoint (GET /api/payments/v1/{order-id})
        con fallback a (GET /api/payments/v1/list-payments?ids={order-id})
        y ejecuta la transición de estado si cambió.
        """
        target_id = payin.order_id
        if not target_id and payin.response_payload:
            target_id = cls._extract_order_id(payin.response_payload)
            if target_id:
                payin.order_id = target_id
                db.add(payin)
                await db.commit()

        if not target_id and payin.payment_reference:
            target_id = payin.payment_reference

        if not target_id:
            return {"status": payin.status, "message": "Payin sin order_id"}

        base_url = settings.YOINT_API_URL.rstrip('/')
        url = f"{base_url}/api/payments/v1/{target_id}"
        headers = await cls._get_headers(idempotency_key=str(uuid.uuid4()))

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.get(url, headers=headers)
                data = None
                if res.status_code == 200:
                    try:
                        data = res.json()
                    except Exception:
                        data = None

                # Fallback secundario si url principal da error o 404
                if not data or res.status_code not in [200, 202]:
                    fallback_url = f"{base_url}/api/payments/v1/list-payments?ids={target_id}"
                    logger.info(f"[YointService] Consultando fallback list-payments para payin #{payin.id}: {fallback_url}")
                    res_fb = await client.get(fallback_url, headers=headers)
                    if res_fb.status_code in [200, 202]:
                        try:
                            data = res_fb.json()
                        except Exception:
                            pass

                if not data:
                    return {"status": payin.status, "http_code": res.status_code, "body": res.text}

                new_status = None
                if isinstance(data, dict):
                    # 1. Caso operations (de list-payments)
                    ops = data.get("operations")
                    if isinstance(ops, list) and ops and isinstance(ops[0], dict):
                        op = ops[0]
                        new_status = op.get("status")
                        ext_resp = op.get("externalResponse")
                        if ext_resp:
                            ext_up = str(ext_resp).upper()
                            if any(ok in ext_up for ok in ["APPROV", "COMPLET", "CONFIRM", "EXITOS", "R00", "SUCCESS"]):
                                new_status = "SUCCESS"
                            elif any(fail in ext_up for fail in ["DECLIN", "REJECT", "FAIL", "ERROR"]):
                                new_status = "FAILED"

                    # 2. Caso subscription
                    if not new_status:
                        sub = data.get("subscription")
                        if isinstance(sub, dict) and sub.get("status"):
                            new_status = sub.get("status")

                    # 3. Caso paymentDetails
                    p_details = data.get("paymentDetails")
                    if isinstance(p_details, list) and p_details and isinstance(p_details[0], dict):
                        p_item = p_details[0]
                        pref = p_item.get("paymentReference")
                        if pref and not payin.transaction_id:
                            payin.transaction_id = str(pref)
                            db.add(payin)

                        if not new_status:
                            new_status = p_item.get("status")

                        ext_resp = p_item.get("externalResponse")
                        if ext_resp:
                            ext_up = str(ext_resp).upper()
                            if any(ok in ext_up for ok in ["APPROV", "COMPLET", "CONFIRM", "EXITOS", "R00", "SUCCESS"]):
                                new_status = "SUCCESS"
                            elif any(fail in ext_up for fail in ["DECLIN", "REJECT", "FAIL", "ERROR"]):
                                new_status = "FAILED"

                    # 4. Caso estado raíz
                    if not new_status:
                        new_status = data.get("status") or data.get("state") or data.get("estado")

                if new_status:
                    curr_status = (payin.status or "").upper()
                    target_status = str(new_status).upper()
                    is_target_success = any(ok in target_status for ok in ["SUCCES", "EXITOS", "APPROV", "COMPLET", "PAID", "PAGAD", "CONFIRM", "OK"])
                    if target_status != curr_status or is_target_success:
                        await cls.process_payin_status_transition(
                            db=db, payin=payin, new_status=str(new_status), payload=data
                        )
                return {"status": payin.status, "raw": data}
        except Exception as e:
            logger.error(f"[YointService] Error consultando estado de payin #{payin.id}: {e}")
            return {"status": payin.status, "error": str(e)}

    @classmethod
    async def get_financial_entities(cls, db: AsyncSession) -> List[Dict[str, Any]]:
        """
        Retorna el catálogo de entidades financieras soportadas (bancos y billeteras)
        consultando a Yoint (GET /api/payments/v2/financial-entities), con fallback a data_bancks.
        """
        base_url = settings.YOINT_API_URL.rstrip('/')
        url = f"{base_url}/api/payments/v2/financial-entities"
        headers = await cls._get_headers(idempotency_key=str(uuid.uuid4()))

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(url, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    if isinstance(data, list) and len(data) > 0:
                        return data
                    elif isinstance(data, dict) and "data" in data and isinstance(data["data"], list):
                        return data["data"]
        except Exception as e:
            logger.warning(f"[YointService] Error consultando financial-entities a Yoint, usando fallback local: {e}")

        # Fallback a tabla local data_bancks
        res = await db.execute(select(DataBank).order_by(DataBank.banck.asc()))
        banks = res.scalars().all()
        return [{"id": b.code_banck, "name": b.banck} for b in banks if b.code_banck and b.banck]

