"""Cupones del evento para Gloint Place: solo para los seleccionados, con vigencia, validación y canje de un solo uso."""
import asyncio
import os
import re
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

for _k, _v in {"DB_HOST": "x", "DB_USER": "x", "DB_PASSWORD": "x", "DB_NAME": "x", "SECRET_KEY": "x"}.items():
    os.environ.setdefault(_k, _v)

from src.core.database import Base  # noqa: E402
from src.models.event import Event, EventAttendee, EventCoupon, EventLiveSession  # noqa: E402
from src.services.event_coupon_rules import attendee_sees_coupon, coupon_is_live  # noqa: E402
from src.services.event_coupon_service import (  # noqa: E402
    EventCouponService as Svc, build_store_link, normalize_code)

_ids = iter(range(1, 1000))
CODE_RE = re.compile(r"^GPT-[A-HJ-NP-Z2-9]{8}$")


def _run(coro_factory):
    async def runner():
        engine = create_async_engine("sqlite+aiosqlite://")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all, tables=[
                Event.__table__, EventAttendee.__table__, EventCoupon.__table__, EventLiveSession.__table__])
        maker = async_sessionmaker(engine, expire_on_commit=False)
        async with maker() as db:
            event = Event(id=1, title="Gloint Power Tech", slug="gloint-power-tech", capacity_in_person=10,
                          event_date=datetime(2026, 11, 7, 18, 0, tzinfo=timezone.utc))
            db.add(event)
            await db.commit()
            result = await coro_factory(db, event)
        await engine.dispose()
        return result
    return asyncio.run(runner())


def _attendee(event, name, mode="virtual", kind="external", status="confirmed", **kw):
    return EventAttendee(id=next(_ids), event_id=event.id, full_name=f"{name} Apellido", email=f"{name.lower()}@x.co",
                         attendee_type=kind, attendance_mode=mode, status=status, access_token=f"tok-{name}", **kw)


async def _crear(db, event, *attendees):
    db.add_all(attendees)
    await db.commit()
    return attendees


def _codigo(overview, attendee):
    return next(c["code"] for c in overview["candidates"] if c["attendee_id"] == attendee.id)


def test_nadie_tiene_cupon_hasta_que_el_equipo_lo_elige():
    async def scenario(db, event):
        ana, luis = await _crear(db, event, _attendee(event, "Ana"), _attendee(event, "Luis"))
        overview = await Svc.admin_overview(db)
        assert overview["total"] == 0 and overview["eligible"] == 2 and overview["coupons"] == []
        assert all(c["code"] is None for c in overview["candidates"])
        mine = await Svc.get_for_attendee(db, "tok-Ana")
        assert mine["assigned"] is False and mine["status"] == "none" and mine["code"] is None
        assert await Svc.validate(db, "GPT-AAAAAAAA") == {"valid": False, "reason": "not_found"}
    _run(scenario)


def test_asignar_da_cupon_solo_a_los_elegidos_y_vigentes():
    async def scenario(db, event):
        ana, luis, eva, fuera = await _crear(db, event, _attendee(event, "Ana", mode="in_person", kind="investor"),
                                             _attendee(event, "Luis"), _attendee(event, "Eva"),
                                             _attendee(event, "Fuera", status="cancelled"))
        overview = await Svc.assign(db, [ana.id, luis.id, fuera.id, 99999])
        assert overview["result"] == {"assigned": 2, "already_had": 0, "ignored": 2}     # el cancelado y el inexistente se ignoran
        assert overview["total"] == 2 and overview["eligible"] == 3                      # candidatos: los 3 vigentes
        assert CODE_RE.match(_codigo(overview, ana)) and CODE_RE.match(_codigo(overview, luis))
        assert _codigo(overview, ana) != _codigo(overview, luis)
        assert _codigo(overview, eva) is None                                              # Eva no fue elegida
        row = next(c for c in overview["candidates"] if c["attendee_id"] == ana.id)
        assert (row["attendee_type"], row["attendance_mode"]) == ("investor", "in_person")
        assert {c["full_name"] for c in overview["coupons"]} == {"Ana Apellido", "Luis Apellido"}   # a quién se le dio
    _run(scenario)


