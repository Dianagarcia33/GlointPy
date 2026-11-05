"""Encuesta de satisfacción en vivo del evento Gloint Power Tech."""
import asyncio
import os
from datetime import datetime, timezone

import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

for _k, _v in {"DB_HOST": "x", "DB_USER": "x", "DB_PASSWORD": "x", "DB_NAME": "x", "SECRET_KEY": "x"}.items():
    os.environ.setdefault(_k, _v)

from src.core.database import Base  # noqa: E402
from src.models.event import Event, EventAttendee, EventSurveyResponse  # noqa: E402
from src.services.event_question_service import questions_hub  # noqa: E402
from src.services.event_survey_service import EventSurveyService as Svc  # noqa: E402

_ids = iter(range(1, 1000))


def _run(coro_factory):
    async def runner():
        engine = create_async_engine("sqlite+aiosqlite://")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all, tables=[
                Event.__table__, EventAttendee.__table__, EventSurveyResponse.__table__])
        maker = async_sessionmaker(engine, expire_on_commit=False)
        async with maker() as db:
            event = Event(id=1, title="Gloint Power Tech", slug="gloint-power-tech", capacity_in_person=10,
                          event_date=datetime(2026, 11, 20, 15, 0, tzinfo=timezone.utc))
            db.add(event)
            await db.commit()
            result = await coro_factory(db, event)
        await engine.dispose()
        return result
    return asyncio.run(runner())


def _attendee(event, name, mode="virtual", kind="external", status="confirmed"):
    return EventAttendee(id=next(_ids), event_id=event.id, full_name=name, email=f"{name.lower()}@x.co",
                         attendee_type=kind, attendance_mode=mode, status=status, access_token=f"tok-{name}")


def _answers(**over):
    base = dict(overall_rating=5, content_rating=4, speakers_rating=5, organization_rating=3, nps=10, comment=None)
    base.update(over)
    return base


def test_no_se_puede_responder_con_la_encuesta_cerrada():
    async def scenario(db, event):
        db.add(_attendee(event, "Ana"))
        await db.commit()
        with pytest.raises(HTTPException) as exc:
            await Svc.submit(db, "tok-Ana", _answers())
        assert exc.value.status_code == 400
    _run(scenario)


def test_responde_una_sola_vez_y_el_estado_lo_refleja():
    async def scenario(db, event):
        db.add(_attendee(event, "Ana"))
        await db.commit()
        await Svc.set_open(db, True)
        assert (await Svc.get_public_status(db, "tok-Ana"))["already_answered"] is False
        await Svc.submit(db, "tok-Ana", _answers())
        assert (await Svc.get_public_status(db, "tok-Ana"))["already_answered"] is True
        with pytest.raises(HTTPException) as exc:
            await Svc.submit(db, "tok-Ana", _answers())
        assert exc.value.status_code == 409
    _run(scenario)


@pytest.mark.parametrize("bad", [
    dict(overall_rating=0), dict(content_rating=6), dict(nps=11), dict(nps=-1), dict(speakers_rating="5"),
])
def test_rechaza_valores_fuera_de_rango(bad):
    async def scenario(db, event):
        db.add(_attendee(event, "Ana"))
        await db.commit()
        await Svc.set_open(db, True)
        with pytest.raises(HTTPException) as exc:
            await Svc.submit(db, "tok-Ana", _answers(**bad))
        assert exc.value.status_code == 422
    _run(scenario)


def test_token_invalido_o_inscripcion_cancelada_no_responde():
    async def scenario(db, event):
        db.add(_attendee(event, "Ana", status="cancelled"))
        await db.commit()
        await Svc.set_open(db, True)
        with pytest.raises(HTTPException) as exc:
            await Svc.submit(db, "no-existe", _answers())
        assert exc.value.status_code == 404
        with pytest.raises(HTTPException) as exc:
            await Svc.submit(db, "tok-Ana", _answers())
        assert exc.value.status_code == 403
    _run(scenario)


def test_resultados_en_conjunto_y_por_grupo_con_nps():
    async def scenario(db, event):
        db.add_all([
            _attendee(event, "Ana", mode="in_person", kind="investor"),
            _attendee(event, "Luis", mode="in_person", kind="investor"),
            _attendee(event, "Eva", mode="virtual", kind="external"),
            _attendee(event, "Tom", mode="virtual", kind="external"),
            _attendee(event, "Sin"),
        ])
        await db.commit()
        await Svc.set_open(db, True)
        empty = await Svc.get_results(db)
        assert empty["overall"]["total"] == 0 and empty["overall"]["nps"]["score"] is None
        assert empty["eligible_attendees"] == 5

        await Svc.submit(db, "tok-Ana", _answers(overall_rating=5, nps=10, comment="Excelente  evento"))
        await Svc.submit(db, "tok-Luis", _answers(overall_rating=3, nps=9))
        await Svc.submit(db, "tok-Eva", _answers(overall_rating=4, nps=8, comment="La señal se cortó"))
        await Svc.submit(db, "tok-Tom", _answers(overall_rating=4, nps=2))
        r = await Svc.get_results(db)

        assert r["overall"]["total"] == 4 and r["overall"]["averages"]["overall_rating"] == 4.0
        assert r["distributions"]["overall_rating"] == {1: 0, 2: 0, 3: 1, 4: 2, 5: 1}
        # 2 promotores (10, 9), 1 pasivo (8), 1 detractor (2) -> (2-1)/4 = 25
        assert r["overall"]["nps"] == {"score": 25, "promoters": 2, "passives": 1, "detractors": 1}

        inv_pres = r["groups"]["investor:in_person"]
        assert inv_pres["total"] == 2 and inv_pres["averages"]["overall_rating"] == 4.0 and inv_pres["nps"]["score"] == 100
        ext_virt = r["groups"]["external:virtual"]
        assert ext_virt["total"] == 2 and ext_virt["nps"]["score"] == -50   # Eva pasiva (8), Tom detractor (2): (0 - 1) / 2
    _run(scenario)


def test_comentarios_anonimos_y_aviso_en_vivo():
    class FakeWS:
        def __init__(self):
            self.sent = []

        async def send_json(self, payload):
            self.sent.append(payload)

    async def scenario(db, event):
        db.add(_attendee(event, "Ana", mode="in_person", kind="investor"))
        await db.commit()
        ws = FakeWS()
        questions_hub.connect(ws, admin=True)
        try:
            await Svc.set_open(db, True)
            await Svc.submit(db, "tok-Ana", _answers(comment="  Muy   bueno "))
        finally:
            questions_hub.disconnect(ws)
        assert ws.sent == [{"type": "changed"}] * 2
        comments = (await Svc.get_results(db))["recent_comments"]
        assert len(comments) == 1 and comments[0]["comment"] == "Muy bueno"
        assert comments[0]["group"] == "investor:in_person"
        assert set(comments[0]) == {"comment", "group", "created_at"}   # sin nombre ni correo
    _run(scenario)
