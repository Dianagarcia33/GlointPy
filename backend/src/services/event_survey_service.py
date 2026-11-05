"""
Encuesta de satisfacción en vivo del evento Gloint Power Tech.

- El administrador abre/cierra la encuesta durante el evento.
- Cada inscrito vigente (presencial o virtual) responde una sola vez con su enlace personal (`access_token`).
- Los resultados se calculan en conjunto y por los cuatro grupos (inversionista/externo × presencial/virtual).
- En pantalla las respuestas y comentarios son anónimos: se ven por grupo, nunca por nombre.
- Cada cambio se avisa por el mismo WebSocket en vivo de las preguntas (aviso "changed"; el cliente vuelve a pedir su vista).
"""
import logging
from typing import Dict, List

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.event import EventAttendee, EventSurveyResponse
from src.services.event_attendance_service import EventAttendanceService
from src.services.event_question_service import questions_hub
from src.services.event_service import EventService

logger = logging.getLogger(__name__)

RATING_FIELDS = ("overall_rating", "content_rating", "speakers_rating", "organization_rating")
GROUP_KEYS = [f"{t}:{m}" for t in ("investor", "external") for m in ("in_person", "virtual")]
MAX_COMMENT = 1000
RECENT_COMMENTS = 20


def _clean_int(value, low: int, high: int, label: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or not (low <= value <= high):
        raise HTTPException(status_code=422, detail=f"{label} debe ser un número entre {low} y {high}.")
    return value


def _stats(rows: List[dict]) -> dict:
    total = len(rows)
    promoters = sum(1 for r in rows if r["nps"] >= 9)
    detractors = sum(1 for r in rows if r["nps"] <= 6)
    return {
        "total": total,
        "averages": {f: (round(sum(r[f] for r in rows) / total, 2) if total else None) for f in RATING_FIELDS},
        "nps": {
            "score": round((promoters - detractors) * 100 / total) if total else None,
            "promoters": promoters, "passives": total - promoters - detractors, "detractors": detractors,
        },
    }


class EventSurveyService:
    # ------------------------------------------------------------------ asistentes (por token)
    @classmethod
    async def get_public_status(cls, db: AsyncSession, token: str) -> dict:
        attendee = await EventAttendanceService._get_by_token(db, token)
        if attendee.status != "confirmed":
            raise HTTPException(status_code=403, detail="Tu inscripción está cancelada.")
        event = await EventService.get_or_create_default_event(db)
        answered = (await db.execute(select(EventSurveyResponse.id).where(
            EventSurveyResponse.event_id == event.id, EventSurveyResponse.attendee_id == attendee.id))).first() is not None
        return {"full_name": attendee.full_name, "event_title": event.title,
                "survey_open": bool(event.survey_open), "already_answered": answered}

    @classmethod
    async def submit(cls, db: AsyncSession, token: str, data: dict) -> dict:
        attendee = await EventAttendanceService._get_by_token(db, token)
        if attendee.status != "confirmed":
            raise HTTPException(status_code=403, detail="Tu inscripción está cancelada.")
        event = await EventService.get_or_create_default_event(db)
        if not event.survey_open:
            raise HTTPException(status_code=400, detail="La encuesta no está abierta en este momento.")

        ratings = {f: _clean_int(data.get(f), 1, 5, f) for f in RATING_FIELDS}
        nps = _clean_int(data.get("nps"), 0, 10, "nps")
        comment = " ".join((data.get("comment") or "").split())[:MAX_COMMENT] or None

        db.add(EventSurveyResponse(event_id=event.id, attendee_id=attendee.id, nps=nps, comment=comment, **ratings))
        try:
            await db.commit()
        except IntegrityError:
            await db.rollback()
            raise HTTPException(status_code=409, detail="Ya respondiste la encuesta. ¡Gracias!")
        await questions_hub.notify()
        return {"ok": True}

    # ------------------------------------------------------------------ admin
    @classmethod
    async def set_open(cls, db: AsyncSession, is_open: bool) -> dict:
        event = await EventService.get_or_create_default_event(db)
        event.survey_open = bool(is_open)
        await db.commit()
        await questions_hub.notify()
        return await cls.get_results(db)

    @classmethod
    async def get_results(cls, db: AsyncSession) -> dict:
        event = await EventService.get_or_create_default_event(db)
        found = (await db.execute(
            select(EventSurveyResponse, EventAttendee.attendee_type, EventAttendee.attendance_mode)
            .join(EventAttendee, EventAttendee.id == EventSurveyResponse.attendee_id)
            .where(EventSurveyResponse.event_id == event.id).order_by(EventSurveyResponse.id))).all()

        rows = []
        for resp, kind, mode in found:
            row = {f: getattr(resp, f) for f in RATING_FIELDS}
            row.update(nps=resp.nps, group=f"{kind}:{mode}", comment=resp.comment, created_at=resp.created_at)
            rows.append(row)

        distributions: Dict[str, Dict[int, int]] = {}
        for f in RATING_FIELDS:
            distributions[f] = {i: sum(1 for r in rows if r[f] == i) for i in range(1, 6)}

        eligible = (await db.execute(select(func.count(EventAttendee.id)).where(
            EventAttendee.event_id == event.id, EventAttendee.status == "confirmed"))).scalar() or 0
        comments = [r for r in reversed(rows) if r["comment"]][:RECENT_COMMENTS]

        return {
            "survey_open": bool(event.survey_open),
            "eligible_attendees": int(eligible),
            "overall": _stats(rows),
            "groups": {g: _stats([r for r in rows if r["group"] == g]) for g in GROUP_KEYS},
            "distributions": distributions,
            "recent_comments": [{"comment": r["comment"], "group": r["group"],
                                 "created_at": r["created_at"].isoformat() if r["created_at"] else None} for r in comments],
        }
