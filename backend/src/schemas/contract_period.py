from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class ContractPeriodBase(BaseModel):
    name: str
    months: int
    days: int
    percentage: float

class ContractPeriodCreate(ContractPeriodBase):
    pass

class ContractPeriodResponse(ContractPeriodBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
