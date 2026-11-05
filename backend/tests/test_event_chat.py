"""Chat en vivo de la sala del evento (solo virtuales, moderación posterior)."""
import asyncio
import os
from datetime import datetime, timezone

import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

for _k, _v in {"DB_HOST": "x", "DB_USER": "x", "DB_PASSWORD": "x", "DB_NAME": "x", "SECRET_KEY": "x"}.items():
    os.environ.setdefault(_k, _v)

from src.core.database import Base  # noqa: E402
from src.models.event import Event, EventAttendee, EventChatMessage, EventQuestion, EventQuestionVote  # noqa: E402
from src.services import event_chat_service as chat_mod  # noqa: E402
from src.services.event_chat_service import EventChatService as Svc, chat_hub  # noqa: E402
from src.services.event_question_service import EventQuestionService as Questions, questions_hub  # noqa: E402

_ids = iter(range(1, 1000))


def _run(coro_factory, live_open=True, chat_open=True):
    async def runner():
        chat_mod._last_sent.clear()
        engine = create_async_engine("sqlite+aiosqlite://")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all, tables=[
                Event.__table__, EventAttendee.__table__, EventChatMessage.__table__, EventQuestion.__table__, EventQuestionVote.__table__])
        maker = async_sessionmaker(engine, expire_on_commit=False)
        async with maker() as db:
            event = Event(id=1, title="Gloint Power Tech", slug="gloint-power-tech", capacity_in_person=10,
                          live_open=live_open, chat_open=chat_open, event_date=datetime(2026, 11, 20, 15, 0, tzinfo=timezone.utc))
            db.add(event)
            await db.commit()
            result = await coro_factory(db, event)
        await engine.dispose()
        return result
    return asyncio.run(runner())


def _attendee(event, name, mode="virtual", status="confirmed"):
    return EventAttendee(id=next(_ids), event_id=event.id, full_name=f"{name} Apellido", email=f"{name.lower()}@x.co",
                         attendee_type="external", attendance_mode=mode, status=status, access_token=f"tok-{name}")


def _free_rate_limit():
    chat_mod._last_sent.clear()


def test_solo_escriben_virtuales_vigentes_con_la_sala_abierta():
    async def scenario(db, event):
        db.add_all([_attendee(event, "Pres", mode="in_person"), _attendee(event, "Cancel", status="cancelled")])
        await db.commit()
        for token, code in [("no-existe", 404), ("tok-Pres", 403), ("tok-Cancel", 403)]:
            with pytest.raises(HTTPException) as exc:
                await Svc.send(db, token, "hola")
            assert exc.value.status_code == code
    _run(scenario)


def test_chat_cerrado_si_la_transmision_no_esta_abierta():
    async def scenario(db, event):
        db.add(_attendee(event, "Ana"))
        await db.commit()
        with pytest.raises(HTTPException) as exc:
            await Svc.send(db, "tok-Ana", "hola")
        assert exc.value.status_code == 400
        assert (await Svc.history(db, "tok-Ana"))["chat_open"] is False
    _run(scenario, live_open=False)


def test_mensaje_sale_con_nombre_y_apellido_y_se_ordena_en_el_historial():
    async def scenario(db, event):
        db.add_all([_attendee(event, "Ana"), _attendee(event, "Luis")])
        await db.commit()
        await Svc.send(db, "tok-Ana", "  Hola   a   todos ")
        await Svc.send(db, "tok-Luis", "Buenas tardes")
        h = await Svc.history(db, "tok-Ana")
        assert [m["text"] for m in h["messages"]] == ["Hola a todos", "Buenas tardes"]
        assert [m["author"] for m in h["messages"]] == ["Ana Apellido", "Luis Apellido"]
        assert [m["mine"] for m in h["messages"]] == [True, False]
        assert all("attendee_id" not in m for m in h["messages"])     # el id interno no sale a los asistentes
    _run(scenario)


def test_valida_largo_y_vacio():
    async def scenario(db, event):
        db.add(_attendee(event, "Ana"))
        await db.commit()
        for bad in ["", "   ", "x" * 501]:
            _free_rate_limit()
            with pytest.raises(HTTPException) as exc:
                await Svc.send(db, "tok-Ana", bad)
            assert exc.value.status_code == 422
    _run(scenario)


