import re
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime

class PotentialReferralBase(BaseModel):
    nombre: str = Field(..., description="Nombre completo del referido")
    telefono: str = Field(..., description="Teléfono de contacto del referido")
    email: Optional[str] = Field(None, description="Correo electrónico del referido")
    notas: Optional[str] = Field(None, description="Notas o comentarios adicionales")

    @field_validator("telefono")
    @classmethod
    def validate_telefono(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("El número de teléfono es obligatorio.")
        clean = re.sub(r"[\s\-\(\)\.]", "", v.strip())
        if not re.match(r"^(\+?57)?3\d{9}$", clean):
            raise ValueError("El teléfono debe ser un número móvil colombiano válido de 10 dígitos (ej. 3001234567 o +573001234567).")
        return clean

class PotentialReferralCreate(PotentialReferralBase):
    codigo_referido: Optional[str] = None

class PotentialReferralUpdate(BaseModel):
    nombre: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    estado: Optional[str] = None
    notas: Optional[str] = None
    fecha_contacto: Optional[datetime] = None

    @field_validator("telefono")
    @classmethod
    def validate_telefono(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        clean = re.sub(r"[\s\-\(\)\.]", "", v.strip())
        if not clean:
            raise ValueError("El número de teléfono no puede estar vacío.")
        if not re.match(r"^(\+?57)?3\d{9}$", clean):
            raise ValueError("El teléfono debe ser un número móvil colombiano válido de 10 dígitos (ej. 3001234567 o +573001234567).")
        return clean

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

    @field_validator("numero_celular")
    @classmethod
    def validate_numero_celular(cls, v: str) -> str:
        clean = re.sub(r"[\s\-\(\)\.]", "", v.strip())
        if not re.match(r"^(\+?57)?3\d{9}$", clean):
            raise ValueError("El número celular debe ser un móvil colombiano válido de 10 dígitos (ej. 3001234567 o +573001234567).")
        return clean
