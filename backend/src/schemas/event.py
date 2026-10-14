import re
import json
from pydantic import BaseModel, EmailStr, field_validator, model_validator
from typing import Optional, List, Any
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
    phone: Optional[str] = None
    is_company: bool = False
    company_name: Optional[str] = None
    company_nit: Optional[str] = None
    job_title: Optional[str] = None
    interests: Optional[List[str]] = None

class PublicRsvpRequest(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    document_id: Optional[str] = None
    city: Optional[str] = None
    is_company: bool = False
    company_name: Optional[str] = None
    company_nit: Optional[str] = None
    job_title: Optional[str] = None
    interests: Optional[List[str]] = None
    attendance_mode: str = "in_person"  # "in_person" | "virtual"
    has_companion: bool = False
    companion_name: Optional[str] = None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("El número de teléfono / WhatsApp es obligatorio.")
        clean = re.sub(r"[\s\-\(\)\.]", "", v.strip())
        if not re.match(r"^(\+?57)?3\d{9}$", clean):
            raise ValueError("El teléfono debe ser un número celular colombiano válido de 10 dígitos (ej. 3001234567 o +573001234567).")
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

    @model_validator(mode="after")
    def validate_company_fields(self):
        if self.is_company:
            if not self.company_name or not self.company_name.strip():
                raise ValueError("El nombre de la empresa es obligatorio para registros de empresa.")
            if not self.company_nit or not self.company_nit.strip():
                raise ValueError("El NIT / RUT de la empresa es obligatorio para registros de empresa.")
            if not self.job_title or not self.job_title.strip():
                raise ValueError("El cargo en la empresa es obligatorio para registros de empresa.")
        return self

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
    is_company: bool = False
    company_name: Optional[str] = None
    company_nit: Optional[str] = None
    job_title: Optional[str] = None
    interests: Optional[Any] = None
    attendance_mode: str
    has_companion: bool
    companion_name: Optional[str] = None
    seats_reserved: int
    status: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

    @field_validator("interests", mode="before")
    @classmethod
    def parse_interests(cls, v: Any) -> Optional[List[str]]:
        if v is None:
            return None
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                return parsed if isinstance(parsed, list) else [v]
            except Exception:
                return [v] if v.strip() else []
        return None

class AdminEventSummaryResponse(BaseModel):
    event: EventPublicResponse
    total_attendees: int
    investor_attendees: int
    external_attendees: int
    in_person_attendees: int
    virtual_attendees: int
    attendees: List[AttendeeResponse]


class EventAuthorizedDomainCreate(BaseModel):
    domain: str
    name: str
    allow_banner: bool = True
    allow_registration: bool = True
    is_active: bool = True


class EventAuthorizedDomainUpdate(BaseModel):
    domain: Optional[str] = None
    name: Optional[str] = None
    allow_banner: Optional[bool] = None
    allow_registration: Optional[bool] = None
    is_active: Optional[bool] = None


class EventAuthorizedDomainResponse(BaseModel):
    id: int
    event_id: int
    domain: str
    name: str
    allow_banner: bool
    allow_registration: bool
    is_active: bool
    api_key: Optional[str] = None
    last_accessed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DomainCheckResponse(BaseModel):
    authorized: bool
    domain: str
    banner_authorized: bool = False
    registration_authorized: bool = False
    event: Optional[EventPublicResponse] = None
    reason: Optional[str] = None

