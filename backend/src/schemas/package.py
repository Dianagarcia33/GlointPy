from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Optional

class PackageBase(BaseModel):
    value: int = Field(..., ge=10000, le=1_000_000_000, description="Valor monetario del paquete ($10.000 a $1.000.000.000 COP)")
    granted_shares: int = Field(default=0, ge=0, le=10_000_000, description="Acciones otorgadas (0 a 10.000.000 acciones)")
    is_active: bool = True

class PackageCreate(PackageBase):
    pass

class PackageUpdate(BaseModel):
    value: Optional[int] = Field(None, ge=10000, le=1_000_000_000, description="Valor monetario del paquete ($10.000 a $1.000.000.000 COP)")
    granted_shares: Optional[int] = Field(None, ge=0, le=10_000_000, description="Acciones otorgadas (0 a 10.000.000 acciones)")
    is_active: Optional[bool] = None

class PackageResponse(BaseModel):
    id: int
    value: int
    granted_shares: int = 0
    is_active: bool = True
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
