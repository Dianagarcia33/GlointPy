from pydantic import BaseModel, ConfigDict, computed_field
from datetime import datetime
from typing import Optional
from dateutil.relativedelta import relativedelta
from src.schemas.user import UserResponse, UserWithBankAccountsResponse
from src.schemas.package import PackageResponse
from src.schemas.period import PeriodResponse
from src.schemas.contract_history import ContractHistoryResponse

class InvestorBase(BaseModel):
    assigned_code: str
    referred_by: Optional[str] = None
    user_id: int
    package_id: int
    period_id: int
    start_date: Optional[datetime] = None
    observations: Optional[str] = None

class InvestorCreate(InvestorBase):
    pass

class InvestorUpdate(BaseModel):
    assigned_code: Optional[str] = None
    referred_by: Optional[str] = None
    user_id: Optional[int] = None
    package_id: Optional[int] = None
    period_id: Optional[int] = None
    start_date: Optional[datetime] = None
    observations: Optional[str] = None

class InvestorResponse(InvestorBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Relationships
    user: Optional[UserWithBankAccountsResponse] = None
    package: Optional[PackageResponse] = None
    period: Optional[PeriodResponse] = None
    contract_histories: Optional[list[ContractHistoryResponse]] = None

    @computed_field
    @property
    def end_date(self) -> datetime:
        # Fallback to start_date if not set
        base_date = self.start_date or datetime.utcnow()
        if not self.period:
            return base_date
        
        if self.period.months > 0:
            return base_date + relativedelta(months=self.period.months)
        else:
            return base_date + relativedelta(days=self.period.days)

    model_config = ConfigDict(from_attributes=True)

class InvestorPaginatedResponse(BaseModel):
    data: list[InvestorResponse]
    total: int

    model_config = ConfigDict(from_attributes=True)
