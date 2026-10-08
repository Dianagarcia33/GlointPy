import os
import uuid
import shutil
import math
import logging
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Optional, List, Dict, Any, Tuple
from fastapi import HTTPException, status, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func, desc, or_

from src.models.credit import Credit, CreditInstallment, CreditConfig
from src.models.user import User
from src.models.user_bank_account import UserBankAccount
from src.models.wallet import Wallet, WalletTransaction
from src.schemas.credit import (
    CreditCreate, 
    CreditApprove, 
    CreditReject, 
    CreditConfigUpdate, 
    CreditConfigOut,
    CreditSimulationResponse, 
    CreditSimulationInstallment,
    CreditInstallmentPayRequest,
    CreditInstallmentReviewRequest
)
from src.services.yoint_service import YointService

logger = logging.getLogger(__name__)


class CreditService:
    """
    Servicio integral de Créditos Fintech para Gloint.
    Maneja configuración y topes de usura, evaluación de solicitudes,
    amortización financiera, dispersión en 1 clic vía Yoint y pagos mixtos con billetera.
    """

    @classmethod
    async def get_or_create_config(cls, db: AsyncSession) -> CreditConfig:
        """
        Obtiene la configuración vigente de créditos o crea los valores legales por defecto.
        """
        try:
            res = await db.execute(select(CreditConfig).limit(1))
            config = res.scalars().first()
        except Exception as e:
            # Auto-recuperación si faltaban columnas como allowed_amounts o allowed_terms
            logger.warning(f"Error consultando credit_configs ({e}), intentando auto-reparar columnas...")
            await db.rollback()
            try:
                from sqlalchemy import text
                await db.execute(text("ALTER TABLE credit_configs ADD COLUMN allowed_amounts VARCHAR(500) NULL DEFAULT '500000, 1000000, 2000000, 5000000, 10000000'"))
                await db.commit()
            except Exception:
                await db.rollback()
            try:
                from sqlalchemy import text
                await db.execute(text("ALTER TABLE credit_configs ADD COLUMN allowed_terms VARCHAR(255) NULL DEFAULT '3, 6, 12, 18, 24'"))
                await db.commit()
            except Exception:
                await db.rollback()
            
            res = await db.execute(select(CreditConfig).limit(1))
            config = res.scalars().first()

        if not config:
            config = CreditConfig(
                max_usury_rate_ea=Decimal("26.50"),
                max_usury_rate_monthly=Decimal("1.98"),
                default_interest_rate_monthly=Decimal("1.80"),
                min_amount=Decimal("100000.00"),
                max_amount=Decimal("20000000.00"),
                min_term_months=1,
                max_term_months=24,
                allowed_amounts="500000, 1000000, 2000000, 5000000, 10000000",
                allowed_terms="3, 6, 12, 18, 24"
            )
            db.add(config)
            await db.commit()
            await db.refresh(config)
        return config

    @classmethod
    async def update_config(
        cls, 
        db: AsyncSession, 
        admin_user: User, 
        data: CreditConfigUpdate
    ) -> CreditConfig:
        """
        Actualiza los parámetros crediticios y la Tasa de Usura legal.
        """
        config = await cls.get_or_create_config(db)

        # Si se actualiza la tasa EA pero no la mensual, calcular equivalente: (1 + ea)^(1/12) - 1
        new_ea = data.max_usury_rate_ea
        new_monthly = data.max_usury_rate_monthly

        if new_ea is not None and new_monthly is None:
            # Formula matemática financiera: i_m = (1 + EA)^(1/12) - 1
            ea_float = float(new_ea) / 100.0
            calc_monthly = ((1.0 + ea_float) ** (1.0 / 12.0) - 1.0) * 100.0
            new_monthly = round(calc_monthly, 2)
        elif new_monthly is not None and new_ea is None:
            # Formula inversa: EA = (1 + i_m)^12 - 1
            m_float = float(new_monthly) / 100.0
            calc_ea = ((1.0 + m_float) ** 12.0 - 1.0) * 100.0
            new_ea = round(calc_ea, 2)

        if new_ea is not None:
            config.max_usury_rate_ea = Decimal(str(new_ea))
        if new_monthly is not None:
            config.max_usury_rate_monthly = Decimal(str(new_monthly))

        if data.default_interest_rate_monthly is not None:
            # Validar que la tasa de la plataforma no supere la usura
            max_allowed = config.max_usury_rate_monthly
            if Decimal(str(data.default_interest_rate_monthly)) > max_allowed:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"La tasa estándar ({data.default_interest_rate_monthly}%) no puede superar la tasa máxima de usura legal ({max_allowed}% M.V.)."
                )
            config.default_interest_rate_monthly = Decimal(str(data.default_interest_rate_monthly))

        if data.min_amount is not None:
            config.min_amount = Decimal(str(data.min_amount))
        if data.max_amount is not None:
            config.max_amount = Decimal(str(data.max_amount))
        if data.min_term_months is not None:
            config.min_term_months = data.min_term_months
        if data.max_term_months is not None:
            config.max_term_months = data.max_term_months
        if data.allowed_amounts is not None:
            config.allowed_amounts = data.allowed_amounts
        if data.allowed_terms is not None:
            config.allowed_terms = data.allowed_terms

        config.updated_by = admin_user.id
        config.updated_at = datetime.utcnow()

        await db.commit()
        await db.refresh(config)
        return config

    @classmethod
    def simulate(
        cls, 
        amount: float, 
        term_months: int, 
        interest_rate_monthly: float
    ) -> CreditSimulationResponse:
        """
        Simulador financiero de amortización de crédito (Método Francés / Cuota Fija).
        """
        if amount <= 0 or term_months <= 0:
            raise HTTPException(status_code=400, detail="Monto y plazo deben ser mayores a 0")

        r = interest_rate_monthly / 100.0
        n = term_months

        if r > 0:
            # Cuota fija = P * (r / (1 - (1 + r)^(-n)))
            installment_val = amount * (r / (1.0 - math.pow(1.0 + r, -n)))
            ea_val = (math.pow(1.0 + r, 12) - 1.0) * 100.0
        else:
            installment_val = amount / n
            ea_val = 0.0

        installments: List[CreditSimulationInstallment] = []
        remaining = amount
        total_interest = 0.0

        today = date.today()

        for i in range(1, n + 1):
            interest = remaining * r if r > 0 else 0.0
            principal = installment_val - interest
            
            # En la última cuota ajustar posibles centavos de redondeo
            if i == n or principal > remaining:
                principal = remaining
                installment_val = principal + interest

            remaining = max(0.0, remaining - principal)
            total_interest += interest

            # Fecha tentativa: 1 mes después por cuota
            # Cálculo simple sumando 30 días o usando replace mes
            due_month = today.month + i
            due_year = today.year + (due_month - 1) // 12
            due_m = ((due_month - 1) % 12) + 1
            due_day = min(today.day, 28)
            est_due_date = date(due_year, due_m, due_day)

            installments.append(CreditSimulationInstallment(
                installment_number=i,
                due_date=est_due_date.isoformat(),
                principal_amount=round(principal, 2),
                interest_amount=round(interest, 2),
                total_amount=round(principal + interest, 2),
                remaining_balance=round(remaining, 2)
            ))

        return CreditSimulationResponse(
            amount=round(amount, 2),
            term_months=term_months,
            interest_rate_monthly=round(interest_rate_monthly, 2),
            interest_rate_ea=round(ea_val, 2),
            monthly_installment=round(installments[0].total_amount if installments else installment_val, 2),
            total_interest=round(total_interest, 2),
            total_payment=round(amount + total_interest, 2),
            installments=installments
        )

    @classmethod
    async def request_credit(
        cls, 
        db: AsyncSession, 
        user: User, 
        data: CreditCreate
    ) -> Credit:
        """
        Crea una nueva solicitud de crédito para el cliente.
        Valida límites configurados y resuelve la cuenta bancaria de desembolso.
        """
        config = await cls.get_or_create_config(db)

        # 1. Validar montos y plazos contra configuración
        if Decimal(str(data.amount)) < config.min_amount:
            raise HTTPException(
                status_code=400, 
                detail=f"El monto mínimo de crédito es ${config.min_amount:,.0f} COP."
            )
        if Decimal(str(data.amount)) > config.max_amount:
            raise HTTPException(
                status_code=400, 
                detail=f"El monto máximo de crédito es ${config.max_amount:,.0f} COP."
            )
        if data.term_months < config.min_term_months or data.term_months > config.max_term_months:
            raise HTTPException(
                status_code=400, 
                detail=f"El plazo debe estar entre {config.min_term_months} y {config.max_term_months} meses."
            )

        # 2. Validar que no tenga solicitudes pendientes en revisión
        existing_pending = await db.execute(
            select(Credit).where(
                (Credit.user_id == user.id) & 
                (Credit.status.in_(["PENDING", "IN_REVIEW"]))
            )
        )
        if existing_pending.scalars().first():
            raise HTTPException(
                status_code=400, 
                detail="Ya tienes una solicitud de crédito en proceso de estudio. Espera la respuesta antes de radicar otra."
            )

        # 3. Resolver datos de la cuenta bancaria de destino (igual que en retiros)
        banco = data.banco
        tipo_cuenta = data.tipo_cuenta
        numero_cuenta = data.numero_cuenta
        bank_account_id = data.user_bank_account_id

        if bank_account_id:
            acc_res = await db.execute(
                select(UserBankAccount).where(
                    (UserBankAccount.id == bank_account_id) & 
                    (UserBankAccount.user_id == user.id)
                )
            )
            bank_acc = acc_res.scalars().first()
            if not bank_acc:
                raise HTTPException(status_code=404, detail="La cuenta bancaria seleccionada no existe o no te pertenece.")
            banco = bank_acc.banco
            tipo_cuenta = bank_acc.tipo_cuenta
            numero_cuenta = bank_acc.numero_cuenta
        elif not (banco and tipo_cuenta and numero_cuenta):
            # Intentar obtener la cuenta activa registrada del usuario
            acc_res = await db.execute(
                select(UserBankAccount).where(
                    (UserBankAccount.user_id == user.id) & 
                    (UserBankAccount.is_active == True)
                ).limit(1)
            )
            bank_acc = acc_res.scalars().first()
            if bank_acc:
                bank_account_id = bank_acc.id
                banco = bank_acc.banco
                tipo_cuenta = bank_acc.tipo_cuenta
                numero_cuenta = bank_acc.numero_cuenta
            else:
                raise HTTPException(
                    status_code=400, 
                    detail="Debes seleccionar o registrar una cuenta bancaria para recibir el desembolso."
                )

        # 4. Crear el crédito en estado PENDING con la tasa legal vigente
        credit = Credit(
            user_id=user.id,
            requested_amount=Decimal(str(data.amount)),
            approved_amount=None,
            term_months=data.term_months,
            interest_rate=config.default_interest_rate_monthly,
            frequency="monthly",
            status="PENDING",
            purpose=data.purpose.strip() if data.purpose else None,
            user_bank_account_id=bank_account_id,
            banco=banco.strip(),
            tipo_cuenta=tipo_cuenta.strip(),
            numero_cuenta=numero_cuenta.strip()
        )

        db.add(credit)
        await db.commit()
        await db.refresh(credit)
        logger.info(f"Nueva solicitud de crédito #{credit.id} creada por usuario #{user.id} por ${data.amount:,.0f} COP.")
        return credit

    @classmethod
    async def approve_credit(
        cls, 
        db: AsyncSession, 
        admin_user: User, 
        credit_id: int, 
        data: CreditApprove
    ) -> Credit:
        """
        Aprobación del crédito en 1 solo clic:
        - Valida que la tasa no exceda la tasa de usura legal vigente.
        - Genera la tabla de amortización (cuotas).
        - Dispara automáticamente la orden de dispersión a Yoint hacia la cuenta bancaria del cliente.
        - Activa el crédito.
        """
        query = select(Credit).options(
            selectinload(Credit.user),
            selectinload(Credit.installments),
            selectinload(Credit.bank_account)
        ).where(Credit.id == credit_id)
        
        res = await db.execute(query)
        credit = res.scalars().first()
        if not credit:
            raise HTTPException(status_code=404, detail="Crédito no encontrado")

        if credit.status not in ["PENDING", "IN_REVIEW"]:
            raise HTTPException(status_code=400, detail=f"El crédito no está pendiente de aprobación (Estado actual: {credit.status}).")

        config = await cls.get_or_create_config(db)

        approved_amount = Decimal(str(data.approved_amount if data.approved_amount is not None else credit.requested_amount))
        term_months = data.term_months if data.term_months is not None else credit.term_months
        rate = Decimal(str(data.interest_rate if data.interest_rate is not None else credit.interest_rate))

        # BLINDAJE LEGAL: Validar contra tasa de usura
        if rate > config.max_usury_rate_monthly:
            raise HTTPException(
                status_code=400,
                detail=f"La tasa aplicada ({rate}% M.V.) no puede exceder la tasa máxima de usura legal en Colombia ({config.max_usury_rate_monthly}% M.V. / {config.max_usury_rate_ea}% E.A.)."
            )

        credit.approved_amount = approved_amount
        credit.term_months = term_months
        credit.interest_rate = rate
        credit.admin_notes = data.admin_notes or credit.admin_notes

        # 1. Generar Amortización
        sim = cls.simulate(
            amount=float(approved_amount),
            term_months=term_months,
            interest_rate_monthly=float(rate)
        )

        # Determinar fecha base del primer pago
        first_date = date.today() + timedelta(days=30)
        if data.first_payment_date:
            try:
                first_date = datetime.strptime(data.first_payment_date, "%Y-%m-%d").date()
            except Exception:
                pass

        # Limpiar posibles cuotas previas
        credit.installments = []
        await db.flush()

        for inst_sim in sim.installments:
            # Calcular fecha exacta para cada cuota
            month_offset = inst_sim.installment_number - 1
            due_month = first_date.month + month_offset
            due_year = first_date.year + (due_month - 1) // 12
            due_m = ((due_month - 1) % 12) + 1
            due_day = min(first_date.day, 28)
            installment_due = date(due_year, due_m, due_day)

            installment = CreditInstallment(
                credit_id=credit.id,
                installment_number=inst_sim.installment_number,
                due_date=installment_due,
                principal_amount=Decimal(str(inst_sim.principal_amount)),
                interest_amount=Decimal(str(inst_sim.interest_amount)),
                total_amount=Decimal(str(inst_sim.total_amount)),
                wallet_amount_paid=Decimal("0.00"),
                external_amount_paid=Decimal("0.00"),
                paid_amount=Decimal("0.00"),
                status="PENDING"
            )
            db.add(installment)

        # 2. Desembolso automático en 1 Clic con Yoint
        credit.approved_by = admin_user.id
        credit.approved_at = datetime.utcnow()
        credit.disbursed_at = datetime.utcnow()
        credit.status = "ACTIVE"
        credit.disbursement_method = "YOINT_DISPERSION"

        await db.flush()

        # Disparar dispersión a Yoint
        dispersion = await YointService.send_credit_dispersion(
            db=db,
            credit=credit,
            user=credit.user
        )

        await db.commit()
        await db.refresh(credit)
        logger.info(f"Crédito #{credit.id} APROBADO Y DESEMBOLSADO con Yoint. Estado dispersión: {dispersion.status}")
        return credit

    @classmethod
    async def reject_credit(
        cls, 
        db: AsyncSession, 
        admin_user: User, 
        credit_id: int, 
        data: CreditReject
    ) -> Credit:
        """
        Rechaza una solicitud de crédito registrando la causa.
        """
        credit = await db.get(Credit, credit_id)
        if not credit:
            raise HTTPException(status_code=404, detail="Crédito no encontrado")

        if credit.status not in ["PENDING", "IN_REVIEW"]:
            raise HTTPException(status_code=400, detail=f"No se puede rechazar un crédito en estado {credit.status}.")

        credit.status = "REJECTED"
        credit.rejected_by = admin_user.id
        credit.rejected_at = datetime.utcnow()
        credit.rejection_reason = data.reason.strip()

        await db.commit()
        await db.refresh(credit)
        logger.info(f"Crédito #{credit.id} RECHAZADO por admin #{admin_user.id}: {data.reason}")
        return credit

    @classmethod
    async def pay_installment(
        cls, 
        db: AsyncSession, 
        user: User, 
        installment_id: int, 
        pay_data: CreditInstallmentPayRequest, 
        receipt_file: Optional[UploadFile] = None
    ) -> CreditInstallment:
        """
        Pago de cuota flexible / mixto:
        - Wallet opcional (cobertura total o parcial).
        - Si queda saldo: transferencia bancaria con comprobante o pasarela Yoint.
        """
        q = select(CreditInstallment).options(
            selectinload(CreditInstallment.credit)
        ).where(CreditInstallment.id == installment_id)
        
        res = await db.execute(q)
        installment = res.scalars().first()
        if not installment:
            raise HTTPException(status_code=404, detail="Cuota no encontrada")

        credit = installment.credit
        if credit.user_id != user.id:
            raise HTTPException(status_code=403, detail="Esta cuota no pertenece a tu cuenta.")

        if installment.status == "PAID":
            raise HTTPException(status_code=400, detail="Esta cuota ya se encuentra totalmente pagada.")

        if installment.status == "IN_REVIEW":
            raise HTTPException(status_code=400, detail="Esta cuota ya tiene un comprobante de pago en proceso de revisión.")

        remaining_needed = installment.total_amount - installment.paid_amount
        wallet_applied = Decimal("0.00")

        # 1. Procesar débito opcional de Wallet
        if pay_data.use_wallet_amount and pay_data.use_wallet_amount > 0:
            wallet_to_use = Decimal(str(pay_data.use_wallet_amount))

            if wallet_to_use > remaining_needed:
                wallet_to_use = remaining_needed

            # Verificar saldo disponible en Wallet
            w_res = await db.execute(select(Wallet).where(Wallet.user_id == user.id))
            wallet = w_res.scalars().first()
            if not wallet or wallet.balance < wallet_to_use:
                available = wallet.balance if wallet else Decimal("0.00")
                raise HTTPException(
                    status_code=400,
                    detail=f"Saldo insuficiente en tu billetera. Tienes ${available:,.0f} COP disponibles."
                )

            # Debitar billetera
            wallet.balance -= wallet_to_use
            wallet_applied = wallet_to_use

            tx = WalletTransaction(
                wallet_id=wallet.id,
                type="DEBIT",
                amount=wallet_to_use,
                description=f"Abono Cuota #{installment.installment_number} Crédito #{credit.id}"
            )
            db.add(tx)

            installment.wallet_amount_paid += wallet_to_use
            installment.paid_amount += wallet_to_use
            logger.info(f"Cuota #{installment.id}: debitados ${wallet_to_use:,.0f} COP de wallet de usuario #{user.id}")

        new_remaining = installment.total_amount - installment.paid_amount

        # 2. Si la cuota ya quedó 100% cubierta con la wallet
        if new_remaining <= Decimal("0.00"):
            installment.status = "PAID"
            installment.paid_at = datetime.utcnow()
            installment.payment_method = "WALLET" if installment.external_amount_paid == 0 else "MIXED"
            installment.notes = pay_data.notes or "Pago completado con saldo de billetera"
        else:
            # 3. Queda saldo pendiente por transferir
            if receipt_file:
                # Guardar comprobante bancario
                filename = receipt_file.filename or ""
                ext = os.path.splitext(filename)[1].lower()
                allowed_exts = [".jpg", ".jpeg", ".png", ".webp", ".pdf"]
                if ext not in allowed_exts:
                    raise HTTPException(status_code=400, detail="Formato de comprobante no válido. Use JPG, PNG, WEBP o PDF.")

                upload_dir = "uploads/comprobantes"
                os.makedirs(upload_dir, exist_ok=True)
                unique_filename = f"credito_cuota_{installment.id}_{int(datetime.utcnow().timestamp())}_{uuid.uuid4().hex[:8]}{ext}"
                dest_path = os.path.join(upload_dir, unique_filename)

                with open(dest_path, "wb") as buffer:
                    shutil.copyfileobj(receipt_file.file, buffer)

                installment.receipt_url = f"/uploads/comprobantes/{unique_filename}"
                installment.external_amount_paid = new_remaining
                installment.payment_reference = pay_data.payment_reference
                installment.payment_method = "MIXED" if wallet_applied > 0 else "MANUAL_TRANSFER"
                installment.status = "IN_REVIEW"
                installment.notes = pay_data.notes
            elif wallet_applied > 0:
                # Se aplicó wallet pero no adjuntó comprobante todavía -> queda parcialmente pagada
                installment.status = "PARTIALLY_PAID"
                installment.payment_method = "WALLET"
                installment.notes = pay_data.notes or f"Abono parcial de ${wallet_applied:,.0f} COP desde wallet."

        # 4. Si todas las cuotas del crédito están pagadas, marcar crédito como PAID
        all_inst_res = await db.execute(
            select(CreditInstallment).where(CreditInstallment.credit_id == credit.id)
        )
        all_inst = all_inst_res.scalars().all()
        if all_inst and all(inst.status == "PAID" for inst in all_inst):
            credit.status = "PAID"
            logger.info(f"¡Crédito #{credit.id} ha sido totalmente pagado y liquidado!")

        await db.commit()
        await db.refresh(installment)
        return installment

    @classmethod
    async def review_installment_payment(
        cls, 
        db: AsyncSession, 
        admin_user: User, 
        installment_id: int, 
        data: CreditInstallmentReviewRequest
    ) -> CreditInstallment:
        """
        Aprobación o rechazo administrativo del comprobante manual de una cuota.
        """
        q = select(CreditInstallment).options(
            selectinload(CreditInstallment.credit)
        ).where(CreditInstallment.id == installment_id)
        
        res = await db.execute(q)
        installment = res.scalars().first()
        if not installment:
            raise HTTPException(status_code=404, detail="Cuota no encontrada")

        if installment.status != "IN_REVIEW":
            raise HTTPException(status_code=400, detail=f"La cuota no está en revisión (Estado: {installment.status}).")

        credit = installment.credit

        installment.reviewed_by = admin_user.id
        installment.reviewed_at = datetime.utcnow()

        if data.approve:
            installment.paid_amount = installment.wallet_amount_paid + installment.external_amount_paid
            installment.status = "PAID"
            installment.paid_at = datetime.utcnow()
            installment.rejection_reason = None
            logger.info(f"Cuota #{installment.id} APROBADA por admin #{admin_user.id}.")

            # Verificar si se liquida el crédito
            all_inst_res = await db.execute(
                select(CreditInstallment).where(CreditInstallment.credit_id == credit.id)
            )
            all_inst = all_inst_res.scalars().all()
            if all_inst and all(inst.status == "PAID" for inst in all_inst):
                credit.status = "PAID"
                logger.info(f"Crédito #{credit.id} marcado como totalmente PAGADO.")
        else:
            installment.status = "PARTIALLY_PAID" if installment.wallet_amount_paid > 0 else "PENDING"
            installment.rejection_reason = data.rejection_reason or "Comprobante rechazado por administración"
            logger.info(f"Comprobante de cuota #{installment.id} RECHAZADO por admin #{admin_user.id}: {installment.rejection_reason}")

        await db.commit()
        await db.refresh(installment)
        return installment

    @classmethod
    async def get_user_credits(cls, db: AsyncSession, user_id: int) -> List[Credit]:
        """
        Retorna todos los créditos de un usuario con sus cuotas y detalles.
        """
        q = select(Credit).options(
            selectinload(Credit.installments),
            selectinload(Credit.bank_account)
        ).where(Credit.user_id == user_id).order_by(Credit.id.desc())
        
        res = await db.execute(q)
        return res.scalars().all()

    @classmethod
    async def get_admin_credits(
        cls, 
        db: AsyncSession, 
        page: int = 1, 
        limit: int = 20, 
        status_filter: Optional[str] = None,
        search: Optional[str] = None
    ) -> Tuple[List[Credit], int]:
        """
        Bandeja administrativa de créditos con paginación, filtros y búsqueda.
        """
        q = select(Credit).options(
            selectinload(Credit.user),
            selectinload(Credit.installments),
            selectinload(Credit.bank_account),
            selectinload(Credit.approver)
        )

        if status_filter:
            q = q.where(Credit.status == status_filter)

        if search:
            search_clean = f"%{search.strip()}%"
            q = q.join(Credit.user).where(
                or_(
                    User.name.ilike(search_clean),
                    User.email.ilike(search_clean),
                    User.document_id.ilike(search_clean),
                    Credit.numero_cuenta.ilike(search_clean),
                    Credit.banco.ilike(search_clean)
                )
            )

        # Count total
        count_q = select(func.count(Credit.id))
        if status_filter:
            count_q = count_q.where(Credit.status == status_filter)
        if search:
            search_clean = f"%{search.strip()}%"
            count_q = count_q.join(Credit.user).where(
                or_(
                    User.name.ilike(search_clean),
                    User.email.ilike(search_clean),
                    User.document_id.ilike(search_clean),
                    Credit.numero_cuenta.ilike(search_clean),
                    Credit.banco.ilike(search_clean)
                )
            )

        total_res = await db.execute(count_q)
        total = total_res.scalar() or 0

        # Paginación
        q = q.order_by(Credit.id.desc()).offset((page - 1) * limit).limit(limit)
        res = await db.execute(q)
        items = res.scalars().all()

        return items, total
