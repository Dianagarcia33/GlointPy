from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class SystemEventBase(BaseModel):
    type: str = Field(..., max_length=255)
    is_recurring: int = Field(..., ge=0, le=1)
    recurrence_start_day: Optional[int] = Field(None, ge=1, le=31)
    recurrence_end_day: Optional[int] = Field(None, ge=1, le=31)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    description: Optional[str] = Field(None, max_length=255)
    is_active: int = Field(1, ge=0, le=1)

class SystemEventCreate(SystemEventBase):
    pass

class SystemEventUpdate(BaseModel):
    type: Optional[str] = Field(None, max_length=255)
    is_recurring: Optional[int] = Field(None, ge=0, le=1)
    recurrence_start_day: Optional[int] = Field(None, ge=1, le=31)
    recurrence_end_day: Optional[int] = Field(None, ge=1, le=31)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    description: Optional[str] = Field(None, max_length=255)
    is_active: Optional[int] = Field(None, ge=0, le=1)

class SystemEventResponse(SystemEventBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
