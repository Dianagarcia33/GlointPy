from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from src.core.database import get_db
from src.api.deps import get_current_user, RequirePermission
from src.models.user import User
from src.schemas.event import (
    EventPublicResponse,
    EventConfigUpdate,
    InvestorRsvpRequest,
    PublicRsvpRequest,
    AttendeeResponse,
    AdminEventSummaryResponse
)
from src.services.event_service import EventService

router = APIRouter()

@router.get("/active", response_model=EventPublicResponse)
async def get_active_event(db: AsyncSession = Depends(get_db)):
    """
    Ruta pública para consultar los datos del evento activo y la disponibilidad de cupos en tiempo real.
    """
    return await EventService.get_event_public_details(db)

@router.post("/register-public", response_model=AttendeeResponse)
async def register_public_attendee(
    rsvp_data: PublicRsvpRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Ruta pública para registrar asistentes externos (no inversionistas) desde la página principal.
    """
    return await EventService.register_public(db, rsvp_data)

@router.post("/register-investor", response_model=AttendeeResponse)
async def register_investor_attendee(
    rsvp_data: InvestorRsvpRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Ruta autenticada para que los inversionistas confirmen su asistencia en 1 clic
    utilizando la información ya almacenada en su cuenta.
    """
    return await EventService.register_investor(db, current_user, rsvp_data)

@router.get("/my-registration", response_model=Optional[AttendeeResponse])
async def get_my_event_registration(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Ruta autenticada para verificar si el usuario actual ya confirmó su asistencia.
    """
    return await EventService.get_my_registration(db, current_user.id)

@router.get("/admin/summary", response_model=AdminEventSummaryResponse)
async def get_admin_event_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Ruta protegida para que administradores vean métricas de aforo y listado completo de asistentes.
    """
    return await EventService.get_admin_summary(db)

@router.put("/admin/config", response_model=EventPublicResponse)
async def update_event_configuration(
    config: EventConfigUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Ruta protegida para que administradores actualicen el aforo, fechas, ubicación y estado del banner.
    """
    return await EventService.update_event_config(db, config)

@router.delete("/admin/attendees/{attendee_id}")
async def cancel_attendee_registration(
    attendee_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Ruta protegida para cancelar un registro de asistencia y liberar el cupo.
    """
    await EventService.cancel_attendee(db, attendee_id)
    return {"message": "Registro de asistencia cancelado correctamente."}
