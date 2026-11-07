"""Rifa por eliminación: bolsa de presenciales que ya entraron, preguntas por rondas y ganador."""
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
from src.models.event import Event, EventAttendee  # noqa: E402
from src.models.event_raffle import EventRaffle, EventRaffleAnswer, EventRaffleEntry, EventRaffleQuestion  # noqa: E402
from src.services import event_raffle_service as svc  # noqa: E402
from src.services.event_raffle_service import EventRaffleService as Svc, display_name, raffle_hub  # noqa: E402

_ids = iter(range(1, 5000))
NOW = datetime(2026, 11, 20, 15, 0, tzinfo=timezone.utc)


@pytest.fixture(autouse=True)
def _sin_auditoria(monkeypatch):
    async def fake_audit(*a, **k):
        return None
    monkeypatch.setattr(svc, "audit_in_tx", fake_audit)


def _run(coro_factory):
    async def runner():
        engine = create_async_engine("sqlite+aiosqlite://")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all, tables=[
                Event.__table__, EventAttendee.__table__, EventRaffle.__table__, EventRaffleEntry.__table__,
                EventRaffleQuestion.__table__, EventRaffleAnswer.__table__])
        maker = async_sessionmaker(engine, expire_on_commit=False)
        async with maker() as db:
            event = Event(id=1, title="Gloint Power Tech", slug="gloint-power-tech", capacity_in_person=500, event_date=NOW)
            db.add(event)
            await db.commit()
            result = await coro_factory(db, event)
        await engine.dispose()
        return result
    return asyncio.run(runner())


def _a(event, name, mode="in_person", status="confirmed", entered=True):
    return EventAttendee(id=next(_ids), event_id=event.id, full_name=name, email=f"{name.split()[0].lower()}{next(_ids)}@x.co",
                         phone="3001112233", document_id="123", attendee_type="external", attendance_mode=mode, status=status,
                         checked_in_at=NOW if entered else None)


async def _jugadores(db, event, n):
    """n presentes que ya entraron. Devuelve sus tokens personales en orden."""
    people = [_a(event, f"Persona{i} Apellido{i}") for i in range(n)]
    db.add_all(people)
    await db.commit()
    return [p.access_token for p in people]


async def _rifa_iniciada(db, title="Tablet"):
    await Svc.create(db, title)
    rid = (await Svc.admin_overview(db))["raffles"][0]["id"]
    await Svc.start(db, rid)
    return rid


async def _pregunta(db, rid, correct=1, seconds=30, abrir=True):
    await Svc.add_question(db, rid, "¿Qué producto te interesa?", ["Place", "Tech", "Inversión"], correct, seconds)
    raffle = next(r for r in (await Svc.admin_overview(db))["raffles"] if r["id"] == rid)
    qid = raffle["questions"][-1]["id"]
    if abrir:
        await Svc.open_question(db, qid)
    return qid


def _raffle(overview, rid):
    return next(r for r in overview["raffles"] if r["id"] == rid)


def test_nombre_corto_es_primer_nombre_y_inicial_del_ultimo_apellido():
    assert display_name("Diana Carolina García Pérez") == "Diana P."
    assert display_name("  juan   garcía ") == "Juan G."
    assert display_name("Madonna") == "Madonna" and display_name("") == "Asistente" and display_name(None) == "Asistente"


def test_la_bolsa_son_los_presenciales_vigentes_que_ya_entraron():
    async def scenario(db, event):
        db.add_all([_a(event, "Entro Uno"), _a(event, "Entro Dos"), _a(event, "NoEntro Tres", entered=False),
                    _a(event, "Virtual Cuatro", mode="virtual"), _a(event, "Cancelado Cinco", status="cancelled")])
        await db.commit()
        assert (await Svc.admin_overview(db))["eligible_now"] == 2
        rid = await _rifa_iniciada(db)
        assert _raffle(await Svc.admin_overview(db), rid)["total"] == 2
    _run(scenario)


def test_hacen_falta_dos_presentes_y_solo_una_rifa_en_curso():
    async def scenario(db, event):
        db.add(_a(event, "Solo Uno"))
        await db.commit()
        await Svc.create(db, "Premio")
        rid = (await Svc.admin_overview(db))["raffles"][0]["id"]
        with pytest.raises(HTTPException) as exc:
            await Svc.start(db, rid)
        assert exc.value.status_code == 400
        await _jugadores(db, event, 4)
        await Svc.start(db, rid)
        await Svc.create(db, "Otro premio")
        otro = next(r for r in (await Svc.admin_overview(db))["raffles"] if r["title"] == "Otro premio")["id"]
        for rifa in (otro, rid):                                                   # ni dos a la vez ni iniciar la ya iniciada
            with pytest.raises(HTTPException) as exc:
                await Svc.start(db, rifa)
            assert exc.value.status_code == 409
    _run(scenario)


