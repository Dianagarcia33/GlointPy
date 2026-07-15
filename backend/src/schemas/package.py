from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class PackageBase(BaseModel):
    value: int
    granted_shares: int = 0
    is_active: bool = True

class PackageCreate(PackageBase):
    pass

class PackageUpdate(BaseModel):
    value: Optional[int] = None
    granted_shares: Optional[int] = None
    is_active: Optional[bool] = None

class PackageResponse(PackageBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
