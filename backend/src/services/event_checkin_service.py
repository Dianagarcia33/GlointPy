"""
Control de entrada presencial del evento Gloint Power Tech y lista unificada de asistencia.

- El equipo escanea el QR único del inscrito (contenido `GLT-PT:<token>`) o lo busca por nombre y registra su entrada.
- Cada entrada se registra una sola vez; un segundo escaneo avisa "ya ingresó" sin duplicar.
- La lista unificada junta a los cuatro grupos: inversionista/externo × presencial (entrada) / virtual (conexión a la sala).
"""
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.event import EventAttendee, EventLiveSession
from src.services.event_attendance_service import QR_PREFIX
from src.services.event_service import EventService

logger = logging.getLogger(__name__)


def _normalize_code(raw: str) -> str:
    """Acepta el contenido del QR, el token suelto o un enlace que lo contenga."""
    code = (raw or "").strip()
    if code.startswith(QR_PREFIX):
        code = code[len(QR_PREFIX):]
    if "/" in code:
        code = code.split("?")[0].rstrip("/").split("/")[-1]
    return code.strip()


def _entry(a: EventAttendee) -> dict:
    return {
        "id": a.id,
        "full_name": a.full_name,
        "email": a.email,
        "attendee_type": a.attendee_type,
        "seats_reserved": a.seats_reserved or 1,
        "companion_name": a.companion_name if a.has_companion else None,
        "checked_in_at": a.checked_in_at,
    }


class EventCheckinService:
    @staticmethod
    def _validate_for_entry(attendee: EventAttendee) -> None:
        if attendee.status != "confirmed":
            raise HTTPException(status_code=403, detail="Esta inscripción está cancelada.")
        if attendee.attendance_mode != "in_person":
            raise HTTPException(status_code=403, detail="Esta persona está inscrita como virtual: no tiene cupo presencial.")

    @classmethod
    async def _register(cls, db: AsyncSession, attendee: EventAttendee, user_id: Optional[int]) -> dict:
        cls._validate_for_entry(attendee)
        if attendee.checked_in_at:
            return {"result": "already_checked_in", "attendee": _entry(attendee)}
        attendee.checked_in_at = datetime.now(timezone.utc)
        attendee.checked_in_by = user_id
        await db.commit()
        logger.info(f"[EventCheckin] Entrada registrada del inscrito {attendee.id} por usuario {user_id}.")
        return {"result": "checked_in", "attendee": _entry(attendee)}

    @classmethod
    async def check_in_by_code(cls, db: AsyncSession, raw_code: str, user_id: Optional[int]) -> dict:
        code = _normalize_code(raw_code)
        if not code or len(code) > 64:
            raise HTTPException(status_code=404, detail="Código no válido.")
        attendee = (await db.execute(select(EventAttendee).where(EventAttendee.access_token == code))).scalar_one_or_none()
        if not attendee:
            raise HTTPException(status_code=404, detail="Código no válido: no corresponde a ningún inscrito.")
        return await cls._register(db, attendee, user_id)

    @classmethod
    async def check_in_by_id(cls, db: AsyncSession, attendee_id: int, user_id: Optional[int]) -> dict:
        attendee = (await db.execute(select(EventAttendee).where(EventAttendee.id == attendee_id))).scalar_one_or_none()
        if not attendee:
            raise HTTPException(status_code=404, detail="Asistente no encontrado.")
        return await cls._register(db, attendee, user_id)

    @classmethod
    async def undo_check_in(cls, db: AsyncSession, attendee_id: int) -> dict:
        """Corrige un registro por error."""
        attendee = (await db.execute(select(EventAttendee).where(EventAttendee.id == attendee_id))).scalar_one_or_none()
        if not attendee:
            raise HTTPException(status_code=404, detail="Asistente no encontrado.")
        attendee.checked_in_at = None
        attendee.checked_in_by = None
        await db.commit()
        return {"ok": True}

    @classmethod
    async def get_attendance(cls, db: AsyncSession) -> dict:
        """Lista unificada de los cuatro grupos con quién asistió (entrada presencial o conexión a la sala)."""
        event = await EventService.get_or_create_default_event(db)
        attendees = (await db.execute(select(EventAttendee).where(
            EventAttendee.event_id == event.id, EventAttendee.status == "confirmed").order_by(EventAttendee.id))).scalars().all()
        sessions = {s.attendee_id: s for s in (await db.execute(
            select(EventLiveSession).where(EventLiveSession.event_id == event.id))).scalars().all()}

        rows = []
        groups = {f"{t}:{m}": {"registered": 0, "attended": 0}
                  for t in ("investor", "external") for m in ("in_person", "virtual")}
        for a in attendees:
            s = sessions.get(a.id)
            attended = bool(a.checked_in_at) if a.attendance_mode == "in_person" else bool(s)
            g = groups[f"{a.attendee_type}:{a.attendance_mode}"] if f"{a.attendee_type}:{a.attendance_mode}" in groups else None
            if g is not None:
                g["registered"] += 1
                g["attended"] += attended
            rows.append({
                "id": a.id, "full_name": a.full_name, "email": a.email, "phone": a.phone,
                "attendee_type": a.attendee_type, "attendance_mode": a.attendance_mode,
                "seats_reserved": a.seats_reserved or 1,
                "attended": attended,
                "checked_in_at": a.checked_in_at,
                "live_first_joined_at": s.first_joined_at if s else None,
                "live_watch_minutes": round((s.watch_seconds or 0) / 60, 1) if s else 0,
            })
        in_person = [a for a in attendees if a.attendance_mode == "in_person"]
        return {
            "groups": groups,
            "in_person_registered": len(in_person),
            "in_person_checked_in": sum(1 for a in in_person if a.checked_in_at),
            "seats_expected": sum((a.seats_reserved or 1) for a in in_person),
            "seats_checked_in": sum((a.seats_reserved or 1) for a in in_person if a.checked_in_at),
            "attendees": rows,
        }
