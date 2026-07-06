from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

class PermissionResponse(BaseModel):
    id: int
    name: str
    module: Optional[str] = None
    action: Optional[str] = None
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class RoleBase(BaseModel):
    name: str
    display_name: str
    description: Optional[str] = None
    is_active: bool = True

class RoleCreate(RoleBase):
    permissions: List[int] = []

class RoleUpdate(BaseModel):
    name: Optional[str] = None
    display_name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    permissions: Optional[List[int]] = None

class RoleResponse(RoleBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    permissions: List[PermissionResponse] = []

    model_config = ConfigDict(from_attributes=True)
