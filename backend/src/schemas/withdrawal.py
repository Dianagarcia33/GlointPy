from pydantic import BaseModel, ConfigDict
from typing import Optional, Any, List
from datetime import datetime, date
from decimal import Decimal
from src.models.withdrawal import WithdrawalStatus, WithdrawalType

class SimpleUserResponse(BaseModel):
    id: int
    name: str
    email: str
    document_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class WithdrawalBase(BaseModel):
    investor_id: Optional[int] = None
    user_id: int
    origen: str = "inversion"
    tipo: WithdrawalType
    monto: Decimal
    impuesto: Decimal = Decimal('0.00')
    monto_neto: Decimal
    fecha_solicitud: date
    fecha_retiro: Optional[date] = None
    estado: WithdrawalStatus = WithdrawalStatus.PENDING
    metodo_pago: Optional[str] = None
    banco: Optional[str] = None
    tipo_cuenta: Optional[str] = None
    numero_cuenta: Optional[str] = None
    observaciones: Optional[str] = None
    motivo_rechazo: Optional[str] = None
    aprobado_por: Optional[int] = None
    fecha_aprobacion: Optional[datetime] = None
    procesado_por: Optional[int] = None
    fecha_procesamiento: Optional[datetime] = None
    comprobante_pago: Optional[str] = None
    receipt_path: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class WithdrawalCreate(WithdrawalBase):
    id: Optional[int] = None

class WithdrawalUpdate(BaseModel):
    estado: Optional[WithdrawalStatus] = None
    motivo_rechazo: Optional[str] = None
    fecha_retiro: Optional[date] = None
    comprobante_pago: Optional[str] = None
    receipt_path: Optional[str] = None
    observaciones: Optional[str] = None
    aprobado_por: Optional[int] = None
    fecha_aprobacion: Optional[datetime] = None
    procesado_por: Optional[int] = None
    fecha_procesamiento: Optional[datetime] = None

class WithdrawalResponse(WithdrawalBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    user: Optional[SimpleUserResponse] = None

    model_config = ConfigDict(from_attributes=True)

class WithdrawalPaginatedResponse(BaseModel):
    data: List[WithdrawalResponse]
    total: int
    page: int
    limit: int

class WithdrawalRejectRequest(BaseModel):
    motivo_rechazo: str
