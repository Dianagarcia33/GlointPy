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


@router.get("/director-dashboard", dependencies=[Depends(RequirePermission(["admin.audits.manage", "director.dashboard.view", "admin.users.manage", "admin.roles.manage", "admin.referrals.manage", "admin.investments.manage"]))])
async def get_director_analytics_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retorna analíticas ejecutivas personalizadas para el Directivo / Ejecutivo Comercial:
    - Captación total propia y comisiones generadas (CommercialSales donde commercial_id == current_user.id)
    - Total de clientes e inversionistas gestionados por el directivo
    - Histórico mensual de captación y comisiones del directivo
    - Desglose por tipo de venta propia (Contrato Nuevo, Reinversión, Referidos)
    - Inversiones personales propias del directivo
    """
    today = date.today()
    from src.models.investment_request import InvestmentRequest, InvestmentRequestStatus
    from src.models.potential_referral import PotentialReferral

    # 1. Ventas comerciales asociadas a este directivo
    my_sales_res = await db.execute(
        select(CommercialSale)
        .where(CommercialSale.commercial_id == current_user.id)
    )
    my_sales = my_sales_res.scalars().all()

    # Fallback para SuperAdmin en ambiente de pruebas si aún no tiene ventas asociadas
    is_personal = len(my_sales) > 0
    if not is_personal and current_user.is_superuser:
        all_sales_res = await db.execute(select(CommercialSale))
        my_sales = all_sales_res.scalars().all()

    total_captado_propio = sum(float(s.amount or 0) for s in my_sales)
    total_comisiones_propias = sum(float(s.commission_amount or 0) for s in my_sales)
    unique_clients = len(set(s.client_document for s in my_sales if s.client_document))

    # 2. Contratos propios del usuario como Inversionista
    my_invs_res = await db.execute(
        select(Investor)
        .options(selectinload(Investor.package), selectinload(Investor.period))
        .where(Investor.user_id == current_user.id)
    )
    my_invs = my_invs_res.scalars().all()
    capital_propio_invertido = sum(float(i.package.value) if i.package and i.package.value else 0 for i in my_invs)

    # 3. Referidos del directivo
    my_refs_res = await db.execute(
        select(PotentialReferral)
        .join(Investor, PotentialReferral.investor_id == Investor.id)
        .where(Investor.user_id == current_user.id)
    )
    my_referrals = my_refs_res.scalars().all()
    total_referidos = len(my_referrals)

    # 4. Rendimiento estimado mensual de sus propias inversiones
    rendimiento_mensual_propio = 0.0
    for inv in my_invs:
        if inv.package and inv.period and inv.package.value:
            val = float(inv.package.value)
            pct = float(inv.period.percentage or 0)
            rendimiento_mensual_propio += val * (pct / 100.0)

    # 5. Crecimiento mensual de ventas del directivo (Últimos 6 meses)
    months_labels = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
    monthly_sales_history = []
    for i in range(5, -1, -1):
        target_date = today.replace(day=1) - relativedelta(months=i)
        y = target_date.year
        m = target_date.month

        month_sales = [
            s for s in my_sales 
            if s.sale_date and s.sale_date.year == y and s.sale_date.month == m
        ]
        month_captado = sum(float(s.amount or 0) for s in month_sales)
        month_comision = sum(float(s.commission_amount or 0) for s in month_sales)

        m_name = months_labels[m - 1]
        monthly_sales_history.append({
            "mes": f"{m_name} {y}",
            "captado": round(month_captado, 2),
            "comision": round(month_comision, 2)
        })

    # 6. Desglose de Ventas por Tipo (Nuevos, Reinversiones, Referidos)
    nuevos_monto = sum(float(s.amount or 0) for s in my_sales if s.sale_type == CommercialSaleType.contrato_nuevo)
    reinversion_monto = sum(float(s.amount or 0) for s in my_sales if s.sale_type == CommercialSaleType.reinversion)
    referidos_monto = sum(float(s.amount or 0) for s in my_sales if s.sale_type == CommercialSaleType.referido)

    sales_by_type = [
        {"nombre": "Contratos Nuevos", "total_monto": nuevos_monto},
        {"nombre": "Reinversiones", "total_monto": reinversion_monto},
        {"nombre": "Referidos", "total_monto": referidos_monto}
    ]

    return {
        "summary_cards": {
            "total_captado": total_captado_propio,
            "total_comisiones": total_comisiones_propias,
            "total_clientes": unique_clients,
            "total_referidos": total_referidos,
            "capital_propio_invertido": capital_propio_invertido,
            "rendimiento_mensual_propio": rendimiento_mensual_propio,
            "total_ventas_count": len(my_sales)
        },
        "payout_projections": monthly_sales_history,
        "package_distribution": sales_by_type
    }

