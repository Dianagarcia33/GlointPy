import logging
import uuid
import re
from datetime import datetime
from decimal import Decimal
from typing import Optional, Dict, Any, Tuple
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from src.core.config import settings
from src.models.user import User
from src.models.withdrawal import Withdrawal, WithdrawalStatus
from src.models.yoint_dispersion import YointDispersion
from src.models.data_bank import DataBank
from src.models.wallet import Wallet, WalletTransaction
from src.services.company_wallet_service import CompanyWalletService

logger = logging.getLogger(__name__)

class YointService:
    """
    Servicio de integración con la API v2 de Pagos y Dispersiones de Yoint.
    Maneja el mapeo de entidades financieras (data_bancks), envío de dispersiones,
    idempotencia, persistencia forense y actualización automática de estados.
    """

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

    @staticmethod
    def _get_headers(idempotency_key: str) -> Dict[str, str]:
        """
        Construye headers requeridos por Yoint v2.
        """
        headers = {
            "Content-Type": "application/json",
            "X-Idempotency-Key": idempotency_key
        }
        if settings.YOINT_API_KEY:
            headers["Authorization"] = f"Bearer {settings.YOINT_API_KEY}"
            headers["x-api-key"] = settings.YOINT_API_KEY
        return headers

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
        if not settings.YOINT_API_KEY and not settings.YOINT_CLIENT_ID:
            dispersion.status = "QUEUED_PENDING_CONFIG"
            dispersion.error_message = "Credenciales de Yoint pendientes de configurar en backend/.env"
            logger.warning(f"Yoint API credentials no configuradas. Retiro #{withdrawal.id} encolado para dispersión.")
            await db.commit()
            return dispersion

        # Realizar la petición HTTP a Yoint v2
        endpoint = f"{settings.YOINT_API_URL.rstrip('/')}/api/payments/v2/dispersions"
        headers = cls._get_headers(idempotency_key)

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
                    # Éxito: Extraer orderId
                    order_ids = res_json.get("orderId", [])
                    order_id_val = str(order_ids[0]) if isinstance(order_ids, list) and order_ids else str(res_json.get("orderId") or "")
                    
                    dispersion.order_id = order_id_val
                    dispersion.status = "PROCESSING"
                    
                    # Actualizar retiro en Gloint
                    withdrawal.estado = WithdrawalStatus.PROCESSED
                    withdrawal.comprobante_pago = f"YOINT-ORDER-{order_id_val}"
                    logger.info(f"Dispersión Yoint exitosa para Retiro #{withdrawal.id}. OrderId: {order_id_val}")
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
        # Buscar la dispersión asociada
        q = select(YointDispersion).where(YointDispersion.order_id == str(order_id))
        res = await db.execute(q)
        dispersion = res.scalars().first()

        if not dispersion:
            logger.warning(f"No se encontró YointDispersion para order_id={order_id}")
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

        # 1. Casos de ÉXITO
        if status_upper in ["APPROVED", "COMPLETED", "PAID", "SUCCESS", "EXITOSA", "APROBADO"]:
            dispersion.status = "APPROVED"
            withdrawal.estado = WithdrawalStatus.APPROVED
            withdrawal.fecha_aprobacion = datetime.utcnow()
            withdrawal.comprobante_pago = f"YOINT-PAID-{order_id}"
            
            # Notificar al usuario
            try:
                from src.services.push_notification_service import PushNotificationService
                formatted_amount = f"${float(withdrawal.monto_neto):,.0f}" if withdrawal.monto_neto else "$0"
                await PushNotificationService.create_and_send_notification(
                    db=db,
                    user_id=withdrawal.user_id,
                    title="¡Pago de Retiro Exitoso!",
                    message=f"Tu retiro #{withdrawal.id} por {formatted_amount} COP ha sido pagado y acreditado a tu cuenta bancaria.",
                    type="retiro",
                    link="/dashboard/wallet"
                )
            except Exception as e:
                logger.warning(f"Error notificando aprobación Yoint retiro #{withdrawal.id}: {e}")

            logger.info(f"Retiro #{withdrawal.id} (Yoint {order_id}) completado y APROBADO.")

        # 2. Casos de RECHAZO O FALLO
        elif status_upper in ["REJECTED", "FAILED", "RECHAZADA", "DEVUELTA", "RECHAZADO"]:
            dispersion.status = "REJECTED"
            motivo = payload.get("message") or payload.get("error") or "Rechazo de dispersión bancaria reportado por Yoint"
            dispersion.error_message = str(motivo)

            withdrawal.estado = WithdrawalStatus.REJECTED
            withdrawal.motivo_rechazo = str(motivo)

            # Revertir fondos a la wallet del usuario (100% del monto solicitado)
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
                    description=f"Devolución por rechazo bancario Yoint #{order_id}: {motivo}",
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
                await PushNotificationService.create_and_send_notification(
                    db=db,
                    user_id=withdrawal.user_id,
                    title="Aviso sobre tu Retiro",
                    message=f"Tu solicitud de retiro #{withdrawal.id} no pudo ser completada por el banco ({motivo}). Los fondos han sido reintegrados a tu saldo.",
                    type="retiro",
                    link="/dashboard/wallet"
                )
            except Exception as e:
                logger.warning(f"Error notificando rechazo Yoint retiro #{withdrawal.id}: {e}")

            logger.warning(f"Retiro #{withdrawal.id} (Yoint {order_id}) RECHAZADO y fondos devueltos a la wallet.")

        await db.commit()
        return True

    @classmethod
    async def query_order_status(cls, db: AsyncSession, dispersion: YointDispersion) -> Dict[str, Any]:
        """
        Consulta en tiempo real el estado de una orden a Yoint.
        """
        if not dispersion.order_id:
            return {"status": dispersion.status, "message": "Orden sin orderId"}

        if not settings.YOINT_API_KEY and not settings.YOINT_CLIENT_ID:
            return {"status": dispersion.status, "message": "Credenciales Yoint no configuradas"}

        endpoint = f"{settings.YOINT_API_URL.rstrip('/')}/api/payments/v2/dispersions/{dispersion.order_id}"
        headers = cls._get_headers(idempotency_key=dispersion.idempotency_key or str(uuid.uuid4()))

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.get(endpoint, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    new_status = data.get("status") or data.get("state")
                    if new_status:
                        await cls.process_status_transition(
                            db=db, 
                            order_id=dispersion.order_id, 
                            new_status=new_status, 
                            payload=data
                        )
                    return data
                else:
                    return {"http_code": res.status_code, "body": res.text}
        except Exception as e:
            return {"error": str(e)}
