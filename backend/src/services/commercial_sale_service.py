from decimal import Decimal
from datetime import datetime, date
from typing import Optional, Tuple, Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import extract, func, or_
from sqlalchemy.orm import selectinload

from src.models.user import User
from src.models.investor import Investor
from src.models.commercial_sale import CommercialSale, CommercialSaleType
from src.models.commercial_bonus import CommercialBonus, CommercialBonusType, CommercialBonusStatus
from src.models.wallet import Wallet, WalletTransaction
from src.schemas.commercial_sale import CommercialSaleCreate

THRESHOLD_36M = Decimal("36000000.00")
RATE_30 = Decimal("0.030") # 3.0%
RATE_35 = Decimal("0.035") # 3.5%
RATE_REFERRAL = Decimal("0.018") # 1.8% Fijo

async def search_clients_service(db: AsyncSession, query_term: str) -> List[Dict[str, Any]]:
    """
    Busca clientes a medida que el comercial escribe:
    - Por Nombre (User.name) en la tabla 'users'
    - Por Cédula/Documento (User.document_id) en la tabla 'users'
    - Por Código Asignado (Investor.assigned_code) en la tabla 'investors'
    """
    term = query_term.strip()
    if not term or len(term) < 2:
        return []
        
    results = []
    seen_user_ids = set()
    
    # 1. Buscar en Investors por código asignado (assigned_code) ej: IG1974
    inv_res = await db.execute(
        select(Investor)
        .options(
            selectinload(Investor.user),
            selectinload(Investor.package)
        )
        .where(Investor.assigned_code.ilike(f"%{term}%"))
        .limit(10)
    )
    investors = inv_res.scalars().all()
    for inv in investors:
        if inv.user and inv.user.id not in seen_user_ids:
            seen_user_ids.add(inv.user.id)
            pkg_val = float(inv.package.value) if inv.package and inv.package.value else 0.0
            results.append({
                "user_id": inv.user.id,
                "name": inv.user.name,
                "document_id": inv.user.document_id,
                "email": inv.user.email,
                "assigned_code": inv.assigned_code,
                "monto": pkg_val,
                "is_existing_client": True,
                "forced_type": "referido"
            })

    # 2. Buscar en User por nombre o por número de cédula/documento
    user_res = await db.execute(
        select(User)
        .options(
            selectinload(User.investments).selectinload(Investor.package)
        )
        .where(
            or_(
                User.name.ilike(f"%{term}%"),
                User.document_id.ilike(f"%{term}%"),
                User.email.ilike(f"%{term}%")
            )
        )
        .limit(10)
    )
    users = user_res.scalars().all()
    for u in users:
        if u.id not in seen_user_ids:
            seen_user_ids.add(u.id)
            first_inv = u.investments[0] if u.investments else None
            code = first_inv.assigned_code if first_inv else None
            pkg_val = float(first_inv.package.value) if first_inv and first_inv.package else 0.0
            results.append({
                "user_id": u.id,
                "name": u.name,
                "document_id": u.document_id,
                "email": u.email,
                "assigned_code": code,
                "monto": pkg_val,
                "is_existing_client": True,
                "forced_type": "referido"
            })
            
    return results

from dateutil.relativedelta import relativedelta
from src.models.contract_history import ContractHistory

def get_current_commercial_cycle_start(ref_date: date) -> date:
    """
    Retorna la fecha de inicio del ciclo comercial vigente (día 29 de cada mes).
    - Si el día actual es >= 29: inicio = día 29 del mes actual.
    - Si el día actual es < 29: inicio = día 29 del mes anterior.
    """
    if ref_date.day >= 29:
        return date(ref_date.year, ref_date.month, 29)
    else:
        prev = ref_date - relativedelta(months=1)
        return date(prev.year, prev.month, 29)

