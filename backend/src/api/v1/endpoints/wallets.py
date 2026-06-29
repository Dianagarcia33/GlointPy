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
