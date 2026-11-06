"""
Preguntas moderadas de los asistentes al evento Gloint Power Tech.

- Cualquier inscrito vigente (presencial o virtual) envía preguntas con su enlace personal (`access_token`).
- Una pregunta nueva queda `pending`: solo su autor la ve. El equipo la aprueba, la rechaza o la marca respondida.
- Los asistentes votan las aprobadas; las más votadas suben.
- Los cambios se avisan por WebSocket (un simple "cambió", con su ámbito) y los clientes vuelven a pedir su vista.
  Para que 200 asistentes no se avalanchen sobre el servidor, los avisos van filtrados y agrupados (ver QuestionsHub).
  (Un único worker de uvicorn: el hub en memoria es suficiente, igual que el chat.)
"""
import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, Set, Tuple

from fastapi import HTTPException, WebSocket
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.event import EventAttendee, EventQuestion, EventQuestionVote
from src.services.event_attendance_service import EventAttendanceService
from src.services.event_service import EventService
from src.services import ws_broadcast

logger = logging.getLogger(__name__)

MIN_LENGTH = 5
MAX_LENGTH = 500
MAX_PENDING_PER_ATTENDEE = 3
MODERATION_STATUSES = {"pending", "approved", "answered", "rejected"}


# Los avisos que llegan en este lapso se juntan en uno solo por ámbito: una ráfaga de votos o respuestas no se multiplica
# por cada asistente conectado.
COALESCE_SECONDS = 1.5


class QuestionsHub:
    """
    Conexiones en vivo: asistentes (por token) y paneles de administración.

    Cada aviso lleva un ámbito (`questions`, `survey`, `coupon`) para que cada panel recargue solo lo que le importa, y
    puede ir solo al equipo (attendees=False): por ejemplo, que alguien responda la encuesta o envíe una pregunta pendiente
    no cambia nada para los demás asistentes, así que no les llega aviso ni recargan.
    """
    def __init__(self):
        self.attendees: Set[WebSocket] = set()
        self.admins: Set[WebSocket] = set()
        self._pending: Dict[str, bool] = {}   # ámbito -> ¿también a los asistentes?
        self._task = None

    def connect(self, ws: WebSocket, admin: bool):
        (self.admins if admin else self.attendees).add(ws)

    def disconnect(self, ws: WebSocket):
        self.attendees.discard(ws)
        self.admins.discard(ws)

    async def notify(self, scope: str = "questions", attendees: bool = True):
        """Registra el aviso y lo envía agrupado, como máximo una vez por ámbito cada COALESCE_SECONDS."""
        self._pending[scope] = self._pending.get(scope, False) or attendees
        loop = asyncio.get_running_loop()
        if self._task is None or self._task.done() or self._task.get_loop() is not loop:
            self._task = loop.create_task(self._flush_later())

    async def _flush_later(self):
        await asyncio.sleep(COALESCE_SECONDS)
        await self.flush_now()

    async def flush_now(self):
        """Envía ya los avisos pendientes (también lo usan las pruebas)."""
        pending, self._pending = self._pending, {}
        targets: list = []
        for scope, to_attendees in pending.items():
            payload = {"type": "changed", "scope": scope}
            targets += [(ws, payload) for ws in list(self.admins)]
            if to_attendees:
                targets += [(ws, payload) for ws in list(self.attendees)]
        await ws_broadcast.send_many(targets, self.disconnect)


questions_hub = QuestionsHub()


def _first_name(full_name: str) -> str:
    return (full_name or "").strip().split(" ")[0] or "Asistente"


async def _vote_counts(db: AsyncSession, question_ids) -> Dict[int, int]:
    if not question_ids:
        return {}
    rows = (await db.execute(
        select(EventQuestionVote.question_id, func.count()).where(EventQuestionVote.question_id.in_(question_ids))
        .group_by(EventQuestionVote.question_id))).all()
    return {int(q): int(c) for q, c in rows}