def test_asignar_dos_veces_no_cambia_el_codigo_ni_duplica():
    async def scenario(db, event):
        ana, = await _crear(db, event, _attendee(event, "Ana"))
        first = _codigo(await Svc.assign(db, [ana.id]), ana)
        again = await Svc.assign(db, [ana.id, ana.id])                                    # incluso repetido en la misma acción
        assert again["result"] == {"assigned": 0, "already_had": 1, "ignored": 0}
        assert _codigo(again, ana) == first and again["total"] == 1
    _run(scenario)


def test_la_seleccion_se_valida():
    async def scenario(db, event):
        await _crear(db, event, _attendee(event, "Ana"))
        for bad in ([], None, ["x"], [1.5], [True], list(range(1, 2002))):
            with pytest.raises(HTTPException) as exc:
                await Svc.assign(db, bad)
            assert exc.value.status_code == 422
        with pytest.raises(HTTPException) as exc:
            await Svc.revoke(db, [])
        assert exc.value.status_code == 422
    _run(scenario)


def test_seleccionado_no_ve_el_codigo_hasta_activar_y_no_seleccionado_nunca():
    async def scenario(db, event):
        ana, eva = await _crear(db, event, _attendee(event, "Ana"), _attendee(event, "Eva"))
        await Svc.assign(db, [ana.id])

        antes = await Svc.get_for_attendee(db, "tok-Ana")                      # elegida, pero aún sin activar
        assert antes["assigned"] is True and antes["status"] == "inactive" and antes["code"] is None

        await Svc.set_active(db, True)
        despues = await Svc.get_for_attendee(db, "tok-Ana")
        assert despues["status"] == "valid" and CODE_RE.match(despues["code"]) and despues["active"] is True
        assert despues["store_link"] == f"https://glointplace.com.co?cupon={despues['code']}"

        nunca = await Svc.get_for_attendee(db, "tok-Eva")                       # no elegida: ni con los cupones activos
        assert nunca["assigned"] is False and nunca["status"] == "none" and nunca["code"] is None
        with pytest.raises(HTTPException) as exc:
            await Svc.get_qr(db, "tok-Eva")
        assert exc.value.status_code == 404
    _run(scenario)


def test_activar_exige_haber_elegido_a_alguien_y_corre_la_vigencia():
    async def scenario(db, event):
        ana, = await _crear(db, event, _attendee(event, "Ana"))
        with pytest.raises(HTTPException) as exc:
            await Svc.set_active(db, True)
        assert exc.value.status_code == 400
        await Svc.assign(db, [ana.id])
        before = datetime.now(timezone.utc)
        overview = await Svc.set_active(db, True)
        assert overview["active"] and overview["live"] and overview["counts"]["valid"] == 1
        assert overview["expires_at"] - overview["starts_at"] == timedelta(hours=48)
        assert overview["starts_at"] >= before.replace(microsecond=0)
    _run(scenario)


def test_quien_se_elige_con_los_cupones_activos_hereda_la_misma_vigencia():
    async def scenario(db, event):
        ana, luis = await _crear(db, event, _attendee(event, "Ana"), _attendee(event, "Luis"))
        await Svc.assign(db, [ana.id])
        activo = await Svc.set_active(db, True)
        await Svc.assign(db, [luis.id])
        tarde = await Svc.get_for_attendee(db, "tok-Luis")
        assert tarde["status"] == "valid" and tarde["expires_at"] == activo["expires_at"]   # no se le da más tiempo que a los demás
    _run(scenario)


def test_quitar_el_cupon_lo_anula_pero_uno_ya_usado_se_conserva():
    async def scenario(db, event):
        ana, luis, eva = await _crear(db, event, _attendee(event, "Ana"), _attendee(event, "Luis"), _attendee(event, "Eva"))
        await Svc.assign(db, [ana.id, luis.id])
        await Svc.set_active(db, True)
        code_ana = (await Svc.get_for_attendee(db, "tok-Ana"))["code"]
        code_luis = (await Svc.get_for_attendee(db, "tok-Luis"))["code"]
        await Svc.redeem(db, 5, code_luis, "PED-1")                              # Luis ya lo usó

        result = await Svc.revoke(db, [ana.id, luis.id, eva.id])                 # Eva ni lo tenía
        assert result["result"] == {"revoked": 1, "kept_used": 1}
        assert _codigo(result, ana) is None and _codigo(result, luis) == code_luis
        assert (await Svc.validate(db, code_ana)) == {"valid": False, "reason": "not_found"}   # el de Ana ya no sirve en la tienda
        assert (await Svc.get_for_attendee(db, "tok-Ana"))["status"] == "none"
        assert (await Svc.validate(db, code_luis))["reason"] == "redeemed"
    _run(scenario)