async def check_client_classification(db: AsyncSession, client_document: str) -> Dict[str, Any]:
    """
    Verifica la clasificación comercial del cliente con base en el ciclo comercial de corte (día 29)
    y los registros de contrato / contract_histories.
    """
    doc_clean = client_document.strip()
    today = date.today()
    cycle_start = get_current_commercial_cycle_start(today)
    cycle_start_dt = datetime(cycle_start.year, cycle_start.month, cycle_start.day)

    # Buscar usuario por documento
    user_res = await db.execute(select(User).where(User.document_id == doc_clean))
    user = user_res.scalars().first()

    # Buscar contratos de este cliente
    investors_res = await db.execute(
        select(Investor)
        .options(
            selectinload(Investor.user),
            selectinload(Investor.package)
        )
        .join(User)
        .where(
            or_(
                User.document_id == doc_clean,
                Investor.assigned_code.ilike(doc_clean)
            )
        )
    )
    investors = investors_res.scalars().all()

    client_name = user.name if user else (investors[0].user.name if investors and investors[0].user else None)
    client_doc = user.document_id if user and user.document_id else (investors[0].user.document_id if investors and investors[0].user else doc_clean)
    pkg_val = float(investors[0].package.value) if investors and investors[0].package and investors[0].package.value else 0.0

    if not user and not investors:
        # Cliente 100% nuevo sin usuario ni contratos
        return {
            "client_document": doc_clean,
            "client_exists": False,
            "is_existing_client": False,
            "client_name": None,
            "monto": 0.0,
            "allowed_types": ["contrato_nuevo", "reinversion", "referido"],
            "forced_type": None
        }

    # Evaluar si algún contrato fue creado/iniciado dentro del ciclo comercial actual (del 29 para acá)
    has_new_contract_in_cycle = False
    investor_ids = []
    for inv in investors:
        investor_ids.append(inv.id)
        start_d = inv.start_date.date() if isinstance(inv.start_date, datetime) else inv.start_date
        created_dt = inv.created_at or datetime(start_d.year, start_d.month, start_d.day)
        if start_d >= cycle_start or created_dt >= cycle_start_dt:
            has_new_contract_in_cycle = True

    # Evaluar si existe algún registro en contract_histories en el ciclo actual para aumentos/reinversión
    has_history_increase_in_cycle = False
    if investor_ids:
        hist_res = await db.execute(
            select(ContractHistory)
            .where(
                ContractHistory.investor_id.in_(investor_ids),
                or_(
                    ContractHistory.fecha_inicio >= cycle_start,
                    ContractHistory.created_at >= cycle_start_dt
                )
            )
        )
        history_records = hist_res.scalars().all()
        if history_records:
            has_history_increase_in_cycle = True

    # Regla del Ciclo Comercial:
    # 1. Si se creó/inició un contrato en el ciclo comercial vigente (del 29 para acá): Se permite "contrato_nuevo".
    # 2. Si hay historial de incremento en el ciclo actual: Se permite "reinversion".
    # 3. Si solo tiene contratos antiguos y ningún cambio en el ciclo: Se considera cliente antiguo y se clasifica como "referido".
    if has_new_contract_in_cycle:
        return {
            "client_document": client_doc,
            "client_exists": True,
            "is_existing_client": False,
            "client_name": client_name,
            "monto": pkg_val,
            "allowed_types": ["contrato_nuevo", "reinversion", "referido"],
            "forced_type": None
        }
    elif has_history_increase_in_cycle:
        return {
            "client_document": client_doc,
            "client_exists": True,
            "is_existing_client": True,
            "client_name": client_name,
            "monto": pkg_val,
            "allowed_types": ["reinversion", "referido"],
            "forced_type": "reinversion"
        }
    else:
        return {
            "client_document": client_doc,
            "client_exists": True,
            "is_existing_client": True,
            "client_name": client_name,
            "monto": pkg_val,
            "allowed_types": ["referido"],
            "forced_type": "referido"
        }

async def calculate_marginal_commission(
    db: AsyncSession,
    commercial_id: int,
    sale_type: CommercialSaleType,
    amount: Decimal,
    sale_date: date
) -> Tuple[Decimal, Decimal, Decimal, Decimal]:
    """
    Calcula la comisión aplicando Partición Marginal al cruzar los $36.000.000 acumulados del mes.
    Retorna: (commission_amount, effective_commission_rate, tramo_a_amount, tramo_b_amount)
    """
    if sale_type == CommercialSaleType.referido:
        comm_amount = amount * RATE_REFERRAL
        return comm_amount, RATE_REFERRAL, Decimal("0.00"), Decimal("0.00")
        
    # Calcular acumulado mensual de ventas directas (Contrato Nuevo + Reinversión) del comercial en el mes en curso
    year = sale_date.year
    month = sale_date.month
    
    accum_res = await db.execute(
        select(func.coalesce(func.sum(CommercialSale.amount), 0))
        .where(
            CommercialSale.commercial_id == commercial_id,
            CommercialSale.sale_type.in_([CommercialSaleType.contrato_nuevo, CommercialSaleType.reinversion]),
            extract('year', CommercialSale.sale_date) == year,
            extract('month', CommercialSale.sale_date) == month
        )
    )
    prev_accumulated = Decimal(str(accum_res.scalar() or "0"))
    
    # Caso 1: El comercial ya había cruzado los 36M en ventas previas del mes
    if prev_accumulated >= THRESHOLD_36M:
        tramo_a = Decimal("0.00")
        tramo_b = amount
        comm_amount = amount * RATE_35
        effective_rate = RATE_35
        
    # Caso 2: Con esta venta completa o queda por debajo de los 36M
    elif (prev_accumulated + amount) <= THRESHOLD_36M:
        tramo_a = amount
        tramo_b = Decimal("0.00")
        comm_amount = amount * RATE_30
        effective_rate = RATE_30
        
    # Caso 3: PARTICIÓN MARGINAL (Esta venta cruza exactamente el umbral de los 36M)
    else:
        tramo_a = THRESHOLD_36M - prev_accumulated # Porción que completa los 36M
        tramo_b = amount - tramo_a                # Excedente que pasa a 3.5%
        
        comm_amount = (tramo_a * RATE_30) + (tramo_b * RATE_35)
        effective_rate = comm_amount / amount if amount > 0 else RATE_30
        
    return comm_amount, effective_rate, tramo_a, tramo_b

