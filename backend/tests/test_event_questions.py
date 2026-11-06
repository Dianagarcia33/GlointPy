"""Preguntas moderadas de los asistentes al evento Gloint Power Tech."""
import asyncio
import os
from datetime import datetime, timezone

import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

for _k, _v in {"DB_HOST": "x", "DB_USER": "x", "DB_PASSWORD": "x", "DB_NAME": "x", "SECRET_KEY": "x"}.items():
    os.environ.setdefault(_k, _v)

from src.core.database import Base  # noqa: E402
from src.models.event import Event, EventAttendee, EventQuestion, EventQuestionVote  # noqa: E402
from src.services.event_question_service import EventQuestionService as Svc, questions_hub  # noqa: E402

_ids = iter(range(1, 1000))


def _run(coro_factory):
    async def runner():
        engine = create_async_engine("sqlite+aiosqlite://")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all, tables=[
                Event.__table__, EventAttendee.__table__, EventQuestion.__table__, EventQuestionVote.__table__])
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


def _attendee(event, name, mode="virtual", status="confirmed", kind="external"):
    return EventAttendee(id=next(_ids), event_id=event.id, full_name=f"{name} Apellido", email=f"{name.lower()}@x.co",
                         attendee_type=kind, attendance_mode=mode, status=status, access_token=f"tok-{name}")


async def _setup(db, event, *names):
    for n in names:
        db.add(_attendee(event, n))
    await db.commit()
    await Svc.set_open(db, True)


def _admin_id(admin, text):
    return next(q["id"] for q in admin["questions"] if q["text"] == text)


def test_no_se_puede_preguntar_con_las_preguntas_cerradas():
    async def scenario(db, event):
        db.add(_attendee(event, "Ana"))
        await db.commit()
        with pytest.raises(HTTPException) as exc:
            await Svc.submit(db, "tok-Ana", "¿Cuándo sale el nuevo producto?")
        assert exc.value.status_code == 400
    _run(scenario)


def test_valida_texto_token_y_inscripcion():
    async def scenario(db, event):
        db.add(_attendee(event, "Cancel", status="cancelled"))
        await _setup(db, event, "Ana")
        for bad, code in [("hi", 422), ("x" * 501, 422)]:
            with pytest.raises(HTTPException) as exc:
                await Svc.submit(db, "tok-Ana", bad)
            assert exc.value.status_code == code
        for token, code in [("no-existe", 404), ("tok-Cancel", 403)]:
            with pytest.raises(HTTPException) as exc:
                await Svc.submit(db, token, "Una pregunta válida")
            assert exc.value.status_code == code
    _run(scenario)


def test_pregunta_nueva_es_privada_hasta_que_se_aprueba():
    async def scenario(db, event):
        await _setup(db, event, "Ana", "Luis")
        await Svc.submit(db, "tok-Ana", "¿Habrá grabación del evento?")
        assert len((await Svc.list_for_attendee(db, "tok-Ana"))["questions"]) == 1       # su autora la ve
        assert (await Svc.list_for_attendee(db, "tok-Luis"))["questions"] == []         # los demás no
        qid = _admin_id(await Svc.admin_list(db), "¿Habrá grabación del evento?")
        await Svc.set_status(db, qid, "approved")
        seen = (await Svc.list_for_attendee(db, "tok-Luis"))["questions"]
        assert [q["text"] for q in seen] == ["¿Habrá grabación del evento?"]
        assert seen[0]["author"] == "Ana" and seen[0]["mine"] is False   # solo el nombre de pila
    _run(scenario)


def test_rechazada_solo_la_ve_su_autor():
    async def scenario(db, event):
        await _setup(db, event, "Ana", "Luis")
        await Svc.submit(db, "tok-Ana", "Pregunta que será rechazada")
        qid = _admin_id(await Svc.admin_list(db), "Pregunta que será rechazada")
        await Svc.set_status(db, qid, "rejected")
        assert (await Svc.list_for_attendee(db, "tok-Ana"))["questions"][0]["status"] == "rejected"
        assert (await Svc.list_for_attendee(db, "tok-Luis"))["questions"] == []
    _run(scenario)


