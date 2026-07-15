from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from src.core.database import get_db
from src.api.deps import get_current_user
from src.models.investment_request import InvestmentRequest

router = APIRouter()

@router.get("/me")
async def get_my_investments(current_user = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """
    Get the investments (requests) of the current logged-in user.
    """
    result = await db.execute(
        select(InvestmentRequest)
        .options(selectinload(InvestmentRequest.package))
        .where(InvestmentRequest.user_id == current_user.id)
    )
    requests = result.scalars().all()
    
    investments = []
    for req in requests:
        inv = {
            "id": req.id,
            "user_id": req.user_id,
            "monto": float(req.monto),
            "status": req.status.value if hasattr(req.status, 'value') else req.status,
            "created_at": req.created_at.isoformat() if req.created_at else None,
            "paquete": {
                "id": req.package.id,
                "paquete_accion_adquirido": str(req.package.value),
                "acciones_otorgadas": req.package.granted_shares
            } if req.package else None
        }
        investments.append(inv)
        
    return investments
