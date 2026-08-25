from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Optional

class PackageBase(BaseModel):
    value: int = Field(..., ge=10000, description="Valor monetario del paquete (mínimo $10.000 COP)")
    granted_shares: int = Field(default=0, ge=0, description="Acciones otorgadas")
    is_active: bool = True

class PackageCreate(PackageBase):
    pass

class PackageUpdate(BaseModel):
    value: Optional[int] = Field(None, ge=10000, description="Valor monetario del paquete (mínimo $10.000 COP)")
    granted_shares: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None

class PackageResponse(PackageBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