def test_limite_de_ritmo_por_persona():
    async def scenario(db, event):
        ana = _attendee(event, "Ana")
        db.add_all([ana, _attendee(event, "Luis")])
        await db.commit()
        await Svc.send(db, "tok-Ana", "uno")
        with pytest.raises(HTTPException) as exc:
            await Svc.send(db, "tok-Ana", "dos")                 # demasiado rápido
        assert exc.value.status_code == 429
        await Svc.send(db, "tok-Luis", "otra persona")           # el límite es por persona
        chat_mod._last_sent[ana.id] -= chat_mod.MIN_SECONDS_BETWEEN_MESSAGES + 1   # pasó el tiempo
        await Svc.send(db, "tok-Ana", "dos")
    _run(scenario)


def test_silenciar_impide_escribir_y_se_puede_revertir():
    async def scenario(db, event):
        ana = _attendee(event, "Ana")
        db.add(ana)
        await db.commit()
        await Svc.set_muted(db, ana.id, True)
        assert (await Svc.history(db, "tok-Ana"))["muted"] is True
        with pytest.raises(HTTPException) as exc:
            await Svc.send(db, "tok-Ana", "hola")
        assert exc.value.status_code == 403
        await Svc.set_muted(db, ana.id, False)
        await Svc.send(db, "tok-Ana", "ya puedo")
        with pytest.raises(HTTPException) as exc:
            await Svc.set_muted(db, 9999, True)
        assert exc.value.status_code == 404
    _run(scenario)


def test_borrar_oculta_el_mensaje_y_avisa_en_vivo():
    class FakeWS:
        def __init__(self):
            self.sent = []

        async def send_json(self, payload):
            self.sent.append(payload)

    async def scenario(db, event):
        luis = _attendee(event, "Luis")
        db.add_all([_attendee(event, "Ana"), luis])
        await db.commit()
        sent = await Svc.send(db, "tok-Ana", "mensaje a borrar")
        att, adm = FakeWS(), FakeWS()
        chat_hub.connect(att, attendee_id=luis.id)
        chat_hub.connect(adm, admin=True)
        try:
            await Svc.delete_message(db, sent["id"], user_id=9)
            await Svc.delete_message(db, sent["id"], user_id=9)   # repetir no vuelve a avisar
        finally:
            chat_hub.disconnect(att)
            chat_hub.disconnect(adm)
        assert att.sent == adm.sent == [{"type": "deleted", "id": sent["id"]}]
        assert (await Svc.history(db, "tok-Luis"))["messages"] == []
        assert (await Svc.admin_list(db))["messages"] == []
        with pytest.raises(HTTPException) as exc:
            await Svc.delete_message(db, 9999, user_id=9)
        assert exc.value.status_code == 404
    _run(scenario)


def test_difusion_en_vivo_marca_mine_y_el_equipo_ve_el_id():
    class FakeWS:
        def __init__(self):
            self.sent = []

        async def send_json(self, payload):
            self.sent.append(payload)

    async def scenario(db, event):
        ana, luis = _attendee(event, "Ana"), _attendee(event, "Luis")
        db.add_all([ana, luis])
        await db.commit()
        ws_ana, ws_luis, ws_admin = FakeWS(), FakeWS(), FakeWS()
        chat_hub.connect(ws_ana, attendee_id=ana.id)
        chat_hub.connect(ws_luis, attendee_id=luis.id)
        chat_hub.connect(ws_admin, admin=True)
        try:
            await Svc.send(db, "tok-Ana", "Hola")
        finally:
            for w in (ws_ana, ws_luis, ws_admin):
                chat_hub.disconnect(w)
        m_ana, m_luis, m_admin = (w.sent[0]["message"] for w in (ws_ana, ws_luis, ws_admin))
        assert m_ana["mine"] is True and m_luis["mine"] is False
        assert "attendee_id" not in m_ana and "attendee_id" not in m_luis
        assert m_admin["attendee_id"] == ana.id and m_admin["author"] == "Ana Apellido"
    _run(scenario)


