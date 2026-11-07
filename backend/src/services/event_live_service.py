"""
Sala en vivo del evento Gloint Power Tech (transmisión por Mux incrustada en la plataforma).

- Los inscritos virtuales entran con su enlace personal (`access_token`), sin sesión de usuario.
- Cada entrada queda registrada: quién, cuándo y cuánto tiempo estuvo (latidos periódicos).
- Solo hay una sesión activa por enlace: si se abre en otro dispositivo, la anterior se corta.
- El video se reproduce con un token firmado de corta duración (Mux), emitido solo a quien entró por la sala.
"""
import asyncio
import base64
import logging
import secrets
import time
from datetime import datetime, timedelta, timezone
from typing import List, Optional

import jwt
from fastapi import HTTPException
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.models.event import Event, EventAttendee, EventLiveSession
from src.models.user import User
from src.models.investor import Investor
from src.services.email_service import EmailService
from src.services.event_coupon_rules import attendee_sees_coupon
from src.services.event_attendance_service import EventAttendanceService
from src.services.event_service import EventService

logger = logging.getLogger(__name__)

HEARTBEAT_SECONDS = 20          # cada cuánto avisa el navegador que sigue conectado
ONLINE_WINDOW_SECONDS = 50      # sin latido en este tiempo = desconectado
MAX_HEARTBEAT_GAP = 60          # un hueco mayor no suma permanencia (pestaña dormida, red caída)
PLAYBACK_TOKEN_TTL = 6 * 3600   # el token de video cubre una transmisión larga; se renueva al volver a entrar
SEND_PAUSE_SECONDS = 0.6        # Resend limita ~2 envíos por segundo

# Playback ID reservado para probar la sala sin cuenta de Mux: no se firma token y la página muestra un reproductor simulado.
SIMULATED_PLAYBACK_ID = "simulado"

_send_in_progress = False


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _aware(dt: Optional[datetime]) -> Optional[datetime]:
    """MySQL/SQLite devuelven fechas sin zona: se interpretan como UTC."""
    if dt is not None and dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def build_playback_token(playback_id: str) -> Optional[str]:
    """JWT RS256 para reproducir un video con política 'signed' de Mux. None si no hay clave configurada."""
    if playback_id == SIMULATED_PLAYBACK_ID:
        return None
    key_id, private_b64 = settings.MUX_SIGNING_KEY_ID, settings.MUX_SIGNING_PRIVATE_KEY
    if not key_id or not private_b64:
        return None
    try:
        private_key = base64.b64decode(private_b64).decode("utf-8")
        return jwt.encode(
            {"sub": playback_id, "aud": "v", "exp": int(time.time()) + PLAYBACK_TOKEN_TTL},
            private_key, algorithm="RS256", headers={"kid": key_id},
        )
    except Exception as e:
        logger.error(f"[EventLive] No se pudo firmar el token de reproducción: {e}")
        raise HTTPException(status_code=503, detail="La transmisión no está configurada correctamente.")


