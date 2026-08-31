from fastapi import APIRouter, Depends, status, UploadFile, File, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.api.deps import RequirePermission, get_current_user
from src.services.wallet_service import bulk_create_or_update_wallets, bulk_create_or_update_wallet_transactions
from sqlalchemy.future import select
from src.models.wallet import Wallet
from src.models.user import User

router = APIRouter()

from src.models.system_event import SystemEvent
from src.services.system_event_service import SystemEventService
from typing import Optional, Tuple

async def check_withdrawal_dates_active(db: AsyncSession) -> Tuple[bool, Optional[str]]:
    from sqlalchemy import func
    withdrawal_types = ["withdrawal", "withdrawals", "retiro", "retiros", "fechas_retiro"]
    
    events_res = await db.execute(
        select(SystemEvent).where(func.lower(SystemEvent.type).in_(withdrawal_types))
    )
    all_withdrawal_events = events_res.scalars().all()
    
    if not all_withdrawal_events:
        return True, None

    for evt_type in withdrawal_types:
        if await SystemEventService.is_event_active(db, evt_type):
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
        raise HTTPException(status_code=500, detail=f"Error al generar el código: {str(e)}")

    # 5. Send Email
    email_sent = EmailService.send_withdrawal_verification_code(current_user.email, code)
    if not email_sent:
        # We don't necessarily fail the request if it's mock, but in production we'd want to know
        pass
        
    return {"message": "Código enviado a tu correo electrónico."}


@router.post("/me/withdraw")
async def request_withdrawal(
    req: WalletWithdrawRequest,
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

    try:
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
        
    return {"message": "Retiro solicitado con éxito.", "withdrawal_id": withdrawal.id, "new_balance": wallet.balance}

@router.get("/me/movements")
async def get_my_movements(current_user = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """
    Get the wallet transactions of the current logged-in user.
    """
    from src.models.wallet import Wallet, WalletTransaction
    
    # Fetch WalletTransactions
    t_result = await db.execute(
        select(WalletTransaction)
        .join(Wallet)
        .where(Wallet.user_id == current_user.id)
    )
    transactions = t_result.scalars().all()
    
    response = []
    
    # Map Transactions
    for t in transactions:
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
            
        # Sanitizar descripción para proteger privacidad de administradores y contrapartes
        desc = t.description or ""
        is_admin = current_user.is_superuser or (current_user.permissions and "admin.wallets.manage" in current_user.permissions)
        if not is_admin:
            import re
            desc = re.sub(r'\(Admin:.*?\)', '', desc).strip()
            if not desc or t.type == "admin_adjustment":
                desc = "Ajuste de saldo administrativo autorizado"
            desc = re.sub(r'\s*\([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+\)', '', desc)

        response.append({
            "id": f"t_{t.id}",
            "investor_id": None,
            "user_id": current_user.id,
            "origen": t.type,
            "tipo": tipo_str,
            "type": t.type,
            "direction": direction,
            "monto": abs(amount),
            "impuesto": 0,
            "monto_neto": abs(amount),
            "fecha_solicitud": t.created_at.isoformat() if t.created_at else None,
            "fecha_retiro": None,
            "estado": "procesado", # Wallet transactions are typically immediately processed
            "metodo_pago": None,
            "banco": None,
            "tipo_cuenta": None,
            "numero_cuenta": None,
            "observaciones": desc,
            "motivo_rechazo": None,
            "fecha_aprobacion": t.created_at.isoformat() if t.created_at else None,
            "fecha_procesamiento": t.created_at.isoformat() if t.created_at else None,
            "created_at": t.created_at.isoformat() if t.created_at else None,
            "updated_at": t.updated_at.isoformat() if t.updated_at else None,
            "saldo_anterior": None,
            "saldo_nuevo": float(t.balance_after),
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
    from src.models.withdrawal import Withdrawal
    
    w_result = await db.execute(
        select(Withdrawal)
        .where(Withdrawal.user_id == current_user.id)
        .order_by(Withdrawal.created_at.desc())
    )
    withdrawals = w_result.scalars().all()
    
    response = []
    for w in withdrawals:
        if w.metodo_pago and w.metodo_pago.lower() == 'wallet':
            continue
            
        response.append({
            "id": f"w_{w.id}",
            "real_id": w.id,
            "investor_id": w.investor_id,
            "user_id": w.user_id,
            "origen": w.origen,
            "tipo": w.tipo.value if hasattr(w.tipo, 'value') else w.tipo,
            "monto": float(w.monto),
            "impuesto": float(w.impuesto),
            "monto_neto": float(w.monto_neto),
            "fecha_solicitud": w.fecha_solicitud.isoformat() if w.fecha_solicitud else None,
            "fecha_retiro": w.fecha_retiro.isoformat() if w.fecha_retiro else None,
            "estado": w.estado.value if hasattr(w.estado, 'value') else w.estado,
            "metodo_pago": w.metodo_pago,
            "banco": w.banco,
            "tipo_cuenta": w.tipo_cuenta,
            "numero_cuenta": w.numero_cuenta,
            "observaciones": w.observaciones,
            "motivo_rechazo": w.motivo_rechazo,
            "fecha_aprobacion": w.fecha_aprobacion.isoformat() if w.fecha_aprobacion else None,
            "fecha_procesamiento": w.fecha_procesamiento.isoformat() if w.fecha_procesamiento else None,
            "created_at": w.created_at.isoformat() if w.created_at else None,
            "updated_at": w.updated_at.isoformat() if w.updated_at else None,
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
    
    try:
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
        
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
        
    wallet_res = await db.execute(select(Wallet).where(Wallet.id == wallet_id))
    wallet = wallet_res.scalars().first()
    
    if not wallet:
        raise HTTPException(status_code=404, detail="Billetera no encontrada.")
        
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
        raise HTTPException(status_code=500, detail=f"Error al ajustar billetera: {str(e)}")
        
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

