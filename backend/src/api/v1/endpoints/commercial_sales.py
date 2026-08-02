from typing import List, Dict, Any, Optional
from decimal import Decimal
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import extract, func, desc, or_
from sqlalchemy.orm import selectinload

from src.core.database import get_db
from src.api.deps import get_current_user, RequirePermission
from src.models.user import User
from src.models.commercial_sale import CommercialSale, CommercialSaleType, CommercialSaleStatus
from src.models.commission_settlement import CommissionSettlement
from src.models.commercial_bonus import CommercialBonus, CommercialBonusType, CommercialBonusStatus
from src.schemas.commercial_sale import (
    CommercialClientCheckRequest,
    CommercialClientCheckResponse,
    CommercialSaleCreate,
    CommercialSaleResponse,
    SettleCommissionsRequest,
    SettlementResponse
)
from src.services.commercial_sale_service import (
    check_client_classification,
    search_clients_service,
    register_commercial_sale,
    THRESHOLD_36M
)

router = APIRouter()

@router.get("/search-clients", dependencies=[Depends(RequirePermission("commercial:view"))])
async def search_clients(
    q: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Busca clientes a medida que el comercial escribe por Nombre, Cédula o Código IG1974.
    """
    return await search_clients_service(db, q)

@router.post("/check-client", response_model=CommercialClientCheckResponse, dependencies=[Depends(RequirePermission("commercial:view"))])
async def check_client(
    req: CommercialClientCheckRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Verifica la existencia del cliente antes de registrar la venta.
    """
    res = await check_client_classification(db, req.client_document)
    return res

@router.post("/sales", response_model=CommercialSaleResponse, dependencies=[Depends(RequirePermission("commercial:view"))])
async def create_sale(
    sale_data: CommercialSaleCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Registra una nueva venta comercial adjudicada al usuario comercial en sesión.
    """
    sale = await register_commercial_sale(db, current_user.id, sale_data)
    return sale

@router.post("/admin-sales", response_model=CommercialSaleResponse, dependencies=[Depends(RequirePermission("admin.commercial.manage"))])
async def create_admin_sale(
    target_commercial_id: int,
    sale_data: CommercialSaleCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Permite a un Administrador adjudicar una venta comercial a cualquier asesor del equipo.
    """
    sale = await register_commercial_sale(db, target_commercial_id, sale_data)
    return sale

@router.get("/my-summary", dependencies=[Depends(RequirePermission("commercial:view"))])
async def get_my_commercial_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Resumen en tiempo real para el comercial en sesión.
    """
    today = date.today()
    year = today.year
    month = today.month
    
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

@router.get("/my-assigned-investments", dependencies=[Depends(RequirePermission(["director.dashboard.view", "commercial:view"]))])
async def get_my_assigned_investments(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene el listado de solicitudes de inversión (InvestmentRequest)
    de todos los usuarios que han seleccionado al usuario actual como su Directivo de Inversiones.
    """
    from sqlalchemy import select, or_, desc
    from sqlalchemy.orm import selectinload
    from src.models.investment_request import InvestmentRequest
    from src.models.user import User
    from src.models.package import Package

    # Buscar usuarios asignados a este directivo
    assigned_users_res = await db.execute(
        select(User.id).where(User.commercial_id == current_user.id)
    )
    assigned_user_ids = set(assigned_users_res.scalars().all())

    # Buscar solicitudes de inversión correspondientes
    stmt = (
        select(InvestmentRequest)
        .options(
            selectinload(InvestmentRequest.user),
            selectinload(InvestmentRequest.package)
        )
        .order_by(desc(InvestmentRequest.created_at))
    )
    res = await db.execute(stmt)
    all_requests = res.scalars().all()

    assigned_requests = []
    need_commit = False

    for req in all_requests:
        req_commercial_id = None
        if req.extra_data and isinstance(req.extra_data, dict):
            raw_cid = (
                req.extra_data.get("commercial_id") or 
                req.extra_data.get("asesor_id") or 
                req.extra_data.get("directivo_id")
            )
            if raw_cid:
                try:
                    req_commercial_id = int(raw_cid)
                except (ValueError, TypeError):
                    pass

        user_obj = req.user
        
        # Si el usuario no tenía commercial_id guardado en DB pero sí en extra_data, auto-reparar
        if user_obj and user_obj.commercial_id is None and req_commercial_id:
            user_obj.commercial_id = req_commercial_id
            need_commit = True

        # Determinar si esta solicitud pertenece al directivo actual o si es superusuario
        is_assigned = (
            (req.user_id in assigned_user_ids) or 
            (req_commercial_id == current_user.id) or 
            (user_obj and user_obj.commercial_id == current_user.id) or
            (current_user.is_superuser is True)
        )

        if is_assigned:
            extra = req.extra_data or {}
            pkg_name = req.package.nombre if req.package else f"Paquete #{req.paquete_inversion_id}"
            
            assigned_requests.append({
                "id": req.id,
                "user_id": req.user_id,
                "investor_name": user_obj.name if user_obj else extra.get("nombre_completo", "Inversionista"),
                "investor_email": user_obj.email if user_obj else "Sin email",
                "investor_phone": user_obj.phone_number if user_obj else extra.get("numero_celular", "Sin teléfono"),
                "investor_document": user_obj.document_id if user_obj else extra.get("documento", "Sin documento"),
                "monto": float(req.monto),
                "paquete_nombre": pkg_name,
                "status": req.status.value if hasattr(req.status, "value") else str(req.status),
                "rejection_reason": req.rejection_reason,
                "comprobante_path": req.comprobante_path,
                "created_at": req.created_at.isoformat() if req.created_at else None
            })

    if need_commit:
        try:
            await db.commit()
        except Exception:
            await db.rollback()

    return {
        "assigned_investments": assigned_requests,
        "total": len(assigned_requests)
    }

@router.get("/admin-summary", dependencies=[Depends(RequirePermission("admin.commercial.manage"))])
async def get_admin_commercial_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Consolidado ejecutivo global para Administradores / Jefes de Ventas:
    - Ventas Totales del equipo en el mes
    - Comisiones totales calculadas a liquidar
    - Total de cierres adjudicados
    - Asesor Líder del mes
    """
    today = date.today()
    year = today.year
    month = today.month
    
    total_sales_res = await db.execute(
        select(func.coalesce(func.sum(CommercialSale.amount), 0))
        .where(
            extract('year', CommercialSale.sale_date) == year,
            extract('month', CommercialSale.sale_date) == month
        )
    )
    global_sales = float(total_sales_res.scalar() or 0)
    
    total_comm_res = await db.execute(
        select(func.coalesce(func.sum(CommercialSale.commission_amount), 0))
        .where(
            extract('year', CommercialSale.sale_date) == year,
            extract('month', CommercialSale.sale_date) == month
        )
    )
    global_commissions = float(total_comm_res.scalar() or 0)
    
    count_res = await db.execute(
        select(func.count(CommercialSale.id))
        .where(
            extract('year', CommercialSale.sale_date) == year,
            extract('month', CommercialSale.sale_date) == month
        )
    )
    total_closures = int(count_res.scalar() or 0)
    
    # Asesor líder del mes
    leader_res = await db.execute(
        select(
            CommercialSale.commercial_id,
            func.sum(CommercialSale.amount).label("vol")
        )
        .where(
            extract('year', CommercialSale.sale_date) == year,
            extract('month', CommercialSale.sale_date) == month
        )
        .group_by(CommercialSale.commercial_id)
        .order_by(desc(func.sum(CommercialSale.amount)))
        .limit(1)
    )
    leader_row = leader_res.first()
    leader_name = "Sin ventas"
    if leader_row:
        u_res = await db.execute(select(User).where(User.id == leader_row.commercial_id))
        u = u_res.scalars().first()
        if u:
            leader_name = u.name

    return {
        "global_sales": global_sales,
        "global_commissions": global_commissions,
        "total_closures": total_closures,
        "leader_name": leader_name
    }

@router.get("/all-sales", dependencies=[Depends(RequirePermission("admin.commercial.manage"))])
async def get_all_commercial_sales(
    commercial_id: Optional[int] = None,
    sale_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Listado general de todas las ventas comerciales para auditoría del Administrador.
    """
    stmt = (
        select(CommercialSale)
        .options(selectinload(CommercialSale.commercial))
        .order_by(CommercialSale.id.desc())
    )
    
    if commercial_id:
        stmt = stmt.where(CommercialSale.commercial_id == commercial_id)
    if sale_type:
        stmt = stmt.where(CommercialSale.sale_type == sale_type)
        
    res = await db.execute(stmt)
    sales = res.scalars().all()
    
    return [
        {
            "id": s.id,
            "commercial_id": s.commercial_id,
            "commercial_name": s.commercial.name if s.commercial else f"Comercial #{s.commercial_id}",
            "client_document": s.client_document,
            "client_name": s.client_name,
            "sale_type": s.sale_type.value,
            "referrer_code": s.referrer_code,
            "amount": float(s.amount),
            "commission_rate": float(s.commission_rate),
            "commission_amount": float(s.commission_amount),
            "tramo_a_amount": float(s.tramo_a_amount or 0),
            "tramo_b_amount": float(s.tramo_b_amount or 0),
            "sale_date": s.sale_date.isoformat(),
            "created_at": s.created_at.isoformat() if s.created_at else None
        }
        for s in sales
    ]

@router.delete("/sales/{sale_id}", status_code=204, dependencies=[Depends(RequirePermission("admin.commercial.manage"))])
async def delete_commercial_sale(
    sale_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Permite al Administrador anular/eliminar una venta errónea.
    """
    sale_res = await db.execute(select(CommercialSale).where(CommercialSale.id == sale_id))
    sale = sale_res.scalars().first()
    if not sale:
        raise HTTPException(status_code=404, detail="Venta comercial no encontrada")
        
    await db.delete(sale)
    await db.commit()

@router.get("/public-advisors")
async def get_public_advisors(
    db: AsyncSession = Depends(get_db)
):
    """
    Endpoint público para listar Directivos de Inversión / Asesores
    en los formularios de registro de nuevos usuarios sin requerir token.
    """
    stmt = (
        select(User)
        .options(selectinload(User.roles))
        .where(User.is_active == True)
        .order_by(User.name.asc())
    )
    res = await db.execute(stmt)
    all_users = res.scalars().all()

    sales_users_res = await db.execute(select(CommercialSale.commercial_id).distinct())
    sales_user_ids = set(sales_users_res.scalars().all())

    commercial_users = []
    for u in all_users:
        role_names = [r.name.lower() for r in (u.roles or [])]
        
        has_commercial_role = any(
            any(kw in r_name for kw in ["directiv", "comercial", "asesor", "lider", "director"])
            and not any(inv_kw in r_name for inv_kw in ["inversionista", "investor"])
            for r_name in role_names
        )

        if has_commercial_role or u.id in sales_user_ids:
            commercial_users.append({
                "id": u.id,
                "name": u.name,
                "email": u.email,
                "document_id": u.document_id
            })

    return commercial_users

@router.get("/commercial-users", dependencies=[Depends(RequirePermission("commercial:view"))])
async def get_commercial_users(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Retorna únicamente el listado de usuarios con rol de Directivo de Inversión / Comercial
    para asignación en el modal del Administrador.
    """
    stmt = (
        select(User)
        .options(selectinload(User.roles))
        .where(User.is_active == True)
        .order_by(User.name.asc())
    )
    res = await db.execute(stmt)
    all_users = res.scalars().all()

    sales_users_res = await db.execute(select(CommercialSale.commercial_id).distinct())
    sales_user_ids = set(sales_users_res.scalars().all())

    commercial_users = []
    for u in all_users:
        role_names = [r.name.lower() for r in (u.roles or [])]
        
        # Filtro estricto: Debe tener un rol comercial (Directivo, Comercial, Asesor, Director, Líder)
        # y NO ser un usuario únicamente cliente 'Inversionista'
        has_commercial_role = any(
            any(kw in r_name for kw in ["directiv", "comercial", "asesor", "lider", "director"])
            and not any(inv_kw in r_name for inv_kw in ["inversionista", "investor"])
            for r_name in role_names
        )

        if has_commercial_role or u.id in sales_user_ids:
            commercial_users.append({
                "id": u.id,
                "name": u.name,
                "email": u.email,
                "document_id": u.document_id
            })

    return commercial_users

@router.get("/leaderboard", dependencies=[Depends(RequirePermission("commercial:view"))])
async def get_commercial_leaderboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Ranking de Ventas (Leaderboard) en tiempo real para el mes en curso.
    """
    today = date.today()
    year = today.year
    month = today.month
    
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
        
        next_target_amount = 0.0
        if rank_idx > 1:
            above_vol = leaderboard[rank_idx - 2]["total_volume"]
            next_target_amount = max(0.0, (above_vol - vol) + 100000.0)
            
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

@router.get("/pending-settlement/{commercial_id}", dependencies=[Depends(RequirePermission("commercial:view"))])
async def get_pending_settlement_breakdown(
    commercial_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Retorna el desglose de comisiones por ventas y bonos pendientes por liquidar.
    """
    sales_res = await db.execute(
        select(CommercialSale)
        .where(
            CommercialSale.commercial_id == commercial_id,
            CommercialSale.status == CommercialSaleStatus.pendiente
        )
    )
    pending_sales = sales_res.scalars().all()

    bonuses_res = await db.execute(
        select(CommercialBonus)
        .where(
            CommercialBonus.commercial_id == commercial_id,
            CommercialBonus.status == CommercialBonusStatus.pendiente
        )
    )
    pending_bonuses = bonuses_res.scalars().all()

    sales_amount = sum(float(s.commission_amount) for s in pending_sales)
    daily_bonuses_amount = sum(float(b.amount) for b in pending_bonuses if b.bonus_type == CommercialBonusType.meta_diaria)
    floor_bonuses_amount = sum(float(b.amount) for b in pending_bonuses if b.bonus_type == CommercialBonusType.piso_cumplido)
    welfare_bonuses_amount = sum(float(b.amount) for b in pending_bonuses if b.bonus_type == CommercialBonusType.bienestar_trimestral)
    total_amount = sales_amount + daily_bonuses_amount + floor_bonuses_amount + welfare_bonuses_amount

    return {
        "commercial_id": commercial_id,
        "sales_count": len(pending_sales),
        "sales_commission_total": sales_amount,
        "daily_bonuses_total": daily_bonuses_amount,
        "floor_bonuses_total": floor_bonuses_amount,
        "welfare_bonuses_total": welfare_bonuses_amount,
        "total_amount": total_amount,
        "bonuses": [
            {
                "id": b.id,
                "bonus_type": b.bonus_type.value,
                "amount": float(b.amount),
                "details": b.details,
                "earned_date": b.earned_date.isoformat()
            }
            for b in pending_bonuses
        ]
    }

@router.get("/bonuses-summary", dependencies=[Depends(RequirePermission("admin.commercial.manage"))])
async def get_all_bonuses_summary(
    db: AsyncSession = Depends(get_db)
):
    """
    Retorna la auditoría de bonos acumulados y pendientes de todos los asesores/directivos.
    """
    try:
        users_res = await db.execute(
            select(User)
            .where(User.is_active == True)
        )
        all_users = users_res.scalars().all()

        today = date.today()
        result = []

        for u in all_users:
            try:
                bonuses_res = await db.execute(
                    select(CommercialBonus)
                    .where(CommercialBonus.commercial_id == u.id)
                    .order_by(CommercialBonus.created_at.desc())
                )
                user_bonuses = bonuses_res.scalars().all()
            except Exception:
                user_bonuses = []

            pending_bonuses = [b for b in user_bonuses if b.status == CommercialBonusStatus.pendiente]
            pending_total = sum(float(b.amount) for b in pending_bonuses)

            daily_sales_res = await db.execute(
                select(func.count(CommercialSale.id))
                .where(
                    CommercialSale.commercial_id == u.id,
                    CommercialSale.sale_date == today
                )
            )
            today_closures = daily_sales_res.scalar() or 0

            monthly_sales_res = await db.execute(
                select(func.coalesce(func.sum(CommercialSale.amount), 0))
                .where(
                    CommercialSale.commercial_id == u.id,
                    extract('year', CommercialSale.sale_date) == today.year,
                    extract('month', CommercialSale.sale_date) == today.month
                )
            )
            monthly_volume = float(monthly_sales_res.scalar() or 0)

            if user_bonuses or monthly_volume > 0 or today_closures > 0:
                result.append({
                    "commercial_id": u.id,
                    "commercial_name": u.name or u.email,
                    "email": u.email,
                    "today_closures": today_closures,
                    "monthly_volume": monthly_volume,
                    "pending_bonuses_count": len(pending_bonuses),
                    "pending_bonuses_total": pending_total,
                    "bonuses": [
                        {
                            "id": b.id,
                            "bonus_type": b.bonus_type.value if hasattr(b.bonus_type, 'value') else str(b.bonus_type),
                            "amount": float(b.amount),
                            "status": b.status.value if hasattr(b.status, 'value') else str(b.status),
                            "details": b.details,
                            "earned_date": b.earned_date.isoformat() if hasattr(b.earned_date, 'isoformat') else str(b.earned_date)
                        }
                        for b in user_bonuses
                    ]
                })

        return result
    except Exception as e:
        print(f"Error in get_all_bonuses_summary: {e}")
        return []

@router.post("/settle", dependencies=[Depends(RequirePermission("admin.commissions.settle"))])
async def settle_commissions(
    req: SettleCommissionsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Liquida todas las comisiones y bonos pendientes de un comercial/directivo.
    - Cambia status de ventas y bonos a 'liquidado'
    - Genera el registro de comprobante en CommissionSettlement
    """
    sales_res = await db.execute(
        select(CommercialSale)
        .where(
            CommercialSale.commercial_id == req.commercial_id,
            CommercialSale.status == CommercialSaleStatus.pendiente
        )
    )
    pending_sales = sales_res.scalars().all()

    bonuses_res = await db.execute(
        select(CommercialBonus)
        .where(
            CommercialBonus.commercial_id == req.commercial_id,
            CommercialBonus.status == CommercialBonusStatus.pendiente
        )
    )
    pending_bonuses = bonuses_res.scalars().all()

    if not pending_sales and not pending_bonuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay comisiones ni bonos pendientes de liquidar para este asesor."
        )

    sales_total = sum(Decimal(str(s.commission_amount)) for s in pending_sales)
    bonuses_total = sum(Decimal(str(b.amount)) for b in pending_bonuses)
    total_amount = sales_total + bonuses_total
    sales_count = len(pending_sales)

    settlement = CommissionSettlement(
        commercial_id=req.commercial_id,
        settled_by_id=current_user.id,
        total_amount=total_amount,
        sales_count=sales_count,
        reference_code=req.reference_code.strip() if req.reference_code else None,
        notes=req.notes.strip() if req.notes else None
    )
    db.add(settlement)
    await db.flush()

    for s in pending_sales:
        s.status = CommercialSaleStatus.liquidado
        s.settlement_id = settlement.id

    for b in pending_bonuses:
        b.status = CommercialBonusStatus.liquidado
        b.settlement_id = settlement.id

    await db.commit()
    await db.refresh(settlement)

    return {
        "message": "Comisiones y bonos liquidados exitosamente",
        "settlement_id": settlement.id,
        "total_amount": float(settlement.total_amount),
        "sales_count": sales_count,
        "reference_code": settlement.reference_code
    }

@router.get("/settlements", response_model=List[SettlementResponse], dependencies=[Depends(RequirePermission("commercial:view"))])
async def get_settlement_history(
    commercial_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Retorna el historial de liquidaciones de comisiones registradas.
    """
    stmt = (
        select(CommissionSettlement)
        .options(
            selectinload(CommissionSettlement.commercial),
            selectinload(CommissionSettlement.settled_by)
        )
        .order_by(CommissionSettlement.id.desc())
    )

    is_admin = current_user.is_superuser or (current_user.permissions and "admin.commercial.manage" in current_user.permissions)
    if not is_admin:
        stmt = stmt.where(CommissionSettlement.commercial_id == current_user.id)
    elif commercial_id:
        stmt = stmt.where(CommissionSettlement.commercial_id == commercial_id)

    res = await db.execute(stmt)
    settlements = res.scalars().all()

    return [
        {
            "id": st.id,
            "commercial_id": st.commercial_id,
            "commercial_name": st.commercial.name if st.commercial else f"Comercial #{st.commercial_id}",
            "settled_by_id": st.settled_by_id,
            "settled_by_name": st.settled_by.name if st.settled_by else "Sistema",
            "total_amount": float(st.total_amount),
            "sales_count": st.sales_count,
            "reference_code": st.reference_code,
            "notes": st.notes,
            "created_at": st.created_at
        }
        for st in settlements
    ]
