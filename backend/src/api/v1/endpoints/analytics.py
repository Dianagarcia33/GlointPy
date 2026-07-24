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

    # 2. Distribución por Paquetes de Inversión
    packages_res = await db.execute(select(Package))
    packages = packages_res.scalars().all()

    package_distribution = []
    for pkg in packages:
        count_res = await db.execute(
            select(func.count(Investor.id)).where(Investor.package_id == pkg.id)
        )
        c = count_res.scalar() or 0
        val = float(pkg.value or 0)
        package_distribution.append({
            "name": f"Paquete ${val:,.0f}",
            "value": c,
            "package_id": pkg.id,
            "monto_unitario": val,
            "total_monto": c * val
        })

    # 3. Balance de Liquidez Ecosistema
    # Total invertido activo (excluye contratos vencidos/finalizados)
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
            aceleracion_dias = sum(float(acc.days_accelerated or 0) for acc in (inv.accelerations or []))
            fecha_fin = fecha_ingreso + relativedelta(months=inv.period.months) - timedelta(days=aceleracion_dias)
            if fecha_fin.date() < today:
                # Contrato vencido/finalizado -> no sumar como activo
                continue
        active_invs.append(inv)

    total_invertido = sum(float(i.package.value) if i.package and i.package.value else 0 for i in active_invs)

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
