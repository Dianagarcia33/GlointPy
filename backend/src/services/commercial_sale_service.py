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

async def check_client_classification(db: AsyncSession, client_document: str) -> Dict[str, Any]:
    """
    Verifica si el documento o código del cliente ya existe en el sistema.
    Si ya existe (User o Investor), fuerza el tipo 'referido' y bloquea 'contrato_nuevo' y 'reinversion'.
    """
    doc_clean = client_document.strip()
    
    # Buscar en usuarios por documento
    user_res = await db.execute(select(User).where(User.document_id == doc_clean))
    user = user_res.scalars().first()
    
    # Buscar en inversionistas por código o usuario
    investor_res = await db.execute(
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
    investor = investor_res.scalars().first()
    
    client_exists = bool(user or investor)
    client_name = user.name if user else (investor.user.name if investor and investor.user else None)
    client_doc = user.document_id if user and user.document_id else (investor.user.document_id if investor and investor.user else doc_clean)
    pkg_val = float(investor.package.value) if investor and investor.package and investor.package.value else 0.0
    
    if client_exists:
        return {
            "client_document": client_doc,
            "client_exists": True,
            "is_existing_client": True,
            "client_name": client_name,
            "monto": pkg_val,
            "allowed_types": ["referido"],
            "forced_type": "referido"
        }
    else:
        return {
            "client_document": doc_clean,
            "client_exists": False,
            "is_existing_client": False,
            "client_name": None,
            "monto": 0.0,
            "allowed_types": ["contrato_nuevo", "reinversion"],
            "forced_type": None
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
    await db.flush()
    
    # 4. Acreditar automáticamente a la Wallet del Comercial
    wallet_res = await db.execute(select(Wallet).where(Wallet.user_id == commercial_id))
    wallet = wallet_res.scalars().first()
    if not wallet:
        wallet = Wallet(user_id=commercial_id, balance=Decimal("0.00"), currency="COP", status="active")
        db.add(wallet)
        await db.flush()
        
    wallet.balance += comm_amount
    
    transaction = WalletTransaction(
        wallet_id=wallet.id,
        amount=comm_amount,
        type="commercial_commission",
        description=f"Comisión venta comercial #{sale.id} ({final_sale_type.value}) - Cliente {sale.client_document}",
        reference_id=str(sale.id)
    )
    db.add(transaction)
    
    await db.commit()
    await db.refresh(sale)
    return sale
