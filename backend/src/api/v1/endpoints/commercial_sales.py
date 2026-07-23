from typing import List, Dict, Any
from decimal import Decimal
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import extract, func, desc

from src.core.database import get_db
from src.api.deps import get_current_user
from src.models.user import User
from src.models.commercial_sale import CommercialSale, CommercialSaleType
from src.schemas.commercial_sale import (
    CommercialClientCheckRequest,
    CommercialClientCheckResponse,
    CommercialSaleCreate,
    CommercialSaleResponse
)
from src.services.commercial_sale_service import (
    check_client_classification,
    register_commercial_sale,
    THRESHOLD_36M
)

router = APIRouter()

@router.post("/check-client", response_model=CommercialClientCheckResponse)
async def check_client(
    req: CommercialClientCheckRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Verifica la existencia del cliente antes de registrar la venta.
    Si el cliente ya existe, la base de datos bloquea 'contrato_nuevo' y 'reinversion',
    forzando la opción de 'referido' al 1.8% fijo.
    """
    res = await check_client_classification(db, req.client_document)
    return res

@router.post("/sales", response_model=CommercialSaleResponse)
async def create_sale(
    sale_data: CommercialSaleCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Registra una nueva venta comercial, ejecuta el algoritmo de partición marginal (3.0% / 3.5%),
    o 1.8% fijo para referidos, e inyecta automáticamente la comisión calculada a la Wallet del comercial.
    """
    sale = await register_commercial_sale(db, current_user.id, sale_data)
    return sale

@router.get("/my-summary")
async def get_my_commercial_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Resumen en tiempo real para el comercial:
    - Acumulado del mes
    - Distancia hacia el umbral de $36.000.000 (tramo 3.5%)
    - Comisiones totales del mes
    - Historial de sus últimas ventas
    """
    today = date.today()
    year = today.year
    month = today.month
    
    # Acumulado de ventas directas (contrato_nuevo + reinversión)
    direct_res = await db.execute(
        select(func.coalesce(func.sum(CommercialSale.amount), 0))
        .where(
            CommercialSale.commercial_id == current_user.id,
            CommercialSale.sale_type.in_([CommercialSaleType.contrato_nuevo, CommercialSaleType.reinversion]),
            extract('year', CommercialSale.sale_date) == year,
            extract('month', CommercialSale.sale_date) == month
        )
    )
    direct_accumulated = float(direct_res.scalar() or 0)
    
    # Acumulado de referidos
    ref_res = await db.execute(
        select(func.coalesce(func.sum(CommercialSale.amount), 0))
        .where(
            CommercialSale.commercial_id == current_user.id,
            CommercialSale.sale_type == CommercialSaleType.referido,
            extract('year', CommercialSale.sale_date) == year,
            extract('month', CommercialSale.sale_date) == month
        )
    )
    referral_accumulated = float(ref_res.scalar() or 0)
    
    total_accumulated = direct_accumulated + referral_accumulated
    
    # Comisiones totales del mes
    comm_res = await db.execute(
        select(func.coalesce(func.sum(CommercialSale.commission_amount), 0))
        .where(
            CommercialSale.commercial_id == current_user.id,
            extract('year', CommercialSale.sale_date) == year,
            extract('month', CommercialSale.sale_date) == month
        )
    )
    total_commissions = float(comm_res.scalar() or 0)
    
    threshold_36m = float(THRESHOLD_36M)
    remaining_for_36m = max(0.0, threshold_36m - direct_accumulated)
    has_reached_36m = direct_accumulated >= threshold_36m
    
    # Obtener últimas ventas del comercial
    recent_res = await db.execute(
        select(CommercialSale)
        .where(CommercialSale.commercial_id == current_user.id)
        .order_by(CommercialSale.id.desc())
        .limit(10)
    )
    recent_sales = recent_res.scalars().all()
    
    return {
        "direct_accumulated": direct_accumulated,
        "referral_accumulated": referral_accumulated,
        "total_accumulated": total_accumulated,
        "total_commissions": total_commissions,
        "threshold_36m": threshold_36m,
        "remaining_for_36m": remaining_for_36m,
        "has_reached_36m": has_reached_36m,
        "current_rate": 0.035 if has_reached_36m else 0.030,
        "recent_sales": [
            {
                "id": s.id,
                "client_document": s.client_document,
                "client_name": s.client_name,
                "sale_type": s.sale_type.value,
                "amount": float(s.amount),
                "commission_amount": float(s.commission_amount),
                "commission_rate": float(s.commission_rate),
                "sale_date": s.sale_date.isoformat()
            }
            for s in recent_sales
        ]
    }

@router.get("/leaderboard")
async def get_commercial_leaderboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Ranking de Ventas (Leaderboard) en tiempo real para el mes en curso:
    - Ordenado descendentemente por volumen facturado.
    - Criterios de desempate automáticos: mayor número de cierres y marca de tiempo.
    - Indicador de Brecha Operativa (Next-Target): calcula la cantidad de dinero exacta que le falta al comercial para superar al compañero de arriba.
    """
    today = date.today()
    year = today.year
    month = today.month
    
    # Consulta de acumulados por comercial en el mes
    sales_stmt = (
        select(
            CommercialSale.commercial_id,
            func.sum(CommercialSale.amount).label("total_volume"),
            func.count(CommercialSale.id).label("total_closures"),
            func.min(CommercialSale.created_at).label("first_closure_at")
        )
        .where(
            extract('year', CommercialSale.sale_date) == year,
            extract('month', CommercialSale.sale_date) == month
        )
        .group_by(CommercialSale.commercial_id)
        .order_by(
            desc(func.sum(CommercialSale.amount)),
            desc(func.count(CommercialSale.id)),
            func.min(CommercialSale.created_at)
        )
    )
    
    res = await db.execute(sales_stmt)
    rows = res.all()
    
    leaderboard = []
    current_user_rank = None
    
    for rank_idx, r in enumerate(rows, start=1):
        c_id = r.commercial_id
        vol = float(r.total_volume or 0)
        closures = int(r.total_closures or 0)
        
        user_res = await db.execute(select(User).where(User.id == c_id))
        user_obj = user_res.scalars().first()
        user_name = user_obj.name if user_obj else f"Comercial #{c_id}"
        
        # Calcular Next-Target (dinero que le falta para superar al de arriba)
        next_target_amount = 0.0
        if rank_idx > 1:
            above_vol = leaderboard[rank_idx - 2]["total_volume"]
            next_target_amount = max(0.0, (above_vol - vol) + 100000.0) # +100k COP para superarlo
            
        entry = {
            "rank": rank_idx,
            "commercial_id": c_id,
            "commercial_name": user_name,
            "total_volume": vol,
            "total_closures": closures,
            "next_target_amount": next_target_amount,
            "is_me": c_id == current_user.id
        }
        
        leaderboard.append(entry)
        if c_id == current_user.id:
            current_user_rank = entry

    return {
        "leaderboard": leaderboard,
        "my_rank": current_user_rank
    }