class EventQuestionService:
    # ------------------------------------------------------------------ helpers
    @staticmethod
    async def _attendee(db: AsyncSession, token: str) -> EventAttendee:
        attendee = await EventAttendanceService._get_by_token(db, token)
        if attendee.status != "confirmed":
            raise HTTPException(status_code=403, detail="Tu inscripción está cancelada.")
        return attendee

    # ------------------------------------------------------------------ asistentes (por token)
    @classmethod
    async def list_for_attendee(cls, db: AsyncSession, token: str) -> dict:
        """Aprobadas y respondidas de todos, más las propias en cualquier estado (las rechazadas solo las ve su autor)."""
        attendee = await cls._attendee(db, token)
        event = await EventService.get_or_create_default_event(db)
        questions = (await db.execute(select(EventQuestion).where(
            EventQuestion.event_id == event.id,
            (EventQuestion.status.in_(("approved", "answered"))) | (EventQuestion.attendee_id == attendee.id)
        ).order_by(EventQuestion.id))).scalars().all()

        ids = [q.id for q in questions]
        counts = await _vote_counts(db, ids)
        voted = set((await db.execute(select(EventQuestionVote.question_id).where(
            EventQuestionVote.attendee_id == attendee.id, EventQuestionVote.question_id.in_(ids)))).scalars().all()) if ids else set()
        names = {a.id: _first_name(a.full_name) for a in (await db.execute(select(EventAttendee).where(
            EventAttendee.id.in_({q.attendee_id for q in questions})))).scalars().all()} if questions else {}

        items = [{
            "id": q.id, "text": q.text, "status": q.status,
            "author": names.get(q.attendee_id, "Asistente"),
            "mine": q.attendee_id == attendee.id,
            "votes": counts.get(q.id, 0), "voted": q.id in voted,
            "created_at": q.created_at,
        } for q in questions]
        # Aprobadas primero (más votadas arriba), luego las propias pendientes/rechazadas, y al final las respondidas
        order = {"approved": 0, "pending": 1, "rejected": 1, "answered": 2}
        items.sort(key=lambda i: (order[i["status"]], -i["votes"] if i["status"] == "approved" else 0, i["id"]))
        return {"questions_open": bool(event.questions_open), "attendee_name": attendee.full_name, "questions": items}

    @classmethod
    async def submit(cls, db: AsyncSession, token: str, text: str) -> dict:
        attendee = await cls._attendee(db, token)
        event = await EventService.get_or_create_default_event(db)
        if not event.questions_open:
            raise HTTPException(status_code=400, detail="Las preguntas no están abiertas en este momento.")
        clean = " ".join((text or "").split())
        if len(clean) < MIN_LENGTH:
            raise HTTPException(status_code=422, detail=f"Escribe una pregunta de al menos {MIN_LENGTH} caracteres.")
        if len(clean) > MAX_LENGTH:
            raise HTTPException(status_code=422, detail=f"La pregunta no puede pasar de {MAX_LENGTH} caracteres.")
        pending = (await db.execute(select(func.count(EventQuestion.id)).where(
            EventQuestion.event_id == event.id, EventQuestion.attendee_id == attendee.id,
            EventQuestion.status == "pending"))).scalar() or 0
        if pending >= MAX_PENDING_PER_ATTENDEE:
            raise HTTPException(status_code=429, detail=f"Tienes {MAX_PENDING_PER_ATTENDEE} preguntas esperando revisión. Espera a que el equipo las revise.")
        db.add(EventQuestion(event_id=event.id, attendee_id=attendee.id, text=clean, status="pending"))
        await db.commit()
        # Una pregunta pendiente solo la ve su autor (que ya se actualiza solo): se avisa únicamente al equipo
        await questions_hub.notify("questions", attendees=False)
        return {"ok": True}

    @classmethod
    async def toggle_vote(cls, db: AsyncSession, token: str, question_id: int) -> dict:
        attendee = await cls._attendee(db, token)
        event = await EventService.get_or_create_default_event(db)
        question = (await db.execute(select(EventQuestion).where(
            EventQuestion.id == question_id, EventQuestion.event_id == event.id))).scalar_one_or_none()
        if not question or question.status != "approved":
            raise HTTPException(status_code=404, detail="Solo se puede votar una pregunta aprobada.")
        existing = (await db.execute(select(EventQuestionVote).where(
            EventQuestionVote.question_id == question_id, EventQuestionVote.attendee_id == attendee.id))).scalar_one_or_none()
        if existing:
            await db.delete(existing)
        else:
            db.add(EventQuestionVote(question_id=question_id, attendee_id=attendee.id))
        await db.commit()
        await questions_hub.notify()
        return {"voted": existing is None}

    # ------------------------------------------------------------------ admin
    @classmethod
    async def admin_list(cls, db: AsyncSession) -> dict:
        event = await EventService.get_or_create_default_event(db)
        questions = (await db.execute(select(EventQuestion).where(EventQuestion.event_id == event.id)
                                      .order_by(EventQuestion.id))).scalars().all()
        counts = await _vote_counts(db, [q.id for q in questions])
        people = {a.id: a for a in (await db.execute(select(EventAttendee).where(
            EventAttendee.id.in_({q.attendee_id for q in questions})))).scalars().all()} if questions else {}
        items = []
        for q in questions:
            a = people.get(q.attendee_id)
            items.append({
                "id": q.id, "text": q.text, "status": q.status, "votes": counts.get(q.id, 0),
                "author": a.full_name if a else "—", "email": a.email if a else None,
                "attendee_type": a.attendee_type if a else None, "attendance_mode": a.attendance_mode if a else None,
                "created_at": q.created_at, "moderated_at": q.moderated_at,
            })
        return {
            "questions_open": bool(event.questions_open),
            "counts": {s: sum(1 for i in items if i["status"] == s) for s in sorted(MODERATION_STATUSES)},
            "questions": items,
        }

    @classmethod
    async def set_open(cls, db: AsyncSession, is_open: bool) -> dict:
        event = await EventService.get_or_create_default_event(db)
        event.questions_open = bool(is_open)
        await db.commit()
        await questions_hub.notify()
        return await cls.admin_list(db)

    @classmethod
    async def set_status(cls, db: AsyncSession, question_id: int, status: str) -> dict:
        if status not in MODERATION_STATUSES:
            raise HTTPException(status_code=422, detail="Estado no válido.")
        event = await EventService.get_or_create_default_event(db)
        question = (await db.execute(select(EventQuestion).where(
            EventQuestion.id == question_id, EventQuestion.event_id == event.id))).scalar_one_or_none()
        if not question:
            raise HTTPException(status_code=404, detail="Pregunta no encontrada.")
        question.status = status
        question.moderated_at = None if status == "pending" else datetime.now(timezone.utc)
        await db.commit()
        await questions_hub.notify()
        return await cls.admin_list(db)
