"""
Chat en vivo de la sala del evento Gloint Power Tech (solo inscritos virtuales).

- Los mensajes salen al instante, con nombre y apellido, mientras la sala está abierta.
- Moderación posterior: el equipo borra mensajes y silencia personas (los silenciados no pueden escribir).
- Cada mensaje nuevo viaja por WebSocket directamente a los asistentes y a los paneles de administración.
  (Un único worker de uvicorn: el hub y el límite de ritmo en memoria son suficientes, igual que el chat.)
"""
import logging
import time
from datetime import datetime, timezone
from typing import Dict, Optional

from fastapi import HTTPException, WebSocket
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.event import EventAttendee, EventChatMessage
from src.services.event_attendance_service import EventAttendanceService
from src.services.event_service import EventService

logger = logging.getLogger(__name__)

MAX_LENGTH = 500
HISTORY_LIMIT = 100
MIN_SECONDS_BETWEEN_MESSAGES = 2.0

# attendee_id -> instante (monotónico) del último mensaje: freno al spam
_last_sent: Dict[int, float] = {}


class ChatHub:
    """Asistentes (con su attendee_id, para marcar «mine») y paneles de administración conectados."""
    def __init__(self):
        self.attendees: Dict[WebSocket, int] = {}
        self.admins = set()

    def connect(self, ws: WebSocket, attendee_id: Optional[int] = None, admin: bool = False):
        if admin:
            self.admins.add(ws)
        else:
            self.attendees[ws] = attendee_id

    def disconnect(self, ws: WebSocket):
        self.attendees.pop(ws, None)
        self.admins.discard(ws)

    async def _send(self, ws: WebSocket, payload: dict):
        try:
            await ws.send_json(payload)
        except Exception:
            self.disconnect(ws)

    async def broadcast_message(self, msg: dict):
        """Los asistentes reciben el mensaje con `mine`; el equipo, además, con el id de la persona."""
        for ws, aid in list(self.attendees.items()):
            await self._send(ws, {"type": "message", "message": {**_public(msg), "mine": aid == msg["attendee_id"]}})
        for ws in list(self.admins):
            await self._send(ws, {"type": "message", "message": msg})

    async def broadcast_deleted(self, message_id: int):
        for ws in list(self.attendees) + list(self.admins):
            await self._send(ws, {"type": "deleted", "id": message_id})


chat_hub = ChatHub()


def _public(msg: dict) -> dict:
    return {k: v for k, v in msg.items() if k != "attendee_id"}


def _iso(dt: Optional[datetime]) -> Optional[str]:
    return dt.isoformat() if dt else None


class EventChatService:
    # ------------------------------------------------------------------ helpers
    @staticmethod
    async def _virtual_attendee(db: AsyncSession, token: str) -> EventAttendee:
        attendee = await EventAttendanceService._get_by_token(db, token)
        if attendee.status != "confirmed":
            raise HTTPException(status_code=403, detail="Tu inscripción está cancelada.")
        if attendee.attendance_mode != "virtual":
            raise HTTPException(status_code=403, detail="El chat en vivo es solo para inscritos con asistencia virtual.")
        return attendee

    @staticmethod
    def _view(m: EventChatMessage, author: str) -> dict:
        return {"id": m.id, "author": author, "text": m.text, "created_at": _iso(m.created_at), "attendee_id": m.attendee_id}

    # ------------------------------------------------------------------ asistentes (por token)
    @classmethod
    async def history(cls, db: AsyncSession, token: str) -> dict:
        attendee = await cls._virtual_attendee(db, token)
        event = await EventService.get_or_create_default_event(db)
        rows = (await db.execute(
            select(EventChatMessage, EventAttendee.full_name).join(EventAttendee, EventAttendee.id == EventChatMessage.attendee_id)
            .where(EventChatMessage.event_id == event.id, EventChatMessage.deleted_at.is_(None))
            .order_by(EventChatMessage.id.desc()).limit(HISTORY_LIMIT))).all()
        messages = [{**_public(cls._view(m, name)), "mine": m.attendee_id == attendee.id} for m, name in reversed(rows)]
        return {"chat_open": bool(event.live_open), "muted": bool(attendee.chat_muted), "messages": messages}

    @classmethod
    async def send(cls, db: AsyncSession, token: str, text: str) -> dict:
        attendee = await cls._virtual_attendee(db, token)
        event = await EventService.get_or_create_default_event(db)
        if not event.live_open:
            raise HTTPException(status_code=400, detail="El chat solo está disponible mientras la transmisión está abierta.")
        if attendee.chat_muted:
            raise HTTPException(status_code=403, detail="El equipo te silenció en el chat.")
        clean = " ".join((text or "").split())
        if not clean:
            raise HTTPException(status_code=422, detail="Escribe un mensaje.")
        if len(clean) > MAX_LENGTH:
            raise HTTPException(status_code=422, detail=f"El mensaje no puede pasar de {MAX_LENGTH} caracteres.")

        now = time.monotonic()
        if now - _last_sent.get(attendee.id, -1e9) < MIN_SECONDS_BETWEEN_MESSAGES:
            raise HTTPException(status_code=429, detail="Estás escribiendo muy rápido. Espera un momento.")
        _last_sent[attendee.id] = now

        message = EventChatMessage(event_id=event.id, attendee_id=attendee.id, text=clean)
        db.add(message)
        await db.commit()
        await db.refresh(message)
        view = cls._view(message, attendee.full_name)
        await chat_hub.broadcast_message(view)
        return {"ok": True, "id": message.id}

    # ------------------------------------------------------------------ admin
    @classmethod
    async def admin_list(cls, db: AsyncSession) -> dict:
        event = await EventService.get_or_create_default_event(db)
        rows = (await db.execute(
            select(EventChatMessage, EventAttendee.full_name, EventAttendee.chat_muted)
            .join(EventAttendee, EventAttendee.id == EventChatMessage.attendee_id)
            .where(EventChatMessage.event_id == event.id, EventChatMessage.deleted_at.is_(None))
            .order_by(EventChatMessage.id.desc()).limit(300))).all()
        return {
            "chat_open": bool(event.live_open),
            "messages": [{**cls._view(m, name), "muted": bool(muted)} for m, name, muted in reversed(rows)],
        }

    @classmethod
    async def delete_message(cls, db: AsyncSession, message_id: int, user_id: Optional[int]) -> dict:
        message = (await db.execute(select(EventChatMessage).where(EventChatMessage.id == message_id))).scalar_one_or_none()
        if not message:
            raise HTTPException(status_code=404, detail="Mensaje no encontrado.")
        if not message.deleted_at:
            message.deleted_at = datetime.now(timezone.utc)
            message.deleted_by = user_id
            await db.commit()
            await chat_hub.broadcast_deleted(message_id)
        return {"ok": True}

    @classmethod
    async def set_muted(cls, db: AsyncSession, attendee_id: int, muted: bool) -> dict:
        attendee = (await db.execute(select(EventAttendee).where(EventAttendee.id == attendee_id))).scalar_one_or_none()
        if not attendee:
            raise HTTPException(status_code=404, detail="Asistente no encontrado.")
        attendee.chat_muted = bool(muted)
        await db.commit()
        return {"ok": True, "muted": bool(muted)}
