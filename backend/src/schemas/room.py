from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# --- Meeting Rooms ---

class MeetingRoomBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    capacity: int = Field(4, ge=1, le=100)
    location: Optional[str] = None
    equipment: Optional[str] = None
    color: str = Field("#10b981", max_length=20)
    is_active: bool = True

class MeetingRoomCreate(MeetingRoomBase):
    pass

class MeetingRoomUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = None
    capacity: Optional[int] = Field(None, ge=1, le=100)
    location: Optional[str] = None
    equipment: Optional[str] = None
    color: Optional[str] = None
    is_active: Optional[bool] = None

class MeetingRoomResponse(MeetingRoomBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- Room Reservations ---

class RoomReservationUserSummary(BaseModel):
    id: int
    name: str
    email: str

    class Config:
        from_attributes = True

class RoomReservationBase(BaseModel):
    room_id: int
    title: str = Field(..., min_length=3, max_length=150)
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    attendees_count: Optional[int] = Field(1, ge=1)

class RoomReservationCreate(RoomReservationBase):
    pass

class RoomReservationCancel(BaseModel):
    reason: Optional[str] = Field(None, max_length=255)

class RoomReservationResponse(BaseModel):
    id: int
    room_id: int
    user_id: int
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    attendees_count: int
    status: str
    cancelled_reason: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    room: Optional[MeetingRoomResponse] = None
    user: Optional[RoomReservationUserSummary] = None

    class Config:
        from_attributes = True