class EventLiveService:
    # ------------------------------------------------------------------ helpers
    @staticmethod
    async def _virtual_attendee(db: AsyncSession, token: str) -> EventAttendee:
        attendee = await EventAttendanceService._get_by_token(db, token)
        if attendee.status != "confirmed":
            raise HTTPException(status_code=403, detail="Tu inscripción está cancelada.")
        if attendee.attendance_mode != "virtual":
            raise HTTPException(status_code=403, detail="Esta sala es solo para inscritos con asistencia virtual.")
        return attendee

    @staticmethod
    async def _session(db: AsyncSession, event_id: int, attendee_id: int) -> Optional[EventLiveSession]:
        return (await db.execute(select(EventLiveSession).where(
            EventLiveSession.event_id == event_id, EventLiveSession.attendee_id == attendee_id))).scalar_one_or_none()

    # ------------------------------------------------------------------ público (por token)
    @classmethod
    async def get_status(cls, db: AsyncSession, token: str) -> dict:
        attendee = await cls._virtual_attendee(db, token)
        event = await EventService.get_or_create_default_event(db)
        return {
            "full_name": attendee.full_name,
            "event_title": event.title,
            "event_date": event.event_date,
            "live_open": bool(event.live_open),
            "coupon_active": await attendee_sees_coupon(db, event, attendee.id),
        }

    @classmethod
    async def join(cls, db: AsyncSession, token: str) -> dict:
        attendee = await cls._virtual_attendee(db, token)
        event = await EventService.get_or_create_default_event(db)
        if not event.live_open:
            raise HTTPException(status_code=409, detail="La transmisión aún no ha comenzado.")
        if not event.live_playback_id:
            raise HTTPException(status_code=503, detail="La transmisión no está configurada todavía.")

        now = _utcnow()
        session_id = secrets.token_urlsafe(16)
        existing = await cls._session(db, event.id, attendee.id)
        if existing:
            # Nueva entrada: toma la sesión y la del otro dispositivo (si hay) deja de ser válida
            existing.session_id = session_id
            existing.last_seen_at = now
            existing.join_count = (existing.join_count or 0) + 1
        else:
            db.add(EventLiveSession(event_id=event.id, attendee_id=attendee.id, session_id=session_id,
                                    first_joined_at=now, last_seen_at=now, watch_seconds=0, join_count=1))
        await db.commit()
        logger.info(f"[EventLive] Inscrito {attendee.id} entró a la sala en vivo.")
        return {
            "session_id": session_id,
            "playback_id": event.live_playback_id,
            "playback_token": build_playback_token(event.live_playback_id),
            "heartbeat_seconds": HEARTBEAT_SECONDS,
        }

    @classmethod
    async def heartbeat(cls, db: AsyncSession, token: str, session_id: str) -> dict:
        attendee = await cls._virtual_attendee(db, token)
        event = await EventService.get_or_create_default_event(db)
        session = await cls._session(db, event.id, attendee.id)
        if not session or not secrets.compare_digest(session.session_id, session_id or ""):
            raise HTTPException(status_code=409, detail="Tu enlace se abrió en otro dispositivo. Esta sesión se cerró.")
        now = _utcnow()
        gap = (now - _aware(session.last_seen_at)).total_seconds()
        if 0 < gap <= MAX_HEARTBEAT_GAP:
            session.watch_seconds = (session.watch_seconds or 0) + int(gap)
        session.last_seen_at = now
        await db.commit()
        return {"live_open": bool(event.live_open), "coupon_active": await attendee_sees_coupon(db, event, attendee.id)}

    # ------------------------------------------------------------------ admin
    @classmethod
    async def get_overview(cls, db: AsyncSession) -> dict:
        event = await EventService.get_or_create_default_event(db)
        attendees = (await db.execute(select(EventAttendee).where(
            EventAttendee.event_id == event.id, EventAttendee.status == "confirmed",
            EventAttendee.attendance_mode == "virtual").order_by(EventAttendee.id))).scalars().all()
        sessions = {s.attendee_id: s for s in (await db.execute(
            select(EventLiveSession).where(EventLiveSession.event_id == event.id))).scalars().all()}

        limit = _utcnow() - timedelta(seconds=ONLINE_WINDOW_SECONDS)
        rows, online = [], 0
        for a in attendees:
            s = sessions.get(a.id)
            is_online = bool(s and _aware(s.last_seen_at) >= limit)
            online += is_online
            rows.append({
                "attendee_id": a.id,
                "full_name": a.full_name,
                "email": a.email,
                "attendee_type": a.attendee_type,
                "invited_at": a.live_invite_sent_at,
                "first_joined_at": s.first_joined_at if s else None,
                "last_seen_at": s.last_seen_at if s else None,
                "watch_minutes": round((s.watch_seconds or 0) / 60, 1) if s else 0,
                "joins": s.join_count if s else 0,
                "online": is_online,
            })
        return {
            "live_open": bool(event.live_open),
            "live_playback_id": event.live_playback_id,
            "signing_configured": bool(settings.MUX_SIGNING_KEY_ID and settings.MUX_SIGNING_PRIVATE_KEY),
            "total_virtual": len(attendees),
            "invited": sum(1 for a in attendees if a.live_invite_sent_at),
            "joined": sum(1 for r in rows if r["first_joined_at"]),
            "online_now": online,
            "attendees": rows,
        }

    @classmethod
    async def admin_preview(cls, db: AsyncSession) -> dict:
        """Video para que el equipo pruebe la transmisión SIN abrir la sala: no cambia `live_open`, no crea sesión ni suma
        permanencia y no avisa a nadie. Solo lo pide el panel de administración."""
        event = await EventService.get_or_create_default_event(db)
        if not event.live_playback_id:
            raise HTTPException(status_code=400, detail="Guarda primero el Playback ID de Mux para poder probar la transmisión.")
        return {
            "playback_id": event.live_playback_id,
            "playback_token": build_playback_token(event.live_playback_id),
            "live_open": bool(event.live_open),
        }

    @classmethod
    async def update_config(cls, db: AsyncSession, playback_id: Optional[str], is_open: Optional[bool]) -> dict:
        event = await EventService.get_or_create_default_event(db)
        if playback_id is not None:
            clean = playback_id.strip()
            if len(clean) > 100 or not all(c.isalnum() for c in clean):
                raise HTTPException(status_code=422, detail="El Playback ID de Mux solo lleva letras y números.")
            event.live_playback_id = clean or None
        if is_open is not None:
            if is_open and not event.live_playback_id:
                raise HTTPException(status_code=400, detail="Configura el Playback ID de Mux antes de abrir la sala.")
            event.live_open = bool(is_open)
        await db.commit()
        return await cls.get_overview(db)

    # ------------------------------------------------------------------ admin: invitaciones
    @staticmethod
    def _job(attendee: EventAttendee, event: Event) -> dict:
        return dict(
            to_email=attendee.email,
            user_name=attendee.full_name or "Estimado/a Participante",
            event_title=event.title or "Gloint Power Tech",
            event_date=event.event_date,
            access_token=attendee.access_token,
        )

    @classmethod
    async def send_invitations(cls, db: AsyncSession, send: bool) -> dict:
        """Invita a los virtuales vigentes que aún no han recibido su invitación. send=False = vista previa."""
        global _send_in_progress
        event = await EventService.get_or_create_default_event(db)
        recipients: List[EventAttendee] = list((await db.execute(select(EventAttendee).where(
            EventAttendee.event_id == event.id, EventAttendee.status == "confirmed",
            EventAttendee.attendance_mode == "virtual", EventAttendee.live_invite_sent_at.is_(None)
        ).order_by(EventAttendee.id))).scalars().all())
        await EventAttendanceService._ensure_tokens(db, recipients)

        summary = {"send": send, "recipients": len(recipients), "emails": [a.email for a in recipients]}
        if not send:
            return summary
        if _send_in_progress:
            raise HTTPException(status_code=409, detail="Ya hay un envío de invitaciones en curso. Espera a que termine.")

        jobs = [cls._job(a, event) for a in recipients]
        now = _utcnow()
        for a in recipients:
            a.live_invite_sent_at = now
        await db.commit()
        _send_in_progress = True
        asyncio.create_task(asyncio.to_thread(cls._send_batch, jobs))
        logger.info(f"[EventLive] Programado envío de {len(jobs)} invitaciones a la sala en vivo.")
        return summary

    @classmethod
    async def send_invitation_to_attendee(cls, db: AsyncSession, attendee_id: int) -> dict:
        """Invitación individual (pruebas o reenvíos): se envía aunque ya se le haya enviado antes."""
        attendee = (await db.execute(select(EventAttendee).where(EventAttendee.id == attendee_id))).scalar_one_or_none()
        if not attendee:
            raise HTTPException(status_code=404, detail="Asistente no encontrado.")
        if attendee.status != "confirmed":
            raise HTTPException(status_code=400, detail="La inscripción está cancelada.")
        if attendee.attendance_mode != "virtual":
            raise HTTPException(status_code=400, detail="La invitación a la sala en vivo es solo para inscritos virtuales.")
        event = await EventService.get_or_create_default_event(db)
        await EventAttendanceService._ensure_tokens(db, [attendee])
        sent = await asyncio.to_thread(EmailService.send_event_live_invitation_email, **cls._job(attendee, event))
        if not sent:
            raise HTTPException(status_code=502, detail="No se pudo enviar el correo. Revisa la configuración de correo (Resend) del servidor.")
        attendee.live_invite_sent_at = _utcnow()
        await db.commit()
        return {"sent": True, "email": attendee.email}

    @classmethod
    async def send_invitation_to_investor(cls, db: AsyncSession, email: str, force_virtual: bool = False) -> dict:
        """Envía el enlace de la transmisión a CUALQUIER inversionista, esté o no inscrito al evento.
        Si no tiene inscripción se le crea una virtual; si estaba presencial se pide confirmación para pasarlo a virtual."""
        email = (email or "").strip().lower()
        if not email:
            raise HTTPException(status_code=400, detail="Escribe el correo del inversionista.")
        user = (await db.execute(select(User).where(func.lower(User.email) == email))).scalars().first()
        investor = None
        if user:
            investor = (await db.execute(select(Investor).where(Investor.user_id == user.id).order_by(desc(Investor.id)))).scalars().first()
        if not user or not investor:
            raise HTTPException(status_code=404, detail="No hay un inversionista con ese correo.")

        event = await EventService.get_or_create_default_event(db)
        attendee = await EventService.find_attendee_for_user(db, event.id, user)
        if attendee and attendee.status == "confirmed" and attendee.attendance_mode == "in_person" and not force_virtual:
            raise HTTPException(status_code=409, detail="Este inversionista está inscrito como presencial. Para enviarle la transmisión debe pasar a virtual (se liberan sus cupos presenciales).")

        if not attendee:
            attendee = EventAttendee(
                event_id=event.id, user_id=user.id, attendee_type="investor",
                full_name=(f"{getattr(investor, 'first_name', '') or ''} {getattr(investor, 'last_name', '') or ''}".strip()
                           or getattr(user, "name", "") or email),
                email=email, phone=getattr(user, "phone_number", None) or getattr(user, "phone", None),
                attendance_mode="virtual", has_companion=False, seats_reserved=0, status="confirmed")
            db.add(attendee)
        else:
            attendee.user_id = attendee.user_id or user.id
            attendee.attendee_type = "investor"
            attendee.attendance_mode = "virtual"
            attendee.has_companion = False
            attendee.companion_name = None
            attendee.seats_reserved = 0
            attendee.status = "confirmed"
        await db.commit()
        await db.refresh(attendee)
        return await cls.send_invitation_to_attendee(db, attendee.id)

    @staticmethod
    def _send_batch(jobs: List[dict]) -> None:
        global _send_in_progress
        ok = failed = 0
        try:
            for job in jobs:
                try:
                    sent = EmailService.send_event_live_invitation_email(**job)
                except Exception as e:
                    logger.error(f"[EventLive] Error con {job['to_email']}: {e}")
                    sent = False
                ok, failed = (ok + 1, failed) if sent else (ok, failed + 1)
                time.sleep(SEND_PAUSE_SECONDS)
        finally:
            _send_in_progress = False
            logger.info(f"[EventLive] Envío terminado: {ok} enviados, {failed} fallidos.")
