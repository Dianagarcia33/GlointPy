from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import or_, func
from typing import List, Optional
from decimal import Decimal
from pydantic import BaseModel, ConfigDict

from src.core.database import get_db
from src.api.deps import RequirePermission
from src.models.user import User
from src.models.investor import Investor
from src.schemas.user import UserResponse
from src.schemas.wallet import WalletResponse
from src.schemas.package import PackageResponse
from src.schemas.period import PeriodResponse
from src.schemas.investor import InvestorBase
from src.schemas.contract_history import ContractHistoryResponse
from src.schemas.withdrawal import WithdrawalResponse
from src.schemas.yield_calc import (
    CalculateYieldRequest, 
    YieldCalculationResult, 
    PayYieldRequest, 
    UserYieldCalculationResult, 
    PayUserYieldRequest,
    BulkYieldUserSummary,
    BulkYieldCalculationResult,
    BulkPayYieldResult,
    UpdateAccelerationDateRequest
)
from src.services.yield_calculator import calculate_investment_yield
from src.models.wallet import Wallet, WalletTransaction
from src.models.withdrawal import Withdrawal
from pydantic import computed_field
from dateutil.relativedelta import relativedelta
from datetime import datetime

class SimpleInvestorAuditResponse(InvestorBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    package: Optional[PackageResponse] = None
    period: Optional[PeriodResponse] = None
    contract_histories: Optional[list[ContractHistoryResponse]] = None
    withdrawals: Optional[list[WithdrawalResponse]] = None

    @computed_field
    @property
    def end_date(self) -> datetime:
        base_date = self.start_date or datetime.utcnow()
        if not self.period:
            return base_date
        return base_date + relativedelta(days=self.period.days)

    model_config = ConfigDict(from_attributes=True)

class AuditUserResponse(BaseModel):
    id: int
    name: str
    email: str
    document_id: Optional[str] = None
    phone_number: Optional[str] = None
    is_active: bool
    wallet: Optional[WalletResponse] = None
    investments: List[SimpleInvestorAuditResponse] = []
    
    model_config = ConfigDict(from_attributes=True)

class AuditUserPaginatedResponse(BaseModel):
    total: int
    page: int
    limit: int
    data: List[AuditUserResponse]

router = APIRouter()

@router.get("/users", response_model=AuditUserPaginatedResponse, dependencies=[Depends(RequirePermission("admin.audits.manage"))])
async def get_audit_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(User)
    
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                User.name.ilike(search_term),
                User.email.ilike(search_term),
                User.document_id.ilike(search_term)
            )
        )
        
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()
    
    offset = (page - 1) * limit
    
    # Load wallet and investments with their packages, periods, contract histories, and withdrawals
    query = query.options(
        selectinload(User.wallet),
        selectinload(User.investments).selectinload(Investor.package),
        selectinload(User.investments).selectinload(Investor.period),
        selectinload(User.investments).selectinload(Investor.contract_histories),
        selectinload(User.investments).selectinload(Investor.withdrawals).selectinload(Withdrawal.user)
    )
    
    query = query.order_by(User.id.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    data = result.scalars().all()
    
    return {
        "total": total,
        "page": page,
        "limit": limit,
        "data": data
    }

@router.post("/investments/{investment_id}/calculate-yield", response_model=YieldCalculationResult, dependencies=[Depends(RequirePermission("admin.audits.manage"))])
async def preview_investment_yield(
    investment_id: int,
    request: CalculateYieldRequest,
    db: AsyncSession = Depends(get_db)
):
    query = select(Investor).where(Investor.id == investment_id).options(
        selectinload(Investor.package),
        selectinload(Investor.period),
        selectinload(Investor.withdrawals)
    )
    result = await db.execute(query)
    investment = result.scalar_one_or_none()
    
    if not investment:
        raise HTTPException(status_code=404, detail="Inversión no encontrada")
        
    calc_result = calculate_investment_yield(investment, request.start_date, request.end_date)
    return calc_result

@router.post("/investments/{investment_id}/pay-yield", dependencies=[Depends(RequirePermission("admin.audits.manage"))])
async def pay_investment_yield(
    investment_id: int,
    request: PayYieldRequest,
    db: AsyncSession = Depends(get_db)
):
    query = select(Investor).where(Investor.id == investment_id).options(
        selectinload(Investor.package),
        selectinload(Investor.period),
        selectinload(Investor.withdrawals),
        selectinload(Investor.user).selectinload(User.wallet)
    )
    result = await db.execute(query)
    investment = result.scalar_one_or_none()
    
    if not investment:
        raise HTTPException(status_code=404, detail="Inversión no encontrada")
        
    calc_result = calculate_investment_yield(investment, request.start_date, request.end_date)
    
    if calc_result.total_yield <= 0:
        raise HTTPException(status_code=400, detail="El rendimiento calculado es 0 o negativo")
        
    wallet = investment.user.wallet
    if not wallet:
        raise HTTPException(status_code=400, detail="El usuario no tiene una billetera activa")
        
    # Update balance
    wallet.balance += calc_result.total_yield
    
    # Create transaction
    transaction = WalletTransaction(
        wallet_id=wallet.id,
        amount=calc_result.total_yield,
        type="ingreso",
        reference_type="rendimiento_inversion",
        reference_id=investment.id,
        description=f"Rendimiento de inversión {investment.assigned_code} del {calc_result.effective_start_date} al {calc_result.effective_end_date}",
        balance_after=wallet.balance
    )
    db.add(transaction)
    
    await db.commit()
    return {"message": "Pago de rendimiento procesado exitosamente", "amount_paid": calc_result.total_yield}

@router.post("/users/{user_id}/calculate-yields", response_model=UserYieldCalculationResult, dependencies=[Depends(RequirePermission("admin.audits.manage"))])
async def preview_user_yields(
    user_id: int,
    request: CalculateYieldRequest,
    db: AsyncSession = Depends(get_db)
):
    query = select(User).where(User.id == user_id).options(
        selectinload(User.investments).selectinload(Investor.package),
        selectinload(User.investments).selectinload(Investor.period),
        selectinload(User.investments).selectinload(Investor.withdrawals),
        selectinload(User.investments).selectinload(Investor.accelerations)
    )
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
    investments_yields = []
    total_yield = Decimal("0.00")
    total_acceleration_bonus = Decimal("0.00")
    
    for investment in user.investments:
        calc_result = calculate_investment_yield(investment, request.start_date, request.end_date)
        if calc_result.total_yield > 0 or calc_result.acceleration_bonus > 0 or len(calc_result.segments) > 0:
            investments_yields.append(calc_result)
            total_yield += calc_result.total_yield
            total_acceleration_bonus += calc_result.acceleration_bonus
            
    grand_total = total_yield + total_acceleration_bonus

    return UserYieldCalculationResult(
        user_id=user_id,
        requested_start_date=request.start_date,
        requested_end_date=request.end_date,
        total_yield=total_yield,
        total_acceleration_bonus=total_acceleration_bonus,
        grand_total=grand_total,
        investments_yields=investments_yields
    )

@router.post("/users/{user_id}/pay-yields", dependencies=[Depends(RequirePermission("admin.audits.manage"))])
async def pay_user_yields(
    user_id: int,
    request: PayUserYieldRequest,
    db: AsyncSession = Depends(get_db)
):
    query = select(User).where(User.id == user_id).options(
        selectinload(User.wallet),
        selectinload(User.investments).selectinload(Investor.package),
        selectinload(User.investments).selectinload(Investor.period),
        selectinload(User.investments).selectinload(Investor.withdrawals),
        selectinload(User.investments).selectinload(Investor.accelerations)
    )
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
    if not user.wallet:
        raise HTTPException(status_code=400, detail="El usuario no tiene una billetera activa")
        
    investments_yields = []
    total_yield = Decimal("0.00")
    total_acceleration_bonus = Decimal("0.00")
    
    for investment in user.investments:
        calc_result = calculate_investment_yield(investment, request.start_date, request.end_date)
        if calc_result.total_yield > 0 or calc_result.acceleration_bonus > 0:
            investments_yields.append(calc_result)
            total_yield += calc_result.total_yield
            total_acceleration_bonus += calc_result.acceleration_bonus
            
            # Create a transaction for EACH investment yield according to pay_mode
            pay_mode = request.pay_mode or "all"
            include_yields = pay_mode in ("all", "yields_only")
            include_bonuses = pay_mode in ("all", "bonuses_only")

            if include_yields and calc_result.total_yield > 0:
                total_yield += calc_result.total_yield
                transaction = WalletTransaction(
                    wallet_id=user.wallet.id,
                    amount=calc_result.total_yield,
                    type="ingreso",
                    reference_type="rendimiento_inversion",
                    reference_id=investment.id,
                    description=f"Rendimiento del {calc_result.effective_start_date} al {calc_result.effective_end_date} (Inv. {investment.assigned_code})",
                    balance_after=0
                )
                db.add(transaction)

            if include_bonuses and calc_result.acceleration_bonus > 0:
                total_acceleration_bonus += calc_result.acceleration_bonus
                acc_transaction = WalletTransaction(
                    wallet_id=user.wallet.id,
                    amount=calc_result.acceleration_bonus,
                    type="ingreso",
                    reference_type="bono_aceleracion",
                    reference_id=investment.id,
                    description=f"Bono de aceleración de inversión {investment.assigned_code}",
                    balance_after=0
                )
                db.add(acc_transaction)
                
    grand_total = total_yield + total_acceleration_bonus
    if grand_total <= 0:
        raise HTTPException(status_code=400, detail="No hay rendimientos ni bonos para pagar en este ciclo según el modo seleccionado")
        
    current_balance = user.wallet.balance
    
    for obj in db.new:
        if isinstance(obj, WalletTransaction):
            current_balance += obj.amount
            obj.balance_after = current_balance
            
    user.wallet.balance = current_balance
    await db.commit()
    
    return {
        "message": "Pago de rendimientos/bonos procesado exitosamente",
        "amount_paid": float(grand_total),
        "total_yield": float(total_yield),
        "total_acceleration_bonus": float(total_acceleration_bonus)
    }


@router.put("/accelerations/{acceleration_id}/date", dependencies=[Depends(RequirePermission("admin.audits.manage"))])
async def update_acceleration_date(
    acceleration_id: int,
    req: UpdateAccelerationDateRequest,
    db: AsyncSession = Depends(get_db)
):
    from src.models.acceleration import Acceleration
    acc_res = await db.execute(
        select(Acceleration).where(Acceleration.id == acceleration_id)
    )
    acc = acc_res.scalars().first()
    if not acc:
        raise HTTPException(status_code=404, detail="Bono de aceleración no encontrado")
        
    try:
        new_date = datetime.fromisoformat(req.created_at.replace("Z", "+00:00"))
    except Exception:
        raise HTTPException(status_code=400, detail="Formato de fecha inválido")
        
    acc.created_at = new_date
    await db.commit()
    await db.refresh(acc)
    return {"message": "Fecha del bono de aceleración actualizada exitosamente", "id": acc.id, "created_at": acc.created_at.isoformat()}


@router.get("/users/{user_id}/wallet-transactions", dependencies=[Depends(RequirePermission("admin.audits.manage"))])
async def get_user_wallet_transactions(
    user_id: int,
    db: AsyncSession = Depends(get_db)
):
    query = select(User).where(User.id == user_id).options(
        selectinload(User.wallet).selectinload(Wallet.transactions)
    )
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user or not user.wallet:
        return []
        
    transactions = sorted(user.wallet.transactions, key=lambda x: x.created_at, reverse=True)
    return transactions

@router.post("/users/{user_id}/create-wallet", dependencies=[Depends(RequirePermission("admin.audits.manage"))])
async def create_user_wallet(
    user_id: int,
    db: AsyncSession = Depends(get_db)
):
    query = select(User).where(User.id == user_id).options(selectinload(User.wallet))
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
    if user.wallet:
        raise HTTPException(status_code=400, detail="El usuario ya tiene una billetera")
        
    new_wallet = Wallet(
        user_id=user.id,
        balance=0,
        status="active"
    )
    db.add(new_wallet)
    await db.commit()
    
    return {"message": "Billetera creada exitosamente"}

@router.post("/bulk-calculate-yields", response_model=BulkYieldCalculationResult, dependencies=[Depends(RequirePermission("admin.audits.manage"))])
async def bulk_calculate_yields(
    request: CalculateYieldRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Simula y audita en masa el cálculo de rendimientos y bonos de aceleración de TODOS los usuarios activos.
    """
    from decimal import Decimal

    query = select(User).options(
        selectinload(User.wallet),
        selectinload(User.investments).selectinload(Investor.package),
        selectinload(User.investments).selectinload(Investor.period),
        selectinload(User.investments).selectinload(Investor.withdrawals),
        selectinload(User.investments).selectinload(Investor.accelerations)
    )
    result = await db.execute(query)
    users = result.scalars().all()

    users_summaries = []
    global_yield_total = Decimal("0.00")
    global_acceleration_bonus_total = Decimal("0.00")
    global_grand_total = Decimal("0.00")
    total_payable_users = 0

    for user in users:
        if not user.investments:
            continue

        user_yield_total = Decimal("0.00")
        user_acc_bonus_total = Decimal("0.00")
        active_investments_count = 0
        user_investments_detail = []

        for investment in user.investments:
            calc_res = calculate_investment_yield(investment, request.start_date, request.end_date)
            if calc_res.total_yield > 0 or calc_res.acceleration_bonus > 0 or len(calc_res.segments) > 0:
                active_investments_count += 1
                user_yield_total += calc_res.total_yield
                user_acc_bonus_total += calc_res.acceleration_bonus
                user_investments_detail.append(calc_res)

        user_grand_total = user_yield_total + user_acc_bonus_total

        if user_grand_total > 0 or active_investments_count > 0:
            if user_grand_total > 0:
                total_payable_users += 1

            users_summaries.append(BulkYieldUserSummary(
                user_id=user.id,
                user_name=user.name or user.email.split('@')[0],
                email=user.email,
                document_id=user.document_id,
                has_wallet=user.wallet is not None,
                investments_count=active_investments_count,
                total_yield=user_yield_total,
                total_acceleration_bonus=user_acc_bonus_total,
                grand_total=user_grand_total,
                investments_detail=user_investments_detail
            ))

            global_yield_total += user_yield_total
            global_acceleration_bonus_total += user_acc_bonus_total
            global_grand_total += user_grand_total


    return BulkYieldCalculationResult(
        requested_start_date=request.start_date,
        requested_end_date=request.end_date,
        total_users_evaluated=len(users),
        total_payable_users=total_payable_users,
        global_yield_total=global_yield_total,
        global_acceleration_bonus_total=global_acceleration_bonus_total,
        global_grand_total=global_grand_total,
        users_summaries=users_summaries
    )


@router.post("/bulk-pay-yields", response_model=BulkPayYieldResult, dependencies=[Depends(RequirePermission("admin.audits.manage"))])
async def bulk_pay_yields(
    request: PayUserYieldRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Ejecuta masivamente la transferencia de rendimientos y bonos de aceleración a las wallets de todos los usuarios beneficiarios.
    """
    from decimal import Decimal

    pay_mode = request.pay_mode or "all"
    include_yields = pay_mode in ("all", "yields_only")
    include_bonuses = pay_mode in ("all", "bonuses_only")

    query = select(User).options(
        selectinload(User.wallet),
        selectinload(User.investments).selectinload(Investor.package),
        selectinload(User.investments).selectinload(Investor.period),
        selectinload(User.investments).selectinload(Investor.withdrawals),
        selectinload(User.investments).selectinload(Investor.accelerations)
    )
    result = await db.execute(query)
    users = result.scalars().all()

    total_users_paid = 0
    global_yield_total = Decimal("0.00")
    global_acceleration_bonus_total = Decimal("0.00")
    global_grand_total = Decimal("0.00")

    for user in users:
        if not user.investments:
            continue

        user_yield_total = Decimal("0.00")
        user_acc_bonus_total = Decimal("0.00")
        transactions_to_add = []

        for investment in user.investments:
            calc_res = calculate_investment_yield(investment, request.start_date, request.end_date)
            
            if include_yields and calc_res.total_yield > 0:
                user_yield_total += calc_res.total_yield
                transactions_to_add.append({
                    "amount": calc_res.total_yield,
                    "type": "ingreso",
                    "reference_type": "rendimiento_inversion",
                    "reference_id": investment.id,
                    "description": f"Rendimiento del {calc_res.effective_start_date} al {calc_res.effective_end_date} (Inv. {investment.assigned_code})"
                })

            if include_bonuses and calc_res.acceleration_bonus > 0:
                user_acc_bonus_total += calc_res.acceleration_bonus
                transactions_to_add.append({
                    "amount": calc_res.acceleration_bonus,
                    "type": "ingreso",
                    "reference_type": "bono_aceleracion",
                    "reference_id": investment.id,
                    "description": f"Bono de aceleración de inversión {investment.assigned_code}"
                })

        user_grand_total = user_yield_total + user_acc_bonus_total

        if user_grand_total > 0 and transactions_to_add:
            # Ensure wallet exists
            wallet = user.wallet
            if not wallet:
                wallet = Wallet(user_id=user.id, balance=Decimal("0.00"), status="active")
                db.add(wallet)
                await db.flush()

            current_balance = wallet.balance
            for tx_data in transactions_to_add:
                current_balance += tx_data["amount"]
                tx = WalletTransaction(
                    wallet_id=wallet.id,
                    amount=tx_data["amount"],
                    type=tx_data["type"],
                    reference_type=tx_data["reference_type"],
                    reference_id=tx_data["reference_id"],
                    description=tx_data["description"],
                    balance_after=current_balance
                )
                db.add(tx)

            wallet.balance = current_balance
            total_users_paid += 1
            global_yield_total += user_yield_total
            global_acceleration_bonus_total += user_acc_bonus_total
            global_grand_total += user_grand_total

    await db.commit()

    return BulkPayYieldResult(
        message=f"Transferencia masiva ({pay_mode}) ejecutada exitosamente a las billeteras",
        requested_start_date=request.start_date,
        requested_end_date=request.end_date,
        total_users_paid=total_users_paid,
        global_yield_total=global_yield_total,
        global_acceleration_bonus_total=global_acceleration_bonus_total,
        global_grand_total=global_grand_total
    )

