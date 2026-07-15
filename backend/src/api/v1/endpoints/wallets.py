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
    
    if not wallet:
        return {"balance": 0, "currency": "COP"}
        
    return {"balance": wallet.balance, "currency": wallet.currency}

@router.get("/me/movements")
async def get_my_movements(current_user = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """
    Get the wallet movements (withdrawals and deposits) of the current logged-in user.
    Combines WalletTransactions (incomes) and Withdrawals (cashouts).
    """
    from src.models.withdrawal import Withdrawal
    from src.models.wallet import Wallet, WalletTransaction
    
    # 1. Fetch Withdrawals (Cashouts with status tracking)
    w_result = await db.execute(
        select(Withdrawal)
        .where(Withdrawal.user_id == current_user.id)
    )
    withdrawals = w_result.scalars().all()
    
    # 2. Fetch WalletTransactions (Incomes, bonuses, etc) - exclude withdrawals to avoid duplicates
    t_result = await db.execute(
        select(WalletTransaction)
        .join(Wallet)
        .where(
            (Wallet.user_id == current_user.id) &
            (WalletTransaction.reference_type != 'withdrawal') &
            (WalletTransaction.type != 'withdrawal')
        )
    )
    transactions = t_result.scalars().all()
    
    response = []
    
    # Map Withdrawals
    for w in withdrawals:
        response.append({
            "id": f"w_{w.id}",
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
            "saldo_anterior": None,
            "saldo_nuevo": None,
            "_sort_date": w.created_at
        })
        
    # Map Transactions
    for t in transactions:
        amount = float(t.amount)
        origen = t.type
        if amount > 0 and origen not in ['generacion_rendimiento', 'bono', 'cash', 'auto_yield_transfer', 'auto_bonus_transfer']:
            origen = "cash"
            
        if amount < 0:
            origen = "retiro_interno"
            
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
            "estado": "procesado",
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
