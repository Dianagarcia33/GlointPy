from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class DataBankBase(BaseModel):
    banck: str
    code_banck: str

class DataBankCreate(DataBankBase):
    pass

class DataBankUpdate(BaseModel):
    banck: Optional[str] = None
    code_banck: Optional[str] = None

class DataBankResponse(DataBankBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
