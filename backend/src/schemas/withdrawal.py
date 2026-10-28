from pydantic import BaseModel, ConfigDict, field_validator, model_validator
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

    @model_validator(mode="after")
    def validate_amounts(self) -> 'WithdrawalCreate':
        """Coherencia contable al crear o importar retiros (H-162): 0 <= GMF <= monto y neto = monto - GMF."""
        ref = f"Retiro{f' #{self.id}' if self.id else ''} de ${self.monto:,.2f}"
        if self.monto <= 0:
            raise ValueError(f"{ref}: el monto debe ser mayor a cero.")
        if self.impuesto < 0 or self.impuesto > self.monto:
            raise ValueError(f"{ref}: el impuesto/GMF (${self.impuesto:,.2f}) debe estar entre $0 y el monto del retiro.")
        # Tolerancia de $1 por redondeo (hay retiros históricos con diferencias de centavos)
        if abs(self.monto - self.impuesto - self.monto_neto) > Decimal("1"):
            raise ValueError(
                f"{ref}: el neto (${self.monto_neto:,.2f}) debe ser el monto menos el impuesto/GMF "
                f"(${self.monto - self.impuesto:,.2f})."
            )
        return self

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

class WithdrawalSummaryStats(BaseModel):
    total_count: int = 0
    pending_count: int = 0
    pending_amount_total: float = 0.0
    approved_count: int = 0
    total_amount_paid: float = 0.0

class WithdrawalPaginatedResponse(BaseModel):
    data: List[WithdrawalResponse]
    total: int
    page: int
    limit: int
    summary: Optional[WithdrawalSummaryStats] = None

class WithdrawalRejectRequest(BaseModel):
    motivo_rechazo: str

    @field_validator('motivo_rechazo')
    @classmethod
    def validate_motivo(cls, v: str) -> str:
        clean = (v or "").strip()
        if len(clean) < 10:
            raise ValueError("El motivo de rechazo debe contener al menos 10 caracteres explicativos.")
        # Prevenir cadenas de texto basura repetitivo (ej: asdf, sss, 1111)
        if len(set(clean.lower().replace(" ", ""))) < 4:
            raise ValueError("Por favor ingrese un motivo de rechazo válido y descriptivo para el usuario.")
        return clean

class WithdrawalBulkProcessRequest(BaseModel):
    withdrawal_ids: List[int]
