from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.sql import func
from decimal import Decimal

from src.core.database import get_db
from src.models.user import User
from src.models.wallet import Wallet
from src.api.dependencies.auth_deps import get_current_user

router = APIRouter()

@router.get("/me/balance")
async def get_my_balance(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Obtiene la sumatoria del balance de todas las wallets activas del usuario."""
    try:
        result = await db.execute(
            select(func.sum(Wallet.balance))
            .where(Wallet.user_id == current_user.id)
            .where(Wallet.status == 'active')
        )
        total_balance = result.scalar()
        
        # Si no tiene wallets o la suma es None, retornamos 0
        balance = float(total_balance) if total_balance is not None else 0.0
        
        return {
            "balance": balance,
            "currency": "COP"
        }
    except Exception as e:
        import traceback
        print("ERROR EN WALLETS:", traceback.format_exc())
        return {
            "balance": 0.0,
            "currency": str(e)
        }

@router.get("/me/movements")
async def get_my_movements(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Obtiene el historial de movimientos de la billetera desde la tabla retiros."""
    from src.models.retiros import Retiro
    try:
        result = await db.execute(
            select(Retiro)
            .where(Retiro.user_id == current_user.id)
            .order_by(Retiro.created_at.desc())
        )
        movements = result.scalars().all()
        
        return [
            {
                "id": m.id,
                "origen": m.origen,
                "tipo": m.tipo,
                "monto_neto": float(m.monto_neto) if m.monto_neto else 0,
                "estado": m.estado,
                "fecha_solicitud": m.fecha_solicitud.isoformat() if m.fecha_solicitud else None,
                "created_at": m.created_at.isoformat() if m.created_at else None
            }
            for m in movements
        ]
    except Exception as e:
        import traceback
        print("ERROR EN MOVIMIENTOS:", traceback.format_exc())
        return []
