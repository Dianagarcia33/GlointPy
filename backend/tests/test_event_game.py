"""Dinámica en vivo del evento: pregunta con un minuto para responder, opciones solo en el celular y estadísticas al cerrar."""
import asyncio
import os
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

for _k, _v in {"DB_HOST": "x", "DB_USER": "x", "DB_PASSWORD": "x", "DB_NAME": "x", "SECRET_KEY": "x"}.items():
    os.environ.setdefault(_k, _v)

from src.core.database import Base  # noqa: E402
from src.models.event import Event  # noqa: E402
from src.models.event_game import EventGameAnswer, EventGameParticipant, EventGameRound  # noqa: E402
from src.services.event_game_service import EventGameService as Svc, ROUND_SECONDS, game_hub  # noqa: E402


def _run(coro_factory):
    async def runner():
        engine = create_async_engine("sqlite+aiosqlite://")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all, tables=[
                Event.__table__, EventGameParticipant.__table__, EventGameRound.__table__, EventGameAnswer.__table__])
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


async def _ronda_abierta(db):
    await Svc.create_round(db, "¿Qué producto te interesa más?", ["Place", "Tech", "Inversión"])
    rid = (await Svc.admin_list(db))["rounds"][0]["id"]
    await Svc.open_round(db, rid)
    return rid


def test_cada_persona_recibe_un_token_anonimo_sin_codigo_visible():
    async def scenario(db, event):
        personas = [await Svc.join(db) for _ in range(30)]
        assert len({p["token"] for p in personas}) == 30
        assert all(set(p) == {"token"} for p in personas)                     # no se devuelve ningún código ni nombre
        ronda = await _ronda_abierta(db)
        estado = await Svc.get_state(db, personas[0]["token"])
        assert estado["me"] == {"answered": False, "option_index": None}
        assert "alias" not in str(estado) and "winner" not in str(estado) and "correct" not in str(estado)
        assert ronda
    _run(scenario)


def test_todos_responden_el_minuto_completo_y_nadie_cierra_la_ronda():
    async def scenario(db, event):
        rid = await _ronda_abierta(db)
        a, b, c = await Svc.join(db), await Svc.join(db), await Svc.join(db)
        for persona, opcion in ((a, 0), (b, 1), (c, 1)):
            assert await Svc.answer(db, persona["token"], rid, opcion) == {"accepted": True}
            assert (await Svc.get_state(db))["round"]["status"] == "open"        # sigue abierta después de cada respuesta
        assert (await Svc.get_state(db, a["token"]))["me"] == {"answered": True, "option_index": 0}
        assert (await Svc.get_state(db))["round"]["answers"] == 3
    _run(scenario)


def test_una_sola_respuesta_por_persona_y_ronda():
    async def scenario(db, event):
        rid = await _ronda_abierta(db)
        ana = await Svc.join(db)
        await Svc.answer(db, ana["token"], rid, 0)
        with pytest.raises(HTTPException) as exc:                             # no puede cambiar ni repetir
            await Svc.answer(db, ana["token"], rid, 1)
        assert exc.value.status_code == 409
    _run(scenario)


def test_validaciones_de_la_pregunta_y_de_la_respuesta():
    async def scenario(db, event):
        for question, options in [("", ["a", "b"]), ("¿?", ["solo una"]), ("¿?", ["a", "a"]),
                                  ("¿?", ["a", "b", "c", "d", "e"]), ("¿?", ["a", " "])]:
            with pytest.raises(HTTPException) as exc:
                await Svc.create_round(db, question, options)
            assert exc.value.status_code == 422
        rid = await _ronda_abierta(db)
        ana = await Svc.join(db)
        for bad in (-1, 3, True):
            with pytest.raises(HTTPException) as exc:
                await Svc.answer(db, ana["token"], rid, bad)
            assert exc.value.status_code == 422
        with pytest.raises(HTTPException) as exc:                             # token inventado
            await Svc.answer(db, "inventado", rid, 0)
        assert exc.value.status_code == 404
    _run(scenario)


def test_las_opciones_solo_las_ve_quien_participa_no_la_pantalla():
    async def scenario(db, event):
        await _ronda_abierta(db)
        ana = await Svc.join(db)

        pantalla = (await Svc.get_state(db))["round"]                         # sin token: la pantalla del presentador
        assert pantalla["question"] and pantalla["options"] == [] and pantalla["options_count"] == 3
        assert "Place" not in str(pantalla) and "Inversión" not in str(pantalla)

        celular = (await Svc.get_state(db, ana["token"]))["round"]            # con token: el celular de quien responde
        assert celular["options"] == ["Place", "Tech", "Inversión"]

        assert (await Svc.get_state(db, "token-inventado"))["round"]["options"] == []
    _run(scenario)


def test_al_cerrar_hay_estadisticas_por_opcion_y_antes_no():
    async def scenario(db, event):
        rid = await _ronda_abierta(db)
        a, b, c, d = [await Svc.join(db) for _ in range(4)]
        assert (await Svc.get_state(db))["round"]["distribution"] is None          # abierta: sin estadísticas (no seguir a la mayoría)

        await Svc.answer(db, a["token"], rid, 0)
        await Svc.answer(db, b["token"], rid, 2)
        await Svc.answer(db, c["token"], rid, 2)
        await Svc.answer(db, d["token"], rid, 1)
        assert (await Svc.get_state(db))["round"]["distribution"] is None
        await Svc.close_round(db, rid)

        cerrada = (await Svc.get_state(db))["round"]                               # lo que ve la pantalla
        assert cerrada["status"] == "closed" and cerrada["distribution"] == [1, 1, 2] and cerrada["answers"] == 4
        assert cerrada["options"] == []                                            # y sigue sin ver las opciones
        assert "winner" not in str(cerrada) and "correct" not in str(cerrada)      # sin ganador ni respuesta correcta
        assert (await Svc.get_state(db, a["token"]))["round"]["distribution"] == [1, 1, 2]   # el celular también las ve
    _run(scenario)