def test_quien_falla_o_no_responde_queda_eliminado_y_los_que_aciertan_pasan():
    async def scenario(db, event):
        t = await _jugadores(db, event, 5)
        rid = await _rifa_iniciada(db)
        qid = await _pregunta(db, rid, correct=1)
        for token, opcion in ((t[0], 1), (t[1], 1), (t[2], 1), (t[3], 0)):          # t[4] no responde
            assert await Svc.answer(db, token, qid, opcion) == {"accepted": True}   # no se dice si acertó
        await Svc.close_question(db, qid)

        r = _raffle(await Svc.admin_overview(db), rid)
        q = r["questions"][0]
        assert q["status"] == "closed" and q["eliminated_count"] == 2 and q["survivors_count"] == 3 and r["remaining"] == 3
        estados = {tok: (await Svc.get_my_state(db, tok))["me"]["status"] for tok in t}
        assert [estados[x] for x in t] == ["active", "active", "active", "eliminated", "eliminated"]
        assert (await Svc.get_my_state(db, t[0]))["me"]["passed"] is True
        assert (await Svc.get_my_state(db, t[3]))["me"]["passed"] is False and (await Svc.get_my_state(db, t[3]))["me"]["eliminated_now"]
        assert (await Svc.get_my_state(db, t[4]))["me"]["passed"] is False
    _run(scenario)


def test_si_nadie_acierta_nadie_se_elimina_y_si_queda_uno_gana():
    async def scenario(db, event):
        t = await _jugadores(db, event, 3)
        rid = await _rifa_iniciada(db)
        q1 = await _pregunta(db, rid, correct=1)
        for tok in t:
            await Svc.answer(db, tok, q1, 0)                                        # todos fallan
        await Svc.close_question(db, q1)
        r = _raffle(await Svc.admin_overview(db), rid)
        assert r["remaining"] == 3 and r["questions"][0]["eliminated_count"] == 0 and r["status"] == "running"

        q2 = await _pregunta(db, rid, correct=2)
        await Svc.answer(db, t[0], q2, 2)
        await Svc.close_question(db, q2)                                            # solo t[0] acierta: queda uno y gana
        r = _raffle(await Svc.admin_overview(db), rid)
        assert r["status"] == "finished" and r["remaining"] == 1
        assert r["winner"]["display_name"] == "Persona0 A." or r["winner"]["full_name"].startswith("Persona0")
        assert (await Svc.get_my_state(db, t[0]))["me"]["status"] == "winner"
    _run(scenario)


def test_el_presentador_puede_sortear_entre_los_que_siguen_pero_no_con_una_pregunta_abierta():
    async def scenario(db, event):
        t = await _jugadores(db, event, 4)
        rid = await _rifa_iniciada(db)
        qid = await _pregunta(db, rid)
        with pytest.raises(HTTPException) as exc:
            await Svc.draw(db, rid)
        assert exc.value.status_code == 409
        for tok in t[:3]:
            await Svc.answer(db, tok, qid, 1)                                       # pasan 3, sale 1
        await Svc.close_question(db, qid)
        r = _raffle(await Svc.draw(db, rid), rid)
        assert r["status"] == "finished" and r["winner"]
        elegidos = [tok for tok in t if (await Svc.get_my_state(db, tok))["me"]["status"] == "winner"]
        assert len(elegidos) == 1 and elegidos[0] in t[:3]                           # un solo ganador, de los que seguían en juego
        with pytest.raises(HTTPException) as exc:
            await Svc.draw(db, rid)
        assert exc.value.status_code == 409
    _run(scenario)


