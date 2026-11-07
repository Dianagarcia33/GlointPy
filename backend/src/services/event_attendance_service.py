"""
Confirmación de asistencia presencial al evento Gloint Power Tech.

- Cada inscrito tiene un `access_token` personal e impredecible (sirve para usuarios con cuenta y externos).
- El correo lleva un enlace con ese token y un QR único. Con el enlace la persona confirma su asistencia
  presencial o se cambia a virtual (liberando el cupo) sin necesidad de iniciar sesión.
- Quien no responde conserva su inscripción tal como está.
"""
import asyncio
import io
import logging
import secrets
import time
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.models.event import Event, EventAttendee
from src.schemas.event import MyRegistrationResponse
from src.services.event_coupon_rules import attendee_sees_coupon
from src.services.email_service import EmailService
from src.services.event_service import EventService

logger = logging.getLogger(__name__)

# Prefijo de los QR antiguos (solo texto, sin enlace). Ya no se genera, pero el control de entrada lo sigue
# aceptando para que los QR enviados antes de que el QR llevara un enlace sigan funcionando en la puerta.
QR_PREFIX = "GLT-PT:"
# Resend limita ~2 envíos por segundo por cuenta: se envía en serie con una pausa corta.
SEND_PAUSE_SECONDS = 0.6

_send_in_progress = False
_qr_send_in_progress = False


def qr_content(access_token: str) -> str:
    """
    Contenido del QR del inscrito: su enlace personal. Con la cámara del celular abre su página de asistencia
    (donde ve su QR y puede confirmar); el escáner de la puerta extrae de ese enlace el código y registra la entrada.
    """
    return f"{settings.FRONTEND_URL.rstrip('/')}/evento/asistencia/{access_token}"


def build_qr_png(access_token: str) -> bytes:
    """PNG del QR único del inscrito (su enlace personal, ver qr_content)."""
    import segno
    buffer = io.BytesIO()
    segno.make(qr_content(access_token), error="m").save(buffer, kind="png", scale=8, border=2)
    return buffer.getvalue()


