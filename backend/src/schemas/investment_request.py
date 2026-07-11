from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any
from datetime import datetime
from src.models.investment_request import InvestmentRequestStatus

class InvestmentRequestBase(BaseModel):
    user_id: int
    paquete_inversion_id: int
    monto: float
    status: InvestmentRequestStatus = InvestmentRequestStatus.pending
    investor_id: Optional[int] = None
    prospecto_id: Optional[int] = None
    comprobante_path: Optional[str] = None
    rejection_reason: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    reviewed_by: Optional[int] = None
    extra_data: Optional[Dict[str, Any]] = None
    
    # Permitir sobreescribir fechas si vienen en el CSV
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None

class InvestmentRequestCreate(InvestmentRequestBase):
    pass

class SimpleUserResponse(BaseModel):
    id: int
    name: Optional[str] = None
    email: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class SimplePackageResponse(BaseModel):
    id: int
    value: Optional[float] = None
    model_config = ConfigDict(from_attributes=True)

class InvestmentRequestResponse(InvestmentRequestBase):
    id: int
    user: Optional[SimpleUserResponse] = None
    package: Optional[SimplePackageResponse] = None

    model_config = ConfigDict(from_attributes=True)

class InvestmentRequestPaginatedResponse(BaseModel):
    data: list[InvestmentRequestResponse]
    total: int

    model_config = ConfigDict(from_attributes=True)