def test_vigencia_vence_y_desactivar_los_deja_inactivos():
    async def scenario(db, event):
        ana, = await _crear(db, event, _attendee(event, "Ana"))
        await Svc.assign(db, [ana.id])
        await Svc.set_active(db, True)
        code = (await Svc.get_for_attendee(db, "tok-Ana"))["code"]
        assert (await Svc.validate(db, code))["valid"] is True

        event_row = await db.get(Event, 1)
        event_row.coupon_expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)   # ya pasaron las 48 h
        await db.commit()
        assert (await Svc.get_for_attendee(db, "tok-Ana"))["status"] == "expired"
        assert (await Svc.validate(db, code)) == {"valid": False, "reason": "expired", "code": code}
        assert coupon_is_live(event_row) is False

        overview = await Svc.set_active(db, True)                       # volver a activar abre una vigencia nueva
        assert overview["counts"]["valid"] == 1 and (await Svc.validate(db, code))["valid"] is True
        await Svc.set_active(db, False)
        assert (await Svc.validate(db, code))["reason"] == "inactive"
        assert (await Svc.get_for_attendee(db, "tok-Ana"))["code"] is None
    _run(scenario)


def test_configuracion_se_valida_y_no_cambia_con_los_cupones_activos():
    async def scenario(db, event):
        ana, = await _crear(db, event, _attendee(event, "Ana"))
        for percent, hours, url in [(0, 48, "https://x.co"), (101, 48, "https://x.co"), (20, 0, "https://x.co"),
                                    (20, 721, "https://x.co"), (20, 48, "http://x.co"), (20, 48, "glointplace.com.co"), (20, 48, "")]:
            with pytest.raises(HTTPException) as exc:
                await Svc.update_config(db, percent, hours, url)
            assert exc.value.status_code == 422
        ok = await Svc.update_config(db, 15, 24, "https://tienda.example.com/promo")
        assert (ok["percent"], ok["hours"], ok["store_url"]) == (15, 24, "https://tienda.example.com/promo")
        await Svc.assign(db, [ana.id])
        activo = await Svc.set_active(db, True)
        assert activo["expires_at"] - activo["starts_at"] == timedelta(hours=24)
        with pytest.raises(HTTPException) as exc:
            await Svc.update_config(db, 30, 24, "https://tienda.example.com/promo")      # con cupones activos no se cambia
        assert exc.value.status_code == 400
    _run(scenario)


def test_gloint_place_valida_y_canjea_un_solo_uso():
    async def scenario(db, event):
        ana, luis = await _crear(db, event, _attendee(event, "Ana"), _attendee(event, "Luis"))
        await Svc.assign(db, [ana.id, luis.id])
        await Svc.set_active(db, True)
        code = (await Svc.get_for_attendee(db, "tok-Ana"))["code"]

        valid = await Svc.validate(db, f"  {code.lower()} ")                  # tolera minúsculas y espacios
        assert valid["valid"] is True and valid["percent"] == 20 and valid["code"] == code
        assert "full_name" not in valid and "email" not in valid               # no revela datos de la persona

        assert (await Svc.redeem(db, app_id=5, raw_code=code, order_reference="PED-1")) == {"redeemed": True, "already": False, "percent": 20}
        assert (await Svc.redeem(db, 5, code, "PED-1"))["already"] is True       # reintento de la misma compra: seguro
        with pytest.raises(HTTPException) as exc:                                # otra compra con el mismo código
            await Svc.redeem(db, 5, code, "PED-2")
        assert exc.value.status_code == 409 and exc.value.detail["reason"] == "redeemed"
        assert (await Svc.validate(db, code))["reason"] == "redeemed"

        overview = await Svc.admin_overview(db)                                # el equipo ve quién lo usó y en qué compra
        used = next(c for c in overview["coupons"] if c["code"] == code)
        assert used["status"] == "redeemed" and used["redeemed_order_ref"] == "PED-1"
        assert overview["counts"]["redeemed"] == 1 and overview["counts"]["valid"] == 1

        other = (await Svc.get_for_attendee(db, "tok-Luis"))["code"]
        for bad_ref in ["", "   "]:
            with pytest.raises(HTTPException) as exc:
                await Svc.redeem(db, 5, other, bad_ref)
            assert exc.value.status_code == 422
        with pytest.raises(HTTPException) as exc:
            await Svc.redeem(db, 5, "GPT-NOEXISTE", "PED-3")
        assert exc.value.status_code == 404
    _run(scenario)


