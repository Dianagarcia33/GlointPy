from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class WalletResponse(BaseModel):
    id: int
    user_id: int
    balance: float
    currency: str
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
