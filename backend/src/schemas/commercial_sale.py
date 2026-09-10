from pydantic import BaseModel, ConfigDict, model_validator
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from src.models.commercial_sale import CommercialSaleType, CommercialSaleStatus

class CommercialClientCheckRequest(BaseModel):
    client_document: str

class CommercialClientCheckResponse(BaseModel):
    client_document: str
    client_exists: bool
    is_existing_client: bool
    client_name: Optional[str] = None
    monto: Optional[Decimal] = Decimal("0.00")
    total_package_amount: Optional[Decimal] = Decimal("0.00")
    previous_package_amount: Optional[Decimal] = Decimal("0.00")
    increase_amount: Optional[Decimal] = Decimal("0.00")
    allowed_types: List[str] # ["contrato_nuevo", "reinversion"] o ["referido"]
    forced_type: Optional[str] = None # "referido" si existe

class CommercialSaleCreate(BaseModel):
    client_document: str
    client_name: Optional[str] = None
    sale_type: CommercialSaleType
    amount: Decimal
    referrer_code: Optional[str] = None
    sale_date: Optional[date] = None
    custom_commission_rate: Optional[Decimal] = None
    custom_commission_amount: Optional[Decimal] = None
    is_already_settled: bool = False
    settlement_notes: Optional[str] = None

    @model_validator(mode="after")
    def validate_referrer_code_for_referrals(self) -> 'CommercialSaleCreate':
        if self.sale_type == CommercialSaleType.referido:
            if not self.referrer_code or not str(self.referrer_code).strip():
                raise ValueError("El código del cliente recomendador (origen) es obligatorio para ventas de tipo Referido")
        return self

class CommercialSaleResponse(BaseModel):
    id: int
    commercial_id: int
    commercial_name: Optional[str] = None
    client_document: str
    client_name: Optional[str] = None
    sale_type: CommercialSaleType
    referrer_code: Optional[str] = None
    amount: Decimal
    commission_rate: Decimal
    commission_amount: Decimal
    tramo_a_amount: Optional[Decimal] = Decimal("0.00")
    tramo_b_amount: Optional[Decimal] = Decimal("0.00")
    status: CommercialSaleStatus = CommercialSaleStatus.pendiente
    settlement_id: Optional[int] = None
    sale_date: date
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class SettleCommissionsRequest(BaseModel):
    commercial_id: int
    month: Optional[int] = None
    year: Optional[int] = None
    reference_code: Optional[str] = None
    notes: Optional[str] = None

class SettlementResponse(BaseModel):
    id: int
    commercial_id: int
    commercial_name: Optional[str] = None
    settled_by_id: Optional[int] = None
    settled_by_name: Optional[str] = None
    total_amount: Decimal
    sales_count: int
    reference_code: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class FloorTierInfo(BaseModel):
    level: int
    label: str
    target: float
    bonus_amount: float

class CommercialFloorMonitoringItem(BaseModel):
    commercial_id: int
    commercial_name: str
    email: str
    document_id: Optional[str] = None
    monthly_volume: float
    today_closures: int
    monthly_closures: int
    current_floor: Optional[FloorTierInfo] = None
    next_floor: Optional[FloorTierInfo] = None
    amount_needed_next_floor: float
    progress_percent: float
    bonus_status: str # "sin_piso", "en_progreso", "piso_alcanzado"

class CommercialFloorsMonitoringSummary(BaseModel):
    total_directivos: int
    directivos_con_piso: int
    total_monthly_volume: float
    projected_floor_bonuses_total: float
    average_volume_per_directivo: float

class CommercialFloorsMonitoringResponse(BaseModel):
    summary: CommercialFloorsMonitoringSummary
    items: List[CommercialFloorMonitoringItem]
