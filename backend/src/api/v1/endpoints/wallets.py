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
    """
    from src.models.withdrawal import Withdrawal
    result = await db.execute(
        select(Withdrawal)
        .where(Withdrawal.user_id == current_user.id)
        .order_by(Withdrawal.created_at.desc())
    )
    movements = result.scalars().all()
    
    response = []
    for mov in movements:
        response.append({
            "id": mov.id,
            "investor_id": mov.investor_id,
            "user_id": mov.user_id,
            "origen": mov.origen,
            "tipo": mov.tipo.value if hasattr(mov.tipo, 'value') else mov.tipo,
            "monto": float(mov.monto),
            "impuesto": float(mov.impuesto),
            "monto_neto": float(mov.monto_neto),
            "fecha_solicitud": mov.fecha_solicitud.isoformat() if mov.fecha_solicitud else None,
            "fecha_retiro": mov.fecha_retiro.isoformat() if mov.fecha_retiro else None,
            "estado": mov.estado.value if hasattr(mov.estado, 'value') else mov.estado,
            "metodo_pago": mov.metodo_pago,
            "banco": mov.banco,
            "tipo_cuenta": mov.tipo_cuenta,
            "numero_cuenta": mov.numero_cuenta,
            "observaciones": mov.observaciones,
            "motivo_rechazo": mov.motivo_rechazo,
            "fecha_aprobacion": mov.fecha_aprobacion.isoformat() if mov.fecha_aprobacion else None,
            "fecha_procesamiento": mov.fecha_procesamiento.isoformat() if mov.fecha_procesamiento else None,
            "created_at": mov.created_at.isoformat() if mov.created_at else None,
            "updated_at": mov.updated_at.isoformat() if mov.updated_at else None,
            "saldo_anterior": None,
            "saldo_nuevo": None
        })
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
