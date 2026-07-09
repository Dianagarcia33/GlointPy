from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class UserBankAccountBase(BaseModel):
    user_id: int
    banco: str
    tipo_cuenta: str
    numero_cuenta: str
    is_active: bool = True

class UserBankAccountCreate(UserBankAccountBase):
    pass

class UserBankAccountUpdate(BaseModel):
    banco: Optional[str] = None
    tipo_cuenta: Optional[str] = None
    numero_cuenta: Optional[str] = None
    is_active: Optional[bool] = None

class UserBankAccountResponse(UserBankAccountBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
