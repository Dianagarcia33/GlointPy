"""
Carga del evento en vivo con 200 asistentes: que los avisos no se multipliquen y que un cliente lento no frene a los demás.

Son pruebas de la capa de servicios con SQLite y conexiones simuladas (no miden la red ni MySQL reales), pero cuentan
exactamente cuántos mensajes recibe cada conexión, que es lo que provocaba la avalancha de recargas.
"""
import asyncio
import os
import time
from datetime import datetime, timezone

import pytest
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

for _k, _v in {"DB_HOST": "x", "DB_USER": "x", "DB_PASSWORD": "x", "DB_NAME": "x", "SECRET_KEY": "x"}.items():
    os.environ.setdefault(_k, _v)

from src.core.database import Base  # noqa: E402
from src.models.event import (  # noqa: E402
    Event, EventAttendee, EventChatMessage, EventQuestion, EventQuestionVote, EventSurveyResponse)
from src.services import event_chat_service as chat_mod  # noqa: E402
from src.services import ws_broadcast  # noqa: E402
from src.services.event_chat_service import EventChatService as Chat, chat_hub  # noqa: E402
from src.services.event_question_service import EventQuestionService as Questions, questions_hub  # noqa: E402
from src.services.event_survey_service import EventSurveyService as Survey  # noqa: E402

ASISTENTES = 200
TABLES = [Event.__table__, EventAttendee.__table__, EventChatMessage.__table__, EventQuestion.__table__,
          EventQuestionVote.__table__, EventSurveyResponse.__table__]


class FakeWS:
    def __init__(self, delay: float = 0.0):
        self.sent = []
        self.delay = delay

    async def send_json(self, payload):
        if self.delay:
            await asyncio.sleep(self.delay)
        self.sent.append(payload)


def _run(coro_factory, **event_flags):
    async def runner():
        chat_mod._last_sent.clear()
        engine = create_async_engine("sqlite+aiosqlite://")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all, tables=TABLES)
        maker = async_sessionmaker(engine, expire_on_commit=False)
        async with maker() as db:
            event = Event(id=1, title="Gloint Power Tech", slug="gloint-power-tech", capacity_in_person=10,
                          event_date=datetime(2026, 11, 7, 18, 0, tzinfo=timezone.utc), **event_flags)
            db.add(event)
            db.add_all([EventAttendee(id=i, event_id=1, full_name=f"Persona {i}", email=f"p{i}@x.co", attendee_type="external",
                                      attendance_mode="virtual", status="confirmed", access_token=f"tok-{i}")
                        for i in range(1, ASISTENTES + 1)])
            await db.commit()
            try:
                return await coro_factory(db, event)
            finally:
                for hub in (questions_hub, chat_hub):
                    for ws in list(hub.attendees) + list(hub.admins):
                        hub.disconnect(ws)
                await chat_hub.drain()
        await engine.dispose()
    return asyncio.run(runner())


def _conectar_asistentes_a_preguntas(sockets_por_asistente=2):
    """Cada virtual abre 2 conexiones al aviso de preguntas/encuesta (panel de preguntas y panel de encuesta)."""
    sockets = [FakeWS() for _ in range(ASISTENTES * sockets_por_asistente)]
    for ws in sockets:
        questions_hub.connect(ws, admin=False)
    return sockets


def test_200_respuestas_de_encuesta_no_hacen_recargar_a_los_asistentes():
    """Antes: 200 respuestas x 400 conexiones = 80.000 avisos (cada uno una recarga). Ahora: ninguno a los asistentes."""
    async def scenario(db, event):
        attendees = _conectar_asistentes_a_preguntas()
        admin = FakeWS()
        questions_hub.connect(admin, admin=True)

        t0 = time.perf_counter()
        for i in range(1, ASISTENTES + 1):
            await Survey.submit(db, f"tok-{i}", dict(overall_rating=5, content_rating=4, speakers_rating=5,
                                                      organization_rating=3, nps=9, comment=None))
        await questions_hub.flush_now()
        elapsed = time.perf_counter() - t0

        assert sum(len(ws.sent) for ws in attendees) == 0                       # los asistentes no reciben nada
        assert admin.sent == [{"type": "changed", "scope": "survey"}]            # el equipo, un solo aviso agrupado
        assert (await Survey.get_results(db))["overall"]["total"] == ASISTENTES   # y todas las respuestas quedaron
        assert elapsed < 30
    _run(scenario, survey_open=True)


def test_abrir_o_cerrar_la_encuesta_si_avisa_a_todos_una_sola_vez():
    async def scenario(db, event):
        attendees = _conectar_asistentes_a_preguntas()
        await Survey.set_open(db, False)
        await Survey.set_open(db, True)
        await Survey.set_open(db, False)
        await questions_hub.flush_now()
        assert all(ws.sent == [{"type": "changed", "scope": "survey"}] for ws in attendees)   # 3 cambios, 1 aviso por conexión
    _run(scenario, survey_open=True)


