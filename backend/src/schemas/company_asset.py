from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

# --- Asignaciones de Custodia ---
class AssetAssignmentCreate(BaseModel):
    user_id: int
    condition_on_assignment: str = Field("GOOD", max_length=30)  # EXCELLENT, GOOD, FAIR, POOR
    assignment_notes: Optional[str] = None

class AssetReturnRequest(BaseModel):
    condition_on_return: str = Field("GOOD", max_length=30)
    return_notes: Optional[str] = None
    new_status: str = Field("AVAILABLE", max_length=30)  # AVAILABLE, IN_MAINTENANCE, DAMAGED, DECOMMISSIONED

class AssetAssignmentResponse(BaseModel):
    id: int
    asset_id: int
    user_id: int
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    assigned_by_id: Optional[int] = None
    assigned_by_name: Optional[str] = None
    assigned_date: datetime
    returned_date: Optional[datetime] = None
    condition_on_assignment: str
    condition_on_return: Optional[str] = None
    assignment_notes: Optional[str] = None
    return_notes: Optional[str] = None
    is_current: bool

    class Config:
        from_attributes = True

# --- Activos de la Empresa ---
class CompanyAssetBase(BaseModel):
    asset_code: str = Field(..., min_length=2, max_length=50)
    name: str = Field(..., min_length=2, max_length=200)
    category: str = Field("TECNOLOGIA", max_length=50)  # TECNOLOGIA, MOBILIARIO, EQUIPOS_OFICINA, VEHICULOS, HERRAMIENTAS, OTROS
    serial_number: Optional[str] = Field(None, max_length=100)
    brand: Optional[str] = Field(None, max_length=100)
    model: Optional[str] = Field(None, max_length=100)
    supplier_id: Optional[int] = None
    purchase_date: Optional[datetime] = None
    purchase_cost: Decimal = Field(Decimal("0.00"), ge=Decimal("0.00"))
    warranty_expiration: Optional[datetime] = None
    status: str = Field("AVAILABLE", max_length=30)  # AVAILABLE, ASSIGNED, IN_MAINTENANCE, DAMAGED, DECOMMISSIONED
    current_condition: str = Field("EXCELLENT", max_length=30)  # EXCELLENT, GOOD, FAIR, POOR
    location: Optional[str] = Field(None, max_length=150)
    photo_url: Optional[str] = Field(None, max_length=500)
    invoice_reference: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None

class CompanyAssetCreate(CompanyAssetBase):
    initial_holder_id: Optional[int] = None  # Si se asigna directamente al registrarlo

class CompanyAssetUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=200)
    category: Optional[str] = Field(None, max_length=50)
    serial_number: Optional[str] = Field(None, max_length=100)
    brand: Optional[str] = Field(None, max_length=100)
    model: Optional[str] = Field(None, max_length=100)
    supplier_id: Optional[int] = None
    purchase_date: Optional[datetime] = None
    purchase_cost: Optional[Decimal] = Field(None, ge=Decimal("0.00"))
    warranty_expiration: Optional[datetime] = None
    status: Optional[str] = Field(None, max_length=30)
    current_condition: Optional[str] = Field(None, max_length=30)
    location: Optional[str] = Field(None, max_length=150)
    photo_url: Optional[str] = Field(None, max_length=500)
    invoice_reference: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None

class CompanyAssetResponse(CompanyAssetBase):
    id: int
    supplier_name: Optional[str] = None
    current_holder_id: Optional[int] = None
    current_holder_name: Optional[str] = None
    current_holder_email: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    assignments: List[AssetAssignmentResponse] = []

    class Config:
        from_attributes = True

class CompanyAssetListResponse(BaseModel):
    items: List[CompanyAssetResponse]
    total: int
