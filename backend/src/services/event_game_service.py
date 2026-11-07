"""
Dinámica en vivo del evento Gloint Power Tech: «¿quién respondió primero?».

- Las personas escanean un QR y entran a una URL pública, sin sesión y sin dar datos: reciben un código corto
  (ej. «Colibrí 47») que ven en su celular. Si ganan, lo ven también en la pantalla del presentador, levantan el celular
  y dicen «fui yo».
- El equipo crea rondas (pregunta de opción múltiple con una respuesta correcta) y abre una a la vez.
- Gana la PRIMERA respuesta correcta. La decide el servidor con una actualización atómica (no la hora del celular), así que
  dos respuestas casi simultáneas nunca dan dos ganadores. Al haber ganador la ronda se cierra sola.
- Cada participante responde una sola vez por ronda. La respuesta correcta no se envía a nadie hasta que la ronda cierra.
"""
import asyncio
import logging
import random
import secrets
from datetime import datetime, timezone
from typing import List, Optional, Set

from fastapi import HTTPException, WebSocket
from sqlalchemy import delete, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.event_game import EventGameAnswer, EventGameParticipant, EventGameRound
from src.services import ws_broadcast
from src.services.event_service import EventService

logger = logging.getLogger(__name__)

ANIMALS = [
    "Colibrí", "Jaguar", "Cóndor", "Delfín", "Tucán", "Puma", "Oso", "Búho", "Lobo", "Zorro",
    "Halcón", "Tigre", "Panda", "Koala", "Lince", "Ocelote", "Manatí", "Capibara", "Guacamaya", "Mono",
]
MAX_QUESTION = 300
MAX_OPTION = 120
COALESCE_SECONDS = 0.25


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _aware(dt: Optional[datetime]) -> Optional[datetime]:
    """MySQL/SQLite devuelven fechas sin zona: se interpretan como UTC."""
    if dt is not None and dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


class GameHub:
    """Conexiones públicas en vivo (pantalla del presentador y celulares). Cada aviso hace que vuelvan a pedir el estado."""
    def __init__(self):
        self.clients: Set[WebSocket] = set()
        self._dirty = False
        self._task = None

    def connect(self, ws: WebSocket):
        self.clients.add(ws)

    def disconnect(self, ws: WebSocket):
        self.clients.discard(ws)

    async def notify(self):
        """Junta los avisos seguidos: como máximo uno cada COALESCE_SECONDS."""
        self._dirty = True
        loop = asyncio.get_running_loop()
        if self._task is None or self._task.done() or self._task.get_loop() is not loop:
            self._task = loop.create_task(self._flush_later())

    async def _flush_later(self):
        await asyncio.sleep(COALESCE_SECONDS)
        await self.flush_now()

    async def flush_now(self):
        if not self._dirty:
            return
        self._dirty = False
        payload = {"type": "changed"}
        await ws_broadcast.send_many([(ws, payload) for ws in list(self.clients)], self.disconnect)


game_hub = GameHub()


def _clean_options(options: List[str]) -> List[str]:
    cleaned = [" ".join((o or "").split()) for o in (options or [])]
    if not 2 <= len(cleaned) <= 4 or any(not o for o in cleaned):
        raise HTTPException(status_code=422, detail="La pregunta necesita entre 2 y 4 opciones, todas con texto.")
    if any(len(o) > MAX_OPTION for o in cleaned):
        raise HTTPException(status_code=422, detail=f"Cada opción admite hasta {MAX_OPTION} caracteres.")
    if len({o.lower() for o in cleaned}) != len(cleaned):
        raise HTTPException(status_code=422, detail="Las opciones no pueden repetirse.")
    return cleaned


def _round_public(r: EventGameRound, answers: int) -> dict:
    return {
        "id": r.id,
        "question": r.question,
        "options": list(r.options or []),
        "status": r.status,
        "answers": answers,
        "winner_alias": r.winner_alias,
        "winner_ms": r.winner_ms,
        # La respuesta correcta solo se conoce cuando la ronda cierra
        "correct_index": r.correct_index if r.status == "closed" else None,
    }


