"""
Rifa por eliminación del evento Gloint Power Tech.

- La bolsa son los inscritos PRESENCIALES vigentes que ya pasaron el control de entrada (están en el lugar). Quien ya ganó
  otra rifa del evento no vuelve a entrar. La bolsa se «fotografía» al iniciar la rifa.
- El equipo crea las preguntas (opción múltiple, una correcta, con su tiempo) y abre una a la vez. Cada invitado responde
  desde su celular con su enlace personal: se sabe quién es, pero en pantalla solo aparece como «Nombre I.».
- Al cerrar una pregunta (se acaba el tiempo o la cierra el equipo) queda eliminado quien falló o no respondió. Si nadie
  acertó, nadie se elimina y se repite con otra pregunta. Si queda una sola persona, gana.
- Cuando quedan pocos, el equipo puede sortear al ganador al azar entre quienes siguen en juego.
- Las OPCIONES solo se envían al celular de quien sigue en juego; la pantalla las recibe nunca. La respuesta correcta solo
  la ve el equipo y, al cerrar, los participantes. El cierre y la eliminación los hace el servidor, una sola vez por pregunta.
- Cada acción del equipo y cada eliminación quedan en la bitácora de auditoría. Los datos de contacto del ganador solo los ve
  el equipo.
"""
import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple

from fastapi import HTTPException
from sqlalchemy import delete, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.event import EventAttendee
from src.models.event_raffle import EventRaffle, EventRaffleAnswer, EventRaffleEntry, EventRaffleQuestion
from src.services.audit_trail_service import audit_in_tx
from src.services.event_attendance_service import EventAttendanceService
from src.services.event_game_service import GameHub
from src.services.event_service import EventService

logger = logging.getLogger(__name__)

raffle_hub = GameHub()   # aviso en vivo (pantalla y celulares): «hubo un cambio, vuelve a pedir el estado»
MIN_PARTICIPANTS = 2
DEFAULT_DURATION = 30
MIN_DURATION, MAX_DURATION = 10, 120
MAX_QUESTION, MAX_OPTION = 300, 120
MAX_NAMES_ON_SCREEN = 80      # con más participantes la pantalla muestra solo el conteo
_rng = secrets.SystemRandom()


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _aware(dt: Optional[datetime]) -> Optional[datetime]:
    """MySQL/SQLite devuelven fechas sin zona: se interpretan como UTC."""
    if dt is not None and dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def display_name(full_name: Optional[str]) -> str:
    """«Diana Carolina García Pérez» -> «Diana P.». Primer nombre y primera letra del último apellido."""
    parts = [p for p in (full_name or "").split() if p]
    if not parts:
        return "Asistente"
    first = parts[0].capitalize()
    return f"{first} {parts[-1][0].upper()}." if len(parts) > 1 else first


def _expires_at(q: EventRaffleQuestion) -> Optional[datetime]:
    return _aware(q.opened_at) + timedelta(seconds=q.duration_seconds) if q.opened_at else None


def _seconds_left(q: EventRaffleQuestion) -> Optional[float]:
    if q.status != "open" or not q.opened_at:
        return None
    return round(max(0.0, (_expires_at(q) - _utcnow()).total_seconds()), 1)


def _clean_options(options: List[str]) -> List[str]:
    cleaned = [" ".join((o or "").split()) for o in (options or [])]
    if not 2 <= len(cleaned) <= 4 or any(not o for o in cleaned):
        raise HTTPException(status_code=422, detail="La pregunta necesita entre 2 y 4 opciones, todas con texto.")
    if any(len(o) > MAX_OPTION for o in cleaned):
        raise HTTPException(status_code=422, detail=f"Cada opción admite hasta {MAX_OPTION} caracteres.")
    if len({o.lower() for o in cleaned}) != len(cleaned):
        raise HTTPException(status_code=422, detail="Las opciones no pueden repetirse.")
    return cleaned


