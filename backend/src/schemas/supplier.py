from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class SupplierBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    nit_rut: Optional[str] = Field(None, max_length=50)
    contact_name: Optional[str] = Field(None, max_length=150)
    email: Optional[str] = Field(None, max_length=150)
    phone: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = Field(None, max_length=255)
    city: Optional[str] = Field(None, max_length=100)
    category: str = Field("GENERAL", max_length=100)  # TECNOLOGIA, PAPELERIA_INSUMOS, MOBILIARIO, SERVICIOS, CAFETERIA_ASEO, GENERAL
    payment_terms: str = Field("CONTADO", max_length=100)  # CONTADO, CREDITO_15, CREDITO_30, CREDITO_60, ANTICIPADO
    bank_info: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = True

class SupplierCreate(SupplierBase):
    pass

class SupplierUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=200)
    nit_rut: Optional[str] = Field(None, max_length=50)
    contact_name: Optional[str] = Field(None, max_length=150)
    email: Optional[str] = Field(None, max_length=150)
    phone: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = Field(None, max_length=255)
    city: Optional[str] = Field(None, max_length=100)
    category: Optional[str] = Field(None, max_length=100)
    payment_terms: Optional[str] = Field(None, max_length=100)
    bank_info: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None

class SupplierResponse(SupplierBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    total_purchase_orders: Optional[int] = 0
    total_spent: Optional[float] = 0.0

    class Config:
        from_attributes = True

class SupplierListResponse(BaseModel):
    items: List[SupplierResponse]
    total: int
