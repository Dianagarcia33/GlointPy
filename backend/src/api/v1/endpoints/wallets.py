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
