"""Dinámica en vivo «¿quién respondió primero?»: participantes anónimos, ganador único y correcta oculta hasta cerrar."""
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


async def _ronda_abierta(db, correct=1):
    await Svc.create_round(db, "¿Cuál es la capital de Colombia?", ["Cali", "Bogotá", "Medellín"], correct)
    rid = (await Svc.admin_list(db))["rounds"][0]["id"]
    await Svc.open_round(db, rid)
    return rid


def test_cada_persona_recibe_un_codigo_corto_unico_sin_datos_personales():
    async def scenario(db, event):
        a, b = await Svc.join(db), await Svc.join(db)
        assert a["token"] != b["token"] and a["alias"] != b["alias"]
        assert len(a["alias"].split(" ")) == 2 and a["alias"].split(" ")[1].isdigit()
    _run(scenario)


def test_gana_la_primera_respuesta_correcta_y_la_ronda_se_cierra_sola():
    async def scenario(db, event):
        rid = await _ronda_abierta(db)
        ana, beto, caro = await Svc.join(db), await Svc.join(db), await Svc.join(db)

        mal = await Svc.answer(db, ana["token"], rid, 0)                      # incorrecta: no gana
        assert mal == {"accepted": True, "correct": False, "winner": False}
        assert (await Svc.get_state(db))["round"]["status"] == "open"

        primero = await Svc.answer(db, beto["token"], rid, 1)                 # primera correcta
        assert primero["winner"] is True
        estado = await Svc.get_state(db, beto["token"])
        assert estado["round"]["status"] == "closed" and estado["round"]["winner_alias"] == beto["alias"]
        assert estado["me"]["is_winner"] is True

        with pytest.raises(HTTPException) as exc:                             # la ronda ya cerró: nadie más puede ganar
            await Svc.answer(db, caro["token"], rid, 1)
        assert exc.value.status_code == 409
        assert (await Svc.get_state(db, caro["token"]))["me"]["is_winner"] is False
    _run(scenario)


def test_una_sola_respuesta_por_persona_y_ronda():
    async def scenario(db, event):
        rid = await _ronda_abierta(db)
        ana = await Svc.join(db)
        await Svc.answer(db, ana["token"], rid, 0)
        with pytest.raises(HTTPException) as exc:                             # no puede probar otra opción
            await Svc.answer(db, ana["token"], rid, 1)
        assert exc.value.status_code == 409
    _run(scenario)


def test_la_respuesta_correcta_no_se_publica_hasta_que_la_ronda_cierra():
    async def scenario(db, event):
        rid = await _ronda_abierta(db, correct=2)
        abierta = (await Svc.get_state(db))["round"]
        assert abierta["status"] == "open" and abierta["correct_index"] is None
        assert "correct" not in str(abierta["options"]).lower()
        ana = await Svc.join(db)
        await Svc.close_round(db, rid)
        assert (await Svc.get_state(db, ana["token"]))["round"]["correct_index"] == 2   # participante: ya la ve
        assert (await Svc.get_state(db))["round"]["correct_index"] is None                # pantalla: nunca
    _run(scenario)


def test_validaciones_de_la_pregunta_y_de_la_respuesta():
    async def scenario(db, event):
        for question, options, correct in [("", ["a", "b"], 0), ("¿?", ["solo una"], 0), ("¿?", ["a", "a"], 0),
                                           ("¿?", ["a", "b"], 5), ("¿?", ["a", "b", "c", "d", "e"], 0), ("¿?", ["a", " "], 0)]:
            with pytest.raises(HTTPException) as exc:
                await Svc.create_round(db, question, options, correct)
            assert exc.value.status_code == 422
        rid = await _ronda_abierta(db)
        ana = await Svc.join(db)
        for bad in (-1, 3, True):
            with pytest.raises(HTTPException) as exc:
                await Svc.answer(db, ana["token"], rid, bad)
            assert exc.value.status_code == 422
        with pytest.raises(HTTPException) as exc:                             # código inventado
            await Svc.answer(db, "inventado", rid, 0)
        assert exc.value.status_code == 404
    _run(scenario)


def test_solo_hay_una_ronda_abierta_y_una_ya_jugada_no_se_reabre():
    async def scenario(db, event):
        primera = await _ronda_abierta(db)
        await Svc.create_round(db, "Otra", ["x", "y"], 0)
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


