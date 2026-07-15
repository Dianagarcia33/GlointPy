from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from datetime import date
from src.core.database import get_db
from src.api.deps import get_current_user
from src.models.investment_request import InvestmentRequest
from src.models.contract_history import ContractHistory
from src.models.investor import Investor

router = APIRouter()

@router.get("/me")
async def get_my_investments(current_user = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """
    Get the investments (requests) of the current logged-in user.
    """
    # 1. Fetch Investment Requests
    result = await db.execute(
        select(InvestmentRequest)
        .options(selectinload(InvestmentRequest.package))
        .where(InvestmentRequest.user_id == current_user.id)
    )
    requests = result.scalars().all()
    
    investments = []
    today = date.today()
    
    for req in requests:
        inv = {
            "id": f"req_{req.id}",
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
        
    # 2. Fetch Contract Histories
    contracts_result = await db.execute(
        select(ContractHistory)
        .join(Investor)
        .options(selectinload(ContractHistory.package))
        .where(Investor.user_id == current_user.id)
    )
    contracts = contracts_result.scalars().all()
    
    for contract in contracts:
        is_active = contract.fecha_fin >= today if contract.fecha_fin else False
        
        inv = {
            "id": contract.id,
            "user_id": current_user.id,
            "monto": float(contract.total_contrato),
            "status": "approved" if is_active else "finished",
            "created_at": contract.created_at.isoformat() if contract.created_at else None,
            "total_contrato": float(contract.total_contrato),
            "rendimiento_total_contrato": float(contract.rendimiento_total_contrato),
            "liquidacion_diaria_rendimiento": float(contract.liquidacion_diaria_rendimiento),
            "dias_contrato": contract.dias_contrato,
            "fecha_ingreso": contract.fecha_inicio.isoformat() if contract.fecha_inicio else None,
            "fecha_finalizacion": contract.fecha_fin.isoformat() if contract.fecha_fin else None,
            "paquete": {
                "id": contract.package.id if contract.package else 0,
                "paquete_accion_adquirido": str(contract.package.value) if contract.package else "0",
                "acciones_otorgadas": contract.acciones_otorgadas
            }
        }
        investments.append(inv)
        
    return investments
