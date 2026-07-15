from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime, date
from decimal import Decimal
from src.schemas.withdrawal import WithdrawalResponse
from src.schemas.investor import InvestorResponse
from src.schemas.investment_request import InvestmentRequestResponse

class AuditUserSummary(BaseModel):
    user_id: int
    name: str
    email: str
    document_id: Optional[str] = None
    total_investments: Decimal = Decimal('0.00')
    total_withdrawals: Decimal = Decimal('0.00')
    active_packages_count: int = 0
    pending_requests_count: int = 0
    
    model_config = ConfigDict(from_attributes=True)

class AuditPaginatedResponse(BaseModel):
    data: List[AuditUserSummary]
    total: int
    page: int
    limit: int

class AuditUserHistory(BaseModel):
    user_id: int
    name: str
    investments: List[InvestorResponse]
    withdrawals: List[WithdrawalResponse]
    requests: List[InvestmentRequestResponse] = []
    accelerations: List[dict] = []

    model_config = ConfigDict(from_attributes=True)
