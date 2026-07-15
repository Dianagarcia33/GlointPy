from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class PeriodBase(BaseModel):
    percentage: float = Field(..., gt=0, description="Porcentaje de rendimiento del periodo")
    months: int = Field(..., ge=0, description="Número de meses del periodo")
    days: int = Field(..., ge=0, description="Número de días del periodo")
    is_active: bool = True

class PeriodCreate(PeriodBase):
    pass

class PeriodUpdate(BaseModel):
    percentage: Optional[float] = Field(None, gt=0)
    months: Optional[int] = Field(None, ge=0)
    days: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None

class PeriodResponse(PeriodBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
