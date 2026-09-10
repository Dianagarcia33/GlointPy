from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, text
from fastapi import HTTPException
from datetime import datetime, timezone, timedelta
from typing import Optional, List

from src.models.event import Event, EventAttendee
from src.models.user import User
from src.models.investor import Investor
from src.schemas.event import (
    EventPublicResponse,
    EventConfigUpdate,
    InvestorRsvpRequest,
    PublicRsvpRequest,
    AttendeeResponse,
    AdminEventSummaryResponse
)

class EventService:
    DEFAULT_SLUG = "gloint-power-tech"

    @classmethod
    async def get_or_create_default_event(cls, db: AsyncSession) -> Event:
        query = select(Event).where(Event.slug == cls.DEFAULT_SLUG)
        result = await db.execute(query)
        event = result.scalar_one_or_none()

        if not event:
            # Fecha por defecto: dentro de 30 días a las 6:00 PM
            default_date = datetime.now(timezone.utc) + timedelta(days=30)
            default_date = default_date.replace(hour=18, minute=0, second=0, microsecond=0)

            event = Event(
                title="Gloint Power Tech",
                slug=cls.DEFAULT_SLUG,
                description="El evento exclusivo de presentación tecnológica y nuevos productos del ecosistema Gloint. Descubre las innovaciones, modelos de negocio y lanzamientos de alto impacto.",
                event_date=default_date,
                location="Auditorio Principal Gloint • Bogotá, Colombia",
                virtual_url="https://meet.gloint.com.co/power-tech",
                capacity_in_person=100,
                is_active=True,
                banner_active=True
            )
            db.add(event)
            await db.commit()
            await db.refresh(event)

        return event

    @classmethod
    async def get_occupied_seats(cls, db: AsyncSession, event_id: int, exclude_attendee_id: Optional[int] = None) -> int:
        query = select(func.coalesce(func.sum(EventAttendee.seats_reserved), 0)).where(
            EventAttendee.event_id == event_id,
            EventAttendee.attendance_mode == "in_person",
            EventAttendee.status == "confirmed"
        )
        if exclude_attendee_id:
            query = query.where(EventAttendee.id != exclude_attendee_id)
        result = await db.execute(query)
        return int(result.scalar() or 0)

    @classmethod
    async def get_event_public_details(cls, db: AsyncSession) -> EventPublicResponse:
        event = await cls.get_or_create_default_event(db)
        occupied = await cls.get_occupied_seats(db, event.id)
        available = max(0, event.capacity_in_person - occupied)

        return EventPublicResponse(
            id=event.id,
            title=event.title,
            slug=event.slug,
            description=event.description,
            event_date=event.event_date,
            location=event.location,
            virtual_url=event.virtual_url,
            capacity_in_person=event.capacity_in_person,
            occupied_in_person=occupied,
            available_in_person=available,
            is_full_in_person=(available <= 0),
            is_active=event.is_active,
            banner_active=event.banner_active
        )

    @classmethod
    async def register_investor(cls, db: AsyncSession, current_user: User, rsvp_data: InvestorRsvpRequest) -> AttendeeResponse:
        event = await cls.get_or_create_default_event(db)
        if not event.is_active:
            raise HTTPException(status_code=400, detail="Las inscripciones para este evento no están activas en este momento.")

        mode = rsvp_data.attendance_mode.lower()
        if mode not in ["in_person", "virtual"]:
            mode = "in_person"

        seats_needed = 0
        if mode == "in_person":
            seats_needed = 2 if rsvp_data.has_companion else 1

        # Verificar si el usuario ya tiene un registro previo
        query = select(EventAttendee).where(
            EventAttendee.event_id == event.id,
            EventAttendee.user_id == current_user.id
        )
        result = await db.execute(query)
        attendee = result.scalar_one_or_none()

        # Verificar capacidad presencial
        if mode == "in_person":
            exclude_id = attendee.id if attendee else None
            occupied = await cls.get_occupied_seats(db, event.id, exclude_attendee_id=exclude_id)
            available = event.capacity_in_person - occupied
            if available < seats_needed:
                raise HTTPException(
                    status_code=400, 
                    detail=f"No hay suficientes cupos presenciales disponibles (solicitados: {seats_needed}, disponibles: {max(0, available)}). Puedes registrarte en modalidad Virtual."
                )

        # Obtener datos de inversionista si existen
        investor_query = select(Investor).where(Investor.user_id == current_user.id)
        inv_res = await db.execute(investor_query)
        investor = inv_res.scalar_one_or_none()

        full_name = current_user.name
        phone = current_user.phone
        document_id = None
        city = None

        if investor:
            inv_name = f"{investor.first_name or ''} {investor.last_name or ''}".strip()
            if inv_name:
                full_name = inv_name
            phone = investor.phone or phone
            document_id = investor.document_id
            city = investor.city

        if attendee:
            # Actualizar registro existente
            attendee.attendance_mode = mode
            attendee.has_companion = rsvp_data.has_companion if mode == "in_person" else False
            attendee.companion_name = rsvp_data.companion_name if (mode == "in_person" and rsvp_data.has_companion) else None
            attendee.seats_reserved = seats_needed
            attendee.status = "confirmed"
            attendee.full_name = full_name
            attendee.phone = phone
            attendee.document_id = document_id
            attendee.city = city
        else:
            attendee = EventAttendee(
                event_id=event.id,
                user_id=current_user.id,
                attendee_type="investor",
                full_name=full_name,
                email=current_user.email,
                phone=phone,
                document_id=document_id,
                city=city,
                attendance_mode=mode,
                has_companion=rsvp_data.has_companion if mode == "in_person" else False,
                companion_name=rsvp_data.companion_name if (mode == "in_person" and rsvp_data.has_companion) else None,
                seats_reserved=seats_needed,
                status="confirmed"
            )
            db.add(attendee)

        await db.commit()
        await db.refresh(attendee)
        return AttendeeResponse.from_orm(attendee)

    @classmethod
    async def register_public(cls, db: AsyncSession, rsvp_data: PublicRsvpRequest) -> AttendeeResponse:
        event = await cls.get_or_create_default_event(db)
        if not event.is_active:
            raise HTTPException(status_code=400, detail="Las inscripciones para este evento están cerradas temporalmente.")

        clean_email = rsvp_data.email.strip().lower()
        mode = rsvp_data.attendance_mode.lower()
        if mode not in ["in_person", "virtual"]:
            mode = "in_person"

        seats_needed = 0
        if mode == "in_person":
            seats_needed = 2 if rsvp_data.has_companion else 1

        # Verificar si el email ya está registrado
        query = select(EventAttendee).where(
            EventAttendee.event_id == event.id,
            EventAttendee.email == clean_email
        )
        result = await db.execute(query)
        attendee = result.scalar_one_or_none()

        if mode == "in_person":
            exclude_id = attendee.id if attendee else None
            occupied = await cls.get_occupied_seats(db, event.id, exclude_attendee_id=exclude_id)
            available = event.capacity_in_person - occupied
            if available < seats_needed:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cupos presenciales agotados (solicitados: {seats_needed}, disponibles: {max(0, available)}). Por favor selecciona asistencia Virtual."
                )

        if attendee:
            attendee.full_name = rsvp_data.full_name.strip()
            attendee.phone = rsvp_data.phone.strip() if rsvp_data.phone else attendee.phone
            attendee.document_id = rsvp_data.document_id.strip() if rsvp_data.document_id else attendee.document_id
            attendee.city = rsvp_data.city.strip() if rsvp_data.city else attendee.city
            attendee.attendance_mode = mode
            attendee.has_companion = rsvp_data.has_companion if mode == "in_person" else False
            attendee.companion_name = rsvp_data.companion_name if (mode == "in_person" and rsvp_data.has_companion) else None
            attendee.seats_reserved = seats_needed
            attendee.status = "confirmed"
        else:
            attendee = EventAttendee(
                event_id=event.id,
                user_id=None,
                attendee_type="external",
                full_name=rsvp_data.full_name.strip(),
                email=clean_email,
                phone=rsvp_data.phone.strip() if rsvp_data.phone else None,
                document_id=rsvp_data.document_id.strip() if rsvp_data.document_id else None,
                city=rsvp_data.city.strip() if rsvp_data.city else None,
                attendance_mode=mode,
                has_companion=rsvp_data.has_companion if mode == "in_person" else False,
                companion_name=rsvp_data.companion_name if (mode == "in_person" and rsvp_data.has_companion) else None,
                seats_reserved=seats_needed,
                status="confirmed"
            )
            db.add(attendee)

        await db.commit()
        await db.refresh(attendee)
        return AttendeeResponse.from_orm(attendee)

    @classmethod
    async def get_my_registration(cls, db: AsyncSession, user_id: int) -> Optional[AttendeeResponse]:
        event = await cls.get_or_create_default_event(db)
        query = select(EventAttendee).where(
            EventAttendee.event_id == event.id,
            EventAttendee.user_id == user_id,
            EventAttendee.status == "confirmed"
        )
        result = await db.execute(query)
        attendee = result.scalar_one_or_none()
        if attendee:
            return AttendeeResponse.from_orm(attendee)
        return None

    @classmethod
    async def get_admin_summary(cls, db: AsyncSession) -> AdminEventSummaryResponse:
        event_pub = await cls.get_event_public_details(db)
        event = await cls.get_or_create_default_event(db)

        # Obtener todos los asistentes
        query = select(EventAttendee).where(
            EventAttendee.event_id == event.id
        ).order_by(EventAttendee.created_at.desc())
        result = await db.execute(query)
        attendees = result.scalars().all()

        confirmed_attendees = [a for a in attendees if a.status == "confirmed"]
        total = len(confirmed_attendees)
        investor_count = sum(1 for a in confirmed_attendees if a.attendee_type == "investor")
        external_count = sum(1 for a in confirmed_attendees if a.attendee_type == "external")
        in_person_count = sum(1 for a in confirmed_attendees if a.attendance_mode == "in_person")
        virtual_count = sum(1 for a in confirmed_attendees if a.attendance_mode == "virtual")

        return AdminEventSummaryResponse(
            event=event_pub,
            total_attendees=total,
            investor_attendees=investor_count,
            external_attendees=external_count,
            in_person_attendees=in_person_count,
            virtual_attendees=virtual_count,
            attendees=[AttendeeResponse.from_orm(a) for a in attendees]
        )

    @classmethod
    async def update_event_config(cls, db: AsyncSession, config: EventConfigUpdate) -> EventPublicResponse:
        event = await cls.get_or_create_default_event(db)

        if config.title is not None:
            event.title = config.title.strip()
        if config.description is not None:
            event.description = config.description.strip()
        if config.event_date is not None:
            event.event_date = config.event_date
        if config.location is not None:
            event.location = config.location.strip()
        if config.virtual_url is not None:
            event.virtual_url = config.virtual_url.strip()
        if config.capacity_in_person is not None:
            event.capacity_in_person = max(1, config.capacity_in_person)
        if config.is_active is not None:
            event.is_active = config.is_active
        if config.banner_active is not None:
            event.banner_active = config.banner_active

        await db.commit()
        await db.refresh(event)
        return await cls.get_event_public_details(db)

    @classmethod
    async def cancel_attendee(cls, db: AsyncSession, attendee_id: int) -> bool:
        query = select(EventAttendee).where(EventAttendee.id == attendee_id)
        result = await db.execute(query)
        attendee = result.scalar_one_or_none()
        if not attendee:
            raise HTTPException(status_code=404, detail="Asistente no encontrado.")

        attendee.status = "cancelled"
        attendee.seats_reserved = 0
        await db.commit()
        return True
