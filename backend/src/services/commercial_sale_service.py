from decimal import Decimal
from datetime import datetime, date
from typing import Optional, Tuple, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import extract, func

from src.models.user import User
from src.models.investor import Investor
from src.models.commercial_sale import CommercialSale, CommercialSaleType
from src.models.wallet import Wallet, WalletTransaction
from src.schemas.commercial_sale import CommercialSaleCreate

THRESHOLD_36M = Decimal("36000000.00")
RATE_30 = Decimal("0.030") # 3.0%
RATE_35 = Decimal("0.035") # 3.5%
RATE_REFERRAL = Decimal("0.018") # 1.8% Fijo

async def check_client_classification(db: AsyncSession, client_document: str) -> Dict[str, Any]:
    """
    Verifica si el documento del cliente ya existe en el sistema.
    Si ya existe (User o Investor), fuerza el tipo 'referido' y bloquea 'contrato_nuevo' y 'reinversion'.
    """
    doc_clean = client_document.strip()
    
    # Buscar en usuarios por documento
    user_res = await db.execute(select(User).where(User.document_id == doc_clean))
    user = user_res.scalars().first()
    
    # Buscar en inversionistas por código o usuario
    investor_res = await db.execute(select(Investor).join(User).where(User.document_id == doc_clean))
    investor = investor_res.scalars().first()
    
    client_exists = bool(user or investor)
    client_name = user.name if user else None
    
    if client_exists:
        return {
            "client_document": doc_clean,
            "client_exists": True,
            "is_existing_client": True,
            "client_name": client_name,
            "allowed_types": ["referido"],
            "forced_type": "referido"
        }
    else:
        return {
            "client_document": doc_clean,
            "client_exists": False,
            "is_existing_client": False,
            "client_name": None,
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
