import re
from pydantic import BaseModel, EmailStr, field_validator
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

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if not v or not v.strip():
            return None
        clean = re.sub(r"[\s\-\(\)\.]", "", v.strip())
        if not re.match(r"^(\+?57)?3\d{9}$", clean):
            raise ValueError("El teléfono debe ser un número móvil colombiano válido de 10 dígitos (ej. 3001234567 o +573001234567).")
        return clean

    @field_validator("document_id")
    @classmethod
    def validate_document_id(cls, v: Optional[str]) -> Optional[str]:
        if not v or not v.strip():
            return None
        clean = v.strip()
        if not re.match(r"^[a-zA-Z0-9]{5,20}$", clean):
            raise ValueError("El documento debe contener entre 5 y 20 caracteres alfanuméricos.")
        return clean

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
