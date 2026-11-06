from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

# --- Items de la Orden de Compra ---
class PurchaseOrderItemBase(BaseModel):
    item_id: Optional[int] = None
    item_name: str = Field(..., min_length=2, max_length=200)
    item_sku: Optional[str] = Field(None, max_length=100)
    quantity_ordered: int = Field(..., gt=0)
    unit_cost: Decimal = Field(..., ge=Decimal("0.00"))

class PurchaseOrderItemCreate(PurchaseOrderItemBase):
    pass

class PurchaseOrderItemResponse(PurchaseOrderItemBase):
    id: int
    purchase_order_id: int
    quantity_received: int = 0
    total_cost: Decimal

    class Config:
        from_attributes = True

# --- Orden de Compra ---
class PurchaseOrderCreate(BaseModel):
    supplier_id: int
    payment_method: str = Field("TRANSFERENCIA", max_length=50)  # TRANSFERENCIA, EFECTIVO, TARJETA_CREDITO, CREDITO_PROVEEDOR
    expected_delivery_date: Optional[datetime] = None
    tax_amount: Decimal = Field(Decimal("0.00"), ge=Decimal("0.00"))
    invoice_number: Optional[str] = Field(None, max_length=100)
    invoice_url: Optional[str] = Field(None, max_length=500)
    notes: Optional[str] = None
    items: List[PurchaseOrderItemCreate] = Field(..., min_items=1)

class PurchaseOrderUpdate(BaseModel):
    payment_method: Optional[str] = Field(None, max_length=50)
    expected_delivery_date: Optional[datetime] = None
    tax_amount: Optional[Decimal] = Field(None, ge=Decimal("0.00"))
    invoice_number: Optional[str] = Field(None, max_length=100)
    invoice_url: Optional[str] = Field(None, max_length=500)
    notes: Optional[str] = None

class PurchaseOrderReceiveItem(BaseModel):
    order_item_id: int
    quantity_received: int = Field(..., ge=0)
    unit_cost: Optional[Decimal] = Field(None, ge=Decimal("0.00"))

class PurchaseOrderReceiveRequest(BaseModel):
    invoice_number: Optional[str] = None
    invoice_url: Optional[str] = None
    notes: Optional[str] = None
    items: Optional[List[PurchaseOrderReceiveItem]] = None  # Si es None o vacío, se reciben todas las cantidades pedidas

class PurchaseOrderResponse(BaseModel):
    id: int
    order_number: str
    supplier_id: int
    supplier_name: Optional[str] = None
    supplier_nit: Optional[str] = None
    status: str  # DRAFT, REQUESTED, APPROVED, RECEIVED, CANCELLED
    issue_date: datetime
    expected_delivery_date: Optional[datetime] = None
    received_date: Optional[datetime] = None
    subtotal: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    payment_method: str
    invoice_number: Optional[str] = None
    invoice_url: Optional[str] = None
    notes: Optional[str] = None
    created_by_id: Optional[int] = None
    created_by_name: Optional[str] = None
    approved_by_id: Optional[int] = None
    approved_by_name: Optional[str] = None
    received_by_id: Optional[int] = None
    received_by_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    items: List[PurchaseOrderItemResponse] = []

    class Config:
        from_attributes = True

class PurchaseOrderListResponse(BaseModel):
    items: List[PurchaseOrderResponse]
    total: int
