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
    acceleration_bonus: Decimal = Decimal("0.00")
    segments: List[YieldSegment]
    
class PayYieldRequest(CalculateYieldRequest):
    pass

class UserYieldCalculationResult(BaseModel):
    user_id: int
    requested_start_date: date
    requested_end_date: date
    total_yield: Decimal
    total_acceleration_bonus: Decimal = Decimal("0.00")
    grand_total: Decimal = Decimal("0.00")
    investments_yields: List[YieldCalculationResult]

class PayUserYieldRequest(CalculateYieldRequest):
    pass

class BulkYieldUserSummary(BaseModel):
    user_id: int
    user_name: str
    email: str
    document_id: Optional[str] = None
    has_wallet: bool
    investments_count: int
    total_yield: Decimal
    total_acceleration_bonus: Decimal
    grand_total: Decimal
    investments_detail: Optional[List[YieldCalculationResult]] = []


class BulkYieldCalculationResult(BaseModel):
    requested_start_date: date
    requested_end_date: date
    total_users_evaluated: int
    total_payable_users: int
    global_yield_total: Decimal
    global_acceleration_bonus_total: Decimal
    global_grand_total: Decimal
    users_summaries: List[BulkYieldUserSummary]

class BulkPayYieldResult(BaseModel):
    message: str
    requested_start_date: date
    requested_end_date: date
    total_users_paid: int
    global_yield_total: Decimal
    global_acceleration_bonus_total: Decimal
    global_grand_total: Decimal

