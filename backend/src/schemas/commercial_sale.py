from pydantic import BaseModel, ConfigDict
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from src.models.commercial_sale import CommercialSaleType, CommercialSaleStatus

class CommercialClientCheckRequest(BaseModel):
    client_document: str

class CommercialClientCheckResponse(BaseModel):
    client_document: str
    client_exists: bool
    is_existing_client: bool
    client_name: Optional[str] = None
    monto: Optional[Decimal] = Decimal("0.00")
    allowed_types: List[str] # ["contrato_nuevo", "reinversion"] o ["referido"]
    forced_type: Optional[str] = None # "referido" si existe

class CommercialSaleCreate(BaseModel):
    client_document: str
    client_name: Optional[str] = None
    sale_type: CommercialSaleType
    amount: Decimal
    referrer_code: Optional[str] = None
    sale_date: Optional[date] = None
    is_already_settled: bool = False
    settlement_notes: Optional[str] = None

class CommercialSaleResponse(BaseModel):
    id: int
    commercial_id: int
    commercial_name: Optional[str] = None
    client_document: str
    client_name: Optional[str] = None
    sale_type: CommercialSaleType
    referrer_code: Optional[str] = None
    amount: Decimal
    commission_rate: Decimal
    commission_amount: Decimal
    tramo_a_amount: Optional[Decimal] = Decimal("0.00")
    tramo_b_amount: Optional[Decimal] = Decimal("0.00")
    status: CommercialSaleStatus = CommercialSaleStatus.pendiente
    settlement_id: Optional[int] = None
    sale_date: date
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class SettleCommissionsRequest(BaseModel):
    commercial_id: int
    reference_code: Optional[str] = None
    notes: Optional[str] = None

class SettlementResponse(BaseModel):
    id: int
    commercial_id: int
    commercial_name: Optional[str] = None
    settled_by_id: Optional[int] = None
    settled_by_name: Optional[str] = None
    total_amount: Decimal
    sales_count: int
    reference_code: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