def test_las_opciones_solo_van_al_celular_de_quien_sigue_en_juego_y_la_pantalla_no_las_recibe():
    async def scenario(db, event):
        t = await _jugadores(db, event, 3)
        db.add(_a(event, "Llego Tarde", entered=False))
        await db.commit()
        rid = await _rifa_iniciada(db)
        qid = await _pregunta(db, rid)

        activo = await Svc.get_my_state(db, t[0])
        assert activo["me"]["can_answer"] and activo["raffle"]["question"]["options"] == ["Place", "Tech", "Inversión"]
        assert activo["raffle"]["question"]["correct_index"] is None                # y sin la correcta mientras está abierta

        pantalla = (await Svc.get_public_state(db))["raffle"]["question"]
        assert pantalla["options"] == [] and pantalla["options_count"] == 3 and "Place" not in str(pantalla)

        tarde = (await Svc.get_my_state(db, (await db.execute(select(EventAttendee).where(EventAttendee.full_name == "Llego Tarde"))).scalar_one().access_token))
        assert tarde["me"]["in_raffle"] is False and tarde["raffle"]["question"]["options"] == []
        with pytest.raises(HTTPException) as exc:                                    # quien no entró a la bolsa no responde
            await Svc.answer(db, (await db.execute(select(EventAttendee).where(EventAttendee.full_name == "Llego Tarde"))).scalar_one().access_token, qid, 1)
        assert exc.value.status_code == 403

        await Svc.answer(db, t[1], qid, 0)
        await Svc.close_question(db, qid)                                            # t[0] y t[2] no respondieron: sale todo el mundo menos...
        # nadie acertó -> nadie sale; las opciones y la correcta ya se ven en el celular al cerrar
        cerrado = await Svc.get_my_state(db, t[1])
        assert cerrado["raffle"]["question"]["correct_text"] == "Tech" and cerrado["raffle"]["question"]["options"]
        assert (await Svc.get_public_state(db))["raffle"]["question"]["correct_text"] is None   # la pantalla nunca la recibe
    _run(scenario)


def test_una_respuesta_por_pregunta_y_token_invalido():
    async def scenario(db, event):
        t = await _jugadores(db, event, 3)
        rid = await _rifa_iniciada(db)
        qid = await _pregunta(db, rid)
        await Svc.answer(db, t[0], qid, 1)
        with pytest.raises(HTTPException) as exc:
            await Svc.answer(db, t[0], qid, 2)
        assert exc.value.status_code == 409
        for bad in (-1, 3, True):
            with pytest.raises(HTTPException) as exc:
                await Svc.answer(db, t[1], qid, bad)
            assert exc.value.status_code == 422
        with pytest.raises(HTTPException) as exc:
            await Svc.answer(db, "token-inventado", qid, 0)
        assert exc.value.status_code == 404
    _run(scenario)


def test_eliminado_ya_no_responde_y_la_pantalla_solo_ve_nombres_cortos():
    async def scenario(db, event):
        t = await _jugadores(db, event, 4)
        rid = await _rifa_iniciada(db)
        q1 = await _pregunta(db, rid)
        await Svc.answer(db, t[0], q1, 1)
        await Svc.answer(db, t[1], q1, 1)
        await Svc.close_question(db, q1)                                             # t[2] y t[3] eliminados
        q2 = await _pregunta(db, rid)
        with pytest.raises(HTTPException) as exc:
            await Svc.answer(db, t[2], q2, 1)
        assert exc.value.status_code == 403
        assert (await Svc.get_my_state(db, t[2]))["raffle"]["question"]["options"] == []   # el eliminado no recibe opciones

        publico = (await Svc.get_public_state(db))["raffle"]
        assert publico["remaining"] == 2 and publico["total"] == 4 and len(publico["names"]) == 2
        assert all(n.endswith(".") for n in publico["names"]) and len(publico["last_eliminated"]) == 2
        assert "@x.co" not in str(publico) and "3001112233" not in str(publico) and "Apellido" not in str(publico)
    _run(scenario)


def test_se_acaba_el_tiempo_y_la_pregunta_se_cierra_sola_eliminando():
    async def scenario(db, event):
        t = await _jugadores(db, event, 3)
        rid = await _rifa_iniciada(db)
        qid = await _pregunta(db, rid, seconds=20)
        await Svc.answer(db, t[0], qid, 1)
        await Svc.answer(db, t[1], qid, 1)
        abierta = (await Svc.get_public_state(db))["raffle"]["question"]
        assert abierta["status"] == "open" and 15 < abierta["seconds_left"] <= 20

        q = (await db.execute(select(EventRaffleQuestion).where(EventRaffleQuestion.id == qid))).scalar_one()
        q.opened_at = datetime.now(timezone.utc) - timedelta(seconds=25)             # ya pasaron los 20 s
        await db.commit()
        with pytest.raises(HTTPException) as exc:                                    # una respuesta tardía se rechaza
            await Svc.answer(db, t[2], qid, 1)
        assert exc.value.status_code == 409 and "tiempo" in exc.value.detail

        publico = (await Svc.get_public_state(db))["raffle"]
        assert publico["question"]["status"] == "closed" and publico["remaining"] == 2   # t[2] no alcanzó: eliminado
        assert (await Svc.get_my_state(db, t[2]))["me"]["status"] == "eliminated"
    _run(scenario)


def test_quien_ya_gano_no_entra_a_la_siguiente_rifa():
    async def scenario(db, event):
        await _jugadores(db, event, 3)
        r1 = await _rifa_iniciada(db, "Primera")
        await Svc.draw(db, r1)
        assert (await Svc.admin_overview(db))["eligible_now"] == 2
        await Svc.create(db, "Segunda")
        r2 = next(r for r in (await Svc.admin_overview(db))["raffles"] if r["title"] == "Segunda")["id"]
        await Svc.start(db, r2)
        assert _raffle(await Svc.admin_overview(db), r2)["total"] == 2
    _run(scenario)