def test_rafaga_de_votos_se_agrupa_en_un_aviso_por_conexion():
    """200 asistentes votando casi a la vez: cada conexión recibe a lo sumo un aviso, no 200."""
    async def scenario(db, event):
        db.add(EventQuestion(id=1, event_id=1, attendee_id=1, text="¿Cuándo sale el producto?", status="approved"))
        await db.commit()
        attendees = _conectar_asistentes_a_preguntas()
        admin = FakeWS()
        questions_hub.connect(admin, admin=True)

        for i in range(1, ASISTENTES + 1):
            await Questions.toggle_vote(db, f"tok-{i}", 1)
        await questions_hub.flush_now()

        assert max(len(ws.sent) for ws in attendees) == 1
        assert sum(len(ws.sent) for ws in attendees) == ASISTENTES * 2           # 400, no 80.000
        assert admin.sent == [{"type": "changed", "scope": "questions"}]
        assert (await Questions.list_for_attendee(db, "tok-1"))["questions"][0]["votes"] == ASISTENTES
    _run(scenario, questions_open=True)


def test_una_pregunta_pendiente_solo_avisa_al_equipo():
    async def scenario(db, event):
        attendees = _conectar_asistentes_a_preguntas()
        admin = FakeWS()
        questions_hub.connect(admin, admin=True)
        await Questions.submit(db, "tok-1", "¿Habrá grabación del evento?")
        await questions_hub.flush_now()
        assert sum(len(ws.sent) for ws in attendees) == 0
        assert admin.sent == [{"type": "changed", "scope": "questions"}]
    _run(scenario, questions_open=True)


def test_los_avisos_en_rafaga_se_juntan_y_el_ambito_amplio_gana():
    async def scenario(db, event):
        asistente, admin = FakeWS(), FakeWS()
        questions_hub.connect(asistente, admin=False)
        questions_hub.connect(admin, admin=True)
        for _ in range(1000):
            await questions_hub.notify("questions", attendees=False)
        await questions_hub.notify("questions", attendees=True)                  # basta uno que sí le importe a los asistentes
        await questions_hub.notify("coupon", attendees=False)
        await questions_hub.flush_now()
        assert asistente.sent == [{"type": "changed", "scope": "questions"}]
        assert sorted(m["scope"] for m in admin.sent) == ["coupon", "questions"]
    _run(scenario)


def test_el_aviso_agrupado_se_envia_solo_pasado_el_tiempo(monkeypatch):
    from src.services import event_question_service as qs
    monkeypatch.setattr(qs, "COALESCE_SECONDS", 0.05)

    async def scenario(db, event):
        ws = FakeWS()
        questions_hub.connect(ws, admin=False)
        await questions_hub.notify("questions")
        await questions_hub.notify("questions")
        assert ws.sent == []                       # todavía no: se espera a agrupar
        await asyncio.sleep(0.2)
        assert ws.sent == [{"type": "changed", "scope": "questions"}]
    _run(scenario)


def test_un_cliente_con_la_red_caida_no_frena_el_chat(monkeypatch):
    monkeypatch.setattr(ws_broadcast, "SEND_TIMEOUT_SECONDS", 0.2)

    async def scenario(db, event):
        rapidos = [FakeWS() for _ in range(ASISTENTES - 1)]
        lento = FakeWS(delay=5)
        for i, ws in enumerate(rapidos, start=1):
            chat_hub.connect(ws, attendee_id=i)
        chat_hub.connect(lento, attendee_id=ASISTENTES)

        t0 = time.perf_counter()
        await chat_hub.broadcast_message({"id": 1, "author": "Ana", "text": "hola", "created_at": None, "attendee_id": 1})
        elapsed = time.perf_counter() - t0

        assert elapsed < 1.0                                                      # no espera los 5 s del lento
        assert all(len(ws.sent) == 1 for ws in rapidos)                           # los demás lo recibieron
        assert lento not in chat_hub.attendees                                    # y el lento se descarta (se reconecta solo)
    _run(scenario)


def test_quien_escribe_no_espera_a_que_llegue_a_los_200():
    async def scenario(db, event):
        sockets = [FakeWS(delay=0.05) for _ in range(ASISTENTES)]
        for i, ws in enumerate(sockets, start=1):
            chat_hub.connect(ws, attendee_id=i)

        t0 = time.perf_counter()
        await Chat.send(db, "tok-1", "mensaje para todos")
        respuesta = time.perf_counter() - t0
        await chat_hub.drain()
        total = time.perf_counter() - t0

        assert respuesta < 0.3                          # la respuesta a quien escribe no depende de los 200 envíos
        assert total < 2.0                              # y los 200 se envían en paralelo (en serie serían ~10 s)
        assert all(len(ws.sent) == 1 for ws in sockets)
    _run(scenario, live_open=True, chat_open=True)


def test_rafaga_de_mensajes_llega_completa_y_en_orden_a_los_200():
    async def scenario(db, event):
        sockets = [FakeWS() for _ in range(ASISTENTES)]
        for i, ws in enumerate(sockets, start=1):
            chat_hub.connect(ws, attendee_id=i)
        for n in range(1, 31):                                    # 30 mensajes de 30 personas distintas
            await Chat.send(db, f"tok-{n}", f"mensaje {n}")
        await chat_hub.drain()
        for ws in sockets:
            textos = [p["message"]["text"] for p in ws.sent]
            assert textos == [f"mensaje {n}" for n in range(1, 31)]
    _run(scenario, live_open=True, chat_open=True)
