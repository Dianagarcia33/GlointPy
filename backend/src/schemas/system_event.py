from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field

class SystemEventBase(BaseModel):
    type: str = Field(..., max_length=255)
    is_recurring: bool = False
    recurrence_start_day: Optional[int] = Field(None, ge=1, le=31)
    recurrence_end_day: Optional[int] = Field(None, ge=1, le=31)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    description: Optional[str] = Field(None, max_length=255)
    is_active: bool = True

class SystemEventCreate(SystemEventBase):
    pass

class SystemEventUpdate(BaseModel):
    type: Optional[str] = Field(None, max_length=255)
    is_recurring: Optional[bool] = None
    recurrence_start_day: Optional[int] = Field(None, ge=1, le=31)
    recurrence_end_day: Optional[int] = Field(None, ge=1, le=31)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    description: Optional[str] = Field(None, max_length=255)
    is_active: Optional[bool] = None

class SystemEventResponse(SystemEventBase):
    id: int
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True
