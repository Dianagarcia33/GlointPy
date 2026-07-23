from pydantic import BaseModel, ConfigDict
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from src.models.commercial_sale import CommercialSaleType

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

class CommercialSaleResponse(BaseModel):
    id: int
    commercial_id: int
    client_document: str
    client_name: Optional[str] = None
    sale_type: CommercialSaleType
    referrer_code: Optional[str] = None
    amount: Decimal
    commission_rate: Decimal
    commission_amount: Decimal
    tramo_a_amount: Optional[Decimal] = Decimal("0.00")
    tramo_b_amount: Optional[Decimal] = Decimal("0.00")
    sale_date: date
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
