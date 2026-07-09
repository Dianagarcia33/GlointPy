from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional
from src.schemas.user import UserResponse
from src.schemas.package import PackageResponse
from src.schemas.period import PeriodResponse

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
    end_date: datetime
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Relationships
    user: Optional[UserResponse] = None
    package: Optional[PackageResponse] = None
    period: Optional[PeriodResponse] = None

    model_config = ConfigDict(from_attributes=True)

class InvestorPaginatedResponse(BaseModel):
    data: list[InvestorResponse]
    total: int

    model_config = ConfigDict(from_attributes=True)
