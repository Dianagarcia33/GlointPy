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
        
    # 2. Fetch Active Contracts from Investor table
    investors_result = await db.execute(
        select(Investor)
        .options(selectinload(Investor.package), selectinload(Investor.period))
        .where(Investor.user_id == current_user.id)
    )
    active_investors = investors_result.scalars().all()
    
    for inv_record in active_investors:
        # Calcular fecha_fin si tenemos start_date y period.months
        from dateutil.relativedelta import relativedelta
        fecha_ingreso = inv_record.start_date
        fecha_fin = None
        dias_contrato = 0
        if fecha_ingreso and inv_record.period:
            fecha_fin = fecha_ingreso + relativedelta(months=inv_record.period.months)
            dias_contrato = (fecha_fin.date() - fecha_ingreso.date()).days

        # Determinar status
        is_active = True
        if fecha_fin and fecha_fin.date() < today:
            is_active = False

        monto = float(inv_record.package.value) if inv_record.package else 0
        
        # Rendimiento
        rendimiento_total = 0
        if inv_record.period and monto:
            # rendimiento_aprobado_mensual * meses
            rendimiento_total = monto * float(inv_record.period.percentage) / 100 * inv_record.period.months
            
        inv = {
            "id": inv_record.id,
            "user_id": current_user.id,
            "monto": monto,
            "status": "approved" if is_active else "finished",
            "created_at": inv_record.created_at.isoformat() if inv_record.created_at else None,
            "total_contrato": monto + rendimiento_total,
            "rendimiento_total_contrato": rendimiento_total,
            "liquidacion_diaria_rendimiento": rendimiento_total / dias_contrato if dias_contrato > 0 else 0,
            "dias_contrato": dias_contrato,
            "fecha_ingreso": fecha_ingreso.isoformat() if fecha_ingreso else None,
            "fecha_finalizacion": fecha_fin.isoformat() if fecha_fin else None,
            "paquete": {
                "id": inv_record.package.id if inv_record.package else 0,
                "paquete_accion_adquirido": str(inv_record.package.value) if inv_record.package else "0",
                "acciones_otorgadas": inv_record.package.granted_shares if inv_record.package else 0
            } if inv_record.package else None
        }
        investments.append(inv)
        
    return investments
