from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from decimal import Decimal

class WalletResponse(BaseModel):
    id: int
    user_id: int
    balance: Decimal
    currency: str
    status: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class AdminWalletAdjustRequest(BaseModel):
    action: str # 'add', 'subtract', 'set'
    amount: Decimal
    description: str
