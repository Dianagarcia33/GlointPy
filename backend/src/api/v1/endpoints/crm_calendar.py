from src.core.errors import public_error_detail
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, Field

from src.core.database import get_db
from src.api.dependencies.auth_deps import get_current_user, RequirePermission
from src.models.user import User
from src.services.crm_calendar_service import CRMCalendarService
from src.services.room_service import RoomService
from src.core.pbac import PBACEngine

ROOM_RESERVE_PERMISSIONS = ["rooms:reserve", "admin.rooms.manage"]


def _can_reserve_rooms(user: User) -> bool:
    return any(PBACEngine.has_permission(user, p) for p in ROOM_RESERVE_PERMISSIONS)


def _require_room_permission(user: User, room_id: Optional[int]) -> None:
    if room_id and not _can_reserve_rooms(user):
        raise HTTPException(status_code=403, detail="No tienes permiso para reservar salas de reuniones.")

router = APIRouter()


class SyncCalendarRequest(BaseModel):
    imap_password: Optional[str] = None
    save_password: bool = True


class CalendarAttendee(BaseModel):
    email: str = Field(..., min_length=3, max_length=254)
    name: Optional[str] = Field(None, max_length=120)


class CreateCalendarEventRequest(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    start_datetime: str = Field(..., description="ISO 8601 string, ej: 2026-09-15T10:00:00")
    end_datetime: str = Field(..., description="ISO 8601 string, ej: 2026-09-15T11:00:00")
    description: Optional[str] = None
    location: Optional[str] = None
    lead_id: Optional[int] = None
    imap_password: Optional[str] = None
    # Invitados: miembros del equipo o correos externos. Reciben la invitación por correo.
    attendees: List[CalendarAttendee] = Field(default_factory=list, max_length=50)
    # Reunión virtual: enlace de la videollamada (Meet, Zoom, Teams...)
    meeting_url: Optional[str] = Field(None, max_length=500)
    # Reunión presencial: sala a reservar en el módulo de Salas
    room_id: Optional[int] = None


class UpdateCalendarEventRequest(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    start_datetime: str
    end_datetime: str
    description: Optional[str] = None
    location: Optional[str] = None
    calendar_url: Optional[str] = None
    imap_password: Optional[str] = None
    attendees: List[CalendarAttendee] = Field(default_factory=list, max_length=50)
    meeting_url: Optional[str] = Field(None, max_length=500)
    room_id: Optional[int] = None


@router.get("/form-options", dependencies=[Depends(RequirePermission(["crm:calendar:manage", "crm:calendar:view", "crm:leads:manage", "crm:view"]))])
async def get_calendar_form_options(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Datos para el formulario de citas: miembros del equipo que se pueden invitar y, si el
    usuario puede reservar salas, las salas activas.
    """
    res = await db.execute(
        select(User)
        .options(selectinload(User.roles))
        .where(User.id != current_user.id)
        .where(User.is_active == True)
        .order_by(User.name)
    )
    team = []
    for u in res.scalars().all():
        role_names = [r.name.lower() for r in (u.roles or [])]
        # Mismo criterio del chat interno: quien solo tiene rol de inversionista no es del equipo
        only_investor = len(role_names) > 0 and all(
            any(kw in r_name for kw in ["inversionista", "investor"]) for r_name in role_names
        )
        if not only_investor and u.email:
            team.append({"id": u.id, "name": u.name, "email": u.email})

    can_reserve = _can_reserve_rooms(current_user)
    rooms = []
    if can_reserve:
        rooms = [
            {"id": r.id, "name": r.name, "capacity": r.capacity, "location": r.location, "color": r.color}
            for r in await RoomService.get_rooms(db, active_only=True)
        ]
    return {"team_members": team, "rooms": rooms, "can_reserve_rooms": can_reserve}


@router.get("/events", dependencies=[Depends(RequirePermission(["crm:calendar:view", "crm:view"]))])
async def get_calendar_events(
    start_date: Optional[str] = Query(None, description="Fecha de inicio mínima (ISO)"),
    end_date: Optional[str] = Query(None, description="Fecha fin máxima (ISO)"),
    imap_password: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene los eventos del calendario cPanel (CalDAV) del usuario autenticado.
    """
    try:
        data = await CRMCalendarService.get_events(
            user=current_user,
            start_date=start_date,
            end_date=end_date,
            password_override=imap_password
        )
        return data
    except Exception as e:
        print(f"[Calendar Endpoint Error] {e}")
        return {
            "events": [],
            "count": 0,
            "needs_password": True,
            "message": str(e)
        }


@router.post("/sync", dependencies=[Depends(RequirePermission(["crm:calendar:manage", "crm:calendar:view", "crm:view"]))])
async def sync_calendar(
    payload: SyncCalendarRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Prueba la conexión CalDAV y sincroniza los eventos.
    Si save_password es True y las credenciales son válidas, guarda la contraseña en el usuario.
    """
    try:
        # Si se envió contraseña para guardar
        if payload.imap_password and payload.save_password and current_user.imap_password != payload.imap_password:
            current_user.imap_password = payload.imap_password
            db.add(current_user)
            await db.commit()
            await db.refresh(current_user)

        data = await CRMCalendarService.get_events(
            user=current_user,
            password_override=payload.imap_password
        )
        
        return {
            "success": not data.get("needs_password", False),
            "data": data,
            "has_saved_password": bool(current_user.imap_password)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=public_error_detail("No se pudo completar la operación", e))


@router.post("/events", dependencies=[Depends(RequirePermission(["crm:calendar:manage", "crm:leads:manage", "crm:view"]))])
async def create_calendar_event(
    payload: CreateCalendarEventRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Crea una nueva cita o reunión directamente en cPanel vía CalDAV.
    - Con invitados: se les envía la invitación por correo (con el enlace si es virtual).
    - Con sala (presencial): se reserva la sala en el módulo de Salas.
    Si se especifica un lead_id, también registra la actividad en el timeline del prospecto.
    """
    _require_room_permission(current_user, payload.room_id)
    try:
        res = await CRMCalendarService.create_event(
            user=current_user,
            db=db,
            title=payload.title,
            start_datetime=payload.start_datetime,
            end_datetime=payload.end_datetime,
            description=payload.description,
            location=payload.location,
            lead_id=payload.lead_id,
            password_override=payload.imap_password,
            attendees=[a.model_dump() for a in payload.attendees],
            meeting_url=payload.meeting_url,
            room_id=payload.room_id,
        )
        return res
    except HTTPException:
        raise  # conflictos de sala (horario ocupado, capacidad) conservan su mensaje y código
    except Exception as e:
        raise HTTPException(status_code=400, detail=public_error_detail("No se pudo completar la operación", e))


@router.put("/events/{event_uid}", dependencies=[Depends(RequirePermission(["crm:calendar:manage", "crm:leads:manage", "crm:view"]))])
async def update_calendar_event(
    event_uid: str,
    payload: UpdateCalendarEventRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Edita una cita. Solo puede hacerlo quien la creó (el organizador); un invitado recibe 403.
    """
    _require_room_permission(current_user, payload.room_id)
    try:
        return await CRMCalendarService.update_event(
            user=current_user,
            db=db,
            event_uid=event_uid,
            title=payload.title,
            start_datetime=payload.start_datetime,
            end_datetime=payload.end_datetime,
            description=payload.description,
            location=payload.location,
            calendar_url=payload.calendar_url,
            password_override=payload.imap_password,
            attendees=[a.model_dump() for a in payload.attendees],
            meeting_url=payload.meeting_url,
            room_id=payload.room_id,
        )
    except HTTPException:
        raise
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=public_error_detail("No se pudo completar la operación", e))


@router.delete("/events/{event_uid}", dependencies=[Depends(RequirePermission(["crm:calendar:manage", "crm:leads:manage", "crm:view"]))])
async def delete_calendar_event(
    event_uid: str,
    calendar_url: Optional[str] = Query(None),
    imap_password: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Elimina una cita en cPanel vía CalDAV DELETE.
    """
    try:
        res = await CRMCalendarService.delete_event(
            user=current_user,
            event_uid=event_uid,
            calendar_url=calendar_url,
            password_override=imap_password,
            db=db
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=public_error_detail("No se pudo completar la operación", e))