class EventGameService:
    # ------------------------------------------------------------------ helpers
    @staticmethod
    async def _answers_count(db: AsyncSession, round_id: int) -> int:
        return int((await db.execute(select(func.count(EventGameAnswer.id)).where(EventGameAnswer.round_id == round_id))).scalar() or 0)

    @staticmethod
    async def _participant(db: AsyncSession, token: Optional[str]) -> Optional[EventGameParticipant]:
        if not token:
            return None
        return (await db.execute(select(EventGameParticipant).where(EventGameParticipant.token == token))).scalar_one_or_none()

    @staticmethod
    async def _current_round(db: AsyncSession, event_id: int) -> Optional[EventGameRound]:
        """La ronda abierta; si no hay, la última que se abrió (para seguir mostrando quién ganó)."""
        opened = (await db.execute(select(EventGameRound).where(
            EventGameRound.event_id == event_id, EventGameRound.status == "open")
            .order_by(EventGameRound.opened_at.desc(), EventGameRound.id.desc()).limit(1))).scalar_one_or_none()
        if opened:
            return opened
        return (await db.execute(select(EventGameRound).where(
            EventGameRound.event_id == event_id, EventGameRound.status == "closed")
            .order_by(EventGameRound.opened_at.desc(), EventGameRound.id.desc()).limit(1))).scalar_one_or_none()

    # ------------------------------------------------------------------ público
    @classmethod
    async def join(cls, db: AsyncSession) -> dict:
        """Crea un participante anónimo con un código corto único."""
        for _ in range(12):
            alias = f"{random.choice(ANIMALS)} {random.randint(10, 99)}"
            exists = (await db.execute(select(EventGameParticipant.id).where(EventGameParticipant.alias == alias))).first()
            if exists:
                continue
            participant = EventGameParticipant(token=secrets.token_urlsafe(24), alias=alias)
            db.add(participant)
            try:
                await db.commit()
            except IntegrityError:
                await db.rollback()
                continue
            return {"token": participant.token, "alias": participant.alias}
        raise HTTPException(status_code=503, detail="No se pudo asignar tu código. Inténtalo de nuevo.")

    @classmethod
    async def get_state(cls, db: AsyncSession, token: Optional[str] = None) -> dict:
        event = await EventService.get_or_create_default_event(db)
        current = await cls._current_round(db, event.id)
        participant = await cls._participant(db, token)
        state: dict = {"round": None, "me": None}
        if current:
            state["round"] = _round_public(current, await cls._answers_count(db, current.id))
        if participant:
            me = {"alias": participant.alias, "answered": False, "option_index": None, "is_winner": False}
            if current:
                mine = (await db.execute(select(EventGameAnswer).where(
                    EventGameAnswer.round_id == current.id, EventGameAnswer.participant_id == participant.id))).scalar_one_or_none()
                if mine:
                    me["answered"] = True
                    me["option_index"] = mine.option_index
                me["is_winner"] = current.winner_participant_id == participant.id
            state["me"] = me
        return state

    @classmethod
    async def answer(cls, db: AsyncSession, token: str, round_id: int, option_index: int) -> dict:
        participant = await cls._participant(db, token)
        if not participant:
            raise HTTPException(status_code=404, detail="Tu código no es válido. Recarga la página para recibir uno nuevo.")
        rnd = (await db.execute(select(EventGameRound).where(EventGameRound.id == round_id))).scalar_one_or_none()
        if not rnd:
            raise HTTPException(status_code=404, detail="La pregunta no existe.")
        if rnd.status != "open":
            raise HTTPException(status_code=409, detail="Esta ronda ya cerró.")
        if isinstance(option_index, bool) or not isinstance(option_index, int) or not 0 <= option_index < len(rnd.options or []):
            raise HTTPException(status_code=422, detail="La opción elegida no es válida.")

        now = _utcnow()
        elapsed_ms = max(0, int((now - _aware(rnd.opened_at)).total_seconds() * 1000)) if rnd.opened_at else None
        is_correct = option_index == rnd.correct_index
        db.add(EventGameAnswer(round_id=rnd.id, participant_id=participant.id, option_index=option_index,
                               is_correct=is_correct, elapsed_ms=elapsed_ms, created_at=now))
        try:
            await db.commit()
        except IntegrityError:
            await db.rollback()
            raise HTTPException(status_code=409, detail="Ya respondiste esta pregunta.")

        winner = False
        if is_correct:
            # Reclamo atómico: solo una respuesta correcta consigue actualizar la fila mientras la ronda sigue abierta y sin ganador
            claim = await db.execute(
                update(EventGameRound)
                .where(EventGameRound.id == rnd.id, EventGameRound.status == "open", EventGameRound.winner_participant_id.is_(None))
                .values(winner_participant_id=participant.id, winner_alias=participant.alias, winner_ms=elapsed_ms,
                        status="closed", closed_at=now))
            await db.commit()
            winner = claim.rowcount == 1
        await game_hub.notify()
        return {"accepted": True, "correct": is_correct, "winner": winner}

    # ------------------------------------------------------------------ admin
    @classmethod
    async def admin_list(cls, db: AsyncSession) -> dict:
        event = await EventService.get_or_create_default_event(db)
        rounds = (await db.execute(select(EventGameRound).where(EventGameRound.event_id == event.id)
                                   .order_by(EventGameRound.id.desc()))).scalars().all()
        counts = {rid: int(c) for rid, c in (await db.execute(
            select(EventGameAnswer.round_id, func.count(EventGameAnswer.id)).group_by(EventGameAnswer.round_id))).all()}
        participants = int((await db.execute(select(func.count(EventGameParticipant.id)))).scalar() or 0)
        return {
            "participants": participants,
            "rounds": [{**_round_public(r, counts.get(r.id, 0)), "correct_index": r.correct_index} for r in rounds],
        }

    @classmethod
    async def create_round(cls, db: AsyncSession, question: str, options: List[str], correct_index: int) -> dict:
        question = " ".join((question or "").split())
        if not question or len(question) > MAX_QUESTION:
            raise HTTPException(status_code=422, detail=f"Escribe la pregunta (hasta {MAX_QUESTION} caracteres).")
        cleaned = _clean_options(options)
        if isinstance(correct_index, bool) or not isinstance(correct_index, int) or not 0 <= correct_index < len(cleaned):
            raise HTTPException(status_code=422, detail="Marca cuál es la respuesta correcta.")
        event = await EventService.get_or_create_default_event(db)
        db.add(EventGameRound(event_id=event.id, question=question, options=cleaned, correct_index=correct_index, status="draft"))
        await db.commit()
        return await cls.admin_list(db)

    @classmethod
    async def _get_round(cls, db: AsyncSession, round_id: int) -> EventGameRound:
        rnd = (await db.execute(select(EventGameRound).where(EventGameRound.id == round_id))).scalar_one_or_none()
        if not rnd:
            raise HTTPException(status_code=404, detail="La ronda no existe.")
        return rnd

    @classmethod
    async def open_round(cls, db: AsyncSession, round_id: int) -> dict:
        rnd = await cls._get_round(db, round_id)
        if rnd.status != "draft":
            raise HTTPException(status_code=409, detail="Solo se puede abrir una ronda que aún no se ha jugado. Crea otra pregunta.")
        now = _utcnow()
        # Solo una ronda abierta a la vez: la anterior se cierra sin ganador
        await db.execute(update(EventGameRound).where(EventGameRound.event_id == rnd.event_id, EventGameRound.status == "open")
                         .values(status="closed", closed_at=now))
        rnd.status, rnd.opened_at = "open", now
        await db.commit()
        await game_hub.notify()
        return await cls.admin_list(db)

    @classmethod
    async def close_round(cls, db: AsyncSession, round_id: int) -> dict:
        rnd = await cls._get_round(db, round_id)
        if rnd.status == "open":
            rnd.status, rnd.closed_at = "closed", _utcnow()
            await db.commit()
            await game_hub.notify()
        return await cls.admin_list(db)

    @classmethod
    async def delete_round(cls, db: AsyncSession, round_id: int) -> dict:
        rnd = await cls._get_round(db, round_id)
        if rnd.status == "open":
            raise HTTPException(status_code=409, detail="Cierra la ronda antes de eliminarla.")
        await db.execute(delete(EventGameAnswer).where(EventGameAnswer.round_id == rnd.id))
        await db.delete(rnd)
        await db.commit()
        await game_hub.notify()
        return await cls.admin_list(db)
