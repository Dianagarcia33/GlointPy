from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List

from src.core.database import get_db
from src.api.dependencies.auth_deps import get_current_user
from src.models.user import User
from src.models.investment import InvestmentRequest, PaqueteInversion
from src.schemas.investment_schema import InvestmentRequestResponse

router = APIRouter()

@router.get("/me", response_model=List[InvestmentRequestResponse])
async def get_my_investments(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        from sqlalchemy import or_, text
        
        # 1. Buscar si el usuario tiene un perfil de inversionista en la tabla investors
        investor_id = None
        try:
            # Primero intentamos con user_id
            inv_res = await db.execute(text("SELECT id FROM investors WHERE user_id = :uid LIMIT 1"), {"uid": current_user.id})
            row = inv_res.fetchone()
            investor_id = row[0] if row else None
        except Exception:
            try:
                # Si falla, intentamos con id_user (por si vienen de Laravel con ese nombre)
                inv_res = await db.execute(text("SELECT id FROM investors WHERE id_user = :uid LIMIT 1"), {"uid": current_user.id})
                row = inv_res.fetchone()
                investor_id = row[0] if row else None
            except Exception:
                pass

        # 2. Buscar las inversiones donde sea el creador directo (user_id) O sea el beneficiario (investor_id)
        filters = [InvestmentRequest.user_id == current_user.id]
        if investor_id:
            filters.append(InvestmentRequest.investor_id == investor_id)

        result = await db.execute(
            select(InvestmentRequest)
            .options(selectinload(InvestmentRequest.paquete))
            .where(or_(*filters))
            .order_by(InvestmentRequest.created_at.desc())
        )
        investments = result.scalars().all()
        return investments
    except Exception as e:
        print(f"Error fetching investments: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener las inversiones del usuario"
        )
