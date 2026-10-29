from src.core.errors import public_error_detail
import logging

from fastapi import APIRouter, Depends, status, UploadFile, File, HTTPException, Form, BackgroundTasks
from pydantic import BaseModel, field_validator, model_validator
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

from src.core.database import get_db
from src.api.deps import RequirePermission, get_current_user
from src.services.wallet_service import bulk_create_or_update_wallets, bulk_create_or_update_wallet_transactions
from sqlalchemy.future import select
from src.models.wallet import Wallet
from src.models.user import User
from src.models.withdrawal import Withdrawal, WithdrawalStatus

router = APIRouter()

from src.models.system_event import SystemEvent
from src.services.system_event_service import SystemEventService
from typing import Optional, Tuple, Any

async def check_withdrawal_dates_active(db: AsyncSession) -> Tuple[bool, Optional[str]]:
    from sqlalchemy import func
    from datetime import datetime
    from src.services.system_event_service import LOCAL_TZ
    withdrawal_types = ["withdrawal", "withdrawals", "retiro", "retiros", "fechas_retiro"]
    
    events_res = await db.execute(
        select(SystemEvent).where(SystemEvent.is_active == True)
    )
    from src.services.system_event_service import normalize_event_type
    _wanted_types = {normalize_event_type(t) for t in withdrawal_types}
    all_withdrawal_events = [e for e in events_res.scalars().all() if normalize_event_type(e.type) in _wanted_types]
    
    if not all_withdrawal_events:
        return True, None

    now_local = datetime.now(LOCAL_TZ)
    for evt in all_withdrawal_events:
        if SystemEventService.is_event_instance_active(evt, now_local):
            return True, None
            
    return False, "Actualmente no se encuentra habilitada la ventana de retiros. Por favor consulta las fechas de retiro autorizadas en el sistema."

from pydantic import BaseModel, Field

class WalletWithdrawRequest(BaseModel):
    monto: float = Field(..., ge=5000, description="Monto mínimo de retiro: 5.000 COP")
    code: str = Field(..., min_length=6, max_length=6)
    bank_account_id: Optional[int] = None

class SendCodeRequest(BaseModel):
    monto: float = Field(..., ge=5000, description="Monto mínimo de retiro: 5.000 COP")

