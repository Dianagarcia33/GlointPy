from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class ExternalAppBase(BaseModel):
    name: str
    description: Optional[str] = None
    webhook_url: Optional[str] = None
    redirect_urls: Optional[str] = None
    is_active: bool = True

class ExternalAppCreate(ExternalAppBase):
    pass

class ExternalAppUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    webhook_url: Optional[str] = None
    redirect_urls: Optional[str] = None
    is_active: Optional[bool] = None

class ExternalAppResponse(ExternalAppBase):
    id: int
    client_id: str
    webhook_secret: Optional[str] = None
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    
    total_orders: Optional[int] = 0
    total_volume_processed: Optional[float] = 0.0

    model_config = ConfigDict(from_attributes=True)

class ExternalAppCreatedResponse(ExternalAppResponse):
    api_key: str  # Only returned once on creation/regeneration

class CreatePaymentIntentRequest(BaseModel):
    order_reference: str
    amount: float
    description: Optional[str] = None
    redirect_url: Optional[str] = None
    metadata: Optional[dict] = None
    expires_in_minutes: Optional[int] = 60

class CreatePaymentIntentResponse(BaseModel):
    payment_token: str
    checkout_url: str
    order_reference: str
    amount: float
    currency: str
    expires_at: Optional[datetime] = None

class CheckoutOrderInfoResponse(BaseModel):
    payment_token: str
    app_name: str
    app_client_id: str
    order_reference: str
    amount: float
    currency: str
    description: Optional[str] = None
    status: str
    redirect_url: Optional[str] = None
    expires_at: Optional[datetime] = None

class ConfirmPaymentRequest(BaseModel):
    payment_token: str
    security_pin: Optional[str] = None

class ExternalPaymentOrderResponse(BaseModel):
    id: int
    payment_token: str
    app_id: int
    app_name: Optional[str] = None
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    order_reference: str
    amount: float
    currency: str
    description: Optional[str] = None
    status: str
    redirect_url: Optional[str] = None
    webhook_status: str
    created_at: datetime
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
