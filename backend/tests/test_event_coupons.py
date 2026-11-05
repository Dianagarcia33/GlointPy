"""Cupones del evento para Gloint Place: un código por asistente, vigencia, validación y canje de un solo uso."""
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
from src.models.event import Event, EventAttendee, EventCoupon  # noqa: E402
from src.services.event_coupon_rules import coupon_is_live  # noqa: E402
from src.services.event_coupon_service import (  # noqa: E402
    EventCouponService as Svc, build_store_link, normalize_code)

_ids = iter(range(1, 1000))
CODE_RE = re.compile(r"^GPT-[A-HJ-NP-Z2-9]{8}$")


def _run(coro_factory):
    async def runner():
        engine = create_async_engine("sqlite+aiosqlite://")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all, tables=[
                Event.__table__, EventAttendee.__table__, EventCoupon.__table__])
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


def _attendee(event, name, mode="virtual", kind="external", status="confirmed"):
    return EventAttendee(id=next(_ids), event_id=event.id, full_name=f"{name} Apellido", email=f"{name.lower()}@x.co",
                         attendee_type=kind, attendance_mode=mode, status=status, access_token=f"tok-{name}")


def test_sin_activar_no_hay_codigo():
    async def scenario(db, event):
        db.add(_attendee(event, "Ana"))
        await db.commit()
        mine = await Svc.get_for_attendee(db, "tok-Ana")
        assert mine["active"] is False and mine["code"] is None and mine["status"] == "inactive"
        assert (await Svc.admin_overview(db))["total"] == 0                   # nada se reparte antes de activar
        assert await Svc.validate(db, "GPT-AAAAAAAA") == {"valid": False, "reason": "not_found"}
    _run(scenario)


def test_activar_da_un_codigo_unico_a_cada_asistente_vigente():
    async def scenario(db, event):
        db.add_all([_attendee(event, "Ana", mode="in_person", kind="investor"), _attendee(event, "Luis"),
                    _attendee(event, "Eva"), _attendee(event, "Fuera", status="cancelled")])
        await db.commit()
        before = datetime.now(timezone.utc)
        overview = await Svc.set_active(db, True)
        assert overview["active"] and overview["live"] and overview["total"] == 3     # el cancelado no recibe
        codes = [c["code"] for c in overview["coupons"]]
        assert len(set(codes)) == 3 and all(CODE_RE.match(c) for c in codes)
        assert {c["full_name"] for c in overview["coupons"]} == {"Ana Apellido", "Luis Apellido", "Eva Apellido"}
        # a quién se le dio: grupo y modalidad visibles
        ana = next(c for c in overview["coupons"] if c["full_name"].startswith("Ana"))
        assert (ana["attendee_type"], ana["attendance_mode"]) == ("investor", "in_person")
        assert overview["counts"]["valid"] == 3
        # vigencia: 48 h desde la activación
        window = overview["expires_at"] - overview["starts_at"]
        assert window == timedelta(hours=48) and overview["starts_at"] >= before.replace(microsecond=0)
        with pytest.raises(HTTPException) as exc:                                      # el cancelado no ve cupón
            await Svc.get_for_attendee(db, "tok-Fuera")
        assert exc.value.status_code == 403
    _run(scenario)


def test_quien_se_inscribe_despues_de_activar_tambien_recibe_su_cupon():
    async def scenario(db, event):
        db.add(_attendee(event, "Ana"))
        await db.commit()
        await Svc.set_active(db, True)
        db.add(_attendee(event, "Tarde"))
        await db.commit()
        mine = await Svc.get_for_attendee(db, "tok-Tarde")
        assert CODE_RE.match(mine["code"]) and mine["status"] == "valid" and mine["active"] is True
        assert (await Svc.admin_overview(db))["total"] == 2
        assert (await Svc.get_for_attendee(db, "tok-Tarde"))["code"] == mine["code"]   # el mismo código siempre
    _run(scenario)


def test_vista_del_asistente_trae_enlace_a_la_tienda_con_el_cupon():
    async def scenario(db, event):
        db.add(_attendee(event, "Ana"))
        await db.commit()
        await Svc.set_active(db, True)
        mine = await Svc.get_for_attendee(db, "tok-Ana")
        assert mine["store_link"] == f"https://glointplace.com.co?cupon={mine['code']}"
        assert mine["percent"] == 20 and mine["expires_at"] is not None
    _run(scenario)


def test_vigencia_vence_y_desactivar_los_deja_inactivos():
    async def scenario(db, event):
        db.add(_attendee(event, "Ana"))
        await db.commit()
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
        for percent, hours, url in [(0, 48, "https://x.co"), (101, 48, "https://x.co"), (20, 0, "https://x.co"),
                                    (20, 721, "https://x.co"), (20, 48, "http://x.co"), (20, 48, "glointplace.com.co"), (20, 48, "")]:
            with pytest.raises(HTTPException) as exc:
                await Svc.update_config(db, percent, hours, url)
            assert exc.value.status_code == 422
        ok = await Svc.update_config(db, 15, 24, "https://tienda.example.com/promo")
        assert (ok["percent"], ok["hours"], ok["store_url"]) == (15, 24, "https://tienda.example.com/promo")
        await Svc.set_active(db, True)
        assert (await Svc.admin_overview(db))["expires_at"] - (await Svc.admin_overview(db))["starts_at"] == timedelta(hours=24)
        with pytest.raises(HTTPException) as exc:
            await Svc.update_config(db, 30, 24, "https://tienda.example.com/promo")      # con cupones activos no se cambia
        assert exc.value.status_code == 400
    _run(scenario)


def test_gloint_place_valida_y_canjea_un_solo_uso():
    async def scenario(db, event):
        db.add_all([_attendee(event, "Ana"), _attendee(event, "Luis")])
        await db.commit()
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
        db.add(_attendee(event, "Ana"))
        await db.commit()
        await Svc.set_active(db, True)
        code = (await Svc.get_for_attendee(db, "tok-Ana"))["code"]
        (await db.get(Event, 1)).coupon_expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        await db.commit()
        with pytest.raises(HTTPException) as exc:
            await Svc.redeem(db, 5, code, "PED-1")
        assert exc.value.status_code == 409 and exc.value.detail["reason"] == "expired"
    _run(scenario)


def test_enlace_de_tienda_conserva_parametros_y_el_codigo_se_normaliza():
    assert build_store_link("https://glointplace.com.co", "GPT-ABCD2345") == "https://glointplace.com.co?cupon=GPT-ABCD2345"
    assert build_store_link("https://tienda.co/promo?utm=evento", "GPT-ABCD2345") == "https://tienda.co/promo?utm=evento&cupon=GPT-ABCD2345"
    assert build_store_link("https://tienda.co/?cupon=VIEJO", "GPT-ABCD2345") == "https://tienda.co/?cupon=GPT-ABCD2345"
    assert normalize_code("  gpt-abcd 2345 ") == "GPT-ABCD2345"


def test_qr_lleva_a_la_tienda_con_el_cupon():
    pytest.importorskip("segno")

    async def scenario(db, event):
        db.add(_attendee(event, "Ana"))
        await db.commit()
        with pytest.raises(HTTPException) as exc:                                # sin activar no hay QR
            await Svc.get_qr(db, "tok-Ana")
        assert exc.value.status_code == 404
        await Svc.set_active(db, True)
        assert (await Svc.get_qr(db, "tok-Ana"))[:8] == b"\x89PNG\r\n\x1a\n"
    _run(scenario)