async def register_commercial_sale(
    db: AsyncSession,
    commercial_id: int,
    sale_data: CommercialSaleCreate
) -> CommercialSale:
    """
    Registra la venta comercial, valida la clasificación forzada si el cliente existe,
    calcula la partición marginal y acredita la comisión a la Wallet del comercial.
    """
    # 1. Validar clasificación del cliente
    classification = await check_client_classification(db, sale_data.client_document)
    
    final_sale_type = sale_data.sale_type
    if classification["is_existing_client"]:
        final_sale_type = CommercialSaleType.referido
        
    today = date.today()
    amount = sale_data.amount
    
    # 2. Calcular comisión marginal
    comm_amount, comm_rate, tramo_a, tramo_b = await calculate_marginal_commission(
        db, commercial_id, final_sale_type, amount, today
    )
    
    # 3. Guardar registro de la venta
    sale = CommercialSale(
        commercial_id=commercial_id,
        client_document=sale_data.client_document.strip(),
        client_name=sale_data.client_name.strip() if sale_data.client_name else classification.get("client_name"),
        sale_type=final_sale_type,
        referrer_code=sale_data.referrer_code.strip() if sale_data.referrer_code else None,
        amount=amount,
        commission_rate=comm_rate,
        commission_amount=comm_amount,
        tramo_a_amount=tramo_a,
        tramo_b_amount=tramo_b,
        sale_date=today
    )
    db.add(sale)
    await db.commit()
    await db.refresh(sale)

    # 4. Evaluar automáticamente Bonos Diarios y Bonos por Piso Mensual
    try:
        await evaluate_daily_bonus(db, commercial_id, today)
        await evaluate_monthly_floor_bonus(db, commercial_id, today.year, today.month)
    except Exception as e:
        print(f"Error al evaluar bonos comerciales: {e}")

    return sale


FLOOR_BONUSES = [
    (Decimal("200000000.00"), Decimal("3600000.00")),
    (Decimal("170000000.00"), Decimal("3060000.00")),
    (Decimal("140000000.00"), Decimal("2520000.00")),
    (Decimal("100000000.00"), Decimal("1800000.00")),
    (Decimal("79000000.00"),  Decimal("1422000.00")),
    (Decimal("54000000.00"),  Decimal("1080000.00")),
    (Decimal("36000000.00"),  Decimal("720000.00")),
    (Decimal("18000000.00"),  Decimal("360000.00")),
]