def test_chat_apagado_por_defecto_y_el_equipo_lo_enciende_en_vivo():
    class FakeWS:
        def __init__(self):
            self.sent = []

        async def send_json(self, payload):
            self.sent.append(payload)

    async def scenario(db, event):
        db.add(_attendee(event, "Ana"))
        await db.commit()
        with pytest.raises(HTTPException) as exc:                    # sala abierta, chat apagado
            await Svc.send(db, "tok-Ana", "hola")
        assert exc.value.status_code == 400
        assert (await Svc.history(db, "tok-Ana"))["chat_open"] is False

        ws = FakeWS()
        chat_hub.connect(ws, attendee_id=1)
        try:
            assert (await Svc.set_open(db, True))["chat_open"] is True
            await Svc.send(db, "tok-Ana", "ya hay chat")
            await Svc.set_open(db, False)
        finally:
            chat_hub.disconnect(ws)
        states = [p for p in ws.sent if p["type"] == "chat_state"]
        assert states == [{"type": "chat_state", "chat_open": True}, {"type": "chat_state", "chat_open": False}]
    _run(scenario, chat_open=False)


def test_chat_encendido_pero_sala_cerrada_no_esta_disponible():
    async def scenario(db, event):
        db.add(_attendee(event, "Ana"))
        await db.commit()
        assert (await Svc.history(db, "tok-Ana"))["chat_open"] is False
        with pytest.raises(HTTPException) as exc:
            await Svc.send(db, "tok-Ana", "hola")
        assert exc.value.status_code == 400
    _run(scenario, live_open=False, chat_open=True)


def test_pasar_a_pregunta_crea_pregunta_aprobada_a_nombre_del_autor():
    async def scenario(db, event):
        db.add_all([_attendee(event, "Ana"), _attendee(event, "Luis")])
        await db.commit()
        await Questions.set_open(db, True)
        sent = await Svc.send(db, "tok-Ana", "¿Habrá versión móvil?")
        assert [m["is_question"] for m in (await Svc.admin_list(db))["messages"]] == [False]

        result = await Svc.promote_to_question(db, sent["id"])
        assert result["ok"] is True
        assert [m["is_question"] for m in (await Svc.admin_list(db))["messages"]] == [True]
        # Luis la ve como pregunta aprobada, a nombre de Ana, y puede votarla
        seen = (await Questions.list_for_attendee(db, "tok-Luis"))["questions"]
        assert [(q["text"], q["status"], q["author"]) for q in seen] == [("¿Habrá versión móvil?", "approved", "Ana")]
        assert (await Questions.toggle_vote(db, "tok-Luis", seen[0]["id"]))["voted"] is True
        # el mensaje original sigue en el chat
        assert [m["text"] for m in (await Svc.history(db, "tok-Luis"))["messages"]] == ["¿Habrá versión móvil?"]
        with pytest.raises(HTTPException) as exc:                    # no se duplica
            await Svc.promote_to_question(db, sent["id"])
        assert exc.value.status_code == 409
    _run(scenario)


def test_pasar_a_pregunta_avisa_en_vivo_y_rechaza_mensajes_borrados_o_inexistentes():
    class FakeWS:
        def __init__(self):
            self.sent = []

        async def send_json(self, payload):
            self.sent.append(payload)

    async def scenario(db, event):
        db.add(_attendee(event, "Ana"))
        await db.commit()
        sent = await Svc.send(db, "tok-Ana", "mensaje")
        ws = FakeWS()
        questions_hub.connect(ws, admin=True)
        try:
            await Svc.promote_to_question(db, sent["id"])
        finally:
            questions_hub.disconnect(ws)
        assert ws.sent == [{"type": "changed"}]

        _free_rate_limit()
        gone = await Svc.send(db, "tok-Ana", "este se borra")
        await Svc.delete_message(db, gone["id"], user_id=1)
        for bad in (gone["id"], 9999):
            with pytest.raises(HTTPException) as exc:
                await Svc.promote_to_question(db, bad)
            assert exc.value.status_code == 404
    _run(scenario)
