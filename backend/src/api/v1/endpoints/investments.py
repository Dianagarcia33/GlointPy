from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List

from src.core.database import get_db
from src.api.dependencies.auth_deps import get_current_user
from src.models.user import User
from src.models.investment import InvestmentRequest, PaqueteInversion
from src.models.investor import Investor
from src.schemas.investment_schema import InvestmentRequestResponse

router = APIRouter()

@router.get("/me", response_model=List[InvestmentRequestResponse])
async def get_my_investments(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        # Usar ORM para traer inversiones activas (investors) asociadas al usuario actual
        stmt = (
            select(Investor)
            .options(selectinload(Investor.paquete))
            .where(Investor.user_id == current_user.id)
            .order_by(Investor.created_at.desc())
        )
        
        result = await db.execute(stmt)
        investor_records = result.scalars().all()

        investments = []
        for inv in investor_records:
            total = float(inv.total_contrato) if inv.total_contrato else 0.0
            rendimiento = float(inv.rendimiento_total_contrato) if inv.rendimiento_total_contrato else 0.0
            monto = total - rendimiento
            if monto <= 0:
                monto = total

            # Configurar los campos para el schema de respuesta
            investments.append({
                "id": inv.id,
                "user_id": inv.user_id,
                "monto": monto,
                "status": "approved", # Las inversiones de la tabla investors ya están aprobadas
                "created_at": inv.created_at,
                "total_contrato": inv.total_contrato,
                "rendimiento_total_contrato": inv.rendimiento_total_contrato,
                "liquidacion_diaria_rendimiento": inv.liquidacion_diaria_rendimiento,
                "dias_contrato": inv.dias_contrato,
                "paquete": {
                    "id": inv.paquete_inversion_adquirido if inv.paquete_inversion_adquirido else 0,
                    "paquete_accion_adquirido": inv.paquete.paquete_accion_adquirido if inv.paquete else f"Paquete {inv.paquete_inversion_adquirido}",
                    "acciones_otorgadas": inv.acciones_otorgadas if inv.acciones_otorgadas is not None else (inv.paquete.acciones_otorgadas if inv.paquete else 0)
                }
            })

        return investments
    except Exception as e:
        print(f"Error fetching investments: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener las inversiones del usuario"
        )