async def evaluate_daily_bonus(db: AsyncSession, commercial_id: int, target_date: date) -> Optional[CommercialBonus]:
    """
    Evaluación de Meta Diaria (cierre de jornada / al registrar venta):
    - Requiere un mínimo de 5 cierres en el mismo día calendario.
    - Filtro Antifraude (Consanguinidad de Código): Si 2 o más ventas del día comparten el mismo árbol o código de referido,
      solo cuenta 1 para el conteo de 5 cierres de la meta.
    - Meta Mixta (1.5%): Si logra 5 cierres válidos combinando Contrato Nuevo, Reinversión o Referido.
    - Meta Exclusiva (2.0%): Si logra 5 cierres válidos compuestos únicamente por Contrato Nuevo o Reinversión.
    """
    sales_res = await db.execute(
        select(CommercialSale)
        .where(
            CommercialSale.commercial_id == commercial_id,
            CommercialSale.sale_date == target_date
        )
    )
    daily_sales = sales_res.scalars().all()

    if not daily_sales:
        return None

    valid_sales_for_count = []
    seen_ref_trees = set()

    for s in daily_sales:
        ref_key = (s.referrer_code or s.referrer_client_id or s.client_document).strip() if (s.referrer_code or s.referrer_client_id or s.client_document) else ""
        if ref_key and ref_key in seen_ref_trees:
            continue
        if ref_key:
            seen_ref_trees.add(ref_key)
        valid_sales_for_count.append(s)

    if len(valid_sales_for_count) < 5:
        return None

    is_exclusive = all(
        s.sale_type in [CommercialSaleType.contrato_nuevo, CommercialSaleType.reinversion]
        for s in valid_sales_for_count
    )

    daily_total_amount = sum(Decimal(str(s.amount)) for s in daily_sales)
    rate = Decimal("0.020") if is_exclusive else Decimal("0.015")
    bonus_amount = daily_total_amount * rate

    bonus_res = await db.execute(
        select(CommercialBonus)
        .where(
            CommercialBonus.commercial_id == commercial_id,
            CommercialBonus.bonus_type == CommercialBonusType.meta_diaria,
            CommercialBonus.earned_date == target_date
        )
    )
    existing_bonus = bonus_res.scalars().first()

    bonus_desc = f"Bono Meta Diaria ({'2.0% Exclusivo' if is_exclusive else '1.5% Mixto'}) - {len(valid_sales_for_count)} cierres válidos"

    if existing_bonus:
        if existing_bonus.status == CommercialBonusStatus.pendiente:
            existing_bonus.amount = bonus_amount
            existing_bonus.details = bonus_desc
            await db.commit()
            await db.refresh(existing_bonus)
        return existing_bonus
    else:
        new_bonus = CommercialBonus(
            commercial_id=commercial_id,
            bonus_type=CommercialBonusType.meta_diaria,
            amount=bonus_amount,
            status=CommercialBonusStatus.pendiente,
            details=bonus_desc,
            earned_date=target_date
        )
        db.add(new_bonus)
        await db.commit()
        await db.refresh(new_bonus)
        return new_bonus


async def evaluate_monthly_floor_bonus(db: AsyncSession, commercial_id: int, year: int, month: int) -> Optional[CommercialBonus]:
    """
    Evaluación de Bono por Piso Cumplido (al cierre de mes a las 23:59:59):
    Suma la producción absoluta del comercial (Contratos Nuevos + Reinversiones + Referidos).
    Asigna un pago único fijo nominal correspondiente al escalón más alto.
    """
    sales_res = await db.execute(
        select(func.coalesce(func.sum(CommercialSale.amount), 0))
        .where(
            CommercialSale.commercial_id == commercial_id,
            extract('year', CommercialSale.sale_date) == year,
            extract('month', CommercialSale.sale_date) == month
        )
    )
    total_monthly = Decimal(str(sales_res.scalar() or "0"))

    bonus_amount = Decimal("0.00")
    tier_desc = ""

    for floor_amount, bonus_val in FLOOR_BONUSES:
        if total_monthly >= floor_amount:
            bonus_amount = bonus_val
            tier_desc = f"Piso de ${float(floor_amount):,.0f} COP"
            break

    if bonus_amount <= 0:
        return None

    last_day_date = date(year, month, 28)

    bonus_res = await db.execute(
        select(CommercialBonus)
        .where(
            CommercialBonus.commercial_id == commercial_id,
            CommercialBonus.bonus_type == CommercialBonusType.piso_cumplido,
            extract('year', CommercialBonus.earned_date) == year,
            extract('month', CommercialBonus.earned_date) == month
        )
    )
    existing_bonus = bonus_res.scalars().first()

    bonus_desc = f"Bono por Piso Cumplido ({tier_desc}) - Producción: ${float(total_monthly):,.0f} COP"

    if existing_bonus:
        if existing_bonus.status == CommercialBonusStatus.pendiente:
            existing_bonus.amount = bonus_amount
            existing_bonus.details = bonus_desc
            await db.commit()
            await db.refresh(existing_bonus)
        return existing_bonus
    else:
        new_bonus = CommercialBonus(
            commercial_id=commercial_id,
            bonus_type=CommercialBonusType.piso_cumplido,
            amount=bonus_amount,
            status=CommercialBonusStatus.pendiente,
            details=bonus_desc,
            earned_date=last_day_date
        )
        db.add(new_bonus)
        await db.commit()
        await db.refresh(new_bonus)
        return new_bonus
