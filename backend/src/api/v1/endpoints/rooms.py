from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from datetime import datetime

from src.core.database import get_db
from src.api.deps import get_current_user, RequirePermission
from src.models.user import User
from src.schemas.room import (
    MeetingRoomCreate,
    MeetingRoomUpdate,
    MeetingRoomResponse,
    RoomReservationCreate,
    RoomReservationResponse,
    RoomReservationCancel
)
from src.services.room_service import RoomService
from src.core.pbac import PBACEngine

router = APIRouter()

# --- SALAS (MEETING ROOMS) ---

@router.get("", response_model=List[MeetingRoomResponse])
async def list_meeting_rooms(
    active_only: bool = Query(False, description="Filtrar solo salas activas"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RequirePermission(["rooms:view", "rooms:reserve", "admin.rooms.manage"]))
):
    """
    Listar las salas de reuniones disponibles en la plataforma.
    """
    # Si no es admin y no especificó active_only, mostrar solo activas
    is_admin = PBACEngine.has_permission(current_user, "admin.rooms.manage")
    if not is_admin:
        active_only = True
    return await RoomService.get_rooms(db, active_only=active_only)


@router.post("", response_model=MeetingRoomResponse, status_code=status.HTTP_201_CREATED)
async def create_meeting_room(
    data: MeetingRoomCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RequirePermission("admin.rooms.manage"))
):
    """
    Crear una nueva sala de reuniones (Solo administradores).
    """
    return await RoomService.create_room(db, data)


@router.get("/{room_id}", response_model=MeetingRoomResponse)
async def get_meeting_room(
    room_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RequirePermission(["rooms:view", "rooms:reserve", "admin.rooms.manage"]))
):
    """
    Obtener detalles de una sala de reuniones.
    """
    return await RoomService.get_room_by_id(db, room_id)


@router.put("/{room_id}", response_model=MeetingRoomResponse)
async def update_meeting_room(
    room_id: int,
    data: MeetingRoomUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RequirePermission("admin.rooms.manage"))
):
    """
    Modificar una sala de reuniones existente (Solo administradores).
    """
    return await RoomService.update_room(db, room_id, data)


@router.delete("/{room_id}")
async def delete_meeting_room(
    room_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RequirePermission("admin.rooms.manage"))
):
    """
    Eliminar o desactivar una sala de reuniones (Solo administradores).
    """
    return await RoomService.delete_room(db, room_id)


# --- RESERVAS (RESERVATIONS) ---

@router.get("/reservations/calendar", response_model=List[RoomReservationResponse])
async def list_room_reservations(
    room_id: Optional[int] = Query(None, description="Filtrar por ID de sala"),
    user_id: Optional[int] = Query(None, description="Filtrar por ID de usuario"),
    start_date: Optional[datetime] = Query(None, description="Fecha de inicio de rango ISO"),
    end_date: Optional[datetime] = Query(None, description="Fecha de fin de rango ISO"),
    status: Optional[str] = Query("confirmed", description="Estado de la reserva (confirmed, cancelled, all)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RequirePermission(["rooms:view", "rooms:reserve", "admin.rooms.manage"]))
):
    """
    Consultar reservas de salas para visualización en agenda o calendario.
    """
    status_filter = None if status == "all" else (status or "confirmed")
    return await RoomService.get_reservations(
        db=db,
        room_id=room_id,
        user_id=user_id,
        start_date=start_date,
        end_date=end_date,
        status_filter=status_filter
    )


@router.get("/reservations/my", response_model=List[RoomReservationResponse])
async def list_my_reservations(
    status: Optional[str] = Query(None, description="Estado de la reserva"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RequirePermission(["rooms:reserve", "admin.rooms.manage"]))
):
    """
    Listar las reservas realizadas por el usuario actualmente autenticado.
    """
    return await RoomService.get_reservations(
        db=db,
        user_id=current_user.id,
        status_filter=status
    )


@router.post("/reservations", response_model=RoomReservationResponse, status_code=status.HTTP_201_CREATED)
async def create_room_reservation(
    data: RoomReservationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RequirePermission(["rooms:reserve", "admin.rooms.manage"]))
):
    """
    Crear una nueva reserva de sala de reuniones, validando disponibilidad en tiempo real.
    """
    return await RoomService.create_reservation(db, current_user.id, data)


@router.post("/reservations/{reservation_id}/cancel", response_model=RoomReservationResponse)
async def cancel_room_reservation(
    reservation_id: int,
    body: Optional[RoomReservationCancel] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RequirePermission(["rooms:reserve", "admin.rooms.manage"]))
):
    """
    Cancelar una reserva (permitido para el creador de la reserva o administradores).
    """
    is_admin = PBACEngine.has_permission(current_user, "admin.rooms.manage")
    reason = body.reason if body else None
    return await RoomService.cancel_reservation(
        db=db,
        reservation_id=reservation_id,
        current_user=current_user,
        reason=reason,
        is_admin=is_admin
    )
