from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class BeneficiaryBase(BaseModel):
    name: str = Field(..., description="Nombre completo del beneficiario")
    document_number: Optional[str] = Field(None, description="Documento o cédula del beneficiario")
    relationship: Optional[str] = Field(None, description="Parentesco / Relación con el inversionista")
    percentage: float = Field(..., ge=0.01, le=100.0, description="Porcentaje asignado (0.01 - 100%)")
    phone: Optional[str] = Field(None, description="Teléfono de contacto")
    email: Optional[str] = Field(None, description="Correo electrónico de contacto")

class BeneficiaryCreate(BeneficiaryBase):
    user_id: Optional[int] = None
    investor_id: Optional[int] = None

class BeneficiaryUpdate(BaseModel):
    name: Optional[str] = None
    document_number: Optional[str] = None
    relationship: Optional[str] = None
    percentage: Optional[float] = Field(None, ge=0.01, le=100.0)
    phone: Optional[str] = None
    email: Optional[str] = None

class BeneficiaryResponse(BeneficiaryBase):
    id: int
    user_id: Optional[int] = None
    investor_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
