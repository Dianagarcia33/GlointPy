from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, date
from decimal import Decimal


# --- Configuración y Tasa de Usura ---
class CreditConfigOut(BaseModel):
    id: int
    max_usury_rate_ea: float
    max_usury_rate_monthly: float
    default_interest_rate_monthly: float
    min_amount: float
    max_amount: float
    min_term_months: int
    max_term_months: int
    updated_at: datetime

    class Config:
        from_attributes = True


class CreditConfigUpdate(BaseModel):
    max_usury_rate_ea: Optional[float] = Field(None, ge=1.0, le=100.0)
    max_usury_rate_monthly: Optional[float] = Field(None, ge=0.1, le=20.0)
    default_interest_rate_monthly: Optional[float] = Field(None, ge=0.0, le=20.0)
    min_amount: Optional[float] = Field(None, ge=10000.0)
    max_amount: Optional[float] = Field(None, ge=100000.0)
    min_term_months: Optional[int] = Field(None, ge=1, le=12)
    max_term_months: Optional[int] = Field(None, ge=1, le=72)


# --- Simulador ---
class CreditSimulationInstallment(BaseModel):
    installment_number: int
    due_date: str
    principal_amount: float
    interest_amount: float
    total_amount: float
    remaining_balance: float


class CreditSimulationResponse(BaseModel):
    amount: float
    term_months: int
    interest_rate_monthly: float
    interest_rate_ea: float
    monthly_installment: float
    total_interest: float
    total_payment: float
    installments: List[CreditSimulationInstallment]


# --- Solicitud de Crédito por el Cliente ---
class CreditCreate(BaseModel):
    amount: float = Field(..., ge=10000.0)
    term_months: int = Field(..., ge=1, le=48)
    purpose: Optional[str] = None
    user_bank_account_id: Optional[int] = None
    banco: Optional[str] = None
    tipo_cuenta: Optional[str] = None
    numero_cuenta: Optional[str] = None


# --- Aprobación / Rechazo Admin ---
class CreditApprove(BaseModel):
    approved_amount: Optional[float] = None
    term_months: Optional[int] = None
    interest_rate: Optional[float] = None # Validado contra tasa de usura
    first_payment_date: Optional[str] = None # YYYY-MM-DD
    admin_notes: Optional[str] = None


class CreditReject(BaseModel):
    reason: str = Field(..., min_length=3)


# --- Cuotas ---
class CreditInstallmentOut(BaseModel):
    id: int
    credit_id: int
    installment_number: int
    due_date: date
    principal_amount: float
    interest_amount: float
    total_amount: float
    wallet_amount_paid: float
    external_amount_paid: float
    paid_amount: float
    status: str
    payment_method: Optional[str] = None
    payment_reference: Optional[str] = None
    receipt_url: Optional[str] = None
    paid_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# --- Detalle de Crédito ---
class CreditOut(BaseModel):
    id: int
    user_id: int
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    user_document: Optional[str] = None
    user_phone: Optional[str] = None
    
    requested_amount: float
    approved_amount: Optional[float] = None
    term_months: int
    interest_rate: float
    frequency: str
    status: str
    purpose: Optional[str] = None

    # Datos bancarios destino
    user_bank_account_id: Optional[int] = None
    banco: str
    tipo_cuenta: str
    numero_cuenta: str

    # Desembolso Yoint / Auditoría
    approved_at: Optional[datetime] = None
    rejected_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    disbursed_at: Optional[datetime] = None
    disbursement_method: Optional[str] = None
    disbursement_reference: Optional[str] = None
    disbursement_receipt_url: Optional[str] = None
    admin_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    # Balance del crédito
    total_repayable: Optional[float] = 0.0
    total_paid: Optional[float] = 0.0
    remaining_balance: Optional[float] = 0.0

    installments: List[CreditInstallmentOut] = []

    class Config:
        from_attributes = True


class CreditPaginatedResponse(BaseModel):
    total: int
    page: int
    limit: int
    pages: int
    items: List[CreditOut]


# --- Pagos de Cuota ---
class CreditInstallmentPayRequest(BaseModel):
    use_wallet_amount: float = Field(0.0, ge=0.0)
    payment_method: Optional[str] = "MANUAL_TRANSFER" # WALLET, YOINT_ONLINE, MANUAL_TRANSFER
    payment_reference: Optional[str] = None
    notes: Optional[str] = None


class CreditInstallmentReviewRequest(BaseModel):
    approve: bool
    rejection_reason: Optional[str] = None
