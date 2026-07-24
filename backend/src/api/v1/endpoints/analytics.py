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
    for inv in all_invs:
        fecha_ingreso = inv.start_date
        if fecha_ingreso and inv.period:
            aceleracion_dias = sum(float(getattr(acc, 'days_to_reduce', getattr(acc, 'days_accelerated', 0)) or 0) for acc in (inv.accelerations or []))
            fecha_fin = fecha_ingreso + relativedelta(months=inv.period.months) - timedelta(days=aceleracion_dias)
            if fecha_fin.date() < today:
                # Contrato vencido/finalizado -> no sumar como activo
                continue
        active_invs.append(inv)

    total_invertido = sum(float(i.package.value) if i.package and i.package.value else 0 for i in active_invs)

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
            "total_inversionistas": len(active_invs),
            "total_wallets": total_wallets,
            "total_withdrawals": total_withdrawals
        }
    }


@router.get("/director-dashboard", dependencies=[Depends(RequirePermission(["admin.audits.manage", "director.dashboard.view", "admin.users.manage"]))])
async def get_director_analytics_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retorna analíticas ejecutivas especializadas para el Directivo de Inversiones:
    - Capital Bajo Gestión (AUM)
    - Proyecciones de Vencimiento / Liquidación a Futuro
    - Distribución del Portafolio por Paquetes de Inversión
    - Pipeline de Solicitudes de Inversión Pendientes y Aprobadas
    """
    today = date.today()

    # 1. Obtener contratos activos de la tabla Investor
    from src.models.investment_request import InvestmentRequest, InvestmentRequestStatus
    from src.models.period import Period

    active_invs_res = await db.execute(
        select(Investor)
        .options(selectinload(Investor.package), selectinload(Investor.period))
    )
    active_invs = active_invs_res.scalars().all()

    total_aum = sum(float(i.package.value) if i.package and i.package.value else 0 for i in active_invs)

    # 2. Rendimientos Mensuales Proyectados
    rendimiento_mensual_total = 0.0
    for inv in active_invs:
        if inv.package and inv.period and inv.package.value:
            val = float(inv.package.value)
            pct = float(inv.period.percentage or 0)
            rendimiento_mensual_total += val * (pct / 100.0)

    proyectado_30d = rendimiento_mensual_total
    proyectado_12m = rendimiento_mensual_total * 12.0

    # Proyección por meses a futuro (Próximos 6 meses)
    months_labels = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
    payout_projections = []
    for i in range(6):
        future_date = today + relativedelta(months=i)
        m_name = months_labels[future_date.month - 1]
        payout_projections.append({
            "mes": f"{m_name} {future_date.year}",
            "rentabilidad_proyectada": round(rendimiento_mensual_total, 2),
            "capital_vigente": round(total_aum, 2)
        })

    # 3. Solicitudes de inversión en pipeline
    pending_reqs_res = await db.execute(
        select(InvestmentRequest)
        .options(selectinload(InvestmentRequest.package))
        .where(InvestmentRequest.status == InvestmentRequestStatus.pending)
    )
    pending_reqs = pending_reqs_res.scalars().all()
    pending_count = len(pending_reqs)
    pending_monto = sum(float(r.monto or 0) for r in pending_reqs)

    # 4. Distribución por Paquetes (AUM por paquete)
    pkg_dict: Dict[int, Dict[str, Any]] = {}
    for inv in active_invs:
        if inv.package:
            pid = inv.package.id
            if pid not in pkg_dict:
                pkg_dict[pid] = {
                    "package_id": pid,
                    "nombre": f"${float(inv.package.value):,.0f} COP" if inv.package.value else "Paquete Custom",
                    "valor_unitario": float(inv.package.value or 0),
                    "count": 0,
                    "total_monto": 0.0
                }
            pkg_dict[pid]["count"] += 1
            pkg_dict[pid]["total_monto"] += float(inv.package.value or 0)

    package_distribution = sorted(list(pkg_dict.values()), key=lambda x: x["valor_unitario"])

    return {
        "summary_cards": {
            "total_aum": total_aum,
            "rendimiento_mensual_estimado": rendimiento_mensual_total,
            "proyectado_30d": proyectado_30d,
            "proyectado_12m": proyectado_12m,
            "solicitudes_pendientes_monto": pending_monto,
            "solicitudes_pendientes_count": pending_count,
            "total_contratos_activos": len(active_invs)
        },
        "payout_projections": payout_projections,
        "package_distribution": package_distribution
    }

