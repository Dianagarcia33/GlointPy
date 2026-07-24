from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class PotentialReferralBase(BaseModel):
    nombre: str = Field(..., description="Nombre completo del referido")
    telefono: str = Field(..., description="Teléfono de contacto del referido")
    email: Optional[str] = Field(None, description="Correo electrónico del referido")
    notas: Optional[str] = Field(None, description="Notas o comentarios adicionales")

class PotentialReferralCreate(PotentialReferralBase):
    codigo_referido: Optional[str] = None

class PotentialReferralUpdate(BaseModel):
    nombre: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    estado: Optional[str] = None
    notas: Optional[str] = None
    fecha_contacto: Optional[datetime] = None

class PotentialReferralResponse(PotentialReferralBase):
    id: int
    investor_id: int
    codigo_referido: str
    estado: str
    fecha_contacto: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class PotentialReferralConvertRequest(BaseModel):
    name: str
    email: str
    password: Optional[str] = None
    tipo_documento: str
    documento: str
    numero_celular: str
    ciudad: str
    fecha_nacimiento: Optional[str] = None
    banco: str
    tipo_cuenta: str
    numero_cuenta: str
    paquete_id: Optional[int] = None
    contract_period_id: int
    monto: float
    comprobante_path: Optional[str] = None
    kyc_docs: Optional[dict] = None
