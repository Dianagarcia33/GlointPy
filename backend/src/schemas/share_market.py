from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# --- Esquemas de Valoración ---
class SharePriceUpdate(BaseModel):
    new_price: float = Field(..., gt=0, description="Nuevo precio oficial de la acción")
    justification_notes: str = Field(..., min_length=5, description="Motivo / justificación obligatoria del cambio de precio")

class SharePriceHistoryOut(BaseModel):
    id: int
    previous_price: float
    new_price: float
    change_percentage: float
    justification_notes: str
    admin_id: Optional[int] = None
    admin_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Esquemas de Emisión Primaria ---
class ShareIssuanceCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    description: Optional[str] = None
    total_shares_issued: int = Field(..., gt=0)
    price_per_share: float = Field(..., gt=0)

class ShareIssuanceOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    total_shares_issued: int
    available_shares: int
    price_per_share: float
    is_active: bool
    created_by: Optional[int] = None
    creator_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Esquemas de Mercado Secundario / Ofertas P2P ---
class ShareListingCreate(BaseModel):
    shares_quantity: int = Field(..., gt=0, description="Cantidad de acciones a poner en venta")
    price_per_share: float = Field(..., gt=0, description="Precio unitario por acción en COP")

class ShareListingOut(BaseModel):
    id: int
    seller_id: int
    seller_name: Optional[str] = None
    seller_email: Optional[str] = None
    shares_total: int
    shares_available: int
    shares_locked: int
    price_per_share: float
    total_value: float
    status: str
    created_at: datetime
    is_mine: bool = False

    class Config:
        from_attributes = True

# --- Esquemas de Órdenes de Compra y Aprobación ---
class ShareTradeOrderOut(BaseModel):
    id: int
    listing_id: Optional[int] = None
    issuance_id: Optional[int] = None
    seller_id: Optional[int] = None
    seller_name: Optional[str] = None
    buyer_id: int
    buyer_name: Optional[str] = None
    buyer_email: Optional[str] = None
    buyer_phone: Optional[str] = None
    buyer_document: Optional[str] = None
    shares_quantity: int
    price_per_share: float
    total_amount: float
    wallet_amount_used: float
    surplus_amount: float
    receipt_url: Optional[str] = None
    payment_method: str
    status: str
    admin_notes: Optional[str] = None
    approved_by: Optional[int] = None
    approver_name: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AdminTradeDecision(BaseModel):
    action: str = Field(..., description="'approve' o 'reject'")
    notes: Optional[str] = None

# --- Resumen de Portafolio de Acciones del Usuario ---
class ShareUserPortfolioOut(BaseModel):
    total_shares_owned: int
    shares_available_for_sale: int
    shares_listed_active: int
    shares_locked_in_escrow: int
    current_share_price: float
    portfolio_market_value: float
    sales_window_open: bool
    sales_window_message: Optional[str] = None
