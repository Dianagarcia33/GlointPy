from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class EventPublicResponse(BaseModel):
    id: int
    title: str
    slug: str
    description: Optional[str] = None
    event_date: Optional[datetime] = None
    location: Optional[str] = None
    virtual_url: Optional[str] = None
    capacity_in_person: int
    occupied_in_person: int
    available_in_person: int
    is_full_in_person: bool
    is_active: bool
    banner_active: bool

    class Config:
        from_attributes = True

class EventConfigUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    event_date: Optional[datetime] = None
    location: Optional[str] = None
    virtual_url: Optional[str] = None
    capacity_in_person: Optional[int] = None
    is_active: Optional[bool] = None
    banner_active: Optional[bool] = None

class InvestorRsvpRequest(BaseModel):
    attendance_mode: str = "in_person"  # "in_person" | "virtual"
    has_companion: bool = False
    companion_name: Optional[str] = None

class PublicRsvpRequest(BaseModel):
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    document_id: Optional[str] = None
    city: Optional[str] = None
    attendance_mode: str = "in_person"  # "in_person" | "virtual"
    has_companion: bool = False
    companion_name: Optional[str] = None

class AttendeeResponse(BaseModel):
    id: int
    event_id: int
    user_id: Optional[int] = None
    attendee_type: str
    full_name: str
    email: str
    phone: Optional[str] = None
    document_id: Optional[str] = None
    city: Optional[str] = None
    attendance_mode: str
    has_companion: bool
    companion_name: Optional[str] = None
    seats_reserved: int
    status: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class AdminEventSummaryResponse(BaseModel):
    event: EventPublicResponse
    total_attendees: int
    investor_attendees: int
    external_attendees: int
    in_person_attendees: int
    virtual_attendees: int
    attendees: List[AttendeeResponse]
