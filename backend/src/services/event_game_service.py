"""
Dinámica en vivo del evento Gloint Power Tech: pregunta del presentador con respuesta desde el celular y estadísticas.

- Las personas escanean un QR y entran a una URL pública, sin sesión y sin dar datos. El navegador guarda un identificador
  interno (token) solo para permitir una respuesta por persona; no se muestra ningún código ni nombre.
- El equipo crea rondas (pregunta de opción múltiple) y abre una a la vez. NO hay ganador ni respuesta correcta: lo que
  importa es qué respondió la gente.
- Cada ronda dura ROUND_SECONDS (1 minuto) desde que se abre y todos pueden responder durante ese tiempo. Pasado el minuto
  se cierra sola (o cuando el equipo la cierra) y las respuestas tardías se rechazan. El cierre lo hace el servidor (en la
  siguiente consulta o respuesta), no el celular.
- Las OPCIONES solo se envían a quien participa (con su token): la pantalla del presentador y cualquier consulta sin token
  reciben la pregunta, pero no las opciones. Quien presenta las dice en voz alta.
- Al cerrar la ronda la pantalla (y los celulares) muestran estadísticas: cuántas personas eligieron cada opción, sin nombres.
  Mientras la ronda está abierta no hay estadísticas, para que nadie siga a la mayoría.
- Cada participante responde una sola vez por ronda.
"""
import asyncio
import logging
import random
import secrets
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Set

from fastapi import HTTPException, WebSocket
from sqlalchemy import delete, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.event_game import EventGameAnswer, EventGameParticipant, EventGameRound
from src.services import ws_broadcast
from src.services.event_service import EventService

logger = logging.getLogger(__name__)

ROUND_SECONDS = 60   # tiempo para responder desde que se abre la ronda
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


def _expires_at(r: EventGameRound) -> Optional[datetime]:
    return _aware(r.opened_at) + timedelta(seconds=ROUND_SECONDS) if r.opened_at else None


def _seconds_left(r: EventGameRound) -> Optional[float]:
    """Segundos que le quedan a una ronda abierta (None si no está abierta)."""
    if r.status != "open" or not r.opened_at:
        return None
    return round(max(0.0, (_expires_at(r) - _utcnow()).total_seconds()), 1)


def _round_public(r: EventGameRound, answers: int, include_options: bool = False,
                  distribution: Optional[List[int]] = None) -> dict:
    options = list(r.options or [])
    return {
        "id": r.id,
        "question": r.question,
        # Las opciones solo salen para participantes (con token) y para el equipo; la pantalla no las recibe
        "options": options if include_options else [],
        "options_count": len(options),
        "status": r.status,
        "duration_seconds": ROUND_SECONDS,
        "seconds_left": _seconds_left(r),
        "answers": answers,
        # Cuántas personas eligieron cada opción (solo con la ronda cerrada)
        "distribution": distribution if r.status == "closed" else None,
    }