def test_reiniciar_deja_las_preguntas_listas_y_borra_participantes_respuestas_y_ganador():
    async def scenario(db, event):
        t = await _jugadores(db, event, 4)
        rid = await _rifa_iniciada(db)
        qid = await _pregunta(db, rid)
        await Svc.answer(db, t[0], qid, 1)
        await Svc.close_question(db, qid)
        r = _raffle(await Svc.reset(db, rid), rid)
        assert r["status"] == "draft" and r["total"] == 0 and r["winner"] is None
        assert r["questions"][0]["status"] == "draft" and r["questions"][0]["eliminated_count"] is None and r["questions"][0]["answers"] == 0
        assert (await Svc.get_public_state(db))["raffle"] is None
        assert _raffle(await Svc.start(db, rid), rid)["total"] == 4
        with pytest.raises(HTTPException) as exc:                                    # en curso no se elimina
            await Svc.delete(db, rid)
        assert exc.value.status_code == 409
        await Svc.reset(db, rid)
        assert (await Svc.delete(db, rid))["raffles"] == []
    _run(scenario)


def test_validaciones_de_la_rifa_y_de_las_preguntas_y_aviso_en_vivo():
    class FakeWs:
        def __init__(self):
            self.sent = []

        async def send_json(self, data):
            self.sent.append(data)

    async def scenario(db, event):
        for title in ("", "x" * 151):
            with pytest.raises(HTTPException) as exc:
                await Svc.create(db, title)
            assert exc.value.status_code == 422
        await _jugadores(db, event, 3)
        await Svc.create(db, "Premio")
        rid = (await Svc.admin_overview(db))["raffles"][0]["id"]
        for q, opts, ok, dur in [("", ["a", "b"], 0, 30), ("¿?", ["solo"], 0, 30), ("¿?", ["a", "a"], 0, 30), ("¿?", ["a", "b"], 5, 30),
                                 ("¿?", ["a", "b"], True, 30), ("¿?", ["a", "b"], 0, 5), ("¿?", ["a", "b"], 0, 500)]:
            with pytest.raises(HTTPException) as exc:
                await Svc.add_question(db, rid, q, opts, ok, dur)
            assert exc.value.status_code == 422
        await Svc.add_question(db, rid, "¿Sí?", ["a", "b"], 0, 30)
        qid = _raffle(await Svc.admin_overview(db), rid)["questions"][0]["id"]
        with pytest.raises(HTTPException) as exc:                                    # sin iniciar la rifa no se lanza
            await Svc.open_question(db, qid)
        assert exc.value.status_code == 409
        ws = FakeWs()
        raffle_hub.connect(ws)
        try:
            await Svc.start(db, rid)
            await Svc.open_question(db, qid)
            await raffle_hub.flush_now()
            assert ws.sent and ws.sent[0]["type"] == "changed"
        finally:
            raffle_hub.disconnect(ws)
        with pytest.raises(HTTPException) as exc:                                    # una lanzada no se elimina
            await Svc.delete_question(db, qid)
        assert exc.value.status_code == 409
    _run(scenario)


def test_eliminar_al_azar_por_rondas_hasta_que_queda_uno_sin_preguntas():
    async def scenario(db, event):
        t = await _jugadores(db, event, 6)
        rid = await _rifa_iniciada(db)
        with pytest.raises(HTTPException) as exc:
            await Svc.eliminate_random(db, rid, 0)
        assert exc.value.status_code == 422
        r = _raffle(await Svc.eliminate_random(db, rid, 2), rid)
        assert r["remaining"] == 4 and r["status"] == "running"
        publico = await Svc.get_public_state(db)
        assert publico["raffle"]["last_round"]["number"] == 1 and publico["raffle"]["last_round"]["count"] == 2
        r = _raffle(await Svc.eliminate_random(db, rid, 2), rid)
        assert r["remaining"] == 2
        assert (await Svc.get_public_state(db))["raffle"]["last_round"]["number"] == 2
        r = _raffle(await Svc.eliminate_random(db, rid, 50), rid)                  # nunca elimina al último: queda uno y gana
        assert r["status"] == "finished" and r["winner"]
        estados = [(await Svc.get_my_state(db, tok))["me"]["status"] for tok in t]
        assert estados.count("winner") == 1 and estados.count("eliminated") == 5
        with pytest.raises(HTTPException) as exc:
            await Svc.eliminate_random(db, rid, 1)
        assert exc.value.status_code == 409
    _run(scenario)