@router.get("/me/balance")
@router.get("/balance")
async def get_my_balance(current_user = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """
    Get the wallet balance of the current logged-in user.
    """
    result = await db.execute(select(Wallet).where(Wallet.user_id == current_user.id))
    wallet = result.scalars().first()
    
    from src.models.user_bank_account import UserBankAccount
    bank_result = await db.execute(
        select(UserBankAccount).where(
            UserBankAccount.user_id == current_user.id, 
            UserBankAccount.is_active == True
        )
    )
    user_bank_accounts = bank_result.scalars().all()
    
    bank_accounts_list = [
        {
            "id": acc.id,
            "banco": acc.banco,
            "tipo_cuenta": acc.tipo_cuenta,
            "numero_cuenta": acc.numero_cuenta
        }
        for acc in user_bank_accounts
    ]
    
    bank_details = bank_accounts_list[0] if bank_accounts_list else None
    can_withdraw, withdrawal_msg = await check_withdrawal_dates_active(db)

    return {
        # H-197: el resto de pantallas siguen recibiendo balance 0; el navbar usa has_wallet para ocultar el widget
        "has_wallet": wallet is not None,
        "balance": wallet.balance if wallet else 0,
        "currency": wallet.currency if wallet else "COP",
        "bank_details": bank_details,
        "bank_accounts": bank_accounts_list,
        "can_withdraw": can_withdraw,
        "withdrawal_date_message": withdrawal_msg
    }

@router.get("/admin/user/{user_id}/balance", dependencies=[Depends(RequirePermission(["admin.investments.manage", "admin.investments.solicitud_inversion", "admin.investors.manage", "admin.investors.create"]))])
async def get_user_wallet_balance_admin(user_id: int, db: AsyncSession = Depends(get_db)):
    """
    Get wallet balance for a specific user ID for investment creation.
    """
    result = await db.execute(select(Wallet).where(Wallet.user_id == user_id))
    wallet = result.scalars().first()
    return {
        "user_id": user_id,
        "balance": wallet.balance if wallet else 0,
        "currency": wallet.currency if wallet else "COP"
    }




@router.post("/me/withdraw/send-code")
async def send_withdrawal_code(
    req: SendCodeRequest,
    current_user = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    """
    Generate and send a 6-digit verification code to the user's email.
    """
    from src.models.user_bank_account import UserBankAccount
    from src.models.wallet import Wallet
    from src.models.withdrawal_verification_code import WithdrawalVerificationCode
    from src.services.email_service import EmailService
    from decimal import Decimal
    from datetime import datetime, timedelta
    import random

    # 0. Check Withdrawal Dates Window
    can_withdraw, date_msg = await check_withdrawal_dates_active(db)
    if not can_withdraw:
        raise HTTPException(status_code=400, detail=date_msg or "No te encuentras en fechas de retiro autorizadas.")

    # 1. Check Bank Account
    bank_res = await db.execute(select(UserBankAccount).where(UserBankAccount.user_id == current_user.id, UserBankAccount.is_active == True))
    bank_account = bank_res.scalars().first()
    if not bank_account:
        raise HTTPException(status_code=400, detail="No tienes una cuenta bancaria activa registrada.")

    # 2. Check Wallet & Balance
    wallet_res = await db.execute(select(Wallet).where(Wallet.user_id == current_user.id))
    wallet = wallet_res.scalars().first()
    
    if not wallet:
        raise HTTPException(status_code=400, detail="No tienes una billetera activa.")
        
    monto_decimal = Decimal(str(req.monto))
    if wallet.balance < monto_decimal:
        raise HTTPException(status_code=400, detail="Saldo insuficiente.")
        
    if monto_decimal < Decimal("5000"):
        raise HTTPException(status_code=400, detail="El monto mínimo de retiro es de $5,000 COP.")

    # 3. Generate 6-digit code
    code = f"{random.randint(0, 999999):06d}"
    expires_at = datetime.utcnow() + timedelta(minutes=10)

    # 4. Save to DB
    verification_code = WithdrawalVerificationCode(
        user_id=current_user.id,
        code=code,
        expires_at=expires_at,
        used_at=None
    )
    db.add(verification_code)
    
    try:
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=public_error_detail("Error al generar el código", e))

    # 5. Send Email
    email_sent = EmailService.send_withdrawal_verification_code(current_user.email, code)
    if not email_sent:
        # We don't necessarily fail the request if it's mock, but in production we'd want to know
        pass
        
    return {"message": "Código enviado a tu correo electrónico."}


@router.post("/me/withdraw")
async def request_withdrawal(
    req: WalletWithdrawRequest,
    background_tasks: BackgroundTasks,
    current_user = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    """
    Request a withdrawal from the user's wallet.
    Requires a valid 6-digit verification code.
    """
    from src.models.user_bank_account import UserBankAccount
    from src.models.wallet import WalletTransaction
    from src.models.withdrawal import Withdrawal, WithdrawalType, WithdrawalStatus
    from src.models.withdrawal_verification_code import WithdrawalVerificationCode
    from src.models.investor import Investor
    from decimal import Decimal
    from datetime import datetime, date

    # 0. Check Withdrawal Dates Window
    can_withdraw, date_msg = await check_withdrawal_dates_active(db)
    if not can_withdraw:
        raise HTTPException(status_code=400, detail=date_msg or "No te encuentras en fechas de retiro autorizadas.")

    # 0. Verify Code
    code_res = await db.execute(
        select(WithdrawalVerificationCode)
        .where(
            WithdrawalVerificationCode.user_id == current_user.id,
            WithdrawalVerificationCode.code == req.code,
            WithdrawalVerificationCode.used_at == None,
            WithdrawalVerificationCode.expires_at > datetime.utcnow()
        )
        .order_by(WithdrawalVerificationCode.created_at.desc())
    )
    verification = code_res.scalars().first()
    
    if not verification:
        raise HTTPException(status_code=400, detail="Código de verificación incorrecto o expirado.")

    # 1. Check Bank Account
    if req.bank_account_id is not None and req.bank_account_id > 0:
        bank_res = await db.execute(
            select(UserBankAccount).where(
                UserBankAccount.id == req.bank_account_id,
                UserBankAccount.user_id == current_user.id,
                UserBankAccount.is_active == True
            )
        )
        bank_account = bank_res.scalars().first()
    else:
        bank_res = await db.execute(
            select(UserBankAccount).where(
                UserBankAccount.user_id == current_user.id,
                UserBankAccount.is_active == True
            ).order_by(UserBankAccount.id.desc())
        )
        bank_account = bank_res.scalars().first()

    if not bank_account:
        raise HTTPException(status_code=400, detail="No tienes una cuenta bancaria activa registrada.")

    # 2. Check Wallet & Balance
    wallet_res = await db.execute(select(Wallet).where(Wallet.user_id == current_user.id))
    wallet = wallet_res.scalars().first()
    
    if not wallet:
        raise HTTPException(status_code=400, detail="No tienes una billetera activa.")
        
    monto_decimal = Decimal(str(req.monto))
    if wallet.balance < monto_decimal:
        raise HTTPException(status_code=400, detail="Saldo insuficiente.")
        
    if monto_decimal < Decimal("5000"):
        raise HTTPException(status_code=400, detail="El monto mínimo de retiro es de $5,000 COP.")

    # 3. Fetch Investor ID if exists
    investor_res = await db.execute(select(Investor).where(Investor.user_id == current_user.id))
    investor = investor_res.scalars().first()
    investor_id = investor.id if investor else None

    # 4. Calculate Taxes
    impuesto = monto_decimal * Decimal("0.032")
    monto_neto = monto_decimal - impuesto

    # 5. Deduct Balance & Create Transaction
    wallet.balance -= monto_decimal
    
    tx = WalletTransaction(
        wallet_id=wallet.id,
        amount=-monto_decimal,
        type="withdrawal request",
        description="Solicitud de retiro de fondos",
        balance_after=wallet.balance
    )
    db.add(tx)
    
    # 0.5 Mark as used
    verification.used_at = datetime.utcnow()
    db.add(verification)
    await db.flush() # flush to get tx.id if needed
    
    # 6. Create Withdrawal Record
    withdrawal = Withdrawal(
        investor_id=investor_id,
        user_id=current_user.id,
        origen="wallet",
        tipo=WithdrawalType.RENDIMIENTO, # default for wallet
        monto=monto_decimal,
        impuesto=impuesto,
        monto_neto=monto_neto,
        fecha_solicitud=date.today(),
        estado=WithdrawalStatus.PENDING,
        metodo_pago="Transferencia",
        banco=bank_account.banco,
        tipo_cuenta=bank_account.tipo_cuenta,
        numero_cuenta=bank_account.numero_cuenta
    )
    db.add(withdrawal)
    
    # Optional: cross-link them
    await db.flush()
    tx.reference_type = "withdrawal"
    tx.reference_id = withdrawal.id

    # 7. Acreditar el 3.2% de retención a la Billetera Corporativa de la Empresa
    try:
        from src.services.company_wallet_service import CompanyWalletService
        await CompanyWalletService.credit_tax_retention(db, withdrawal, current_user.name)
    except Exception as cw_err:
        logger.warning(f"Aviso al acreditar retención 3.2% a Billetera Corporativa: {cw_err}")

    try:
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=public_error_detail("No se pudo completar la operación", e))

    # 8. Disparar dispersión automática a la API v2 de Yoint
    yoint_tracking = None
    try:
        from src.services.yoint_service import YointService
        dispersion = await YointService.send_dispersion(db=db, withdrawal=withdrawal, user=current_user)
        if dispersion:
            yoint_tracking = {
                "dispersion_id": dispersion.id,
                "order_id": dispersion.order_id,
                "status": dispersion.status
            }
    except Exception as y_err:
        logger.error(f"Error al enviar dispersión a Yoint para retiro #{withdrawal.id}: {y_err}", exc_info=True)

    # 9. Enviar correo corporativo notificando que la solicitud de retiro está pendiente
    try:
        if current_user and current_user.email:
            from src.services.email_service import EmailService
            background_tasks.add_task(
                EmailService.send_withdrawal_request_pending_email,
                to_email=current_user.email,
                user_name=current_user.name or "Inversionista",
                amount=float(withdrawal.monto),
                tax=float(withdrawal.impuesto or 0),
                net_amount=float(withdrawal.monto_neto or withdrawal.monto),
                bank=withdrawal.banco or (bank_account.banco if bank_account else "Entidad Bancaria"),
                account_type=withdrawal.tipo_cuenta or (bank_account.tipo_cuenta if bank_account else "Cuenta"),
                account_number=withdrawal.numero_cuenta or (bank_account.numero_cuenta if bank_account else "N/A"),
                withdrawal_id=withdrawal.id
            )
    except Exception as em_err:
        logger.warning(f"Aviso al encolar correo de retiro pendiente #{withdrawal.id}: {em_err}")

    return {
        "message": "Retiro solicitado con éxito.", 
        "withdrawal_id": withdrawal.id, 
        "new_balance": float(wallet.balance),
        "yoint": yoint_tracking
    }

def _translate_wallet_text(text: str | None) -> str:
    if not text:
        return ""
    import re
    cleaned = str(text)
    # Remove admin tags & emails
    cleaned = re.sub(r'\(Admin:.*?\)', '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'\s*\([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+\)', '', cleaned)
    cleaned = cleaned.strip()
    if not cleaned:
        return ""

    # Payment methods in descriptions
    cleaned = re.sub(r'\(?BOTON_BANCOLOMBIA\)?', '(Botón Bancolombia)', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'\(?BANCOLOMBIA_QR\)?', '(QR Bancolombia)', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'\(?CREDIT_CARD\)?', '(Tarjeta de Crédito)', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'\(?DEBIT_CARD\)?', '(Tarjeta de Débito)', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'\(?BANK_TRANSFER\)?', '(Transferencia Bancaria)', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'\(?DIRECT_TRANSFER\)?', '(Transferencia Bancaria)', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'\(?CASH\)?', '(Efectivo)', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'\(?WALLET\)?', '(Billetera)', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'\(?NEQUI\)?', '(Nequi)', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'\(?PSE\)?', '(PSE)', cleaned, flags=re.IGNORECASE)

    # Common English phrases
    replacements = [
        (r'\bwallet recharge\b', 'Recarga de billetera'),
        (r'\bwallet topup\b', 'Recarga de billetera'),
        (r'\brecharge online\b', 'Recarga en línea'),
        (r'\brecharge via\b', 'Recarga vía'),
        (r'\bdirect transfer to\b', 'Transferencia enviada a'),
        (r'\bdirect transfer from\b', 'Transferencia recibida de'),
        (r'\btransfer to\b', 'Transferencia a'),
        (r'\btransfer from\b', 'Transferencia de'),
        (r'\byield payout for\b', 'Pago de rendimientos de'),
        (r'\byield payout\b', 'Pago de rendimientos'),
        (r'\bbonus payout for\b', 'Pago de bono de'),
        (r'\bbonus payout\b', 'Pago de bono'),
        (r'\bwithdrawal request\b', 'Solicitud de retiro'),
        (r'\bwithdrawal refund\b', 'Reembolso de retiro'),
        (r'\bwithdrawal rejection\b', 'Devolución por rechazo de retiro'),
        (r'\binvestment reservation\b', 'Reserva de inversión'),
        (r'\bcapital liquidation\b', 'Liquidación de capital'),
        (r'\badmin adjustment\b', 'Ajuste administrativo de saldo'),
        (r'\binsufficient funds\b', 'Fondos insuficientes'),
        (r'\bpending approval\b', 'Pendiente de aprobación'),
        (r'\bapproved by admin\b', 'Aprobado por administración'),
        (r'\brejected by admin\b', 'Rechazado por administración'),
        (r'\border cancelled by user\b', 'Orden cancelada por el usuario'),
        (r'\border canceled by user\b', 'Orden cancelada por el usuario'),
        (r'\btransaction completed\b', 'Transacción completada'),
        (r'\border\b', 'Orden'),
        (r'\bref:\b', 'Ref:'),
        (r'\breference:\b', 'Referencia:'),
        (r'\bbatch\b', 'Lote'),
    ]
    for pattern, repl in replacements:
        cleaned = re.sub(pattern, repl, cleaned, flags=re.IGNORECASE)

    return cleaned


def _translate_payment_method(method: str | None) -> str:
    if not method:
        return "Transferencia Bancaria"
    norm = str(method).strip().upper().replace("-", "_").replace(" ", "_")
    mapping = {
        "BOTON_BANCOLOMBIA": "Botón Bancolombia",
        "BANCOLOMBIA": "Bancolombia",
        "BANCOLOMBIA_QR": "QR Bancolombia",
        "NEQUI": "Nequi",
        "DAVIPLATA": "Daviplata",
        "PSE": "PSE",
        "CREDIT_CARD": "Tarjeta de Crédito",
        "DEBIT_CARD": "Tarjeta de Débito",
        "CARD": "Tarjeta",
        "TARJETA": "Tarjeta",
        "BANK_TRANSFER": "Transferencia Bancaria",
        "TRANSFER": "Transferencia Bancaria",
        "DIRECT_TRANSFER": "Transferencia Bancaria",
        "CASH": "Efectivo",
        "WALLET": "Billetera Gloint",
        "BILLETERA": "Billetera Gloint",
        "YOINT": "Yoint en Línea",
        "GATEWAY": "Pasarela de Pago",
        "MANUAL": "Consignación Directa",
    }
    return mapping.get(norm, str(method).replace("_", " ").title())


def _translate_status(status_val: str | None) -> str:
    if not status_val:
        return "completado"
    norm = str(status_val).lower().strip()
    mapping = {
        "aprobado": "completado",
        "completed": "completado",
        "completado": "completado",
        "procesado": "completado",
        "success": "completado",
        "pending": "pendiente",
        "pendiente": "pendiente",
        "processing": "en_proceso",
        "en_proceso": "en_proceso",
        "in_progress": "en_proceso",
        "rejected": "rechazado",
        "rechazado": "rechazado",
        "cancelled": "cancelado",
        "canceled": "cancelado",
        "cancelado": "cancelado",
        "failed": "fallido",
        "fallido": "fallido",
        "refunded": "reembolsado",
        "reembolsado": "reembolsado",
    }
    return mapping.get(norm, "completado")


def _get_movement_type_display(raw_type: str | None, is_ingreso: bool) -> str:
    if not raw_type:
        return "Ingreso a Billetera" if is_ingreso else "Egreso de Billetera"
    norm = str(raw_type).lower().strip().replace("-", "_").replace(" ", "_")
    mapping = {
        "wallet_recharge": "Recarga de Billetera",
        "wallet_topup": "Recarga de Billetera",
        "wallet_deposit": "Recarga de Billetera",
        "recharge": "Recarga de Billetera",
        "recarga": "Recarga de Billetera",
        "recarga_billetera": "Recarga de Billetera",
        "recarga_en_linea": "Recarga en Línea",
        "transfer_in": "Transferencia Recibida",
        "transfer_received": "Transferencia Recibida",
        "transferencia_recibida": "Transferencia Recibida",
        "transfer_out": "Transferencia Enviada",
        "transfer_sent": "Transferencia Enviada",
        "transferencia_enviada": "Transferencia Enviada",
        "transfer_between_wallets": "Transferencia entre Billeteras",
        "transfer": "Transferencia de Billetera",
        "withdrawal_rejection": "Reembolso de Retiro",
        "withdrawal_refund": "Reembolso de Retiro",
        "reembolso_de_retiro": "Reembolso de Retiro",
        "reembolso_retiro": "Reembolso de Retiro",
        "devolucion_por_rechazo": "Reembolso de Retiro",
        "withdrawal_request": "Solicitud de Retiro",
        "withdrawal": "Solicitud de Retiro",
        "retiro": "Solicitud de Retiro",
        "solicitud_retiro": "Solicitud de Retiro",
        "solicitud_de_retiro": "Solicitud de Retiro",
        "yield_payout_reversal": "Reversión de Rendimientos",
        "yield_payout_reversed": "Rendimientos Revertidos",
        "yield_payout": "Pago de Rendimientos",
        "auto_yield_transfer": "Pago de Rendimientos",
        "generacion_rendimiento": "Pago de Rendimientos",
        "rendimiento_inversion": "Pago de Rendimientos",
        "rendimiento": "Pago de Rendimientos",
        "yield": "Pago de Rendimientos",
        "bonus_payout": "Pago de Bono",
        "auto_bonus_transfer": "Pago de Bono",
        "bono_aceleracion": "Bono de Aceleración",
        "bono": "Pago de Bono",
        "bonus": "Pago de Bono",
        "investment_reservation": "Reserva de Inversión",
        "investment_payment": "Pago de Inversión",
        "reserva_inversion": "Reserva de Inversión",
        "capital_liquidation": "Liquidación de Capital",
        "credit_installment": "Abono a Crédito",
        "shares_purchase": "Compra de Acciones",
        "shares_buy": "Compra de Acciones",
        "shares_sale": "Venta de Acciones",
        "shares_sell": "Venta de Acciones",
        "shares_retention": "Custodia de Acciones",
        "shares_release": "Liberación de Acciones",
        "admin_adjustment": "Ajuste Administrativo de Saldo",
        "cash": "Depósito de Saldo",
        "deposit": "Depósito de Saldo",
        "deposito": "Depósito de Saldo",
        "credit": "Abono a Billetera",
        "debit": "Débito de Billetera",
        "ingreso": "Ingreso a Billetera",
        "egreso": "Egreso de Billetera",
    }
    if norm in mapping:
        return mapping[norm]
    for k, v in mapping.items():
        if k in norm:
            return v
    return "Ingreso a Billetera" if is_ingreso else "Egreso de Billetera"


@router.get("/me/movements")
async def get_my_movements(current_user = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """
    Get the wallet transactions of the current logged-in user.
    """
    from src.models.wallet import Wallet, WalletTransaction
    from src.models.withdrawal import Withdrawal, WithdrawalStatus
    
    # Fetch WalletTransactions
    t_result = await db.execute(
        select(WalletTransaction)
        .join(Wallet)
        .where(Wallet.user_id == current_user.id)
    )
    transactions = t_result.scalars().all()

    # Pre-cargar los retiros del usuario para enriquecer las transacciones con desglose financiero exacto
    w_res = await db.execute(
        select(Withdrawal).where(Withdrawal.user_id == current_user.id)
    )
    user_withdrawals = w_res.scalars().all()
    user_withdrawals_by_id = {w.id: w for w in user_withdrawals}
    
    # Pre-cargar dispersiones Yoint asociadas a los retiros del usuario
    from src.models.yoint_dispersion import YointDispersion
    w_ids = [w.id for w in user_withdrawals]
    dispersions_by_wid = {}
    if w_ids:
        d_res = await db.execute(
            select(YointDispersion).where(YointDispersion.withdrawal_id.in_(w_ids))
        )
        for d in d_res.scalars().all():
            dispersions_by_wid.setdefault(d.withdrawal_id, []).append(d)

    from datetime import datetime
    response = []
    # Retiros ya enlazados por referencia explícita: el emparejamiento por monto no los reutiliza
    claimed_withdrawal_ids = {
        t.reference_id for t in transactions
        if t.reference_type == "withdrawal" and t.reference_id in user_withdrawals_by_id
    }
    
    # Map Transactions
    for t in sorted(transactions, key=lambda x: x.created_at or datetime.min):
        amount = float(t.amount)
        raw_type = (t.type or "").lower().strip().replace("-", "_")
        
        outflow_types = [
            "transfer_out", "transfer sent", "transfer_sent", "transferencia enviada",
            "withdrawal_request", "withdrawal", "retiro", "solicitud_retiro",
            "investment_reservation", "investment_payment", "investment", "reserva_inversion",
            "yield_payout_reversal", "debit", "egreso"
        ]
        
        is_outflow = raw_type in outflow_types or amount < 0
        direction = "out" if is_outflow else "in"
        tipo_str = "egreso" if is_outflow else "ingreso"
            
        # Sanitizar y traducir descripción al español
        desc = _translate_wallet_text(t.description)
        is_admin = current_user.is_superuser or (current_user.permissions and "admin.wallets.manage" in current_user.permissions)
        if not is_admin:
            if not desc or t.type == "admin_adjustment":
                desc = "Ajuste de saldo administrativo autorizado"

        # Valores por defecto para transacciones estándar
        monto_val = abs(amount)
        impuesto_val = 0.0
        monto_neto_val = abs(amount)
        estado_val = "completado" # Transacciones estándar ya efectivas en billetera
        banco_val = None
        tipo_cuenta_val = None
        numero_cuenta_val = None
        metodo_pago_val = None
        fecha_solicitud_val = t.created_at.isoformat() if t.created_at else None
        fecha_aprobacion_val = t.created_at.isoformat() if t.created_at else None
        fecha_procesamiento_val = t.created_at.isoformat() if t.created_at else None
        motivo_rechazo_val = None
        can_cancel_val = False
        has_yoint_val = False

        # Vincular retiro si aplica para obtener el impuesto 3.2%, el neto real y el estado exacto
        linked_w = None
        is_withdrawal_request_tx = raw_type.replace(" ", "_") in ["withdrawal_request", "solicitud_retiro", "retiro", "withdrawal"]
        if t.reference_type == "withdrawal" and t.reference_id in user_withdrawals_by_id:
            linked_w = user_withdrawals_by_id[t.reference_id]
        elif is_withdrawal_request_tx:
            # H-203: sin referencia explícita, se empareja con el retiro de igual monto que ningún otro
            # movimiento haya reclamado y cuya fecha de solicitud esté más cerca del movimiento
            # (antes se tomaba el primero con el mismo monto, que podía ser otro retiro de $5.000)
            tx_day = t.created_at.date() if t.created_at else None
            candidates = [
                w for w in user_withdrawals
                if abs(float(w.monto) - abs(amount)) < 0.01 and w.id not in claimed_withdrawal_ids
            ]
            if candidates:
                if tx_day:
                    candidates.sort(key=lambda w: abs((w.fecha_solicitud - tx_day).days) if w.fecha_solicitud else 9999)
                linked_w = candidates[0]
                claimed_withdrawal_ids.add(linked_w.id)

        if linked_w:
            monto_val = float(linked_w.monto)
            impuesto_val = float(linked_w.impuesto)
            monto_neto_val = float(linked_w.monto_neto) # El valor neto real a recibir en el banco
            raw_w_estado = linked_w.estado.value if hasattr(linked_w.estado, "value") else str(linked_w.estado)
            estado_val = _translate_status(raw_w_estado)
            banco_val = linked_w.banco
            tipo_cuenta_val = linked_w.tipo_cuenta
            numero_cuenta_val = linked_w.numero_cuenta
            metodo_pago_val = _translate_payment_method(linked_w.metodo_pago)
            fecha_solicitud_val = linked_w.fecha_solicitud.isoformat() if linked_w.fecha_solicitud else (t.created_at.isoformat() if t.created_at else None)
            fecha_aprobacion_val = linked_w.fecha_aprobacion.isoformat() if linked_w.fecha_aprobacion else None
            fecha_procesamiento_val = linked_w.fecha_procesamiento.isoformat() if linked_w.fecha_procesamiento else None
            motivo_rechazo_val = _translate_wallet_text(linked_w.motivo_rechazo) if linked_w.motivo_rechazo else None

            w_disps = dispersions_by_wid.get(linked_w.id, [])
            has_yoint_val = any(
                d.status not in ["FAILED", "REJECTED"] or d.order_id for d in w_disps
            ) or bool(linked_w.comprobante_pago and "YOINT" in str(linked_w.comprobante_pago).upper())
            can_cancel_val = (linked_w.estado == WithdrawalStatus.PENDING or str(linked_w.estado).lower() in ["pending", "pendiente"]) and not has_yoint_val
        elif is_withdrawal_request_tx:
            # Retiro sin registro asociado: no se puede afirmar que fue aprobado ni procesado (H-203)
            fecha_aprobacion_val = None
            fecha_procesamiento_val = None
        elif t.reference_type == "yoint_payin" or "yoint" in (t.type or "").lower() or "recharge" in (t.type or "").lower():
            metodo_pago_val = _translate_payment_method("BOTON_BANCOLOMBIA" if "bancolombia" in desc.lower() else "Yoint en Línea")

        tipo_display = _get_movement_type_display(t.type, not is_outflow)

        # H-185: saldo antes del movimiento = saldo después - efecto firmado del movimiento
        # (la tabla guarda balance_after; el efecto se toma de la dirección, no del signo del monto)
        saldo_anterior_val = None
        if t.balance_after is not None:
            signed_effect = -abs(amount) if is_outflow else abs(amount)
            saldo_anterior_val = round(float(t.balance_after) - signed_effect, 2)

        response.append({
            "id": f"t_{t.id}",
            "real_id": linked_w.id if linked_w else None,
            "investor_id": None,
            "user_id": current_user.id,
            "origen": tipo_display,
            "tipo": tipo_str,
            "tipo_display": tipo_display,
            "type": t.type,
            "direction": direction,
            "monto": monto_val,
            "impuesto": impuesto_val,
            "monto_neto": monto_neto_val,
            "fecha_solicitud": fecha_solicitud_val,
            "fecha_retiro": None,
            "estado": estado_val,
            "metodo_pago": metodo_pago_val,
            "banco": banco_val,
            "tipo_cuenta": tipo_cuenta_val,
            "numero_cuenta": numero_cuenta_val,
            "observaciones": desc,
            "motivo_rechazo": motivo_rechazo_val,
            "fecha_aprobacion": fecha_aprobacion_val,
            "fecha_procesamiento": fecha_procesamiento_val,
            "created_at": t.created_at.isoformat() if t.created_at else None,
            "updated_at": t.updated_at.isoformat() if t.updated_at else None,
            "saldo_anterior": saldo_anterior_val,
            "saldo_nuevo": float(t.balance_after) if t.balance_after is not None else None,
            "can_cancel": can_cancel_val,
            "has_yoint_dispersion": has_yoint_val,
            "_sort_date": t.created_at
        })
        
    # Sort descending
    response.sort(key=lambda x: x["_sort_date"].isoformat() if x["_sort_date"] else "", reverse=True)
    
    # Remove sort helper
    for r in response:
        r.pop("_sort_date", None)
        
    return response

@router.get("/me/withdrawals")
async def get_my_withdrawals(current_user = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """
    Get the withdrawals of the current logged-in user.
    """
    from src.models.withdrawal import Withdrawal, WithdrawalStatus
    from src.models.yoint_dispersion import YointDispersion
    
    w_result = await db.execute(
        select(Withdrawal)
        .where(Withdrawal.user_id == current_user.id)
        .order_by(Withdrawal.created_at.desc())
    )
    withdrawals = w_result.scalars().all()
    
    # Pre-cargar dispersiones de Yoint para saber si los retiros tienen dispersión activa
    w_ids = [w.id for w in withdrawals]
    dispersions_by_wid = {}
    if w_ids:
        d_res = await db.execute(
            select(YointDispersion).where(YointDispersion.withdrawal_id.in_(w_ids))
        )
        for d in d_res.scalars().all():
            dispersions_by_wid.setdefault(d.withdrawal_id, []).append(d)

    response = []
    for w in withdrawals:
        if w.metodo_pago and w.metodo_pago.lower() == 'wallet':
            continue
            
        w_disps = dispersions_by_wid.get(w.id, [])
        has_active_yoint = any(
            d.status not in ["FAILED", "REJECTED"] or d.order_id for d in w_disps
        ) or bool(w.comprobante_pago and "YOINT" in str(w.comprobante_pago).upper())
        can_cancel = (w.estado == WithdrawalStatus.PENDING) and not has_active_yoint

        raw_w_estado = w.estado.value if hasattr(w.estado, 'value') else str(w.estado)
        estado_val = _translate_status(raw_w_estado)
        metodo_pago_val = _translate_payment_method(w.metodo_pago)
        tipo_disp = _get_movement_type_display(w.tipo.value if hasattr(w.tipo, 'value') else w.tipo, False)
        observaciones_val = _translate_wallet_text(w.observaciones) if w.observaciones else None
        motivo_rechazo_val = _translate_wallet_text(w.motivo_rechazo) if w.motivo_rechazo else None

        response.append({
            "id": f"w_{w.id}",
            "real_id": w.id,
            "investor_id": w.investor_id,
            "user_id": w.user_id,
            "origen": tipo_disp,
            "tipo": w.tipo.value if hasattr(w.tipo, 'value') else w.tipo,
            "tipo_display": tipo_disp,
            "monto": float(w.monto),
            "impuesto": float(w.impuesto),
            "monto_neto": float(w.monto_neto),
            "fecha_solicitud": w.fecha_solicitud.isoformat() if w.fecha_solicitud else None,
            "fecha_retiro": w.fecha_retiro.isoformat() if w.fecha_retiro else None,
            "estado": estado_val,
            "metodo_pago": metodo_pago_val,
            "banco": w.banco,
            "tipo_cuenta": w.tipo_cuenta,
            "numero_cuenta": w.numero_cuenta,
            "observaciones": observaciones_val,
            "motivo_rechazo": motivo_rechazo_val,
            "fecha_aprobacion": w.fecha_aprobacion.isoformat() if w.fecha_aprobacion else None,
            "fecha_procesamiento": w.fecha_procesamiento.isoformat() if w.fecha_procesamiento else None,
            "created_at": w.created_at.isoformat() if w.created_at else None,
            "updated_at": w.updated_at.isoformat() if w.updated_at else None,
            "can_cancel": can_cancel,
            "has_yoint_dispersion": has_active_yoint,
        })
        
    return response


@router.post("/me/withdrawals/{withdrawal_id}/cancel")
async def cancel_my_withdrawal(
    withdrawal_id: int,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Cancel a pending withdrawal and refund the amount to the user's wallet.
    """
    from src.models.withdrawal import Withdrawal, WithdrawalStatus
    from src.models.wallet import Wallet, WalletTransaction
    from decimal import Decimal
    
    # 1. Fetch Withdrawal
    w_res = await db.execute(select(Withdrawal).where(Withdrawal.id == withdrawal_id, Withdrawal.user_id == current_user.id))
    withdrawal = w_res.scalars().first()
    
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Retiro no encontrado.")
        
    if withdrawal.estado != WithdrawalStatus.PENDING:
        raise HTTPException(status_code=400, detail="Solo se pueden cancelar retiros en estado pendiente.")

    # 1.1 Protección financiera estricta: Bloquear cancelación si la dispersión ya fue enviada a Yoint
    from src.models.yoint_dispersion import YointDispersion
    d_res = await db.execute(
        select(YointDispersion).where(YointDispersion.withdrawal_id == withdrawal.id)
    )
    dispersions = d_res.scalars().all()
    has_active_dispersion = any(
        d.status not in ["FAILED", "REJECTED"] or d.order_id for d in dispersions
    ) or bool(withdrawal.comprobante_pago and "YOINT" in str(withdrawal.comprobante_pago).upper())

    if has_active_dispersion:
        raise HTTPException(
            status_code=400,
            detail="Esta solicitud de retiro ya fue despachada y se encuentra en procesamiento con la pasarela bancaria Yoint. No puede ser cancelada para evitar duplicidad de desembolsos."
        )
        
    # 2. Fetch Wallet
    wallet_res = await db.execute(select(Wallet).where(Wallet.user_id == current_user.id))
    wallet = wallet_res.scalars().first()
    
    if not wallet:
        raise HTTPException(status_code=404, detail="Billetera no encontrada.")
        
    # 3. Process Cancellation
    withdrawal.estado = WithdrawalStatus.CANCELLED
    withdrawal.motivo_rechazo = "Cancelado por el usuario"
    
    # Refund Wallet
    monto_decimal = Decimal(str(withdrawal.monto))
    wallet.balance += monto_decimal
    
    # Create WalletTransaction
    tx = WalletTransaction(
        wallet_id=wallet.id,
        amount=monto_decimal,
        type="withdrawal refund",
        description=f"Reembolso por retiro cancelado #{withdrawal.id}",
        balance_after=wallet.balance,
        reference_type="withdrawal",
        reference_id=withdrawal.id
    )
    db.add(tx)

    # Revertir retención del 3.2% en el libro fiscal corporativo
    try:
        from src.services.company_wallet_service import CompanyWalletService
        await CompanyWalletService.refund_tax_retention(db, withdrawal)
    except Exception as cw_err:
        logger.warning(f"Aviso al revertir retención en libro fiscal para retiro cancelado #{withdrawal.id}: {cw_err}")
    
    try:
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=public_error_detail("No se pudo completar la operación", e))
        
    return {"message": "Retiro cancelado exitosamente.", "new_balance": wallet.balance}


@router.post("/bulk-upload", dependencies=[Depends(RequirePermission("admin.investors.manage"))])
async def bulk_upload_wallets(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    """
    Upload a CSV file and load/update wallets for users in bulk.
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="El archivo debe ser un CSV válido.")
    
    content = await file.read()
    success_count, errors = await bulk_create_or_update_wallets(db, content)
    return {"success_count": success_count, "errors": errors}


@router.post("/transactions/bulk-upload", dependencies=[Depends(RequirePermission("admin.investors.manage"))])
async def bulk_upload_transactions(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    """
    Upload a CSV file and load/update wallet transactions in bulk.
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="El archivo debe ser un CSV válido.")
    
    content = await file.read()
    success_count, errors = await bulk_create_or_update_wallet_transactions(db, content)
    return {"success_count": success_count, "errors": errors}

from src.schemas.wallet import AdminWalletAdjustRequest
@router.post("/admin/wallets/{wallet_id}/adjust", dependencies=[Depends(RequirePermission("admin.investors.wallet_adjust"))])
async def admin_adjust_wallet(
    wallet_id: int, 
    req: AdminWalletAdjustRequest, 
    current_user = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    """
    Adjust a user's wallet balance manually as an admin.
    """
    from src.models.wallet import WalletTransaction
    from decimal import Decimal

    if req.action not in ["add", "subtract", "set"]:
        raise HTTPException(status_code=400, detail="Acción inválida. Use add, subtract, o set.")
        
    if req.amount < 0 or (req.action != "set" and req.amount == 0):
        raise HTTPException(status_code=400, detail="El monto del ajuste debe ser mayor a cero.")

    # FOR UPDATE: el saldo validado no puede cambiar por otra operación antes de guardar el ajuste
    wallet_res = await db.execute(select(Wallet).where(Wallet.id == wallet_id).with_for_update())
    wallet = wallet_res.scalars().first()
    
    if not wallet:
        raise HTTPException(status_code=404, detail="Billetera no encontrada.")

    # H-174: un débito mayor al saldo se rechaza con el saldo disponible, nunca se recorta a 0
    if req.action == "subtract" and req.amount > wallet.balance:
        raise HTTPException(
            status_code=400,
            detail=f"El débito excede el saldo disponible (${float(wallet.balance):,.0f} COP).".replace(",", ".")
        )
        
    old_balance = wallet.balance
    
    if req.action == "add":
        diff = req.amount
        wallet.balance += req.amount
    elif req.action == "subtract":
        diff = -req.amount
        wallet.balance -= req.amount
    elif req.action == "set":
        diff = req.amount - wallet.balance
        wallet.balance = req.amount
        
    if wallet.balance < 0:
        raise HTTPException(status_code=400, detail="El saldo no puede ser negativo.")
        
    tx = WalletTransaction(
        wallet_id=wallet.id,
        amount=diff,
        type="admin_adjustment",
        description=req.description.strip() if req.description else "Ajuste administrativo de saldo autorizado",
        reference_type="admin",
        reference_id=current_user.id,
        balance_after=wallet.balance
    )
    db.add(tx)

    # Si fue un débito (diff < 0), creamos automáticamente un registro de Retiro Aprobado
    if diff < 0:
        from src.models.withdrawal import Withdrawal, WithdrawalStatus, WithdrawalType
        from src.models.user_bank_account import UserBankAccount
        from src.models.investor import Investor
        from datetime import date, datetime

        monto_abs = abs(Decimal(str(diff)))
        impuesto = (monto_abs * Decimal("0.032")).quantize(Decimal("0.01"))
        monto_neto = monto_abs - impuesto

        investor_res = await db.execute(select(Investor).where(Investor.user_id == wallet.user_id))
        investor = investor_res.scalars().first()
        investor_id = investor.id if investor else None

        bank_res = await db.execute(select(UserBankAccount).where(UserBankAccount.user_id == wallet.user_id, UserBankAccount.is_active == True))
        bank_account = bank_res.scalars().first()

        withdrawal = Withdrawal(
            investor_id=investor_id,
            user_id=wallet.user_id,
            origen="wallet",
            tipo=WithdrawalType.RENDIMIENTO,
            monto=monto_abs,
            impuesto=impuesto,
            monto_neto=monto_neto,
            fecha_solicitud=date.today(),
            fecha_retiro=date.today(),
            estado=WithdrawalStatus.APPROVED,
            metodo_pago="Ajuste Admin Wallet",
            banco=bank_account.banco if bank_account else None,
            tipo_cuenta=bank_account.tipo_cuenta if bank_account else None,
            numero_cuenta=bank_account.numero_cuenta if bank_account else None,
            observaciones=f"{req.description} (Ajuste por admin: {current_user.name})",
            aprobado_por=current_user.id,
            fecha_aprobacion=datetime.utcnow(),
            procesado_por=current_user.id,
            fecha_procesamiento=datetime.utcnow()
        )
        db.add(withdrawal)
        await db.flush()


        tx.reference_type = "withdrawal"
        tx.reference_id = withdrawal.id
    
    try:
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=public_error_detail("Error al ajustar billetera", e))
        
    return {"message": "Saldo ajustado correctamente.", "new_balance": wallet.balance}


class VerifyRecipientRequest(BaseModel):
    identifier: str

class WalletTransferRequest(BaseModel):
    identifier: str
    monto: float
    notes: Optional[str] = None

@router.post("/transfer/verify-recipient")
async def verify_transfer_recipient(
    req: VerifyRecipientRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Valida la existencia del destinatario por cédula (document_id) o correo (email).
    Sin listas ni autocompletado para proteger la privacidad.
    """
    identifier = req.identifier.strip()
    if not identifier:
        raise HTTPException(status_code=400, detail="Debe ingresar el número de cédula o correo electrónico.")

    from src.models.user import User
    from sqlalchemy import or_, func

    stmt = select(User).where(
        User.is_active == True,
        or_(
            User.document_id == identifier,
            func.lower(User.email) == identifier.lower()
        )
    )
    res = await db.execute(stmt)
    recipient = res.scalars().first()

    if not recipient:
        raise HTTPException(
            status_code=404, 
            detail="No se encontró ningún usuario activo con el número de cédula o correo electrónico ingresado."
        )

    if recipient.id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="No puedes realizar transferencias a tu propia billetera."
        )

    doc = recipient.document_id or ""
    masked_doc = f"CC ***{doc[-4:]}" if len(doc) >= 4 else doc

    return {
        "recipient_id": recipient.id,
        "name": recipient.name,
        "email": recipient.email,
        "document_id": recipient.document_id,
        "masked_document": masked_doc
    }

@router.post("/transfer")
async def transfer_wallet_funds(
    req: WalletTransferRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Ejecuta la transferencia de fondos entre billeteras con trazabilidad completa en wallet_transactions.
    """
    from decimal import Decimal
    from src.models.wallet import WalletTransaction
    
    identifier = req.identifier.strip()
    amount = Decimal(str(req.monto))

    if amount <= 0:
        raise HTTPException(status_code=400, detail="El monto a transferir debe ser mayor a cero.")

    from src.models.user import User
    from sqlalchemy import or_, func

    stmt = select(User).where(
        User.is_active == True,
        or_(
            User.document_id == identifier,
            func.lower(User.email) == identifier.lower()
        )
    )
    res = await db.execute(stmt)
    recipient = res.scalars().first()

    if not recipient:
        raise HTTPException(
            status_code=404,
            detail="No se encontró ningún usuario activo con el número de cédula o correo electrónico ingresado."
        )

    if recipient.id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="No puedes realizar transferencias a tu propia billetera."
        )

    # Obtener billetera del emisor
    sender_wallet_res = await db.execute(select(Wallet).where(Wallet.user_id == current_user.id))
    sender_wallet = sender_wallet_res.scalars().first()

    if not sender_wallet or Decimal(str(sender_wallet.balance)) < amount:
        raise HTTPException(
            status_code=400,
            detail=f"Saldo insuficiente en tu billetera. Disponibles: ${float(sender_wallet.balance if sender_wallet else 0):,.0f} COP"
        )

    # Obtener o crear billetera del receptor
    recipient_wallet_res = await db.execute(select(Wallet).where(Wallet.user_id == recipient.id))
    recipient_wallet = recipient_wallet_res.scalars().first()

    if not recipient_wallet:
        recipient_wallet = Wallet(
            user_id=recipient.id,
            balance=Decimal("0.00"),
            currency="COP"
        )
        db.add(recipient_wallet)
        await db.flush()

    # Débito emisor
    sender_wallet.balance = Decimal(str(sender_wallet.balance)) - amount
    sender_tx = WalletTransaction(
        wallet_id=sender_wallet.id,
        amount=-amount,
        type="transfer_out",
        reference_type="wallet_transfer",
        reference_id=recipient_wallet.id,
        description=f"Transferencia enviada a {recipient.name}",
        balance_after=sender_wallet.balance
    )
    db.add(sender_tx)

    # Crédito receptor
    recipient_wallet.balance = Decimal(str(recipient_wallet.balance)) + amount
    recipient_tx = WalletTransaction(
        wallet_id=recipient_wallet.id,
        amount=amount,
        type="transfer_in",
        reference_type="wallet_transfer",
        reference_id=sender_wallet.id,
        description=f"Transferencia recibida de {current_user.name}",
        balance_after=recipient_wallet.balance
    )
    db.add(recipient_tx)

    await db.commit()

    # Notificaciones in-app y push
    try:
        from src.services.push_notification_service import PushNotificationService
        formatted_monto = f"${float(amount):,.0f} COP"
        
        # Notificar al receptor
        await PushNotificationService.create_and_send_notification(
            db=db,
            user_id=recipient.id,
            title="¡Transferencia Recibida!",
            message=f"Has recibido {formatted_monto} de {current_user.name} en tu billetera.",
            type="billetera",
            link="/dashboard/wallets"
        )
        
        # Notificar al emisor
        await PushNotificationService.create_and_send_notification(
            db=db,
            user_id=current_user.id,
            title="Transferencia Exitosa",
            message=f"Has enviado {formatted_monto} a {recipient.name} correctamente.",
            type="billetera",
            link="/dashboard/wallets"
        )
    except Exception as err:
        print(f"Warning sending transfer notifications: {err}")

    return {
        "message": "Transferencia realizada con éxito.",
        "amount": float(amount),
        "recipient_name": recipient.name,
        "new_balance": float(sender_wallet.balance)
    }


# ==========================================================
# GESTIÓN DE RECARGAS DE BILLETERA (INVESTOR & ADMIN)
# ==========================================================

class RejectRechargeRequest(BaseModel):
    reason: Optional[str] = None
    rejection_reason: Optional[str] = None

    @model_validator(mode='before')
    @classmethod
    def populate_reason(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if not data.get('reason') and data.get('rejection_reason'):
                data['reason'] = data['rejection_reason']
        return data

    @field_validator('reason')
    @classmethod
    def validate_reason(cls, v: Optional[str]) -> str:
        clean = (v or "").strip()
        if len(clean) < 10:
            raise ValueError("El motivo de rechazo debe contener al menos 10 caracteres explicativos.")
        # Prevenir cadenas de texto basura repetitivo (ej: asdf, sss, 1111)
        if len(set(clean.lower().replace(" ", ""))) < 4:
            raise ValueError("Por favor ingrese un motivo de rechazo válido y descriptivo para el usuario.")
        return clean

class ApproveRechargeRequest(BaseModel):
    admin_notes: Optional[str] = None

@router.post("/me/recharge")
async def create_wallet_recharge(
    amount: float = Form(..., description="Monto a recargar en COP"),
    payment_method: str = Form("Transferencia Bancaria"),
    reference_number: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    receipt: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Permite al inversionista solicitar una recarga de saldo adjuntando su comprobante bancario.
    """
    import os
    import uuid
    import shutil
    from datetime import datetime
    from decimal import Decimal
    from src.models.wallet_recharge import WalletRecharge
    from src.models.wallet import Wallet

    if amount < 5000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El monto mínimo de recarga es de $5.000 COP."
        )

    # H-190: extensión, tamaño y contenido real del comprobante
    from src.core.uploads import validate_receipt_upload
    receipt_bytes = await receipt.read()
    ext = validate_receipt_upload(receipt.filename, receipt_bytes)

    # Verificar o crear la billetera del usuario
    w_res = await db.execute(select(Wallet).where(Wallet.user_id == current_user.id))
    wallet = w_res.scalars().first()
    if not wallet:
        wallet = Wallet(user_id=current_user.id, balance=Decimal("0.00"), currency="COP")
        db.add(wallet)
        await db.flush()

    # Guardar archivo seguro en uploads/comprobantes
    upload_dir = "uploads/comprobantes"
    os.makedirs(upload_dir, exist_ok=True)
    unique_filename = f"recarga_{current_user.id}_{int(datetime.utcnow().timestamp())}_{uuid.uuid4().hex[:8]}{ext}"
    dest_path = os.path.join(upload_dir, unique_filename)

    with open(dest_path, "wb") as buffer:
        buffer.write(receipt_bytes)

    receipt_url = f"/uploads/comprobantes/{unique_filename}"

    recharge = WalletRecharge(
        user_id=current_user.id,
        wallet_id=wallet.id,
        amount=Decimal(str(amount)),
        status="pending",
        payment_method=payment_method.strip(),
        reference_number=reference_number.strip() if reference_number else None,
        receipt_url=receipt_url,
        user_notes=notes.strip() if notes else None
    )
    db.add(recharge)
    await db.commit()
    await db.refresh(recharge)

    return {
        "message": "Solicitud de recarga enviada con éxito. El saldo será acreditado una vez validado el comprobante bancario.",
        "recharge": {
            "id": recharge.id,
            "amount": float(recharge.amount),
            "status": recharge.status,
            "payment_method": recharge.payment_method,
            "reference_number": recharge.reference_number,
            "receipt_url": recharge.receipt_url,
            "created_at": recharge.created_at.isoformat() if recharge.created_at else None
        }
    }


@router.get("/me/recharges")
async def get_my_recharges(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene el historial de solicitudes de recarga del inversionista autenticado.
    """
    from src.models.wallet_recharge import WalletRecharge
    from src.models.yoint_payin import YointPayin
    from src.models.wallet import Wallet, WalletTransaction
    from datetime import datetime
    from sqlalchemy import or_

    stmt = (
        select(WalletRecharge)
        .where(WalletRecharge.user_id == current_user.id)
        .order_by(WalletRecharge.created_at.desc())
    )
    res = await db.execute(stmt)
    recharges = res.scalars().all()

    # Auto-conciliación en tiempo real: Si una recarga está pendiente pero ya se acreditó o procesó en Yoint, marcarla como approved
    has_healed = False
    for r in recharges:
        if r.status == "pending":
            # 1. Buscar si tiene YointPayin exitoso asociado
            p_res = await db.execute(
                select(YointPayin).where(
                    YointPayin.wallet_recharge_id == r.id,
                    YointPayin.status == "SUCCESS"
                )
            )
            payin = p_res.scalars().first()

            # 2. Buscar por coincidencia de reference_number
            if not payin and r.reference_number and r.reference_number != "EN_PROCESO_YOINT":
                p_res2 = await db.execute(
                    select(YointPayin).where(
                        YointPayin.user_id == current_user.id,
                        YointPayin.status == "SUCCESS",
                        or_(
                            YointPayin.order_id == r.reference_number,
                            YointPayin.payment_reference == r.reference_number
                        )
                    )
                )
                payin = p_res2.scalars().first()

            # 3. Buscar si ya existe una transacción de ingreso de recarga para ese monto en la billetera
            linked_tx = None
            if not payin:
                tx_res = await db.execute(
                    select(WalletTransaction)
                    .join(Wallet, WalletTransaction.wallet_id == Wallet.id)
                    .where(
                        Wallet.user_id == current_user.id,
                        WalletTransaction.amount == r.amount,
                        WalletTransaction.type.in_(["wallet_recharge", "recharge", "recarga"]),
                        WalletTransaction.created_at >= r.created_at
                    )
                )
                linked_tx = tx_res.scalars().first()

            if payin or linked_tx:
                r.status = "approved"
                r.reviewed_at = (payin.updated_at if payin else (linked_tx.created_at if linked_tx else None)) or datetime.utcnow()
                r.admin_notes = f"Aprobada y sincronizada automáticamente con la pasarela Yoint ({payin.order_id if payin else 'Saldo acreditado'})"
                if payin and payin.order_id:
                    r.reference_number = payin.order_id
                db.add(r)
                has_healed = True

    if has_healed:
        try:
            await db.commit()
        except Exception as heal_err:
            await db.rollback()
            logger.warning(f"Aviso al auto-conciliar recargas en get_my_recharges: {heal_err}")

    return [
        {
            "id": r.id,
            "amount": float(r.amount),
            "status": r.status,
            "payment_method": r.payment_method,
            "reference_number": r.reference_number,
            "receipt_url": r.receipt_url,
            "user_notes": r.user_notes,
            "admin_notes": r.admin_notes,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "reviewed_at": r.reviewed_at.isoformat() if r.reviewed_at else None
        }
        for r in recharges
    ]


@router.post("/me/recharges/{recharge_id}/cancel")
async def cancel_my_recharge(
    recharge_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Permite al inversionista cancelar una solicitud de recarga que aún esté pendiente.
    """
    from src.models.wallet_recharge import WalletRecharge

    stmt = select(WalletRecharge).where(
        WalletRecharge.id == recharge_id,
        WalletRecharge.user_id == current_user.id
    )
    res = await db.execute(stmt)
    recharge = res.scalars().first()

    if not recharge:
        raise HTTPException(status_code=404, detail="Solicitud de recarga no encontrada.")

    if recharge.status != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Solo se pueden cancelar recargas en estado pendiente (estado actual: {recharge.status})."
        )

    recharge.status = "cancelled"
    recharge.admin_notes = "Cancelada por el usuario"
    await db.commit()

    return {"message": "Solicitud de recarga cancelada exitosamente."}


@router.get("/admin/recharges", dependencies=[Depends(RequirePermission(["admin.payments.manage", "admin.investors.manage", "admin.users.manage"]))])
@router.get("/recharges/admin", dependencies=[Depends(RequirePermission(["admin.payments.manage", "admin.investors.manage", "admin.users.manage"]))])
async def get_all_recharges_admin(
    status_filter: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Lista las solicitudes de recargas para el administrador con filtros y datos de usuario.
    """
    from sqlalchemy.orm import selectinload
    from src.models.wallet_recharge import WalletRecharge
    from src.models.yoint_payin import YointPayin
    from src.models.wallet import WalletTransaction
    from datetime import datetime
    from sqlalchemy import or_, and_

    # Auto-conciliación de recargas en pending antes de listar
    try:
        pending_recharges_q = select(WalletRecharge).where(WalletRecharge.status == "pending")
        res_pending = await db.execute(pending_recharges_q)
        pending_to_heal = res_pending.scalars().all()
        has_admin_healed = False

        for pr in pending_to_heal:
            # 1. Buscar payin SUCCESS coincidente
            p_res = await db.execute(
                select(YointPayin).where(
                    or_(
                        YointPayin.wallet_recharge_id == pr.id,
                        and_(
                            YointPayin.user_id == pr.user_id,
                            YointPayin.status == "SUCCESS",
                            or_(
                                YointPayin.order_id == pr.reference_number,
                                YointPayin.payment_reference == pr.reference_number,
                                and_(
                                    YointPayin.amount == pr.amount,
                                    YointPayin.payin_type == "WALLET_TOPUP"
                                )
                            )
                        )
                    )
                ).order_by(YointPayin.id.desc())
            )
            matched_payin = p_res.scalars().first()
            if matched_payin and matched_payin.status == "SUCCESS":
                pr.status = "approved"
                pr.reviewed_at = matched_payin.updated_at or datetime.utcnow()
                pr.reference_number = matched_payin.order_id or matched_payin.payment_reference or pr.reference_number
                pr.admin_notes = f"Aprobada automáticamente por pasarela Yoint ({matched_payin.order_id or matched_payin.payment_reference})"
                if not matched_payin.wallet_recharge_id:
                    matched_payin.wallet_recharge_id = pr.id
                    db.add(matched_payin)
                db.add(pr)
                has_admin_healed = True
                continue

            # 2. Buscar si ya existe transacción de saldo
            tx_res = await db.execute(
                select(WalletTransaction).where(
                    WalletTransaction.wallet_id == pr.wallet_id,
                    WalletTransaction.amount == pr.amount,
                    WalletTransaction.type.in_(["wallet_recharge", "recarga", "recharge"]),
                    WalletTransaction.created_at >= pr.created_at
                )
            )
            matched_tx = tx_res.scalars().first()
            if matched_tx:
                pr.status = "approved"
                pr.reviewed_at = matched_tx.created_at or datetime.utcnow()
                pr.admin_notes = "Aprobada automáticamente (Saldo acreditado en billetera)"
                db.add(pr)
                has_admin_healed = True

        if has_admin_healed:
            await db.commit()
    except Exception as heal_err:
        await db.rollback()
        logger.warning(f"Aviso al auto-conciliar en get_admin_recharges: {heal_err}")

    stmt = (
        select(WalletRecharge)
        .options(
            selectinload(WalletRecharge.user),
            selectinload(WalletRecharge.reviewer)
        )
        .order_by(WalletRecharge.created_at.desc())
    )

    active_status = status_filter or status
    if active_status and active_status.lower() != "todos" and active_status.lower() != "all":
        stmt = stmt.where(WalletRecharge.status == active_status.lower().strip())

    res = await db.execute(stmt)
    recharges = res.scalars().all()

    output = []
    search_term = (search or "").lower().strip()

    for r in recharges:
        user_name = r.user.name if r.user else "Usuario Desconocido"
        user_email = r.user.email if r.user else ""
        user_doc = r.user.document_id if r.user else ""
        reviewer_name = r.reviewer.name if r.reviewer else None

        if search_term:
            matches_search = (
                search_term in user_name.lower() or
                search_term in user_email.lower() or
                search_term in str(user_doc).lower() or
                search_term in str(r.reference_number or "").lower() or
                search_term in str(r.id)
            )
            if not matches_search:
                continue

        output.append({
            "id": r.id,
            "user_id": r.user_id,
            "user_name": user_name,
            "user_email": user_email,
            "user_document": user_doc,
            "amount": float(r.amount),
            "status": r.status,
            "payment_method": r.payment_method,
            "reference_number": r.reference_number,
            "receipt_url": r.receipt_url,
            "user_notes": r.user_notes,
            "admin_notes": r.admin_notes,
            "reviewed_by": r.reviewed_by,
            "reviewer_name": reviewer_name,
            "reviewed_at": r.reviewed_at.isoformat() if r.reviewed_at else None,
            "created_at": r.created_at.isoformat() if r.created_at else None
        })

    return output


@router.post("/admin/recharges/{recharge_id}/approve", dependencies=[Depends(RequirePermission(["admin.payments.manage", "admin.investors.manage", "admin.users.manage"]))])
@router.post("/recharges/{recharge_id}/approve", dependencies=[Depends(RequirePermission(["admin.payments.manage", "admin.investors.manage", "admin.users.manage"]))])
async def approve_wallet_recharge_admin(
    recharge_id: int,
    payload: Optional[ApproveRechargeRequest] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Aprueba una solicitud de recarga de billetera, acredita el saldo y registra la transacción de ingreso.
    """
    from datetime import datetime
    from decimal import Decimal
    from src.models.wallet_recharge import WalletRecharge
    from src.models.wallet import Wallet, WalletTransaction
    from src.services.push_notification_service import PushNotificationService

    stmt = select(WalletRecharge).where(WalletRecharge.id == recharge_id)
    res = await db.execute(stmt)
    recharge = res.scalars().first()

    if not recharge:
        raise HTTPException(status_code=404, detail="Solicitud de recarga no encontrada.")

    if recharge.status != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Solo se pueden procesar recargas en estado pendiente. Estado actual: {recharge.status}."
        )

    # Cargar billetera del usuario
    w_res = await db.execute(select(Wallet).where(Wallet.id == recharge.wallet_id))
    wallet = w_res.scalars().first()
    if not wallet:
        w_res2 = await db.execute(select(Wallet).where(Wallet.user_id == recharge.user_id))
        wallet = w_res2.scalars().first()

    if not wallet:
        wallet = Wallet(user_id=recharge.user_id, balance=Decimal("0.00"), currency="COP")
        db.add(wallet)
        await db.flush()

    # Acreditar saldo en la billetera protegiendo contra duplicidad si Yoint ya la acreditó
    recharge_amount = Decimal(str(recharge.amount))
    
    chk_existing_tx = await db.execute(
        select(WalletTransaction).where(
            WalletTransaction.wallet_id == wallet.id,
            WalletTransaction.amount == recharge_amount,
            or_(
                and_(
                    WalletTransaction.reference_type == "wallet_recharge",
                    WalletTransaction.reference_id == recharge.id
                ),
                and_(
                    WalletTransaction.type.in_(["wallet_recharge", "recarga", "recharge"]),
                    WalletTransaction.created_at >= recharge.created_at
                )
            )
        )
    )
    existing_tx = chk_existing_tx.scalars().first()

    if not existing_tx:
        wallet.balance = Decimal(str(wallet.balance)) + recharge_amount

        # Crear la transacción de ingreso en wallet_transactions
        notes_detail = f" - {payload.admin_notes.strip()}" if payload and payload.admin_notes else ""
        tx = WalletTransaction(
            wallet_id=wallet.id,
            amount=recharge_amount,
            type="wallet_recharge",
            reference_type="wallet_recharge",
            reference_id=recharge.id,
            description=f"Recarga de saldo aprobada ({recharge.payment_method}){notes_detail}",
            balance_after=wallet.balance
        )
        db.add(tx)
    else:
        logger.info(f"Saldo ya acreditado previamente en transacción #{existing_tx.id} para recarga #{recharge.id}, no se duplica saldo.")

    # Actualizar estado de la recarga
    recharge.status = "approved"
    recharge.reviewed_by = current_user.id
    recharge.reviewed_at = datetime.utcnow()
    if payload and payload.admin_notes:
        recharge.admin_notes = payload.admin_notes.strip()

    await db.commit()

    # Notificar al inversionista
    try:
        formatted_monto = f"${float(recharge_amount):,.0f} COP"
        await PushNotificationService.create_and_send_notification(
            db=db,
            user_id=recharge.user_id,
            title="¡Recarga de Saldo Aprobada!",
            message=f"Tu recarga por {formatted_monto} ha sido aprobada y acreditada en tu billetera.",
            type="billetera",
            link="/dashboard/wallet"
        )
    except Exception as err:
        print(f"Warning sending recharge approval notification: {err}")

    # Enviar correo corporativo de recarga aprobada
    try:
        from src.models.user import User
        u_res = await db.execute(select(User).where(User.id == recharge.user_id))
        u_obj = u_res.scalars().first()
        if u_obj and u_obj.email:
            from src.services.email_service import EmailService
            EmailService.send_wallet_recharge_confirmed_email(
                to_email=u_obj.email,
                user_name=u_obj.name or "Inversionista",
                amount=float(recharge_amount),
                new_balance=float(wallet.balance),
                payment_method=recharge.payment_method or "Consignación / Transferencia",
                reference_id=recharge.reference_number or f"REC-{recharge.id}"
            )
    except Exception as mail_err:
        print(f"Warning sending recharge approval email: {mail_err}")

    return {
        "message": "Recarga aprobada exitosamente y saldo acreditado en la billetera.",
        "new_balance": float(wallet.balance)
    }


@router.post("/admin/recharges/{recharge_id}/reject", dependencies=[Depends(RequirePermission(["admin.payments.manage", "admin.investors.manage", "admin.users.manage"]))])
@router.post("/recharges/{recharge_id}/reject", dependencies=[Depends(RequirePermission(["admin.payments.manage", "admin.investors.manage", "admin.users.manage"]))])
async def reject_wallet_recharge_admin(
    recharge_id: int,
    payload: RejectRechargeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Rechaza una solicitud de recarga de billetera ingresando motivo de rechazo obligatorio.
    """
    from datetime import datetime
    from decimal import Decimal
    from src.models.wallet_recharge import WalletRecharge
    from src.services.push_notification_service import PushNotificationService

    if not payload.reason or len(payload.reason.strip()) < 3:
        raise HTTPException(
            status_code=400,
            detail="Es obligatorio indicar el motivo del rechazo."
        )

    stmt = select(WalletRecharge).where(WalletRecharge.id == recharge_id)
    res = await db.execute(stmt)
    recharge = res.scalars().first()

    if not recharge:
        raise HTTPException(status_code=404, detail="Solicitud de recarga no encontrada.")

    if recharge.status != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Solo se pueden procesar recargas en estado pendiente. Estado actual: {recharge.status}."
        )

    recharge.status = "rejected"
    recharge.reviewed_by = current_user.id
    recharge.reviewed_at = datetime.utcnow()
    recharge.admin_notes = payload.reason.strip()

    await db.commit()

    # Notificar al inversionista
    try:
        formatted_monto = f"${float(recharge.amount):,.0f} COP"
        await PushNotificationService.create_and_send_notification(
            db=db,
            user_id=recharge.user_id,
            title="Recarga Rechazada",
            message=f"Tu solicitud de recarga por {formatted_monto} fue rechazada: {payload.reason.strip()}",
            type="billetera",
            link="/dashboard/wallet"
        )
    except Exception as err:
        print(f"Warning sending recharge rejection notification: {err}")

    return {"message": "Solicitud de recarga rechazada."}