def test_la_ronda_dura_un_minuto_y_se_cierra_sola_sin_ganador():
    async def scenario(db, event):
        assert ROUND_SECONDS == 60
        rid = await _ronda_abierta(db)
        ana, beto = await Svc.join(db), await Svc.join(db)

        abierta = (await Svc.get_state(db))["round"]
        assert abierta["status"] == "open" and abierta["duration_seconds"] == 60
        assert 55 < abierta["seconds_left"] <= 60

        rnd = (await db.execute(select(EventGameRound).where(EventGameRound.id == rid))).scalar_one()
        rnd.opened_at = datetime.now(timezone.utc) - timedelta(seconds=ROUND_SECONDS + 5)   # ya pasó el minuto
        await db.commit()

        with pytest.raises(HTTPException) as exc:                             # respuesta tardía: se rechaza
            await Svc.answer(db, ana["token"], rid, 1)
        assert exc.value.status_code == 409 and "tiempo" in exc.value.detail

        cerrada = (await Svc.get_state(db, beto["token"]))["round"]           # y la ronda queda cerrada, sin ganador
        assert cerrada["status"] == "closed" and cerrada["winner_alias"] is None
        assert cerrada["seconds_left"] is None and cerrada["correct_index"] == 1
    _run(scenario)


def test_si_se_acaba_el_tiempo_nadie_gana_aunque_alguien_llegue_justo_despues():
    async def scenario(db, event):
        rid = await _ronda_abierta(db)
        ana = await Svc.join(db)
        rnd = (await db.execute(select(EventGameRound).where(EventGameRound.id == rid))).scalar_one()
        rnd.opened_at = datetime.now(timezone.utc) - timedelta(seconds=ROUND_SECONDS + 1)
        await db.commit()
        with pytest.raises(HTTPException):
            await Svc.answer(db, ana["token"], rid, 1)                       # era la correcta, pero llegó tarde
        estado = (await Svc.get_state(db, ana["token"]))
        assert estado["round"]["winner_alias"] is None and estado["me"]["is_winner"] is False
    _run(scenario)


def test_las_opciones_solo_las_ve_quien_participa_no_la_pantalla():
    async def scenario(db, event):
        rid = await _ronda_abierta(db, correct=1)
        ana = await Svc.join(db)

        pantalla = (await Svc.get_state(db))["round"]                         # sin código: la pantalla del presentador
        assert pantalla["question"] and pantalla["options"] == [] and pantalla["options_count"] == 3
        assert "Bogotá" not in str(pantalla) and "Cali" not in str(pantalla)

        celular = (await Svc.get_state(db, ana["token"]))["round"]            # con código: el celular de quien responde
        assert celular["options"] == ["Cali", "Bogotá", "Medellín"]

        falso = (await Svc.get_state(db, "codigo-inventado"))["round"]        # un código inventado tampoco las recibe
        assert falso["options"] == []

        await Svc.close_round(db, rid)                                        # cerrada: la pantalla no ve ni las opciones ni la correcta
        cerrada = (await Svc.get_state(db))["round"]
        assert cerrada["options"] == [] and cerrada["correct_text"] is None and cerrada["correct_index"] is None
        assert "Bogotá" not in str(cerrada) and "Cali" not in str(cerrada) and "Medellín" not in str(cerrada)
        assert (await Svc.get_state(db, ana["token"]))["round"]["correct_text"] == "Bogotá"   # el celular sí
    _run(scenario)


def test_al_cerrar_la_pantalla_recibe_estadisticas_por_opcion_sin_nombres():
    async def scenario(db, event):
        rid = await _ronda_abierta(db, correct=1)
        a, b, c, d = [await Svc.join(db) for _ in range(4)]
        assert (await Svc.get_state(db))["round"]["distribution"] is None          # abierta: sin estadísticas (no seguir a la mayoría)

        await Svc.answer(db, a["token"], rid, 0)
        await Svc.answer(db, b["token"], rid, 2)
        await Svc.answer(db, c["token"], rid, 2)
        await Svc.answer(db, d["token"], rid, 1)                                  # acierta: gana y cierra

        cerrada = (await Svc.get_state(db))["round"]                              # lo que ve la pantalla
        assert cerrada["distribution"] == [1, 1, 2] and cerrada["answers"] == 4
        assert cerrada["correct_index"] is None and cerrada["options"] == []
        for alias in (a["alias"], b["alias"], c["alias"]):
            assert alias not in str(cerrada)                                       # solo cifras, sin nombres
        assert d["alias"] in str(cerrada)                                          # salvo el ganador, que sí se anuncia
    _run(scenario)
