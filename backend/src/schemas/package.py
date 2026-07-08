from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class PackageBase(BaseModel):
    value: int
    is_active: bool = True

class PackageCreate(PackageBase):
    pass

class PackageUpdate(BaseModel):
    value: Optional[int] = None
    is_active: Optional[bool] = None

class PackageResponse(PackageBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
