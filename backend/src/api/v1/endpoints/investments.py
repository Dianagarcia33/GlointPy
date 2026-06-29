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
        from sqlalchemy import text
        
        # Buscar las inversiones del usuario directamente en la tabla investors (user_id = user.id)
        investor_rows = (await db.execute(
            text("""
                SELECT i.id, i.user_id, i.total_contrato, i.rendimiento_total_contrato, 
                       i.paquete_inversion_adquirido, i.acciones_otorgadas, i.created_at,
                       p.paquete_accion_adquirido, p.acciones_otorgadas as pkg_acciones
                FROM investors i
                LEFT JOIN paquetes_inversion p ON i.paquete_inversion_adquirido = p.id
                WHERE i.user_id = :uid
                ORDER BY i.created_at DESC
            """),
            {"uid": current_user.id}
        )).fetchall()

        investments = []
        for r in investor_rows:
            total = float(r[2]) if r[2] else 0.0
            rendimiento = float(r[3]) if r[3] else 0.0
            monto = total - rendimiento
            if monto <= 0:
                monto = total

            investments.append({
                "id": r[0],
                "user_id": r[1],
                "monto": monto,
                "status": "approved",
                "created_at": r[6],
                "paquete": {
                    "id": r[4] if r[4] else 0,
                    "paquete_accion_adquirido": r[7] if r[7] else f"Paquete {r[4]}",
                    "acciones_otorgadas": r[5] if r[5] is not None else (r[8] if r[8] else 0)
                }
            })

        return investments
    except Exception as e:
        print(f"Error fetching investments: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener las inversiones del usuario"
        )
