from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class AccelerationResponse(BaseModel):
    id: int
    investor_id: int
    investment_request_id: int
    contract_period_id: Optional[int] = None
    original_days: int
    acceleration_percentage: float
    days_to_reduce: float
    capital_released: Optional[float] = 0.0
    new_duration: float
    applied: bool
    bonus_amount: Optional[float] = 0.0
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
