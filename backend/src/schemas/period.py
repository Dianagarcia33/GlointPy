from pydantic import BaseModel, Field, model_validator
from typing import Optional
from datetime import datetime

class PeriodBase(BaseModel):
    percentage: float = Field(..., gt=0, le=100, description="Porcentaje de rendimiento mensual del periodo")
    months: int = Field(..., ge=1, le=120, description="Número de meses del periodo")
    days: int = Field(..., ge=1, le=3660, description="Número de días del periodo")
    is_active: bool = True

    @model_validator(mode="after")
    def validate_coherence(self):
        months = self.months
        days = self.days
        min_days = months * 28
        max_days = months * 32
        if days < min_days or days > max_days:
            raise ValueError(
                f"Incoherencia entre meses ({months}) y días ({days}). Para {months} meses, los días deben estar comprendidos entre {min_days} y {max_days} días."
            )
        return self

class PeriodCreate(PeriodBase):
    pass

class PeriodUpdate(BaseModel):
    percentage: Optional[float] = Field(None, gt=0, le=100)
    months: Optional[int] = Field(None, ge=1, le=120)
    days: Optional[int] = Field(None, ge=1, le=3660)
    is_active: Optional[bool] = None

    @model_validator(mode="after")
    def validate_coherence(self):
        if self.months is not None and self.days is not None:
            min_days = self.months * 28
            max_days = self.months * 32
            if self.days < min_days or self.days > max_days:
                raise ValueError(
                    f"Incoherencia entre meses ({self.months}) y días ({self.days}). Para {self.months} meses, los días deben estar comprendidos entre {min_days} y {max_days} días."
                )
        return self

class PeriodResponse(PeriodBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
