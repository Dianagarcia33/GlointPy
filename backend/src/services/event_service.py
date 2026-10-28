from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, text, desc
from fastapi import HTTPException, status
from datetime import datetime, timezone, timedelta
from typing import Optional, List

import re
import secrets
import json
import logging
import asyncio
from src.models.event import Event, EventAttendee, EventAuthorizedDomain
from src.models.user import User
from src.models.investor import Investor
from src.services.email_service import EmailService

logger = logging.getLogger(__name__)
from src.schemas.event import (
    EventPublicResponse,
    EventConfigUpdate,
    InvestorRsvpRequest,
    PublicRsvpRequest,
    AttendeeResponse,
    AdminEventSummaryResponse,
    EventAuthorizedDomainCreate,
    EventAuthorizedDomainUpdate,
    EventAuthorizedDomainResponse,
    DomainCheckResponse
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

    @staticmethod
    def _normalize_document(doc: Optional[str]) -> str:
        """Deja solo letras y números en mayúscula (ej. '1.020.456-7' -> '10204567')."""
        if not doc:
            return ""
        return re.sub(r"[^0-9A-Za-z]", "", str(doc)).upper()

    @staticmethod
    def _pick_attendee(rows: List[EventAttendee], confirmed_only: bool = False) -> Optional[EventAttendee]:
        """Prefiere la inscripción confirmada más reciente (rows debe venir ordenado por id desc)."""
        confirmed = [r for r in rows if r.status == "confirmed"]
        if confirmed:
            return confirmed[0]
        if confirmed_only:
            return None
        return rows[0] if rows else None

    @staticmethod
    def _normalized_document_column():
        """Columna document_id sin puntos, guiones ni espacios y en mayúscula, para comparar en SQL."""
        return func.upper(
            func.replace(func.replace(func.replace(EventAttendee.document_id, ".", ""), "-", ""), " ", "")
        )

    @classmethod
    async def find_attendee_for_user(
        cls,
        db: AsyncSession,
        event_id: int,
        user: User,
        confirmed_only: bool = False
    ) -> Optional[EventAttendee]:
        """
        Busca la inscripción existente de un usuario para evitar registros dobles.
        Orden de coincidencia:
          1. Registro ya vinculado a su user_id.
          2. Registro del formulario externo (sin user_id) con el mismo email (sin importar mayúsculas).
          3. Registro del formulario externo (sin user_id) con el mismo documento (ignorando puntos, guiones y espacios).
        Dentro de cada criterio se prefiere la inscripción confirmada más reciente.
        """
        def pick(rows: List[EventAttendee]) -> Optional[EventAttendee]:
            return cls._pick_attendee(rows, confirmed_only)

        # 1. Por user_id
        res = await db.execute(
            select(EventAttendee).where(
                EventAttendee.event_id == event_id,
                EventAttendee.user_id == user.id
            ).order_by(desc(EventAttendee.id))
        )
        found = pick(list(res.scalars().all()))
        if found:
            return found

        # 2. Por email entre inscripciones externas aún no vinculadas
        clean_email = (user.email or "").strip().lower()
        if clean_email:
            res = await db.execute(
                select(EventAttendee).where(
                    EventAttendee.event_id == event_id,
                    EventAttendee.user_id.is_(None),
                    func.lower(func.trim(EventAttendee.email)) == clean_email
                ).order_by(desc(EventAttendee.id))
            )
            found = pick(list(res.scalars().all()))
            if found:
                return found

        # 3. Por documento entre inscripciones externas aún no vinculadas
        clean_doc = cls._normalize_document(getattr(user, "document_id", None))
        if clean_doc:
            normalized_col = cls._normalized_document_column()
            res = await db.execute(
                select(EventAttendee).where(
                    EventAttendee.event_id == event_id,
                    EventAttendee.user_id.is_(None),
                    EventAttendee.document_id.isnot(None),
                    normalized_col == clean_doc
                ).order_by(desc(EventAttendee.id))
            )
            found = pick(list(res.scalars().all()))
            if found:
                return found

        return None

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

        # Verificar si el usuario ya tiene un registro previo (propio o del formulario externo)
        attendee = await cls.find_attendee_for_user(db, event.id, current_user)

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

        # Obtener datos de inversionista si existen (puede tener múltiples contratos o registros de inversionista)
        investor_query = select(Investor).where(Investor.user_id == current_user.id).order_by(desc(Investor.id))
        inv_res = await db.execute(investor_query)
        investor = inv_res.scalars().first()

        full_name = getattr(current_user, "name", "")
        phone = getattr(current_user, "phone_number", None) or getattr(current_user, "phone", None)
        document_id = getattr(current_user, "document_id", None)
        city = getattr(current_user, "city", None)

        if investor:
            first_name = getattr(investor, "first_name", None)
            last_name = getattr(investor, "last_name", None)
            if first_name or last_name:
                inv_name = f"{first_name or ''} {last_name or ''}".strip()
                if inv_name:
                    full_name = inv_name
            phone = getattr(investor, "phone", None) or getattr(investor, "phone_number", None) or phone
            document_id = getattr(investor, "document_id", None) or document_id
            city = getattr(investor, "city", None) or city

        interests_str = json.dumps(rsvp_data.interests, ensure_ascii=False) if rsvp_data.interests else None

        if attendee:
            # Actualizar registro existente. Si venía del formulario externo, queda vinculado al inversionista
            # (misma fila = mismo cupo, nunca se crea uno nuevo).
            attendee.user_id = current_user.id
            attendee.attendee_type = "investor"
            if current_user.email:
                attendee.email = current_user.email.strip().lower()
            attendee.attendance_mode = mode
            attendee.has_companion = rsvp_data.has_companion if mode == "in_person" else False
            attendee.companion_name = rsvp_data.companion_name if (mode == "in_person" and rsvp_data.has_companion) else None
            attendee.seats_reserved = seats_needed
            attendee.status = "confirmed"
            # No borrar datos existentes con valores vacíos de la cuenta
            attendee.full_name = full_name or attendee.full_name
            attendee.phone = (rsvp_data.phone.strip() if rsvp_data.phone else None) or phone or attendee.phone
            attendee.document_id = document_id or attendee.document_id
            attendee.city = city or attendee.city
            # Los datos de empresa solo se modifican si el cliente los envía explícitamente
            # (el modal del dashboard no los envía, así se conservan los del formulario externo).
            if "is_company" in rsvp_data.model_fields_set:
                attendee.is_company = rsvp_data.is_company
                attendee.company_name = rsvp_data.company_name.strip() if (rsvp_data.is_company and rsvp_data.company_name) else None
                attendee.company_nit = rsvp_data.company_nit.strip() if (rsvp_data.is_company and rsvp_data.company_nit) else None
                attendee.job_title = rsvp_data.job_title.strip() if (rsvp_data.is_company and rsvp_data.job_title) else None
            if interests_str:
                attendee.interests = interests_str
        else:
            attendee = EventAttendee(
                event_id=event.id,
                user_id=current_user.id,
                attendee_type="investor",
                full_name=full_name,
                email=(current_user.email or "").strip().lower(),
                phone=rsvp_data.phone.strip() if rsvp_data.phone else phone,
                document_id=document_id,
                city=city,
                is_company=rsvp_data.is_company,
                company_name=rsvp_data.company_name.strip() if (rsvp_data.is_company and rsvp_data.company_name) else None,
                company_nit=rsvp_data.company_nit.strip() if (rsvp_data.is_company and rsvp_data.company_nit) else None,
                job_title=rsvp_data.job_title.strip() if (rsvp_data.is_company and rsvp_data.job_title) else None,
                interests=interests_str,
                attendance_mode=mode,
                has_companion=rsvp_data.has_companion if mode == "in_person" else False,
                companion_name=rsvp_data.companion_name if (mode == "in_person" and rsvp_data.has_companion) else None,
                seats_reserved=seats_needed,
                status="confirmed"
            )
            db.add(attendee)

        await db.commit()
        await db.refresh(attendee)
        cls._dispatch_confirmation_email(event, attendee)
        return AttendeeResponse.from_orm(attendee)

    @classmethod
    async def find_attendee_for_public(
        cls,
        db: AsyncSession,
        event_id: int,
        clean_email: str,
        document_id: Optional[str]
    ) -> Optional[EventAttendee]:
        """
        Busca una inscripción existente para el formulario externo, entre TODAS las inscripciones
        del evento (externas o de inversionistas):
          1. Mismo email (sin importar mayúsculas).
          2. Mismo documento (ignorando puntos, guiones y espacios).
        """
        if clean_email:
            res = await db.execute(
                select(EventAttendee).where(
                    EventAttendee.event_id == event_id,
                    func.lower(func.trim(EventAttendee.email)) == clean_email
                ).order_by(desc(EventAttendee.id))
            )
            found = cls._pick_attendee(list(res.scalars().all()))
            if found:
                return found

        clean_doc = cls._normalize_document(document_id)
        if clean_doc:
            res = await db.execute(
                select(EventAttendee).where(
                    EventAttendee.event_id == event_id,
                    EventAttendee.document_id.isnot(None),
                    cls._normalized_document_column() == clean_doc
                ).order_by(desc(EventAttendee.id))
            )
            found = cls._pick_attendee(list(res.scalars().all()))
            if found:
                return found

        return None

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

        # Verificar si la persona ya está inscrita (por email o por documento)
        attendee = await cls.find_attendee_for_public(db, event.id, clean_email, rsvp_data.document_id)

        # Si la inscripción encontrada pertenece a un inversionista, no se modifica desde el formulario
        # público (no autenticado): debe hacerlo desde su dashboard. Así tampoco se crea un registro doble.
        if attendee and attendee.user_id is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ya tienes una inscripción registrada como inversionista Gloint. Para modificarla, inicia sesión y hazlo desde el banner del evento en tu dashboard."
            )

        if mode == "in_person":
            exclude_id = attendee.id if attendee else None
            occupied = await cls.get_occupied_seats(db, event.id, exclude_attendee_id=exclude_id)
            available = event.capacity_in_person - occupied
            if available < seats_needed:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cupos presenciales agotados (solicitados: {seats_needed}, disponibles: {max(0, available)}). Por favor selecciona asistencia Virtual."
                )

        interests_str = json.dumps(rsvp_data.interests, ensure_ascii=False) if rsvp_data.interests else None

        if attendee:
            attendee.full_name = rsvp_data.full_name.strip()
            attendee.phone = rsvp_data.phone.strip()
            attendee.document_id = rsvp_data.document_id.strip() if rsvp_data.document_id else attendee.document_id
            attendee.city = rsvp_data.city.strip() if rsvp_data.city else attendee.city
            attendee.is_company = rsvp_data.is_company
            attendee.company_name = rsvp_data.company_name.strip() if (rsvp_data.is_company and rsvp_data.company_name) else None
            attendee.company_nit = rsvp_data.company_nit.strip() if (rsvp_data.is_company and rsvp_data.company_nit) else None
            attendee.job_title = rsvp_data.job_title.strip() if (rsvp_data.is_company and rsvp_data.job_title) else None
            if interests_str:
                attendee.interests = interests_str
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
                phone=rsvp_data.phone.strip(),
                document_id=rsvp_data.document_id.strip() if rsvp_data.document_id else None,
                city=rsvp_data.city.strip() if rsvp_data.city else None,
                is_company=rsvp_data.is_company,
                company_name=rsvp_data.company_name.strip() if (rsvp_data.is_company and rsvp_data.company_name) else None,
                company_nit=rsvp_data.company_nit.strip() if (rsvp_data.is_company and rsvp_data.company_nit) else None,
                job_title=rsvp_data.job_title.strip() if (rsvp_data.is_company and rsvp_data.job_title) else None,
                interests=interests_str,
                attendance_mode=mode,
                has_companion=rsvp_data.has_companion if mode == "in_person" else False,
                companion_name=rsvp_data.companion_name if (mode == "in_person" and rsvp_data.has_companion) else None,
                seats_reserved=seats_needed,
                status="confirmed"
            )
            db.add(attendee)

        await db.commit()
        await db.refresh(attendee)
        cls._dispatch_confirmation_email(event, attendee)
        return AttendeeResponse.from_orm(attendee)

    @classmethod
    def _dispatch_confirmation_email(cls, event: Event, attendee: EventAttendee):
        """
        Envía en segundo plano el correo corporativo de confirmación de inscripción al evento.
        Nunca bloquea ni interrumpe la respuesta HTTP si el servicio de correo falla o tarda.
        """
        try:
            # Parsear áreas de interés si están guardadas en JSON o texto
            interests_list: List[str] = []
            if attendee.interests:
                if isinstance(attendee.interests, list):
                    interests_list = [str(x) for x in attendee.interests]
                elif isinstance(attendee.interests, str):
                    try:
                        parsed = json.loads(attendee.interests)
                        if isinstance(parsed, list):
                            interests_list = [str(x) for x in parsed]
                        else:
                            interests_list = [str(parsed)]
                    except Exception:
                        interests_list = [i.strip() for i in attendee.interests.split(",") if i.strip()]

            # Disparar tarea en segundo plano sin bloquear el loop de FastAPI
            asyncio.create_task(
                asyncio.to_thread(
                    EmailService.send_event_registration_confirmation_email,
                    to_email=attendee.email,
                    user_name=attendee.full_name or "Estimado/a Participante",
                    event_title=event.title or "Gloint Power Tech",
                    event_date=event.event_date,
                    attendance_mode=attendee.attendance_mode or "in_person",
                    location=event.location,
                    virtual_url=event.virtual_url,
                    seats_reserved=attendee.seats_reserved or 1,
                    has_companion=bool(attendee.has_companion),
                    companion_name=attendee.companion_name,
                    is_company=bool(attendee.is_company),
                    company_name=attendee.company_name,
                    company_nit=attendee.company_nit,
                    job_title=attendee.job_title,
                    document_id=attendee.document_id,
                    phone=attendee.phone,
                    city=attendee.city,
                    interests=interests_list,
                    attendee_type=attendee.attendee_type or "external"
                )
            )
            logger.info(f"[EventService] Programado envío de correo de confirmación a {attendee.email}")
        except Exception as e:
            logger.error(f"[EventService] Error al programar correo de confirmación para {attendee.email}: {e}")

    @classmethod
    async def get_my_registration(cls, db: AsyncSession, user: User) -> Optional[AttendeeResponse]:
        """
        Devuelve la inscripción confirmada del usuario, incluyendo la que haya hecho por el
        formulario externo (coincidencia por email o documento), para que el dashboard muestre
        la opción de modificar en lugar de crear un registro nuevo.
        """
        event = await cls.get_or_create_default_event(db)
        attendee = await cls.find_attendee_for_user(db, event.id, user, confirmed_only=True)
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
            new_capacity = max(1, config.capacity_in_person)
            occupied = await cls.get_occupied_seats(db, event.id)
            if new_capacity < occupied:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"El aforo presencial ({new_capacity}) no puede ser menor a los cupos ya confirmados ({occupied} cupos). Cancela o reubica asistentes antes de reducir el aforo."
                )
            event.capacity_in_person = new_capacity
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

    @staticmethod
    def normalize_domain(domain_str: Optional[str]) -> str:
        if not domain_str:
            return ""
        clean = domain_str.strip().lower()
        # Remove protocol
        clean = re.sub(r"^https?:\/\/", "", clean)
        # Remove path and query string
        clean = clean.split("/")[0].split("?")[0].strip()
        # Remove trailing port unless localhost
        if "localhost" not in clean and ":" in clean:
            clean = clean.split(":")[0]
        return clean

    @classmethod
    async def ensure_default_domains(cls, db: AsyncSession, event_id: int):
        q = select(func.count(EventAuthorizedDomain.id)).where(EventAuthorizedDomain.event_id == event_id)
        res = await db.execute(q)
        count = res.scalar() or 0
        if count == 0:
            defaults = [
                ("glointech.com.co", "Gloint Tech Oficial"),
                ("glointplace.com.co", "Gloint Place"),
                ("gloint.com.co", "Gloint Principal"),
                ("localhost:5173", "Desarrollo Local Frontend (Vite)"),
                ("localhost:3000", "Desarrollo Local Apps (Next/React)")
            ]
            for dom, name in defaults:
                db_dom = EventAuthorizedDomain(
                    event_id=event_id,
                    domain=dom,
                    name=name,
                    allow_banner=True,
                    allow_registration=True,
                    is_active=True,
                    api_key=f"glt_dom_{secrets.token_hex(16)}"
                )
                db.add(db_dom)
            await db.commit()

    @classmethod
    async def get_authorized_domains(cls, db: AsyncSession) -> List[EventAuthorizedDomainResponse]:
        event = await cls.get_or_create_default_event(db)
        await cls.ensure_default_domains(db, event.id)

        query = select(EventAuthorizedDomain).where(
            EventAuthorizedDomain.event_id == event.id
        ).order_by(desc(EventAuthorizedDomain.id))
        result = await db.execute(query)
        domains = result.scalars().all()
        return [EventAuthorizedDomainResponse.model_validate(d) for d in domains]

    @classmethod
    async def create_authorized_domain(cls, db: AsyncSession, data: EventAuthorizedDomainCreate) -> EventAuthorizedDomainResponse:
        event = await cls.get_or_create_default_event(db)
        clean_domain = cls.normalize_domain(data.domain)
        if not clean_domain:
            raise HTTPException(status_code=400, detail="El dominio ingresado no es válido.")

        # Check existing
        existing_q = select(EventAuthorizedDomain).where(
            EventAuthorizedDomain.event_id == event.id,
            EventAuthorizedDomain.domain == clean_domain
        )
        existing_res = await db.execute(existing_q)
        if existing_res.scalar_one_or_none():
            raise HTTPException(status_code=400, detail=f"El dominio '{clean_domain}' ya está registrado.")

        new_domain = EventAuthorizedDomain(
            event_id=event.id,
            domain=clean_domain,
            name=data.name.strip(),
            allow_banner=data.allow_banner,
            allow_registration=data.allow_registration,
            is_active=data.is_active,
            api_key=f"glt_dom_{secrets.token_hex(16)}"
        )
        db.add(new_domain)
        await db.commit()
        await db.refresh(new_domain)
        return EventAuthorizedDomainResponse.model_validate(new_domain)

    @classmethod
    async def update_authorized_domain(
        cls, db: AsyncSession, domain_id: int, data: EventAuthorizedDomainUpdate
    ) -> EventAuthorizedDomainResponse:
        query = select(EventAuthorizedDomain).where(EventAuthorizedDomain.id == domain_id)
        result = await db.execute(query)
        domain_record = result.scalar_one_or_none()
        if not domain_record:
            raise HTTPException(status_code=404, detail="Dominio no encontrado.")

        if data.domain is not None:
            clean = cls.normalize_domain(data.domain)
            if not clean:
                raise HTTPException(status_code=400, detail="Dominio inválido.")
            domain_record.domain = clean
        if data.name is not None:
            domain_record.name = data.name.strip()
        if data.allow_banner is not None:
            domain_record.allow_banner = data.allow_banner
        if data.allow_registration is not None:
            domain_record.allow_registration = data.allow_registration
        if data.is_active is not None:
            domain_record.is_active = data.is_active

        await db.commit()
        await db.refresh(domain_record)
        return EventAuthorizedDomainResponse.model_validate(domain_record)

    @classmethod
    async def delete_authorized_domain(cls, db: AsyncSession, domain_id: int) -> bool:
        query = select(EventAuthorizedDomain).where(EventAuthorizedDomain.id == domain_id)
        result = await db.execute(query)
        domain_record = result.scalar_one_or_none()
        if not domain_record:
            raise HTTPException(status_code=404, detail="Dominio no encontrado.")

        await db.delete(domain_record)
        await db.commit()
        return True

    @classmethod
    async def check_domain_authorization(
        cls,
        db: AsyncSession,
        domain_or_origin: Optional[str] = None,
        api_key: Optional[str] = None
    ) -> DomainCheckResponse:
        event = await cls.get_or_create_default_event(db)
        await cls.ensure_default_domains(db, event.id)
        event_pub = await cls.get_event_public_details(db)

        if not event.is_active:
            return DomainCheckResponse(
                authorized=False,
                domain=domain_or_origin or "desconocido",
                banner_authorized=False,
                registration_authorized=False,
                event=event_pub,
                reason="El evento está actualmente desactivado."
            )

        domain_record = None

        if api_key:
            key_q = select(EventAuthorizedDomain).where(
                EventAuthorizedDomain.event_id == event.id,
                EventAuthorizedDomain.api_key == api_key,
                EventAuthorizedDomain.is_active == True
            )
            key_res = await db.execute(key_q)
            domain_record = key_res.scalar_one_or_none()

        if not domain_record and domain_or_origin:
            clean_dom = cls.normalize_domain(domain_or_origin)
            dom_q = select(EventAuthorizedDomain).where(
                EventAuthorizedDomain.event_id == event.id,
                EventAuthorizedDomain.is_active == True
            )
            dom_res = await db.execute(dom_q)
            all_active = dom_res.scalars().all()

            for cand in all_active:
                reg_clean = cls.normalize_domain(cand.domain)
                # Check exact or subdomain or www variations
                if (
                    clean_dom == reg_clean or
                    clean_dom == f"www.{reg_clean}" or
                    reg_clean == f"www.{clean_dom}" or
                    clean_dom.endswith(f".{reg_clean}") or
                    clean_dom.startswith("localhost") and reg_clean.startswith("localhost")
                ):
                    domain_record = cand
                    break

        if not domain_record:
            return DomainCheckResponse(
                authorized=False,
                domain=domain_or_origin or "desconocido",
                banner_authorized=False,
                registration_authorized=False,
                event=event_pub,
                reason="Dominio o API Key no autorizados para el ecosistema Gloint Power Tech."
            )

        # Update last accessed timestamp
        domain_record.last_accessed_at = datetime.now(timezone.utc)
        await db.commit()

        banner_auth = domain_record.allow_banner and event.banner_active and event.is_active
        reg_auth = domain_record.allow_registration and event.is_active

        return DomainCheckResponse(
            authorized=True,
            domain=domain_record.domain,
            banner_authorized=banner_auth,
            registration_authorized=reg_auth,
            event=event_pub,
            reason=None
        )