class EventAttendanceService:
    # ------------------------------------------------------------------ helpers
    @staticmethod
    async def _get_by_token(db: AsyncSession, token: str) -> EventAttendee:
        clean = (token or "").strip()
        if not clean or len(clean) > 64:
            raise HTTPException(status_code=404, detail="Enlace no válido.")
        result = await db.execute(select(EventAttendee).where(EventAttendee.access_token == clean))
        attendee = result.scalar_one_or_none()
        if not attendee:
            raise HTTPException(status_code=404, detail="Enlace no válido.")
        return attendee

    @staticmethod
    async def _ensure_tokens(db: AsyncSession, attendees: List[EventAttendee]) -> None:
        """Inscritos anteriores a esta función no tienen token: se les genera uno."""
        changed = False
        for a in attendees:
            if not a.access_token:
                a.access_token = secrets.token_urlsafe(32)
                changed = True
        if changed:
            await db.commit()

    @staticmethod
    def _public_view(attendee: EventAttendee, event: Event) -> dict:
        return {
            "full_name": attendee.full_name,
            "attendance_mode": attendee.attendance_mode,
            "status": attendee.status,
            "seats_reserved": attendee.seats_reserved or 0,
            "companion_name": attendee.companion_name,
            "attendance_confirmed_at": attendee.attendance_confirmed_at,
            "event_title": event.title,
            "event_date": event.event_date,
            "location": event.location,
        }

    # ------------------------------------------------------------------ público (por token)
    @classmethod
    async def get_public_status(cls, db: AsyncSession, token: str) -> dict:
        attendee = await cls._get_by_token(db, token)
        event = await EventService.get_or_create_default_event(db)
        return cls._public_view(attendee, event)

    @classmethod
    async def get_qr(cls, db: AsyncSession, token: str) -> bytes:
        attendee = await cls._get_by_token(db, token)
        if attendee.status != "confirmed":
            raise HTTPException(status_code=404, detail="Enlace no válido.")
        return build_qr_png(attendee.access_token)

    @classmethod
    async def confirm_in_person(cls, db: AsyncSession, token: str) -> dict:
        attendee = await cls._get_by_token(db, token)
        event = await EventService.get_or_create_default_event(db)
        if attendee.status != "confirmed":
            raise HTTPException(status_code=400, detail="Tu inscripción está cancelada.")
        if attendee.attendance_mode != "in_person":
            raise HTTPException(status_code=400, detail="Tu inscripción es virtual; no requiere confirmación presencial.")
        if not attendee.attendance_confirmed_at:
            attendee.attendance_confirmed_at = datetime.now(timezone.utc)
            await db.commit()
            await db.refresh(attendee)
        return cls._public_view(attendee, event)

    @classmethod
    async def switch_to_virtual(cls, db: AsyncSession, token: str) -> dict:
        """Pasa la inscripción a virtual y libera los cupos presenciales (incluido el acompañante)."""
        attendee = await cls._get_by_token(db, token)
        event = await EventService.get_or_create_default_event(db)
        if attendee.status != "confirmed":
            raise HTTPException(status_code=400, detail="Tu inscripción está cancelada.")
        if attendee.attendance_mode != "virtual":
            attendee.attendance_mode = "virtual"
            attendee.has_companion = False
            attendee.companion_name = None
            attendee.seats_reserved = 1
            attendee.attendance_confirmed_at = None
            await db.commit()
            await db.refresh(attendee)
            logger.info(f"[EventAttendance] Inscrito {attendee.id} cambió a modalidad virtual desde el enlace del correo.")
        return cls._public_view(attendee, event)

    @classmethod
    async def get_my_access(cls, db: AsyncSession, user) -> Optional[MyRegistrationResponse]:
        """
        Inscripción vigente del usuario con sesión iniciada, con su enlace personal y el estado de la sala
        (transmisión, preguntas y encuesta). Así puede entrar al evento desde su dashboard sin buscar el correo.
        """
        event = await EventService.get_or_create_default_event(db)
        attendee = await EventService.find_attendee_for_user(db, event.id, user, confirmed_only=True)
        if not attendee:
            return None
        await cls._ensure_tokens(db, [attendee])
        data = MyRegistrationResponse.model_validate(attendee, from_attributes=True)
        data.access_token = attendee.access_token
        data.live_open = bool(event.live_open)
        data.questions_open = bool(event.questions_open)
        data.survey_open = bool(event.survey_open)
        data.coupon_active = await attendee_sees_coupon(db, event, attendee.id)
        return data

    # ------------------------------------------------------------------ admin: envío
    @staticmethod
    async def _pending_recipients(db: AsyncSession, event_id: int) -> List[EventAttendee]:
        """Inscritos presenciales vigentes que aún no han confirmado su asistencia."""
        result = await db.execute(
            select(EventAttendee).where(
                EventAttendee.event_id == event_id,
                EventAttendee.status == "confirmed",
                EventAttendee.attendance_mode == "in_person",
                EventAttendee.attendance_confirmed_at.is_(None),
            ).order_by(EventAttendee.id)
        )
        return list(result.scalars().all())

    @classmethod
    async def send_confirmation_emails(cls, db: AsyncSession, send: bool) -> dict:
        """
        Con send=False solo cuenta a quién se enviaría (vista previa). Con send=True encola el envío
        en segundo plano y registra la fecha de envío de cada inscrito.
        """
        global _send_in_progress
        event = await EventService.get_or_create_default_event(db)
        recipients = await cls._pending_recipients(db, event.id)
        await cls._ensure_tokens(db, recipients)

        summary = {
            "send": send,
            "recipients": len(recipients),
            "emails": [a.email for a in recipients],
        }
        if not send:
            return summary

        if _send_in_progress:
            raise HTTPException(status_code=409, detail="Ya hay un envío de confirmaciones en curso. Espera a que termine.")

        # Datos planos para no usar objetos ORM fuera de la sesión
        jobs = [
            dict(
                to_email=a.email,
                user_name=a.full_name or "Estimado/a Participante",
                event_title=event.title or "Gloint Power Tech",
                event_date=event.event_date,
                location=event.location,
                seats_reserved=a.seats_reserved or 1,
                companion_name=a.companion_name if a.has_companion else None,
                access_token=a.access_token,
            )
            for a in recipients
        ]
        now = datetime.now(timezone.utc)
        for a in recipients:
            a.attendance_email_sent_at = now
        await db.commit()

        _send_in_progress = True
        asyncio.create_task(asyncio.to_thread(cls._send_batch, jobs))
        logger.info(f"[EventAttendance] Programado envío de {len(jobs)} correos de confirmación de asistencia.")
        return summary

    @classmethod
    async def send_confirmation_email_to_attendee(cls, db: AsyncSession, attendee_id: int) -> dict:
        """
        Envía el correo de confirmación a un solo inscrito (útil para pruebas). Se envía aunque ya
        haya confirmado o se le haya enviado antes, y se espera el resultado para informarlo.
        """
        result = await db.execute(select(EventAttendee).where(EventAttendee.id == attendee_id))
        attendee = result.scalar_one_or_none()
        if not attendee:
            raise HTTPException(status_code=404, detail="Asistente no encontrado.")
        if attendee.status != "confirmed":
            raise HTTPException(status_code=400, detail="La inscripción está cancelada.")
        if attendee.attendance_mode != "in_person":
            raise HTTPException(status_code=400, detail="Este correo es solo para inscritos con asistencia presencial.")

        event = await EventService.get_or_create_default_event(db)
        await cls._ensure_tokens(db, [attendee])
        job = dict(
            to_email=attendee.email,
            user_name=attendee.full_name or "Estimado/a Participante",
            event_title=event.title or "Gloint Power Tech",
            event_date=event.event_date,
            location=event.location,
            seats_reserved=attendee.seats_reserved or 1,
            companion_name=attendee.companion_name if attendee.has_companion else None,
            access_token=attendee.access_token,
        )
        qr = build_qr_png(job["access_token"])
        sent = await asyncio.to_thread(EmailService.send_event_attendance_confirmation_email, qr_png=qr, **job)
        if not sent:
            raise HTTPException(status_code=502, detail="No se pudo enviar el correo. Revisa la configuración de correo (Resend) del servidor.")
        attendee.attendance_email_sent_at = datetime.now(timezone.utc)
        await db.commit()
        logger.info(f"[EventAttendance] Correo de confirmación individual enviado a {attendee.email}.")
        return {"sent": True, "email": attendee.email}

    # ------------------------------------------------------------------ admin: reenvío del QR de acceso
    @staticmethod
    async def _access_qr_recipients(db: AsyncSession, event_id: int) -> List[EventAttendee]:
        """Todos los presenciales vigentes (hayan confirmado o no): el QR es lo que necesitan para entrar."""
        result = await db.execute(
            select(EventAttendee).where(
                EventAttendee.event_id == event_id,
                EventAttendee.status == "confirmed",
                EventAttendee.attendance_mode == "in_person",
            ).order_by(EventAttendee.id)
        )
        return list(result.scalars().all())

    @staticmethod
    def _access_qr_job(event: Event, a: EventAttendee) -> dict:
        return dict(
            to_email=a.email,
            user_name=a.full_name or "Estimado/a Participante",
            event_title=event.title or "Gloint Power Tech",
            event_date=event.event_date,
            location=event.location,
            seats_reserved=a.seats_reserved or 1,
            companion_name=a.companion_name if a.has_companion else None,
            access_token=a.access_token,
        )

    @classmethod
    async def send_access_qr_emails(cls, db: AsyncSession, send: bool) -> dict:
        """
        Reenvía el correo «Tu QR de acceso» a todos los presenciales vigentes. Con send=False solo cuenta a quién se
        enviaría (vista previa); con send=True encola el envío en segundo plano y registra la fecha de cada inscrito.
        """
        global _qr_send_in_progress
        event = await EventService.get_or_create_default_event(db)
        recipients = await cls._access_qr_recipients(db, event.id)
        await cls._ensure_tokens(db, recipients)

        summary = {"send": send, "recipients": len(recipients), "emails": [a.email for a in recipients]}
        if not send:
            return summary
        if _qr_send_in_progress:
            raise HTTPException(status_code=409, detail="Ya hay un reenvío de QR en curso. Espera a que termine.")

        jobs = [cls._access_qr_job(event, a) for a in recipients]
        now = datetime.now(timezone.utc)
        for a in recipients:
            a.access_qr_sent_at = now
        await db.commit()

        _qr_send_in_progress = True
        asyncio.create_task(asyncio.to_thread(cls._send_qr_batch, jobs))
        logger.info(f"[EventAttendance] Programado reenvío de {len(jobs)} correos «Tu QR de acceso».")
        return summary

    @classmethod
    async def send_access_qr_to_attendee(cls, db: AsyncSession, attendee_id: int) -> dict:
        """Reenvía el QR de acceso a un solo inscrito presencial y espera el resultado para informarlo."""
        attendee = (await db.execute(select(EventAttendee).where(EventAttendee.id == attendee_id))).scalar_one_or_none()
        if not attendee:
            raise HTTPException(status_code=404, detail="Asistente no encontrado.")
        if attendee.status != "confirmed":
            raise HTTPException(status_code=400, detail="La inscripción está cancelada.")
        if attendee.attendance_mode != "in_person":
            raise HTTPException(status_code=400, detail="El QR de acceso es solo para inscritos con asistencia presencial.")
        event = await EventService.get_or_create_default_event(db)
        await cls._ensure_tokens(db, [attendee])
        job = cls._access_qr_job(event, attendee)
        sent = await asyncio.to_thread(EmailService.send_event_access_qr_email, qr_png=build_qr_png(job["access_token"]), **job)
        if not sent:
            raise HTTPException(status_code=502, detail="No se pudo enviar el correo. Revisa la configuración de correo (Resend) del servidor.")
        attendee.access_qr_sent_at = datetime.now(timezone.utc)
        await db.commit()
        logger.info(f"[EventAttendance] QR de acceso reenviado a {attendee.email}.")
        return {"sent": True, "email": attendee.email}

    @staticmethod
    def _send_qr_batch(jobs: List[dict]) -> None:
        global _qr_send_in_progress
        ok = failed = 0
        try:
            for job in jobs:
                try:
                    sent = EmailService.send_event_access_qr_email(qr_png=build_qr_png(job["access_token"]), **job)
                except Exception as e:
                    logger.error(f"[EventAttendance] Error reenviando QR a {job['to_email']}: {e}")
                    sent = False
                ok, failed = (ok + 1, failed) if sent else (ok, failed + 1)
                time.sleep(SEND_PAUSE_SECONDS)
        finally:
            _qr_send_in_progress = False
            logger.info(f"[EventAttendance] Reenvío de QR terminado: {ok} enviados, {failed} fallidos.")

    @staticmethod
    def _send_batch(jobs: List[dict]) -> None:
        global _send_in_progress
        ok = failed = 0
        try:
            for job in jobs:
                try:
                    qr = build_qr_png(job["access_token"])
                    sent = EmailService.send_event_attendance_confirmation_email(qr_png=qr, **job)
                except Exception as e:
                    logger.error(f"[EventAttendance] Error con {job['to_email']}: {e}")
                    sent = False
                ok, failed = (ok + 1, failed) if sent else (ok, failed + 1)
                time.sleep(SEND_PAUSE_SECONDS)
        finally:
            _send_in_progress = False
            logger.info(f"[EventAttendance] Envío terminado: {ok} enviados, {failed} fallidos.")
