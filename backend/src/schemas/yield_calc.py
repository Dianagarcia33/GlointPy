from pydantic import BaseModel
from typing import List, Optional
from datetime import date
from decimal import Decimal

class CalculateYieldRequest(BaseModel):
    start_date: date
    end_date: date

class YieldSegment(BaseModel):
    start_date: date
    end_date: date
    days: int
    active_capital: Decimal
    daily_yield: Decimal
    segment_yield: Decimal
    note: str

class YieldCalculationResult(BaseModel):
    investment_id: int
    requested_start_date: date
    requested_end_date: date
    effective_start_date: Optional[date] = None
    effective_end_date: Optional[date] = None
    total_days: int
    total_yield: Decimal
    segments: List[YieldSegment]
    
class PayYieldRequest(CalculateYieldRequest):
    pass