def _question_public(q: EventRaffleQuestion, answers: int, include_options: bool = False, reveal_correct: bool = False) -> dict:
    options = list(q.options or [])
    show_correct = reveal_correct and q.status == "closed"
    return {
        "id": q.id,
        "question": q.question,
        # Las opciones solo llegan al celular de quien puede responder y al equipo; la pantalla recibe []
        "options": options if include_options else [],
        "options_count": len(options),
        "status": q.status,
        "duration_seconds": q.duration_seconds,
        "seconds_left": _seconds_left(q),
        "answers": answers,
        "eliminated_count": q.eliminated_count if q.status == "closed" else None,
        "survivors_count": q.survivors_count if q.status == "closed" else None,
        "correct_index": q.correct_index if show_correct else None,
        "correct_text": options[q.correct_index] if show_correct and 0 <= q.correct_index < len(options) else None,
    }


class EventRaffleService:
    # ------------------------------------------------------------------ helpers
    @staticmethod
    async def _raffle(db: AsyncSession, raffle_id: int, lock: bool = False) -> EventRaffle:
        query = select(EventRaffle).where(EventRaffle.id == raffle_id)
        if lock:
            query = query.with_for_update()   # evita acciones simultáneas sobre la misma rifa (MySQL; SQLite lo ignora)
        raffle = (await db.execute(query)).scalar_one_or_none()
        if not raffle:
            raise HTTPException(status_code=404, detail="La rifa no existe.")
        return raffle

    @staticmethod
    async def _question(db: AsyncSession, question_id: int) -> EventRaffleQuestion:
        q = (await db.execute(select(EventRaffleQuestion).where(EventRaffleQuestion.id == question_id))).scalar_one_or_none()
        if not q:
            raise HTTPException(status_code=404, detail="La pregunta no existe.")
        return q

    @staticmethod
    async def _entries(db: AsyncSession, raffle_id: int) -> List[EventRaffleEntry]:
        return list((await db.execute(select(EventRaffleEntry).where(EventRaffleEntry.raffle_id == raffle_id)
                                      .order_by(EventRaffleEntry.display_name, EventRaffleEntry.id))).scalars().all())

    @staticmethod
    async def _questions(db: AsyncSession, raffle_id: int) -> List[EventRaffleQuestion]:
        return list((await db.execute(select(EventRaffleQuestion).where(EventRaffleQuestion.raffle_id == raffle_id)
                                      .order_by(EventRaffleQuestion.id))).scalars().all())

    @staticmethod
    async def _answers_count(db: AsyncSession, question_id: int) -> int:
        return int((await db.execute(select(func.count(EventRaffleAnswer.id))
                                     .where(EventRaffleAnswer.question_id == question_id))).scalar() or 0)

    @staticmethod
    async def _eligible(db: AsyncSession, event_id: int) -> List[EventAttendee]:
        """Presenciales vigentes que ya entraron al evento y que no han ganado otra rifa."""
        won = select(EventRaffle.winner_attendee_id).where(
            EventRaffle.event_id == event_id, EventRaffle.winner_attendee_id.isnot(None))
        return list((await db.execute(select(EventAttendee).where(
            EventAttendee.event_id == event_id,
            EventAttendee.status == "confirmed",
            EventAttendee.attendance_mode == "in_person",
            EventAttendee.checked_in_at.isnot(None),
            EventAttendee.id.notin_(won),
        ).order_by(EventAttendee.id))).scalars().all())

    @classmethod
    async def _current(cls, db: AsyncSession, event_id: int) -> Optional[EventRaffle]:
        """La rifa en curso; si no hay, la última que terminó (para seguir mostrando al ganador)."""
        running = (await db.execute(select(EventRaffle).where(EventRaffle.event_id == event_id, EventRaffle.status == "running")
                                    .order_by(EventRaffle.id.desc()).limit(1))).scalar_one_or_none()
        if running:
            return running
        return (await db.execute(select(EventRaffle).where(EventRaffle.event_id == event_id, EventRaffle.status == "finished")
                                 .order_by(EventRaffle.finished_at.desc(), EventRaffle.id.desc()).limit(1))).scalar_one_or_none()

    @classmethod
    async def _current_question(cls, db: AsyncSession, raffle_id: int) -> Optional[EventRaffleQuestion]:
        """La pregunta abierta; si no hay, la última que se cerró (para seguir mostrando su resultado)."""
        opened = (await db.execute(select(EventRaffleQuestion).where(
            EventRaffleQuestion.raffle_id == raffle_id, EventRaffleQuestion.status == "open")
            .order_by(EventRaffleQuestion.opened_at.desc(), EventRaffleQuestion.id.desc()).limit(1))).scalar_one_or_none()
        if opened:
            return opened
        return (await db.execute(select(EventRaffleQuestion).where(
            EventRaffleQuestion.raffle_id == raffle_id, EventRaffleQuestion.status == "closed")
            .order_by(EventRaffleQuestion.closed_at.desc(), EventRaffleQuestion.id.desc()).limit(1))).scalar_one_or_none()

    # ------------------------------------------------------------------ cierre y eliminación
    @classmethod
    async def _apply_elimination(cls, db: AsyncSession, raffle: EventRaffle, q: EventRaffleQuestion, actor=None) -> None:
        """Quien siga en juego y no acertó queda eliminado. Si nadie acertó, nadie sale. Si queda uno, gana."""
        active = [e for e in await cls._entries(db, raffle.id) if e.status == "active"]
        correct_ids = {eid for (eid,) in (await db.execute(select(EventRaffleAnswer.entry_id).where(
            EventRaffleAnswer.question_id == q.id, EventRaffleAnswer.is_correct.is_(True)))).all()}
        survivors = [e for e in active if e.id in correct_ids]
        out: List[EventRaffleEntry] = []
        if survivors:
            out = [e for e in active if e.id not in correct_ids]
            for e in out:
                e.status, e.eliminated_question_id = "eliminated", q.id
        remaining = survivors if survivors else active
        q.eliminated_count, q.survivors_count = len(out), len(remaining)

        winner = None
        if len(remaining) == 1:
            winner = remaining[0]
            winner.status = "winner"
            raffle.status, raffle.finished_at, raffle.winner_attendee_id = "finished", _utcnow(), winner.attendee_id

        await audit_in_tx(
            db, "EVENT_RAFFLE_ROUND", "events", actor, "EventRaffle", raffle.id,
            f"Rifa «{raffle.title}»: se cerró la pregunta #{q.id} ({len(out)} eliminados, quedan {len(remaining)})",
            {"raffle_id": raffle.id, "question_id": q.id, "eliminados_attendee_ids": [e.attendee_id for e in out],
             "restantes": len(remaining), "nadie_acerto": not survivors,
             "ganador_attendee_id": winner.attendee_id if winner else None})

    @classmethod
    async def _close_question(cls, db: AsyncSession, q: EventRaffleQuestion, closed_at: datetime, actor=None) -> bool:
        """Cierra la pregunta y aplica la eliminación UNA sola vez, aunque varias consultas coincidan."""
        claim = await db.execute(update(EventRaffleQuestion)
                                 .where(EventRaffleQuestion.id == q.id, EventRaffleQuestion.status == "open")
                                 .values(status="closed", closed_at=closed_at))
        if claim.rowcount != 1:
            await db.rollback()
            await db.refresh(q)
            return False
        await db.refresh(q)
        raffle = await cls._raffle(db, q.raffle_id, lock=True)
        await cls._apply_elimination(db, raffle, q, actor)
        await db.commit()
        await db.refresh(q)
        await raffle_hub.notify()
        return True

    @classmethod
    async def _close_if_expired(cls, db: AsyncSession, q: EventRaffleQuestion) -> bool:
        """Si ya se acabó el tiempo de la pregunta, la cierra (y elimina). True si el tiempo ya se había cumplido."""
        if q.status != "open" or not q.opened_at or _utcnow() < _expires_at(q):
            return False
        await cls._close_question(db, q, _expires_at(q))
        return True

    # ------------------------------------------------------------------ público: pantalla
    @classmethod
    async def get_public_state(cls, db: AsyncSession) -> dict:
        """Lo que se proyecta: solo nombres cortos. Sin correos, teléfonos, opciones ni la respuesta correcta."""
        event = await EventService.get_or_create_default_event(db)
        raffle = await cls._current(db, event.id)
        if not raffle:
            return {"raffle": None}
        return {"raffle": await cls._raffle_public(db, raffle, include_options=False, reveal_correct=False)}

    @classmethod
    async def _raffle_public(cls, db: AsyncSession, raffle: EventRaffle, include_options: bool, reveal_correct: bool) -> dict:
        q = await cls._current_question(db, raffle.id)
        if q:
            await cls._close_if_expired(db, q)
            raffle = await cls._raffle(db, raffle.id)
        entries = await cls._entries(db, raffle.id)
        active = [e for e in entries if e.status == "active"]
        winner = next((e for e in entries if e.status == "winner"), None)
        # Los últimos eliminados salen de la última pregunta CERRADA (aunque ya haya otra abierta)
        last_closed = (await db.execute(select(EventRaffleQuestion.id).where(
            EventRaffleQuestion.raffle_id == raffle.id, EventRaffleQuestion.status == "closed")
            .order_by(EventRaffleQuestion.closed_at.desc(), EventRaffleQuestion.id.desc()).limit(1))).scalar_one_or_none()
        last_out = [e.display_name for e in entries if last_closed and e.eliminated_question_id == last_closed]
        question = None
        if q:
            question = _question_public(q, await cls._answers_count(db, q.id), include_options=include_options, reveal_correct=reveal_correct)
        return {
            "id": raffle.id,
            "title": raffle.title,
            "status": raffle.status,
            "total": len(entries),
            "remaining": len(active) if raffle.status == "running" else (1 if winner else 0),
            "names": [e.display_name for e in active] if raffle.status == "running" and len(active) <= MAX_NAMES_ON_SCREEN else None,
            "last_eliminated": last_out if len(last_out) <= 30 else None,
            "question": question,
            "winner": winner.display_name if winner else None,
        }

    # ------------------------------------------------------------------ público: celular (enlace personal)
    @classmethod
    async def _me(cls, db: AsyncSession, token: str) -> Tuple[EventAttendee, Optional[EventRaffle]]:
        attendee = await EventAttendanceService._get_by_token(db, token)
        if attendee.status != "confirmed":
            raise HTTPException(status_code=403, detail="Tu inscripción está cancelada.")
        event = await EventService.get_or_create_default_event(db)
        return attendee, await cls._current(db, event.id)

    @classmethod
    async def get_my_state(cls, db: AsyncSession, token: str) -> dict:
        attendee, raffle = await cls._me(db, token)
        base = {"full_name": attendee.full_name, "in_person": attendee.attendance_mode == "in_person"}
        if not raffle:
            return {**base, "raffle": None, "me": None}
        entry = (await db.execute(select(EventRaffleEntry).where(
            EventRaffleEntry.raffle_id == raffle.id, EventRaffleEntry.attendee_id == attendee.id))).scalar_one_or_none()
        cur = await cls._current_question(db, raffle.id)
        if cur:
            await cls._close_if_expired(db, cur)
            if entry:
                await db.refresh(entry)
            cur = await cls._question(db, cur.id)
        can_answer = bool(entry and entry.status == "active" and cur and cur.status == "open")
        # Las opciones solo al que sigue en juego mientras la pregunta está abierta; cerrada, a quien participó (para ver su resultado)
        include_options = bool(entry and (can_answer or (cur and cur.status == "closed")))
        pub = await cls._raffle_public(db, raffle, include_options=include_options, reveal_correct=entry is not None)
        me = {"in_raffle": entry is not None, "status": entry.status if entry else None,
              "display_name": entry.display_name if entry else None, "answered": False, "option_index": None,
              "passed": None, "can_answer": can_answer}
        if entry and cur:
            mine = (await db.execute(select(EventRaffleAnswer).where(
                EventRaffleAnswer.question_id == cur.id, EventRaffleAnswer.entry_id == entry.id))).scalar_one_or_none()
            if mine:
                me["answered"], me["option_index"] = True, mine.option_index
            if cur.status == "closed":
                me["passed"] = bool(mine and mine.is_correct)
                me["eliminated_now"] = entry.eliminated_question_id == cur.id
        return {**base, "raffle": pub, "me": me}

    @classmethod
    async def answer(cls, db: AsyncSession, token: str, question_id: int, option_index: int) -> dict:
        attendee, raffle = await cls._me(db, token)
        q = await cls._question(db, question_id)
        if not raffle or q.raffle_id != raffle.id:
            raise HTTPException(status_code=404, detail="Esta pregunta ya no está disponible.")
        entry = (await db.execute(select(EventRaffleEntry).where(
            EventRaffleEntry.raffle_id == raffle.id, EventRaffleEntry.attendee_id == attendee.id))).scalar_one_or_none()
        if not entry:
            raise HTTPException(status_code=403, detail="No estás en esta rifa: solo participan los presenciales que ya entraron al evento cuando empezó.")
        if entry.status != "active":
            raise HTTPException(status_code=403, detail="Ya no sigues en juego en esta rifa.")
        if q.status != "open":
            raise HTTPException(status_code=409, detail="Esta pregunta ya cerró.")
        if await cls._close_if_expired(db, q):
            raise HTTPException(status_code=409, detail="Se acabó el tiempo de esta pregunta.")
        if isinstance(option_index, bool) or not isinstance(option_index, int) or not 0 <= option_index < len(q.options or []):
            raise HTTPException(status_code=422, detail="La opción elegida no es válida.")
        db.add(EventRaffleAnswer(question_id=q.id, entry_id=entry.id, option_index=option_index,
                                 is_correct=option_index == q.correct_index, created_at=_utcnow()))
        try:
            await db.commit()
        except IntegrityError:
            await db.rollback()
            raise HTTPException(status_code=409, detail="Ya respondiste esta pregunta.")
        await raffle_hub.notify()
        return {"accepted": True}   # no se dice si acertó: se sabe al cerrar la pregunta

    # ------------------------------------------------------------------ admin
    @classmethod
    async def admin_overview(cls, db: AsyncSession) -> dict:
        event = await EventService.get_or_create_default_event(db)
        raffles = (await db.execute(select(EventRaffle).where(EventRaffle.event_id == event.id)
                                    .order_by(EventRaffle.id.desc()))).scalars().all()
        out = []
        for r in raffles:
            questions = await cls._questions(db, r.id)
            for q in questions:
                await cls._close_if_expired(db, q)
            r = await cls._raffle(db, r.id)
            entries = await cls._entries(db, r.id)
            winner = None
            if r.winner_attendee_id:
                a = (await db.execute(select(EventAttendee).where(EventAttendee.id == r.winner_attendee_id))).scalar_one_or_none()
                if a:   # el equipo sí ve cómo contactar al ganador
                    winner = {"full_name": a.full_name, "email": a.email, "phone": a.phone, "document_id": a.document_id,
                              "display_name": display_name(a.full_name)}
            out.append({
                "id": r.id, "title": r.title, "status": r.status,
                "total": len(entries), "remaining": sum(1 for e in entries if e.status == "active"), "winner": winner,
                "questions": [_question_public(q, await cls._answers_count(db, q.id), include_options=True, reveal_correct=True)
                              | {"correct_index": q.correct_index} for q in await cls._questions(db, r.id)],
            })
        return {"eligible_now": len(await cls._eligible(db, event.id)), "raffles": out}

    @classmethod
    async def create(cls, db: AsyncSession, title: str, actor=None) -> dict:
        title = " ".join((title or "").split())
        if not title or len(title) > 150:
            raise HTTPException(status_code=422, detail="Escribe el nombre de la rifa o del premio (hasta 150 caracteres).")
        event = await EventService.get_or_create_default_event(db)
        raffle = EventRaffle(event_id=event.id, title=title, status="draft")
        db.add(raffle)
        await db.flush()
        await audit_in_tx(db, "EVENT_RAFFLE_CREATE", "events", actor, "EventRaffle", raffle.id,
                          f"Rifa creada: {title}", {"raffle_id": raffle.id, "titulo": title})
        await db.commit()
        return await cls.admin_overview(db)

    @classmethod
    async def add_question(cls, db: AsyncSession, raffle_id: int, question: str, options: List[str],
                           correct_index: int, duration_seconds: int = DEFAULT_DURATION) -> dict:
        raffle = await cls._raffle(db, raffle_id)
        question = " ".join((question or "").split())
        if not question or len(question) > MAX_QUESTION:
            raise HTTPException(status_code=422, detail=f"Escribe la pregunta (hasta {MAX_QUESTION} caracteres).")
        cleaned = _clean_options(options)
        if isinstance(correct_index, bool) or not isinstance(correct_index, int) or not 0 <= correct_index < len(cleaned):
            raise HTTPException(status_code=422, detail="Marca cuál es la respuesta correcta.")
        if isinstance(duration_seconds, bool) or not isinstance(duration_seconds, int) or not MIN_DURATION <= duration_seconds <= MAX_DURATION:
            raise HTTPException(status_code=422, detail=f"El tiempo para responder debe estar entre {MIN_DURATION} y {MAX_DURATION} segundos.")
        db.add(EventRaffleQuestion(raffle_id=raffle.id, question=question, options=cleaned, correct_index=correct_index,
                                   duration_seconds=duration_seconds, status="draft"))
        await db.commit()
        return await cls.admin_overview(db)

    @classmethod
    async def delete_question(cls, db: AsyncSession, question_id: int) -> dict:
        q = await cls._question(db, question_id)
        if q.status != "draft":
            raise HTTPException(status_code=409, detail="Solo se puede eliminar una pregunta que aún no se ha lanzado.")
        await db.delete(q)
        await db.commit()
        return await cls.admin_overview(db)

    @classmethod
    async def start(cls, db: AsyncSession, raffle_id: int, actor=None) -> dict:
        raffle = await cls._raffle(db, raffle_id, lock=True)
        if raffle.status != "draft":
            raise HTTPException(status_code=409, detail="Esta rifa ya se inició. Reiníciala para volver a empezar.")
        other = (await db.execute(select(EventRaffle.id).where(
            EventRaffle.event_id == raffle.event_id, EventRaffle.status == "running", EventRaffle.id != raffle.id).limit(1))).first()
        if other:
            raise HTTPException(status_code=409, detail="Ya hay otra rifa en curso. Termínala o reiníciala antes de iniciar esta.")
        pool = await cls._eligible(db, raffle.event_id)
        if len(pool) < MIN_PARTICIPANTS:
            raise HTTPException(status_code=400, detail=f"Hacen falta al menos {MIN_PARTICIPANTS} presenciales que ya hayan entrado al evento (ahora hay {len(pool)}).")
        for a in pool:
            db.add(EventRaffleEntry(raffle_id=raffle.id, attendee_id=a.id, display_name=display_name(a.full_name), status="active"))
        raffle.status, raffle.started_at = "running", _utcnow()
        await audit_in_tx(db, "EVENT_RAFFLE_START", "events", actor, "EventRaffle", raffle.id,
                          f"Rifa iniciada con {len(pool)} participantes",
                          {"raffle_id": raffle.id, "participantes": len(pool), "attendee_ids": [a.id for a in pool]})
        await db.commit()
        await raffle_hub.notify()
        return await cls.admin_overview(db)

    @classmethod
    async def open_question(cls, db: AsyncSession, question_id: int) -> dict:
        q = await cls._question(db, question_id)
        raffle = await cls._raffle(db, q.raffle_id, lock=True)
        if raffle.status != "running":
            raise HTTPException(status_code=409, detail="Inicia la rifa antes de lanzar preguntas.")
        if q.status != "draft":
            raise HTTPException(status_code=409, detail="Esta pregunta ya se lanzó. Crea otra.")
        for other in await cls._questions(db, raffle.id):
            if other.status == "open":
                if _utcnow() >= (_expires_at(other) or _utcnow()):
                    await cls._close_question(db, other, _expires_at(other))
                else:
                    raise HTTPException(status_code=409, detail="Hay una pregunta abierta. Ciérrala antes de lanzar otra.")
        raffle = await cls._raffle(db, q.raffle_id)
        if raffle.status != "running":
            raise HTTPException(status_code=409, detail="La rifa ya terminó.")
        q = await cls._question(db, question_id)
        q.status, q.opened_at = "open", _utcnow()
        await db.commit()
        await raffle_hub.notify()
        return await cls.admin_overview(db)

    @classmethod
    async def close_question(cls, db: AsyncSession, question_id: int, actor=None) -> dict:
        q = await cls._question(db, question_id)
        if q.status == "open":
            await cls._close_question(db, q, _utcnow(), actor)
        return await cls.admin_overview(db)

    @classmethod
    async def draw(cls, db: AsyncSession, raffle_id: int, actor=None) -> dict:
        """Elige al ganador AL AZAR entre quienes siguen en juego (cuando el presentador no quiere seguir eliminando)."""
        raffle = await cls._raffle(db, raffle_id, lock=True)
        if raffle.status != "running":
            raise HTTPException(status_code=409, detail="La rifa no está en curso.")
        for q in await cls._questions(db, raffle.id):
            if q.status == "open":
                raise HTTPException(status_code=409, detail="Cierra la pregunta abierta antes de sortear.")
        active = [e for e in await cls._entries(db, raffle.id) if e.status == "active"]
        if not active:
            raise HTTPException(status_code=409, detail="No queda nadie en juego.")
        winner = _rng.choice(active)
        winner.status = "winner"
        raffle.status, raffle.finished_at, raffle.winner_attendee_id = "finished", _utcnow(), winner.attendee_id
        await audit_in_tx(db, "EVENT_RAFFLE_DRAW", "events", actor, "EventRaffle", raffle.id,
                          f"Rifa «{raffle.title}»: sorteo entre {len(active)} que seguían en juego",
                          {"raffle_id": raffle.id, "candidatos": len(active), "ganador_attendee_id": winner.attendee_id})
        await db.commit()
        await raffle_hub.notify()
        return await cls.admin_overview(db)

    @classmethod
    async def reset(cls, db: AsyncSession, raffle_id: int, actor=None) -> dict:
        """Vuelve la rifa a «borrador»: borra participantes, respuestas y ganador, y deja las preguntas listas para lanzarlas de nuevo."""
        raffle = await cls._raffle(db, raffle_id, lock=True)
        question_ids = select(EventRaffleQuestion.id).where(EventRaffleQuestion.raffle_id == raffle.id)
        await db.execute(delete(EventRaffleAnswer).where(EventRaffleAnswer.question_id.in_(question_ids)))
        await db.execute(delete(EventRaffleEntry).where(EventRaffleEntry.raffle_id == raffle.id))
        await db.execute(update(EventRaffleQuestion).where(EventRaffleQuestion.raffle_id == raffle.id)
                         .values(status="draft", opened_at=None, closed_at=None, eliminated_count=None, survivors_count=None))
        raffle.status, raffle.started_at, raffle.finished_at, raffle.winner_attendee_id = "draft", None, None, None
        await audit_in_tx(db, "EVENT_RAFFLE_RESET", "events", actor, "EventRaffle", raffle.id,
                          f"Rifa reiniciada: {raffle.title}", {"raffle_id": raffle.id})
        await db.commit()
        await raffle_hub.notify()
        return await cls.admin_overview(db)

    @classmethod
    async def delete(cls, db: AsyncSession, raffle_id: int, actor=None) -> dict:
        raffle = await cls._raffle(db, raffle_id, lock=True)
        if raffle.status == "running":
            raise HTTPException(status_code=409, detail="La rifa está en curso. Reiníciala antes de eliminarla.")
        question_ids = select(EventRaffleQuestion.id).where(EventRaffleQuestion.raffle_id == raffle.id)
        await audit_in_tx(db, "EVENT_RAFFLE_DELETE", "events", actor, "EventRaffle", raffle.id,
                          f"Rifa eliminada: {raffle.title}", {"raffle_id": raffle.id, "estado": raffle.status})
        await db.execute(delete(EventRaffleAnswer).where(EventRaffleAnswer.question_id.in_(question_ids)))
        await db.execute(delete(EventRaffleEntry).where(EventRaffleEntry.raffle_id == raffle.id))
        await db.execute(delete(EventRaffleQuestion).where(EventRaffleQuestion.raffle_id == raffle.id))
        await db.delete(raffle)
        await db.commit()
        await raffle_hub.notify()
        return await cls.admin_overview(db)
