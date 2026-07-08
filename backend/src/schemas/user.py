from pydantic import BaseModel, EmailStr, ConfigDict
from typing import List, Optional, Any, Dict
from datetime import datetime
from src.schemas.security import RoleResponse

class UserBase(BaseModel):
    name: str
    email: EmailStr
    is_active: bool = True
    is_superuser: bool = False

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None
    must_change_password: Optional[bool] = None
    date_of_birth: Optional[datetime] = None
    permissions_override: Optional[Dict[str, bool]] = None

class UserResponse(UserBase):
    id: int
    must_change_password: bool
    date_of_birth: Optional[datetime] = None
    permissions_override: Optional[Dict[str, bool]] = None
    created_at: datetime
    updated_at: datetime
    
    # Devuelve los roles asociados
    roles: List[RoleResponse] = []
    
    model_config = ConfigDict(from_attributes=True)
