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
