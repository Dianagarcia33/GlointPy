from typing import List, Dict, Any
from decimal import Decimal
from datetime import date, datetime, timedelta
from dateutil.relativedelta import relativedelta
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import extract, func, desc
from sqlalchemy.orm import selectinload

from src.core.database import get_db
from src.api.deps import get_current_user, RequirePermission
from src.models.user import User
from src.models.investor import Investor
from src.models.package import Package
from src.models.wallet import Wallet
from src.models.withdrawal import Withdrawal
from src.models.commercial_sale import CommercialSale, CommercialSaleType

router = APIRouter()

@router.get("/admin-dashboard", dependencies=[Depends(RequirePermission("admin.audits.manage"))])
async def get_admin_analytics_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retorna analíticas globales 360° para el Dashboard del Administrador:
    - Crecimiento mensual de captación
    - Distribución por Paquetes de Inversión (Pie/Donut chart)
    - Balance de liquidez (Inversiones vs Billeteras vs Retiros)
    - Proporción por Tipo de Venta (Contrato Nuevo, Reinversión, Referidos)
    """
    today = date.today()

    # 1. Crecimiento mensual de captación (Últimos 6 meses)
    monthly_growth = []
    for i in range(5, -1, -1):
        target_date = today.replace(day=1) - timedelta(days=i*30)
        y = target_date.year
        m = target_date.month

        # Ventas comerciales en ese mes
        comm_sales_res = await db.execute(
            select(func.coalesce(func.sum(CommercialSale.amount), 0))
            .where(
                extract('year', CommercialSale.sale_date) == y,
                extract('month', CommercialSale.sale_date) == m
            )
        )
        comm_val = float(comm_sales_res.scalar() or 0)

        # Contratos de inversionistas registrados en ese mes
        inv_res = await db.execute(
            select(Investor)
            .options(selectinload(Investor.package))
            .where(
                extract('year', Investor.start_date) == y,
                extract('month', Investor.start_date) == m
            )
        )
        inv_list = inv_res.scalars().all()
        inv_val = sum(float(inv.package.value) if inv.package and inv.package.value else 0 for inv in inv_list)

        month_name = target_date.strftime("%b %Y")
        monthly_growth.append({
            "month": month_name,
            "capital_captado": max(comm_val, inv_val),
            "ventas_comerciales": comm_val
        })

    # 2. Obtener Contratos Activos Vigentes (excluye vencidos/finalizados)
    investors_all = await db.execute(
        select(Investor).options(
            selectinload(Investor.package),
            selectinload(Investor.period),
            selectinload(Investor.accelerations)
        )
    )
    all_invs = investors_all.scalars().all()
    active_invs = []
    finished_invs = []
    current_today = date.today()
    for inv in all_invs:
        fecha_ingreso = inv.start_date
        if fecha_ingreso and inv.period:
            inv_start = fecha_ingreso.date() if isinstance(fecha_ingreso, datetime) else fecha_ingreso
            dias_base = getattr(inv.period, 'days', 0) or (inv.period.months * 30 if inv.period.months else 0)
            fecha_fin = inv_start + timedelta(days=dias_base)
            if fecha_fin <= current_today:
                # Contrato vencido (fecha_fin <= hoy) -> Capital Finalizado
                finished_invs.append(inv)
                continue
        # Contrato en curso (fecha_fin > hoy) -> Capital Activo
        active_invs.append(inv)

    total_invertido = sum(float(i.package.value) if i.package and i.package.value else 0 for i in active_invs)
    total_capital_finalizado = sum(float(i.package.value) if i.package and i.package.value else 0 for i in finished_invs)

    # 3. Distribución por Paquetes de Inversión (solo paquetes con contratos activos)
    package_counts = {}
    for inv in active_invs:
        if inv.package:
            pid = inv.package.id
            if pid not in package_counts:
                val = float(inv.package.value or 0)
                package_counts[pid] = {
                    "name": f"${val:,.0f}",
                    "value": 0,
                    "package_id": pid,
                    "monto_unitario": val,
                    "total_monto": 0.0
                }
            package_counts[pid]["value"] += 1
            package_counts[pid]["total_monto"] += float(inv.package.value or 0)

    package_distribution = sorted(list(package_counts.values()), key=lambda x: x["monto_unitario"])

    # Total disponible en Wallets
    wallets_res = await db.execute(select(func.coalesce(func.sum(Wallet.balance), 0)))
    total_wallets = float(wallets_res.scalar() or 0)

    # Total retiros solicitados / pagados
    withdrawals_res = await db.execute(select(func.coalesce(func.sum(Withdrawal.monto), 0)))
    total_withdrawals = float(withdrawals_res.scalar() or 0)

    liquidity_balance = [
        {"category": "Capital Invertido Activo", "amount": total_invertido, "color": "#10B981"},
        {"category": "Saldo en Billeteras", "amount": total_wallets, "color": "#6366F1"},
        {"category": "Retiros Procesados", "amount": total_withdrawals, "color": "#F59E0B"}
    ]

    # 4. Proporción por Tipo de Venta Comercial
    nuevo_res = await db.execute(
        select(func.coalesce(func.sum(CommercialSale.amount), 0))
        .where(CommercialSale.sale_type == CommercialSaleType.contrato_nuevo)
    )
    reinversion_res = await db.execute(
        select(func.coalesce(func.sum(CommercialSale.amount), 0))
        .where(CommercialSale.sale_type == CommercialSaleType.reinversion)
    )
    referido_res = await db.execute(
        select(func.coalesce(func.sum(CommercialSale.amount), 0))
        .where(CommercialSale.sale_type == CommercialSaleType.referido)
    )

    sales_by_type = [
        {"name": "Contratos Nuevos", "value": float(nuevo_res.scalar() or 0)},
        {"name": "Reinversiones", "value": float(reinversion_res.scalar() or 0)},
        {"name": "Referidos", "value": float(referido_res.scalar() or 0)}
    ]

    return {
        "monthly_growth": monthly_growth,
        "package_distribution": package_distribution,
        "liquidity_balance": liquidity_balance,
        "sales_by_type": sales_by_type,
        "summary_cards": {
            "total_invertido": total_invertido,
            "total_capital_activo": total_invertido,
            "total_capital_finalizado": total_capital_finalizado,
            "total_inversionistas": len(active_invs),
            "total_inversionistas_inactivos": len(finished_invs),
            "total_wallets": total_wallets,
            "total_withdrawals": total_withdrawals
        }
    }


@router.get("/director-dashboard", dependencies=[Depends(RequirePermission(["admin.audits.manage", "director.dashboard.view", "admin.users.manage", "admin.roles.manage", "admin.referrals.manage", "admin.investments.manage", "admin.commercial.manage", "commercial:view"]))])
async def get_director_analytics_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retorna analíticas comerciales ejecutivas para la Dirección de Inversiones / Jefe de Ventas:
    - Captación total del equipo comercial en el mes y acumulado
    - Comisiones totales a liquidar al equipo
    - Total de cierres adjudicados
    - Asesor líder de ventas del mes
    - Ranking de asesores (Leaderboard)
    - Desglose por tipo de venta (Contratos nuevos, reinversiones, referidos)
    - Evolución mensual de captación del equipo
    """
    today = date.today()
    year = today.year
    month = today.month

    # 1. Total Captación y Comisiones Globales del Equipo (Mes Actual)
    month_sales_res = await db.execute(
        select(func.coalesce(func.sum(CommercialSale.amount), 0))
        .where(
            extract('year', CommercialSale.sale_date) == year,
            extract('month', CommercialSale.sale_date) == month
        )
    )
    captacion_mes = float(month_sales_res.scalar() or 0)

    month_comm_res = await db.execute(
        select(func.coalesce(func.sum(CommercialSale.commission_amount), 0))
        .where(
            extract('year', CommercialSale.sale_date) == year,
            extract('month', CommercialSale.sale_date) == month
        )
    )
    comisiones_mes = float(month_comm_res.scalar() or 0)

    count_res = await db.execute(
        select(func.count(CommercialSale.id))
        .where(
            extract('year', CommercialSale.sale_date) == year,
            extract('month', CommercialSale.sale_date) == month
        )
    )
    cierres_mes = int(count_res.scalar() or 0)

    # Captación histórica total acumulada por el equipo
    total_sales_res = await db.execute(select(func.coalesce(func.sum(CommercialSale.amount), 0)))
    captacion_historica = float(total_sales_res.scalar() or 0)

    # 2. Asesor Líder del Mes
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
    leader_name = "Sin ventas en el mes"
    if leader_row:
        u_res = await db.execute(select(User).where(User.id == leader_row.commercial_id))
        u = u_res.scalars().first()
        if u:
            leader_name = u.name

    # 3. Leaderboard / Ranking de Asesores del Mes
    sales_stmt = (
        select(
            CommercialSale.commercial_id,
            func.sum(CommercialSale.amount).label("total_volume"),
            func.count(CommercialSale.id).label("total_closures")
        )
        .where(
            extract('year', CommercialSale.sale_date) == year,
            extract('month', CommercialSale.sale_date) == month
        )
        .group_by(CommercialSale.commercial_id)
        .order_by(desc(func.sum(CommercialSale.amount)))
    )
    rank_res = await db.execute(sales_stmt)
    rank_rows = rank_res.all()

    leaderboard = []
    for idx, r in enumerate(rank_rows, start=1):
        u_res = await db.execute(select(User).where(User.id == r.commercial_id))
        u = u_res.scalars().first()
        leaderboard.append({
            "rank": idx,
            "commercial_id": r.commercial_id,
            "commercial_name": u.name if u else f"Asesor #{r.commercial_id}",
            "total_volume": float(r.total_volume or 0),
            "total_closures": int(r.total_closures or 0)
        })

    # 4. Desglose de Ventas por Tipo (Nuevos, Reinversiones, Referidos)
    nuevos_res = await db.execute(
        select(func.coalesce(func.sum(CommercialSale.amount), 0))
        .where(CommercialSale.sale_type == CommercialSaleType.contrato_nuevo)
    )
    reinversion_res = await db.execute(
        select(func.coalesce(func.sum(CommercialSale.amount), 0))
        .where(CommercialSale.sale_type == CommercialSaleType.reinversion)
    )
    referido_res = await db.execute(
        select(func.coalesce(func.sum(CommercialSale.amount), 0))
        .where(CommercialSale.sale_type == CommercialSaleType.referido)
    )

    sales_by_type = [
        {"nombre": "Contratos Nuevos", "total_monto": float(nuevos_res.scalar() or 0)},
        {"nombre": "Reinversiones", "total_monto": float(reinversion_res.scalar() or 0)},
        {"nombre": "Referidos", "total_monto": float(referido_res.scalar() or 0)}
    ]

    # 5. Evolución Mensual de Captación del Equipo (Últimos 6 meses)
    months_labels = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
    monthly_sales_history = []
    for i in range(5, -1, -1):
        target_date = today.replace(day=1) - relativedelta(months=i)
        y = target_date.year
        m = target_date.month

        m_sales_res = await db.execute(
            select(func.coalesce(func.sum(CommercialSale.amount), 0))
            .where(
                extract('year', CommercialSale.sale_date) == y,
                extract('month', CommercialSale.sale_date) == m
            )
        )
        m_comm_res = await db.execute(
            select(func.coalesce(func.sum(CommercialSale.commission_amount), 0))
            .where(
                extract('year', CommercialSale.sale_date) == y,
                extract('month', CommercialSale.sale_date) == m
            )
        )
        m_name = months_labels[m - 1]
        monthly_sales_history.append({
            "mes": f"{m_name} {y}",
            "captado": float(m_sales_res.scalar() or 0),
            "comision": float(m_comm_res.scalar() or 0)
        })

    # 6. Contratos por vencerse adjudicados ÚNICAMENTE al usuario en sesión
    expiring_contracts = []
    
    # Obtener ventas adjudicadas a este usuario comercial
    my_sales_res = await db.execute(
        select(CommercialSale)
        .options(selectinload(CommercialSale.commercial))
        .where(CommercialSale.commercial_id == current_user.id)
    )
    my_sales = my_sales_res.scalars().all()

    # Si es superusuario de prueba sin ventas propias, mostrar las ventas adjudicadas registradas
    if not my_sales and current_user.is_superuser:
        all_sales_res = await db.execute(
            select(CommercialSale).options(selectinload(CommercialSale.commercial))
        )
        my_sales = all_sales_res.scalars().all()

    # Mapa de client_document -> asesor_name (solo ventas adjudicadas)
    my_sales_map = {}
    for s in my_sales:
        if s.client_document:
            my_sales_map[s.client_document.strip()] = s.commercial.name if s.commercial else f"Asesor #{s.commercial_id}"

    if my_sales_map:
        invs_res = await db.execute(
            select(Investor)
            .options(
                selectinload(Investor.user),
                selectinload(Investor.package),
                selectinload(Investor.period)
            )
        )
        all_invs = invs_res.scalars().all()

        for inv in all_invs:
            doc = inv.user.document_id.strip() if inv.user and inv.user.document_id else ""
            # SOLO INCLUIR SI EL CONTRATO FUE ADJUDICADO Y ESTÁ EN EL MAPA DE VENTAS DE ESTE ASESOR
            if doc in my_sales_map:
                if inv.start_date and inv.period and inv.period.months:
                    start_d = inv.start_date.date() if isinstance(inv.start_date, datetime) else inv.start_date
                    end_d = start_d + relativedelta(months=inv.period.months)
                    days_left = (end_d - today).days

                    if -30 <= days_left <= 90:
                        expiring_contracts.append({
                            "id": inv.id,
                            "codigo_contrato": inv.assigned_code,
                            "cliente_nombre": inv.user.name if inv.user else "Cliente N/A",
                            "cliente_documento": doc,
                            "asesor_adjudicado": my_sales_map[doc],
                            "monto": float(inv.package.value or 0) if inv.package else 0.0,
                            "fecha_ingreso": start_d.isoformat(),
                            "fecha_vencimiento": end_d.isoformat(),
                            "dias_restantes": days_left
                        })

    expiring_contracts.sort(key=lambda x: x["dias_restantes"])

    return {
        "summary_cards": {
            "captacion_mes": captacion_mes,
            "comisiones_mes": comisiones_mes,
            "cierres_mes": cierres_mes,
            "captacion_historica": captacion_historica,
            "leader_name": leader_name
        },
        "payout_projections": monthly_sales_history,
        "package_distribution": sales_by_type,
        "leaderboard": leaderboard,
        "expiring_contracts": expiring_contracts
    }

