from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

# --- Categorías ---

class InventoryCategoryBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    item_type: str = Field("GENERAL", max_length=50)  # 'PRODUCT', 'OFFICE_SUPPLY', 'GENERAL'
    is_active: bool = True

class InventoryCategoryCreate(InventoryCategoryBase):
    pass

class InventoryCategoryResponse(InventoryCategoryBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- Artículos (Productos Comerciales e Insumos de Oficina) ---

class InventoryItemBase(BaseModel):
    sku: str = Field(..., min_length=2, max_length=50)
    name: str = Field(..., min_length=2, max_length=150)
    description: Optional[str] = None
    item_type: str = Field("PRODUCT", max_length=50)  # 'PRODUCT' | 'OFFICE_SUPPLY'
    category_id: Optional[int] = None
    unit_measure: str = Field("UNIDAD", max_length=30)
    current_stock: int = Field(0, ge=0)
    min_stock: int = Field(5, ge=0)
    unit_cost: Decimal = Field(Decimal("0.00"), ge=Decimal("0.00"))
    sale_price: Optional[Decimal] = Field(None, ge=Decimal("0.00"))
    is_active: bool = True

class InventoryItemCreate(InventoryItemBase):
    pass

class InventoryItemUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=150)
    description: Optional[str] = None
    category_id: Optional[int] = None
    unit_measure: Optional[str] = None
    min_stock: Optional[int] = Field(None, ge=0)
    unit_cost: Optional[Decimal] = Field(None, ge=Decimal("0.00"))
    sale_price: Optional[Decimal] = Field(None, ge=Decimal("0.00"))
    is_active: Optional[bool] = None

class InventoryItemResponse(InventoryItemBase):
    id: int
    category_name: Optional[str] = None
    is_low_stock: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- Movimientos de Inventario (Kardex) ---

class InventoryMovementCreate(BaseModel):
    movement_type: str = Field(..., max_length=50)  # 'ENTRY', 'DISPATCH_OFFICE', 'SALE', 'ADJUSTMENT', 'WASTE'
    quantity: int = Field(..., gt=0)
    unit_cost: Optional[Decimal] = Field(None, ge=Decimal("0.00"))
    destination_department: Optional[str] = Field(None, max_length=100)  # Requerido si es 'DISPATCH_OFFICE'
    reference: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None

class InventoryAdjustmentCreate(BaseModel):
    actual_stock: int = Field(..., ge=0)
    reason: str = Field(..., min_length=3, max_length=255)
    notes: Optional[str] = None

class InventoryMovementResponse(BaseModel):
    id: int
    item_id: int
    item_name: Optional[str] = None
    item_sku: Optional[str] = None
    item_type: Optional[str] = None
    movement_type: str
    quantity: int
    previous_stock: int
    new_stock: int
    unit_cost: Decimal
    total_cost: Decimal
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    destination_department: Optional[str] = None
    reference: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# --- Estadísticas y Resúmenes ---

class InventoryDepartmentExpense(BaseModel):
    department: str
    total_amount: Decimal
    movements_count: int

class InventoryDashboardStats(BaseModel):
    total_products: int
    total_supplies: int
    low_stock_count: int
    total_inventory_valuation: Decimal
    monthly_office_expenses: Decimal
    expenses_by_department: List[InventoryDepartmentExpense] = []