def test_la_ronda_dura_un_minuto_y_se_cierra_sola():
    async def scenario(db, event):
        assert ROUND_SECONDS == 60
        rid = await _ronda_abierta(db)
        ana, beto = await Svc.join(db), await Svc.join(db)
        await Svc.answer(db, ana["token"], rid, 1)

        abierta = (await Svc.get_state(db))["round"]
        assert abierta["status"] == "open" and abierta["duration_seconds"] == 60 and 55 < abierta["seconds_left"] <= 60

        rnd = (await db.execute(select(EventGameRound).where(EventGameRound.id == rid))).scalar_one()
        rnd.opened_at = datetime.now(timezone.utc) - timedelta(seconds=ROUND_SECONDS + 5)   # ya pasó el minuto
        await db.commit()

        with pytest.raises(HTTPException) as exc:                             # respuesta tardía: se rechaza
            await Svc.answer(db, beto["token"], rid, 1)
        assert exc.value.status_code == 409 and "tiempo" in exc.value.detail

        cerrada = (await Svc.get_state(db, beto["token"]))["round"]
        assert cerrada["status"] == "closed" and cerrada["seconds_left"] is None
        assert cerrada["distribution"] == [0, 1, 0]                           # cuenta solo lo que llegó a tiempo
    _run(scenario)


def test_solo_hay_una_ronda_abierta_y_una_ya_jugada_no_se_reabre():
    async def scenario(db, event):
        primera = await _ronda_abierta(db)
        await Svc.create_round(db, "Otra", ["x", "y"])
        segunda = (await Svc.admin_list(db))["rounds"][0]["id"]
        await Svc.open_round(db, segunda)
        estados = {r["id"]: r["status"] for r in (await Svc.admin_list(db))["rounds"]}
        assert estados == {primera: "closed", segunda: "open"}
        with pytest.raises(HTTPException) as exc:
            await Svc.open_round(db, primera)
        assert exc.value.status_code == 409
        with pytest.raises(HTTPException) as exc:                             # una abierta no se elimina
            await Svc.delete_round(db, segunda)
        assert exc.value.status_code == 409
        await Svc.close_round(db, segunda)
        assert len((await Svc.delete_round(db, segunda))["rounds"]) == 1
    _run(scenario)


def test_los_avisos_en_vivo_llegan_a_pantalla_y_celulares():
    class FakeWs:
        def __init__(self):
            self.sent = []

        async def send_json(self, data):
            self.sent.append(data)

    async def scenario(db, event):
        ws = FakeWs()
        game_hub.connect(ws)
        try:
            await _ronda_abierta(db)
            await game_hub.flush_now()
            assert ws.sent and ws.sent[0]["type"] == "changed"
        finally:
            game_hub.disconnect(ws)
    _run(scenario)


def test_reiniciar_una_ronda_borra_sus_respuestas_y_se_puede_volver_a_jugar():
    async def scenario(db, event):
        rid = await _ronda_abierta(db)
        a, b = await Svc.join(db), await Svc.join(db)
        await Svc.answer(db, a["token"], rid, 0)
        await Svc.answer(db, b["token"], rid, 1)
        await Svc.close_round(db, rid)
        assert (await Svc.get_state(db))["round"]["distribution"] == [1, 1, 0]

        listado = await Svc.reset_round(db, rid)
        ronda = next(r for r in listado["rounds"] if r["id"] == rid)
        assert ronda["status"] == "draft" and ronda["answers"] == 0 and ronda["distribution"] is None
        assert (await Svc.get_state(db))["round"] is None                          # la pantalla vuelve a «prepárate»

        await Svc.open_round(db, rid)                                              # se abre otra vez con su minuto completo
        estado = await Svc.get_state(db, a["token"])
        assert estado["round"]["status"] == "open" and estado["round"]["seconds_left"] > 55
        assert estado["me"] == {"answered": False, "option_index": None}           # quien ya había respondido puede hacerlo de nuevo
        assert await Svc.answer(db, a["token"], rid, 2) == {"accepted": True}
    _run(scenario)


def test_reiniciar_todo_borra_preguntas_respuestas_y_participantes_y_los_celulares_se_recuperan():
    async def scenario(db, event):
        rid = await _ronda_abierta(db)
        ana = await Svc.join(db)
        await Svc.answer(db, ana["token"], rid, 0)

        vacio = await Svc.reset_all(db)
        assert vacio == {"participants": 0, "rounds": []}
        assert (await Svc.get_state(db, ana["token"])) == {"round": None, "me": None}   # el token viejo ya no existe
        with pytest.raises(HTTPException) as exc:
            await Svc.answer(db, ana["token"], rid, 0)
        assert exc.value.status_code == 404

        nueva = await Svc.join(db)                                                  # el celular pide un token nuevo y sigue
        assert (await Svc.get_state(db, nueva["token"]))["me"] == {"answered": False, "option_index": None}
    _run(scenario)
