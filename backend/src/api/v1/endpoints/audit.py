from fastapi import APIRouter, Depends, Query
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
from pydantic import computed_field
from dateutil.relativedelta import relativedelta
from datetime import datetime

class SimpleInvestorAuditResponse(InvestorBase):
    id: int
    package: Optional[PackageResponse] = None
    period: Optional[PeriodResponse] = None
    contract_histories: Optional[list[ContractHistoryResponse]] = None

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
    
    # Load wallet and investments with their packages, periods, and contract histories
    query = query.options(
        selectinload(User.wallet),
        selectinload(User.investments).selectinload(Investor.package),
        selectinload(User.investments).selectinload(Investor.period),
        selectinload(User.investments).selectinload(Investor.contract_histories)
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
