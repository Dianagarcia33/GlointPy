from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import or_, func
from typing import List, Optional
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
from src.schemas.yield_calc import CalculateYieldRequest, YieldCalculationResult, PayYieldRequest, UserYieldCalculationResult, PayUserYieldRequest
from src.services.yield_calculator import calculate_investment_yield
from src.models.wallet import Wallet, WalletTransaction
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
        selectinload(User.investments).selectinload(Investor.withdrawals)
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
        selectinload(User.investments).selectinload(Investor.withdrawals)
    )
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
    investments_yields = []
    total_yield = 0
    
    for investment in user.investments:
        calc_result = calculate_investment_yield(investment, request.start_date, request.end_date)
        if calc_result.total_yield > 0 or len(calc_result.segments) > 0:
            investments_yields.append(calc_result)
            total_yield += calc_result.total_yield
            
    return UserYieldCalculationResult(
        user_id=user_id,
        requested_start_date=request.start_date,
        requested_end_date=request.end_date,
        total_yield=total_yield,
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
        selectinload(User.investments).selectinload(Investor.withdrawals)
    )
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
    if not user.wallet:
        raise HTTPException(status_code=400, detail="El usuario no tiene una billetera activa")
        
    investments_yields = []
    total_yield = 0
    
    for investment in user.investments:
        calc_result = calculate_investment_yield(investment, request.start_date, request.end_date)
        if calc_result.total_yield > 0:
            investments_yields.append(calc_result)
            total_yield += calc_result.total_yield
            
            # Create a transaction for EACH investment
            transaction = WalletTransaction(
                wallet_id=user.wallet.id,
                amount=calc_result.total_yield,
                type="ingreso",
                reference_type="rendimiento_inversion",
                reference_id=investment.id,
                description=f"Rendimiento del {calc_result.effective_start_date} al {calc_result.effective_end_date} (Inv. {investment.assigned_code})",
                # We will update balance incrementally or once at the end.
                balance_after=0 # Placeholder, we will fix below
            )
            db.add(transaction)
                
    if total_yield <= 0:
        raise HTTPException(status_code=400, detail="No hay rendimientos para pagar en este ciclo")
        
    # We must update wallet balance and the balance_after for each transaction correctly
    current_balance = user.wallet.balance
    
    # Actually, we can just let the transactions hold the cumulative balance
    # But since db.add doesn't guarantee order of auto-increment IDs immediately without flush,
    # let's just do it sequentially.
    for obj in db.new:
        if isinstance(obj, WalletTransaction):
            current_balance += obj.amount
            obj.balance_after = current_balance
            
    user.wallet.balance = current_balance
    await db.commit()
    
    return {"message": "Pago consolidado procesado exitosamente", "amount_paid": total_yield}
