from src.services.contract_terms import contract_end
from typing import List, Dict, Any, Optional
from decimal import Decimal
from datetime import date, datetime, timedelta
from dateutil.relativedelta import relativedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import extract, func, desc
from sqlalchemy.orm import selectinload

from src.core.database import get_db
from src.api.deps import get_current_user, RequirePermission
from src.models.user import User
from src.models.investor import Investor
from src.models.package import Package
from src.models.period import Period
from src.models.wallet import Wallet
from src.models.withdrawal import Withdrawal, WithdrawalStatus
from src.models.commercial_sale import CommercialSale, CommercialSaleType
from src.models.investment_request import InvestmentRequest, InvestmentRequestStatus
from src.models.wallet_recharge import WalletRecharge

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
    start_cutoff = today.replace(day=1) - relativedelta(months=5)

    # 1. Crecimiento mensual de captación (Últimos 6 meses) optimizado en solo 2 queries agrupadas
    comm_stmt = (
        select(
            extract('year', CommercialSale.sale_date).label('y'),
            extract('month', CommercialSale.sale_date).label('m'),
            func.coalesce(func.sum(CommercialSale.amount), 0).label('total')
        )
        .where(CommercialSale.sale_date >= start_cutoff)
        .group_by('y', 'm')
    )
    comm_res = await db.execute(comm_stmt)
    comm_map = {(int(r.y), int(r.m)): float(r.total) for r in comm_res.all()}

    inv_stmt = (
        select(
            extract('year', Investor.start_date).label('y'),
            extract('month', Investor.start_date).label('m'),
            func.coalesce(func.sum(Package.value), 0).label('total')
        )
        .join(Package, Investor.package_id == Package.id)
        .where(Investor.start_date >= start_cutoff)
        .group_by('y', 'm')
    )
    inv_res = await db.execute(inv_stmt)
    inv_map = {(int(r.y), int(r.m)): float(r.total) for r in inv_res.all()}

    monthly_growth = []
    for i in range(5, -1, -1):
        target_date = today.replace(day=1) - relativedelta(months=i)
        key = (target_date.year, target_date.month)
        c_val = comm_map.get(key, 0.0)
        i_val = inv_map.get(key, 0.0)
        monthly_growth.append({
            "month": target_date.strftime("%b %Y"),
            "capital_captado": max(c_val, i_val),
            "ventas_comerciales": c_val
        })

    # 2. Obtener Contratos Activos Vigentes (1 query joined ligera sin sobrecarga ORM)
    stmt_invs = (
        select(
            Investor.id,
            Investor.start_date,
            Investor.package_id,
            Package.value.label("package_value"),
            Period.days.label("period_days"),
            Period.months.label("period_months")
        )
        .join(Package, Investor.package_id == Package.id, isouter=True)
        .join(Period, Investor.period_id == Period.id, isouter=True)
    )
    rows = (await db.execute(stmt_invs)).all()

    active_count = 0
    finished_count = 0
    total_invertido = 0.0
    total_capital_finalizado = 0.0
    package_counts = {}

    for r in rows:
        pkg_val = float(r.package_value or 0)
        is_active = True
        if r.start_date and (r.period_days or r.period_months):
            inv_start = r.start_date.date() if isinstance(r.start_date, datetime) else r.start_date
            dias_base = r.period_days or ((r.period_months or 0) * 30)
            fecha_fin = inv_start + timedelta(days=dias_base)
            if fecha_fin <= today:
                is_active = False

        if is_active:
            active_count += 1
            total_invertido += pkg_val
            if r.package_id:
                if r.package_id not in package_counts:
                    package_counts[r.package_id] = {
                        "name": f"${pkg_val:,.0f}",
                        "value": 0,
                        "package_id": r.package_id,
                        "monto_unitario": pkg_val,
                        "total_monto": 0.0
                    }
                package_counts[r.package_id]["value"] += 1
                package_counts[r.package_id]["total_monto"] += pkg_val
        else:
            finished_count += 1
            total_capital_finalizado += pkg_val

    # 3. Distribución por Paquetes de Inversión (solo paquetes con contratos activos)
    package_distribution = sorted(list(package_counts.values()), key=lambda x: x["monto_unitario"])

    # 4. Total disponible en Wallets, Retiros y Ventas por Tipo
    wallets_res = await db.execute(select(func.coalesce(func.sum(Wallet.balance), 0)))
    total_wallets = float(wallets_res.scalar() or 0)

    withdrawals_res = await db.execute(select(func.coalesce(func.sum(Withdrawal.monto), 0)))
    total_withdrawals = float(withdrawals_res.scalar() or 0)

    liquidity_balance = [
        {"category": "Capital Invertido Activo", "amount": total_invertido, "color": "#10B981"},
        {"category": "Saldo en Billeteras", "amount": total_wallets, "color": "#6366F1"},
        {"category": "Retiros Procesados", "amount": total_withdrawals, "color": "#F59E0B"}
    ]

    sales_type_res = await db.execute(
        select(CommercialSale.sale_type, func.coalesce(func.sum(CommercialSale.amount), 0))
        .group_by(CommercialSale.sale_type)
    )
    sales_type_map = {r[0]: float(r[1]) for r in sales_type_res.all()}
    sales_by_type = [
        {"name": "Contratos Nuevos", "value": sales_type_map.get(CommercialSaleType.contrato_nuevo, 0.0)},
        {"name": "Reinversiones", "value": sales_type_map.get(CommercialSaleType.reinversion, 0.0)},
        {"name": "Referidos", "value": sales_type_map.get(CommercialSaleType.referido, 0.0)}
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
            "total_inversionistas": active_count,
            "total_inversionistas_inactivos": finished_count,
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

    # 2 & 3. Leaderboard / Ranking de Asesores del Mes y Asesor Líder (1 sola consulta con JOIN a User)
    sales_stmt = (
        select(
            CommercialSale.commercial_id,
            User.name.label("commercial_name"),
            func.sum(CommercialSale.amount).label("total_volume"),
            func.count(CommercialSale.id).label("total_closures")
        )
        .join(User, CommercialSale.commercial_id == User.id, isouter=True)
        .where(
            extract('year', CommercialSale.sale_date) == year,
            extract('month', CommercialSale.sale_date) == month
        )
        .group_by(CommercialSale.commercial_id, User.name)
        .order_by(desc(func.sum(CommercialSale.amount)))
    )
    rank_res = await db.execute(sales_stmt)
    rank_rows = rank_res.all()

    leaderboard = [
        {
            "rank": idx,
            "commercial_id": r.commercial_id,
            "commercial_name": r.commercial_name or f"Asesor #{r.commercial_id}",
            "total_volume": float(r.total_volume or 0),
            "total_closures": int(r.total_closures or 0)
        }
        for idx, r in enumerate(rank_rows, start=1)
    ]
    leader_name = leaderboard[0]["commercial_name"] if leaderboard else "Sin ventas en el mes"

    # 4. Desglose de Ventas por Tipo (1 sola query agrupada)
    sales_type_res = await db.execute(
        select(CommercialSale.sale_type, func.coalesce(func.sum(CommercialSale.amount), 0))
        .group_by(CommercialSale.sale_type)
    )
    sales_type_map = {r[0]: float(r[1]) for r in sales_type_res.all()}
    sales_by_type = [
        {"nombre": "Contratos Nuevos", "total_monto": sales_type_map.get(CommercialSaleType.contrato_nuevo, 0.0)},
        {"nombre": "Reinversiones", "total_monto": sales_type_map.get(CommercialSaleType.reinversion, 0.0)},
        {"nombre": "Referidos", "total_monto": sales_type_map.get(CommercialSaleType.referido, 0.0)}
    ]

    # 5. Evolución Mensual de Captación del Equipo (1 sola query para los últimos 6 meses)
    months_labels = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
    start_cutoff_sales = today.replace(day=1) - relativedelta(months=5)
    hist_stmt = (
        select(
            extract('year', CommercialSale.sale_date).label('y'),
            extract('month', CommercialSale.sale_date).label('m'),
            func.coalesce(func.sum(CommercialSale.amount), 0).label('total_amount'),
            func.coalesce(func.sum(CommercialSale.commission_amount), 0).label('total_comm')
        )
        .where(CommercialSale.sale_date >= start_cutoff_sales)
        .group_by('y', 'm')
    )
    hist_res = await db.execute(hist_stmt)
    hist_map = {(int(r.y), int(r.m)): (float(r.total_amount), float(r.total_comm)) for r in hist_res.all()}

    monthly_sales_history = []
    for i in range(5, -1, -1):
        target_date = today.replace(day=1) - relativedelta(months=i)
        y = target_date.year
        m = target_date.month
        t_amt, t_comm = hist_map.get((y, m), (0.0, 0.0))
        m_name = months_labels[m - 1]
        monthly_sales_history.append({
            "mes": f"{m_name} {y}",
            "captado": t_amt,
            "comision": t_comm
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
                selectinload(Investor.period),
                selectinload(Investor.accelerations)
            )
        )
        all_invs = invs_res.scalars().all()

        for inv in all_invs:
            doc = inv.user.document_id.strip() if inv.user and inv.user.document_id else ""
            # SOLO INCLUIR SI EL CONTRATO FUE ADJUDICADO Y ESTÁ EN EL MAPA DE VENTAS DE ESTE ASESOR
            if doc in my_sales_map:
                if inv.start_date and inv.period and inv.period.days:
                    end_d = contract_end(inv)  # regla única de vigencia (H-140)
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


@router.get("/accounting-dashboard", dependencies=[Depends(RequirePermission(["accounting.dashboard.view", "admin.audits.manage", "admin.payments.manage", "admin.withdrawals.manage", "admin.investments.manage"]))])
async def get_accounting_analytics_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retorna analíticas y listados prioritarios para el Dashboard de Contabilidad:
    - 1. Solicitudes de inversión pendientes de aprobación
    - 2. Recargas de billetera pendientes de verificación
    - 3. Retiros / pagos pendientes de desembolso
    """
    # 1. Solicitudes de Inversión Pendientes
    inv_req_res = await db.execute(
        select(InvestmentRequest)
        .options(
            selectinload(InvestmentRequest.user),
            selectinload(InvestmentRequest.package)
        )
        .where(InvestmentRequest.status == InvestmentRequestStatus.pending)
        .order_by(InvestmentRequest.created_at.desc())
    )
    pending_investments = inv_req_res.scalars().all()
    pending_investments_count = len(pending_investments)
    pending_investments_amount = sum(float(r.monto or 0) for r in pending_investments)

    pending_investments_list = [
        {
            "id": r.id,
            "user_id": r.user_id,
            "user_name": r.user.name if r.user else "Usuario",
            "user_email": r.user.email if r.user else "",
            "user_document": getattr(r.user, "document_id", None) if r.user else None,
            "package_name": r.package.name if r.package else "Paquete Inversión",
            "monto": float(r.monto or 0),
            "comprobante_path": r.comprobante_path,
            "created_at": r.created_at.isoformat() if r.created_at else None
        }
        for r in pending_investments
    ]

    # 2. Recargas de Billetera Pendientes (auto-sanando aquellas que ya fueron procesadas por Yoint o ya acreditaron saldo)
    from src.models.yoint_payin import YointPayin
    from src.models.wallet import WalletTransaction
    from sqlalchemy import or_, and_

    recharges_res = await db.execute(
        select(WalletRecharge)
        .options(selectinload(WalletRecharge.user))
        .where(WalletRecharge.status == "pending")
        .order_by(WalletRecharge.created_at.desc())
    )
    raw_pending_recharges = recharges_res.scalars().all()
    pending_recharges = []
    has_analytics_healed = False

    for r in raw_pending_recharges:
        # Verificar si tiene payin SUCCESS
        p_res = await db.execute(
            select(YointPayin).where(
                or_(
                    YointPayin.wallet_recharge_id == r.id,
                    and_(
                        YointPayin.user_id == r.user_id,
                        YointPayin.status == "SUCCESS",
                        or_(
                            YointPayin.order_id == r.reference_number,
                            YointPayin.payment_reference == r.reference_number,
                            and_(
                                YointPayin.amount == r.amount,
                                YointPayin.payin_type == "WALLET_TOPUP"
                            )
                        )
                    )
                )
            ).order_by(YointPayin.id.desc())
        )
        matched_p = p_res.scalars().first()
        if matched_p and matched_p.status == "SUCCESS":
            r.status = "approved"
            r.reviewed_at = matched_p.updated_at or datetime.utcnow()
            r.reference_number = matched_p.order_id or matched_p.payment_reference or r.reference_number
            r.admin_notes = f"Aprobada automáticamente por pasarela Yoint ({matched_p.order_id or matched_p.payment_reference})"
            if not matched_p.wallet_recharge_id:
                matched_p.wallet_recharge_id = r.id
                db.add(matched_p)
            db.add(r)
            has_analytics_healed = True
            continue

        # Verificar si ya existe transacción de saldo
        tx_res = await db.execute(
            select(WalletTransaction).where(
                WalletTransaction.wallet_id == r.wallet_id,
                WalletTransaction.amount == r.amount,
                WalletTransaction.type.in_(["wallet_recharge", "recarga", "recharge"]),
                WalletTransaction.created_at >= r.created_at
            )
        )
        matched_tx = tx_res.scalars().first()
        if matched_tx:
            r.status = "approved"
            r.reviewed_at = matched_tx.created_at or datetime.utcnow()
            r.admin_notes = "Aprobada automáticamente (Saldo acreditado en billetera)"
            db.add(r)
            has_analytics_healed = True
            continue

        pending_recharges.append(r)

    if has_analytics_healed:
        try:
            await db.commit()
        except Exception:
            await db.rollback()

    pending_recharges_count = len(pending_recharges)
    pending_recharges_amount = sum(float(r.amount or 0) for r in pending_recharges)

    pending_recharges_list = [
        {
            "id": r.id,
            "user_id": r.user_id,
            "user_name": r.user.name if r.user else "Usuario",
            "user_email": r.user.email if r.user else "",
            "user_document": getattr(r.user, "document_id", None) if r.user else None,
            "amount": float(r.amount or 0),
            "payment_method": r.payment_method,
            "reference_number": r.reference_number,
            "receipt_url": r.receipt_url,
            "created_at": r.created_at.isoformat() if r.created_at else None
        }
        for r in pending_recharges
    ]

    # 3. Retiros / Pagos Pendientes
    withdrawals_res = await db.execute(
        select(Withdrawal)
        .options(selectinload(Withdrawal.user))
        .where(Withdrawal.estado.in_([WithdrawalStatus.PENDING, "pendiente"]))
        .order_by(Withdrawal.created_at.desc())
    )
    pending_withdrawals = withdrawals_res.scalars().all()
    pending_withdrawals_count = len(pending_withdrawals)
    pending_withdrawals_amount = sum(float(w.monto_neto or w.monto or 0) for w in pending_withdrawals)

    pending_withdrawals_list = [
        {
            "id": w.id,
            "user_id": w.user_id,
            "user_name": w.user.name if w.user else "Inversionista",
            "user_email": w.user.email if w.user else "",
            "user_document": getattr(w.user, "document_id", None) if w.user else None,
            "monto": float(w.monto or 0),
            "impuesto": float(w.impuesto or 0),
            "monto_neto": float(w.monto_neto or w.monto or 0),
            "banco": w.banco,
            "tipo_cuenta": w.tipo_cuenta,
            "numero_cuenta": w.numero_cuenta,
            "tipo": w.tipo.value if hasattr(w.tipo, "value") else str(w.tipo),
            "fecha_solicitud": w.fecha_solicitud.isoformat() if w.fecha_solicitud else None,
            "created_at": w.created_at.isoformat() if w.created_at else None
        }
        for w in pending_withdrawals
    ]

    total_pending_action_amount = (
        pending_investments_amount + pending_recharges_amount + pending_withdrawals_amount
    )

    return {
        "summary_cards": {
            "pending_investments_count": pending_investments_count,
            "pending_investments_amount": pending_investments_amount,
            "pending_recharges_count": pending_recharges_count,
            "pending_recharges_amount": pending_recharges_amount,
            "pending_withdrawals_count": pending_withdrawals_count,
            "pending_withdrawals_amount": pending_withdrawals_amount,
            "total_pending_action_amount": total_pending_action_amount
        },
        "pending_investment_requests": pending_investments_list,
        "pending_recharges": pending_recharges_list,
        "pending_withdrawals": pending_withdrawals_list
    }


@router.get("/statement", dependencies=[Depends(RequirePermission(["admin.users.manage", "admin.investors.manage", "admin.payments.manage", "admin.audits.manage", "admin.roles.manage"]))])
async def get_analytics_statement(
    start_date: Optional[str] = Query(None, description="Fecha inicial formato YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="Fecha final formato YYYY-MM-DD"),
    user_id: Optional[int] = Query(None, description="Filtrar por usuario específico"),
    tx_type: Optional[str] = Query(None, description="Filtrar por tipo de transacción"),
    db: AsyncSession = Depends(get_db)
):
    """
    Alias documentado en Módulo 14 para obtener el estado de cuenta financiero global consolidado.
    """
    from src.services.user_service import UserService
    return await UserService.get_global_account_statement(db, start_date, end_date, user_id, tx_type)