def test_maximo_de_pendientes_por_asistente():
    async def scenario(db, event):
        await _setup(db, event, "Ana")
        for i in range(3):
            await Svc.submit(db, "tok-Ana", f"Pregunta número {i}")
        with pytest.raises(HTTPException) as exc:
            await Svc.submit(db, "tok-Ana", "Pregunta número 4")
        assert exc.value.status_code == 429
        admin = await Svc.admin_list(db)
        await Svc.set_status(db, admin["questions"][0]["id"], "approved")   # libera un lugar
        await Svc.submit(db, "tok-Ana", "Pregunta número 4")
    _run(scenario)


def test_votos_alternan_solo_en_aprobadas_y_ordenan():
    async def scenario(db, event):
        await _setup(db, event, "Ana", "Luis", "Eva")
        await Svc.submit(db, "tok-Ana", "Primera pregunta")
        await Svc.submit(db, "tok-Ana", "Segunda pregunta")
        admin = await Svc.admin_list(db)
        first, second = _admin_id(admin, "Primera pregunta"), _admin_id(admin, "Segunda pregunta")
        with pytest.raises(HTTPException) as exc:                 # pendiente: no se vota
            await Svc.toggle_vote(db, "tok-Luis", first)
        assert exc.value.status_code == 404
        await Svc.set_status(db, first, "approved")
        await Svc.set_status(db, second, "approved")

        assert (await Svc.toggle_vote(db, "tok-Luis", second))["voted"] is True
        assert (await Svc.toggle_vote(db, "tok-Eva", second))["voted"] is True
        view = (await Svc.list_for_attendee(db, "tok-Luis"))["questions"]
        assert [q["text"] for q in view] == ["Segunda pregunta", "Primera pregunta"]   # la más votada arriba
        assert view[0]["votes"] == 2 and view[0]["voted"] is True and view[1]["voted"] is False
        assert (await Svc.toggle_vote(db, "tok-Luis", second))["voted"] is False       # quitar voto
        assert (await Svc.list_for_attendee(db, "tok-Eva"))["questions"][0]["votes"] == 1
    _run(scenario)


def test_respondidas_van_al_final_y_el_admin_ve_conteos_y_origen():
    async def scenario(db, event):
        db.add(_attendee(event, "Pres", mode="in_person", kind="investor"))
        await _setup(db, event, "Ana")
        await Svc.submit(db, "tok-Pres", "Pregunta presencial")
        await Svc.submit(db, "tok-Ana", "Pregunta virtual")
        admin = await Svc.admin_list(db)
        pres = next(q for q in admin["questions"] if q["text"] == "Pregunta presencial")
        assert (pres["attendee_type"], pres["attendance_mode"]) == ("investor", "in_person")
        assert admin["counts"] == {"pending": 2, "approved": 0, "answered": 0, "rejected": 0}
        a, b = pres["id"], _admin_id(admin, "Pregunta virtual")
        await Svc.set_status(db, a, "answered")
        await Svc.set_status(db, b, "approved")
        view = (await Svc.list_for_attendee(db, "tok-Ana"))["questions"]
        assert [q["status"] for q in view] == ["approved", "answered"]
        with pytest.raises(HTTPException) as exc:
            await Svc.set_status(db, a, "otro")
        assert exc.value.status_code == 422
        with pytest.raises(HTTPException) as exc:
            await Svc.set_status(db, 9999, "approved")
        assert exc.value.status_code == 404
    _run(scenario)


def test_cada_cambio_avisa_en_vivo_a_asistentes_y_admins():
    class FakeWS:
        def __init__(self):
            self.sent = []

        async def send_json(self, payload):
            self.sent.append(payload)

    async def scenario(db, event):
        db.add(_attendee(event, "Ana"))
        await db.commit()
        att, adm = FakeWS(), FakeWS()
        questions_hub.connect(att, admin=False)
        questions_hub.connect(adm, admin=True)
        try:
            await Svc.set_open(db, True)
            await Svc.submit(db, "tok-Ana", "Una pregunta en vivo")
            qid = _admin_id(await Svc.admin_list(db), "Una pregunta en vivo")
            await Svc.set_status(db, qid, "approved")
            await Svc.toggle_vote(db, "tok-Ana", qid)
            await questions_hub.flush_now()
        finally:
            questions_hub.disconnect(att)
            questions_hub.disconnect(adm)
        # Cuatro cambios seguidos se agrupan en un solo aviso, con su ámbito
        assert att.sent == adm.sent == [{"type": "changed", "scope": "questions"}]
    _run(scenario)
