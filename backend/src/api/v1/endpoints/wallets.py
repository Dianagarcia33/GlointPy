from fastapi import APIRouter, Depends, status, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.api.deps import RequirePermission, get_current_user
from src.services.wallet_service import bulk_create_or_update_wallets, bulk_create_or_update_wallet_transactions
from sqlalchemy.future import select
from src.models.wallet import Wallet

router = APIRouter()

@router.get("/me/balance")
async def get_my_balance(current_user = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """
    Get the wallet balance of the current logged-in user.
    """
    result = await db.execute(select(Wallet).where(Wallet.user_id == current_user.id))
    wallet = result.scalars().first()
    
    from src.models.user_bank_account import UserBankAccount
    bank_result = await db.execute(select(UserBankAccount).where(UserBankAccount.user_id == current_user.id, UserBankAccount.is_active == True))
    bank_account = bank_result.scalars().first()
    
    bank_details = None
    if bank_account:
        bank_details = {
            "banco": bank_account.banco,
            "tipo_cuenta": bank_account.tipo_cuenta,
            "numero_cuenta": bank_account.numero_cuenta
        }
    
    if not wallet:
        return {"balance": 0, "currency": "COP", "bank_details": bank_details, "can_withdraw": True}
        
    return {"balance": wallet.balance, "currency": wallet.currency, "bank_details": bank_details, "can_withdraw": True}

from pydantic import BaseModel
class WalletWithdrawRequest(BaseModel):
    monto: float
    code: str

class SendCodeRequest(BaseModel):
    monto: float

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
        used=False
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

    # 0. Verify Code
    code_res = await db.execute(
        select(WithdrawalVerificationCode)
        .where(
            WithdrawalVerificationCode.user_id == current_user.id,
            WithdrawalVerificationCode.code == req.code,
            WithdrawalVerificationCode.used == False,
            WithdrawalVerificationCode.expires_at > datetime.utcnow()
        )
        .order_by(WithdrawalVerificationCode.created_at.desc())
    )
    verification = code_res.scalars().first()
    
    if not verification:
        raise HTTPException(status_code=400, detail="Código de verificación incorrecto o expirado.")

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
    
    # Mark code as used
    verification.used = True
    
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
        origen = t.type
            
        response.append({
            "id": f"t_{t.id}",
            "investor_id": None,
            "user_id": current_user.id,
            "origen": origen,
            "tipo": t.type,
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
            "observaciones": t.description,
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
