from pydantic import BaseModel, ConfigDict, computed_field
from datetime import datetime
from typing import Optional
from dateutil.relativedelta import relativedelta
from src.schemas.user import UserResponse, UserWithBankAccountsResponse
from src.schemas.package import PackageResponse
from src.schemas.period import PeriodResponse
from src.schemas.contract_history import ContractHistoryResponse
from src.schemas.acceleration import AccelerationResponse

class InvestorBase(BaseModel):
    assigned_code: Optional[str] = None
    referred_by: Optional[str] = None
    user_id: int
    package_id: int
    period_id: int
    start_date: Optional[datetime] = None
    observations: Optional[str] = None

class InvestorCreate(InvestorBase):
    pass

class InvestorUpdate(BaseModel):
    assigned_code: Optional[str] = None
    referred_by: Optional[str] = None
    user_id: Optional[int] = None
    package_id: Optional[int] = None
    period_id: Optional[int] = None
    start_date: Optional[datetime] = None
    observations: Optional[str] = None

class SimpleInvestorResponse(InvestorBase):
    id: int
    created_at: datetime
    
    package: Optional[PackageResponse] = None
    period: Optional[PeriodResponse] = None

    model_config = ConfigDict(from_attributes=True)

from src.schemas.withdrawal import WithdrawalBase

class InvestorResponse(InvestorBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Relationships
    user: Optional[UserWithBankAccountsResponse] = None
    package: Optional[PackageResponse] = None
    period: Optional[PeriodResponse] = None
    contract_histories: Optional[list[ContractHistoryResponse]] = None
    accelerations: Optional[list[AccelerationResponse]] = None
    withdrawals: Optional[list[WithdrawalBase]] = None

    @computed_field
    @property
    def total_acceleration_bonus(self) -> float:
        if not self.accelerations:
            return 0.0
        return float(sum(acc.bonus_amount or 0.0 for acc in self.accelerations if acc.applied))

    @computed_field
    @property
    def daily_yield_amount(self) -> float:
        if not self.package or not self.period or not self.period.days:
            return 0.0
        monto = float(self.package.value or 0)
        pct = float(self.period.percentage or 0) / 100.0
        months = float(self.period.months or 0)
        rendimiento_total = (monto * pct) * months
        return float(rendimiento_total / self.period.days) if self.period.days > 0 else 0.0

    @computed_field
    @property
    def daily_capital_amount(self) -> float:
        if not self.package or not self.period or not self.period.days:
            return 0.0
        monto = float(self.package.value or 0)
        return float(monto / self.period.days) if self.period.days > 0 else 0.0

    @computed_field
    @property
    def has_capital_withdrawal(self) -> bool:
        if not self.withdrawals:
            return False
        for w in self.withdrawals:
            w_tipo = w.tipo.value if hasattr(w.tipo, 'value') else str(w.tipo)
            w_estado = w.estado.value if hasattr(w.estado, 'value') else str(w.estado)
            if w_tipo.lower() == "capital" and w_estado.lower() in ["pendiente", "aprobado", "procesado"]:
                return True
        return False

    @computed_field
    @property
    def total_capital_withdrawn(self) -> float:
        if not self.withdrawals:
            return 0.0
        total = 0.0
        for w in self.withdrawals:
            w_tipo = w.tipo.value if hasattr(w.tipo, 'value') else str(w.tipo)
            w_estado = w.estado.value if hasattr(w.estado, 'value') else str(w.estado)
            if w_tipo.lower() == "capital" and w_estado.lower() in ["pendiente", "aprobado", "procesado"]:
                total += float(w.monto or 0.0)
        return total

    @computed_field
    @property
    def end_date(self) -> datetime:
        # Fallback to start_date if not set
        base_date = self.start_date or datetime.utcnow()
        if not self.period:
            return base_date
        
        return base_date + relativedelta(days=self.period.days)

    model_config = ConfigDict(from_attributes=True)

class InvestorPaginatedResponse(BaseModel):
    data: list[InvestorResponse]
    total: int

    model_config = ConfigDict(from_attributes=True)