def test_no_se_canjea_un_cupon_vencido():
    async def scenario(db, event):
        ana, = await _crear(db, event, _attendee(event, "Ana"))
        await Svc.assign(db, [ana.id])
        await Svc.set_active(db, True)
        code = (await Svc.get_for_attendee(db, "tok-Ana"))["code"]
        (await db.get(Event, 1)).coupon_expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        await db.commit()
        with pytest.raises(HTTPException) as exc:
            await Svc.redeem(db, 5, code, "PED-1")
        assert exc.value.status_code == 409 and exc.value.detail["reason"] == "expired"
    _run(scenario)


def test_el_aviso_de_la_sala_y_del_dashboard_es_solo_para_los_seleccionados():
    """attendee_sees_coupon alimenta el aviso del latido de la sala y de my-registration."""
    async def scenario(db, event):
        ana, eva = await _crear(db, event, _attendee(event, "Ana"), _attendee(event, "Eva"))
        event_row = await db.get(Event, 1)
        await Svc.assign(db, [ana.id])
        assert await attendee_sees_coupon(db, event_row, ana.id) is False        # aún no activados
        await Svc.set_active(db, True)
        event_row = await db.get(Event, 1)
        assert await attendee_sees_coupon(db, event_row, ana.id) is True          # elegida
        assert await attendee_sees_coupon(db, event_row, eva.id) is False         # no elegida: sin aviso
        await Svc.revoke(db, [ana.id])
        assert await attendee_sees_coupon(db, event_row, ana.id) is False         # si se le quita, deja de verlo
    _run(scenario)


def test_el_panel_marca_quien_asistio_para_ayudar_a_elegir():
    async def scenario(db, event):
        pres, virt, nada = await _crear(
            db, event, _attendee(event, "Pres", mode="in_person", checked_in_at=datetime.now(timezone.utc)),
            _attendee(event, "Virt"), _attendee(event, "Nada", mode="in_person"))
        now = datetime.now(timezone.utc)
        db.add(EventLiveSession(event_id=1, attendee_id=virt.id, session_id="s", first_joined_at=now, last_seen_at=now, watch_seconds=60))
        await db.commit()
        rows = {c["attendee_id"]: c["attended"] for c in (await Svc.admin_overview(db))["candidates"]}
        assert rows == {pres.id: True, virt.id: True, nada.id: False}            # entró por la puerta / se conectó a la sala
    _run(scenario)


def test_enlace_de_tienda_conserva_parametros_y_el_codigo_se_normaliza():
    assert build_store_link("https://glointplace.com.co", "GPT-ABCD2345") == "https://glointplace.com.co?cupon=GPT-ABCD2345"
    assert build_store_link("https://tienda.co/promo?utm=evento", "GPT-ABCD2345") == "https://tienda.co/promo?utm=evento&cupon=GPT-ABCD2345"
    assert build_store_link("https://tienda.co/?cupon=VIEJO", "GPT-ABCD2345") == "https://tienda.co/?cupon=GPT-ABCD2345"
    assert normalize_code("  gpt-abcd 2345 ") == "GPT-ABCD2345"


def test_qr_lleva_a_la_tienda_con_el_cupon():
    pytest.importorskip("segno")

    async def scenario(db, event):
        ana, = await _crear(db, event, _attendee(event, "Ana"))
        await Svc.assign(db, [ana.id])
        with pytest.raises(HTTPException) as exc:                                # sin activar no hay QR
            await Svc.get_qr(db, "tok-Ana")
        assert exc.value.status_code == 404
        await Svc.set_active(db, True)
        assert (await Svc.get_qr(db, "tok-Ana"))[:8] == b"\x89PNG\r\n\x1a\n"
    _run(scenario)