class EventGameService:
    # ------------------------------------------------------------------ helpers
    @staticmethod
    async def _answers_count(db: AsyncSession, round_id: int) -> int:
        return int((await db.execute(select(func.count(EventGameAnswer.id)).where(EventGameAnswer.round_id == round_id))).scalar() or 0)

    @staticmethod
    async def _distribution(db: AsyncSession, rnd: EventGameRound) -> List[int]:
        rows = (await db.execute(select(EventGameAnswer.option_index, func.count(EventGameAnswer.id))
                                 .where(EventGameAnswer.round_id == rnd.id).group_by(EventGameAnswer.option_index))).all()
        counts = {int(i): int(c) for i, c in rows}
        return [counts.get(i, 0) for i in range(len(rnd.options or []))]

    @staticmethod
    async def _participant(db: AsyncSession, token: Optional[str]) -> Optional[EventGameParticipant]:
        if not token:
            return None
        return (await db.execute(select(EventGameParticipant).where(EventGameParticipant.token == token))).scalar_one_or_none()

    @staticmethod
    async def _close_if_expired(db: AsyncSession, rnd: EventGameRound) -> bool:
        """Cierra la ronda si ya pasó su minuto. Es idempotente: varias consultas a la vez no duplican nada."""
        if rnd.status != "open" or not rnd.opened_at or _utcnow() < _expires_at(rnd):
            return False
        res = await db.execute(
            update(EventGameRound)
            .where(EventGameRound.id == rnd.id, EventGameRound.status == "open")
            .values(status="closed", closed_at=_expires_at(rnd)))
        await db.commit()
        await db.refresh(rnd)
        if res.rowcount == 1:
            await game_hub.notify()
        return True

    @staticmethod
    async def _current_round(db: AsyncSession, event_id: int) -> Optional[EventGameRound]:
        """La ronda abierta; si no hay, la última que se abrió (para seguir mostrando sus resultados)."""
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
        """Crea un participante anónimo. El `alias` es solo un identificador interno único: no se muestra ni se devuelve."""
        for _ in range(12):
            alias = str(random.randint(100000, 999999))
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
            return {"token": participant.token}
        raise HTTPException(status_code=503, detail="No se pudo conectar. Inténtalo de nuevo.")

    @classmethod
    async def get_state(cls, db: AsyncSession, token: Optional[str] = None) -> dict:
        event = await EventService.get_or_create_default_event(db)
        current = await cls._current_round(db, event.id)
        if current:
            await cls._close_if_expired(db, current)   # si se acabó el tiempo, ya se muestra cerrada
        participant = await cls._participant(db, token)
        state: dict = {"round": None, "me": None}
        if current:
            # Sin token de participante (pantalla del presentador, curiosos) no se envían las opciones
            state["round"] = _round_public(
                current, await cls._answers_count(db, current.id), include_options=participant is not None,
                distribution=await cls._distribution(db, current) if current.status == "closed" else None)
        if participant:
            me = {"answered": False, "option_index": None}
            if current:
                mine = (await db.execute(select(EventGameAnswer).where(
                    EventGameAnswer.round_id == current.id, EventGameAnswer.participant_id == participant.id))).scalar_one_or_none()
                if mine:
                    me["answered"] = True
                    me["option_index"] = mine.option_index
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
        if await cls._close_if_expired(db, rnd):
            raise HTTPException(status_code=409, detail="Se acabó el tiempo de esta ronda.")
        if isinstance(option_index, bool) or not isinstance(option_index, int) or not 0 <= option_index < len(rnd.options or []):
            raise HTTPException(status_code=422, detail="La opción elegida no es válida.")

        now = _utcnow()
        elapsed_ms = max(0, int((now - _aware(rnd.opened_at)).total_seconds() * 1000)) if rnd.opened_at else None
        # is_correct no se usa: la dinámica no tiene respuesta correcta
        db.add(EventGameAnswer(round_id=rnd.id, participant_id=participant.id, option_index=option_index,
                               is_correct=False, elapsed_ms=elapsed_ms, created_at=now))
        try:
            await db.commit()
        except IntegrityError:
            await db.rollback()
            raise HTTPException(status_code=409, detail="Ya respondiste esta pregunta.")
        await game_hub.notify()
        return {"accepted": True}

    # ------------------------------------------------------------------ admin
    @classmethod
    async def admin_list(cls, db: AsyncSession) -> dict:
        event = await EventService.get_or_create_default_event(db)
        rounds = (await db.execute(select(EventGameRound).where(EventGameRound.event_id == event.id)
                                   .order_by(EventGameRound.id.desc()))).scalars().all()
        for r in rounds:
            await cls._close_if_expired(db, r)   # el panel también ve cerradas las que se les acabó el tiempo
        counts = {rid: int(c) for rid, c in (await db.execute(
            select(EventGameAnswer.round_id, func.count(EventGameAnswer.id)).group_by(EventGameAnswer.round_id))).all()}
        participants = int((await db.execute(select(func.count(EventGameParticipant.id)))).scalar() or 0)
        return {
            "participants": participants,
            "rounds": [_round_public(r, counts.get(r.id, 0), include_options=True,
                                     distribution=await cls._distribution(db, r) if r.status == "closed" else None)
                       for r in rounds],
        }

    @classmethod
    async def create_round(cls, db: AsyncSession, question: str, options: List[str]) -> dict:
        question = " ".join((question or "").split())
        if not question or len(question) > MAX_QUESTION:
            raise HTTPException(status_code=422, detail=f"Escribe la pregunta (hasta {MAX_QUESTION} caracteres).")
        cleaned = _clean_options(options)
        event = await EventService.get_or_create_default_event(db)
        db.add(EventGameRound(event_id=event.id, question=question, options=cleaned, correct_index=0, status="draft"))
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
