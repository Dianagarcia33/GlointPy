from typing import Optional, List
from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import and_, or_

from src.models.room import MeetingRoom, RoomReservation
from src.models.user import User
from src.schemas.room import MeetingRoomCreate, MeetingRoomUpdate, RoomReservationCreate


class RoomService:
    @staticmethod
    async def get_rooms(db: AsyncSession, active_only: bool = False) -> List[MeetingRoom]:
        query = select(MeetingRoom)
        if active_only:
            query = query.where(MeetingRoom.is_active == True)
        query = query.order_by(MeetingRoom.name.asc())
        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def get_room_by_id(db: AsyncSession, room_id: int) -> MeetingRoom:
        result = await db.execute(select(MeetingRoom).where(MeetingRoom.id == room_id))
        room = result.scalars().first()
        if not room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Sala de reuniones no encontrada."
            )
        return room

    @staticmethod
    async def create_room(db: AsyncSession, data: MeetingRoomCreate) -> MeetingRoom:
        room = MeetingRoom(
            name=data.name.strip(),
            description=data.description.strip() if data.description else None,
            capacity=data.capacity,
            location=data.location.strip() if data.location else None,
            equipment=data.equipment.strip() if data.equipment else None,
            color=data.color or "#10b981",
            is_active=data.is_active
        )
        db.add(room)
        await db.commit()
        await db.refresh(room)
        return room

    @staticmethod
    async def update_room(db: AsyncSession, room_id: int, data: MeetingRoomUpdate) -> MeetingRoom:
        room = await RoomService.get_room_by_id(db, room_id)
        
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            if isinstance(value, str):
                value = value.strip()
            setattr(room, key, value)

        await db.commit()
        await db.refresh(room)
        return room

    @staticmethod
    async def delete_room(db: AsyncSession, room_id: int) -> dict:
        room = await RoomService.get_room_by_id(db, room_id)
        # Check active reservations
        now = datetime.now(timezone.utc)
        active_res = await db.execute(
            select(RoomReservation).where(
                and_(
                    RoomReservation.room_id == room_id,
                    RoomReservation.status == "confirmed",
                    RoomReservation.end_time > now
                )
            )
        )
        if active_res.first():
            # If it has future reservations, soft-delete it
            room.is_active = False
            await db.commit()
            return {"detail": "La sala tiene reservas futuras y ha sido desactivada."}

        await db.delete(room)
        await db.commit()
        return {"detail": "Sala eliminada exitosamente."}

    # --- RESERVAS ---

    @staticmethod
    async def get_reservations(
        db: AsyncSession,
        room_id: Optional[int] = None,
        user_id: Optional[int] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        status_filter: Optional[str] = None
    ) -> List[RoomReservation]:
        query = (
            select(RoomReservation)
            .options(
                selectinload(RoomReservation.room),
                selectinload(RoomReservation.user)
            )
        )

        conditions = []
        if room_id is not None:
            conditions.append(RoomReservation.room_id == room_id)
        if user_id is not None:
            conditions.append(RoomReservation.user_id == user_id)
        if status_filter is not None:
            conditions.append(RoomReservation.status == status_filter)
        if start_date is not None and end_date is not None:
            # Overlaps the queried window
            conditions.append(
                and_(
                    RoomReservation.start_time < end_date,
                    RoomReservation.end_time > start_date
                )
            )
        elif start_date is not None:
            conditions.append(RoomReservation.end_time >= start_date)
        elif end_date is not None:
            conditions.append(RoomReservation.start_time <= end_date)

        if conditions:
            query = query.where(and_(*conditions))

        query = query.order_by(RoomReservation.start_time.asc())
        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def create_reservation(
        db: AsyncSession,
        user_id: int,
        data: RoomReservationCreate
    ) -> RoomReservation:
        if data.end_time <= data.start_time:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La hora de finalización debe ser posterior a la hora de inicio."
            )

        duration_minutes = (data.end_time - data.start_time).total_seconds() / 60
        if duration_minutes < 15:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La reserva debe tener una duración mínima de 15 minutos."
            )

        # Check room
        room = await RoomService.get_room_by_id(db, data.room_id)
        if not room.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"La sala '{room.name}' se encuentra inactiva o fuera de servicio."
            )

        if data.attendees_count and data.attendees_count > room.capacity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"La cantidad de asistentes ({data.attendees_count}) supera la capacidad máxima de la sala ({room.capacity} personas)."
            )

        # Overlapping conflict check
        conflict_query = select(RoomReservation).where(
            and_(
                RoomReservation.room_id == data.room_id,
                RoomReservation.status == "confirmed",
                RoomReservation.start_time < data.end_time,
                RoomReservation.end_time > data.start_time
            )
        )
        conflict_res = await db.execute(conflict_query)
        conflict = conflict_res.scalars().first()
        if conflict:
            c_start = conflict.start_time.strftime("%I:%M %p")
            c_end = conflict.end_time.strftime("%I:%M %p")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"La sala '{room.name}' ya tiene una reserva en ese horario ({c_start} - {c_end}). Por favor elige otro horario o sala."
            )

        reservation = RoomReservation(
            room_id=data.room_id,
            user_id=user_id,
            title=data.title.strip(),
            description=data.description.strip() if data.description else None,
            start_time=data.start_time,
            end_time=data.end_time,
            attendees_count=data.attendees_count or 1,
            status="confirmed"
        )
        db.add(reservation)
        await db.commit()
        await db.refresh(reservation)

        # Reload with relationships
        res_loaded = await db.execute(
            select(RoomReservation)
            .options(
                selectinload(RoomReservation.room),
                selectinload(RoomReservation.user)
            )
            .where(RoomReservation.id == reservation.id)
        )
        return res_loaded.scalars().first()

    @staticmethod
    async def cancel_reservation(
        db: AsyncSession,
        reservation_id: int,
        current_user: User,
        reason: Optional[str] = None,
        is_admin: bool = False
    ) -> RoomReservation:
        res = await db.execute(
            select(RoomReservation)
            .options(
                selectinload(RoomReservation.room),
                selectinload(RoomReservation.user)
            )
            .where(RoomReservation.id == reservation_id)
        )
        reservation = res.scalars().first()
        if not reservation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reserva no encontrada."
            )

        if not is_admin and reservation.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para cancelar esta reserva."
            )

        if reservation.status == "cancelled":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Esta reserva ya se encuentra cancelada."
            )

        reservation.status = "cancelled"
        reservation.cancelled_reason = reason.strip() if reason else "Cancelada por el usuario"
        await db.commit()
        await db.refresh(reservation)
        return reservation
