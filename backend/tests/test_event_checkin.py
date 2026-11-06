"""Control de entrada presencial por QR y lista unificada de asistencia."""
import asyncio
import os
from datetime import datetime, timezone

import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

for _k, _v in {"DB_HOST": "x", "DB_USER": "x", "DB_PASSWORD": "x", "DB_NAME": "x", "SECRET_KEY": "x"}.items():
    os.environ.setdefault(_k, _v)

from src.core.database import Base  # noqa: E402
from src.models.event import Event, EventAttendee, EventLiveSession  # noqa: E402
from src.services.event_attendance_service import QR_PREFIX, build_qr_png, qr_content  # noqa: E402,F401
from src.services.event_checkin_service import _normalize_code  # noqa: E402
from src.services.event_checkin_service import EventCheckinService as Svc  # noqa: E402

_ids = iter(range(1, 1000))


def _run(coro_factory):
    async def runner():
        engine = create_async_engine("sqlite+aiosqlite://")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all, tables=[
                Event.__table__, EventAttendee.__table__, EventLiveSession.__table__])
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


def _attendee(event, name, mode="in_person", kind="external", status="confirmed", seats=1, companion=None):
    return EventAttendee(id=next(_ids), event_id=event.id, full_name=name, email=f"{name.lower()}@x.co",
                         attendee_type=kind, attendance_mode=mode, status=status, seats_reserved=seats,
                         has_companion=bool(companion), companion_name=companion, access_token=f"tok-{name}")


def test_escanear_qr_registra_entrada_y_el_segundo_escaneo_avisa():
    async def scenario(db, event):
        db.add(_attendee(event, "Ana", seats=2, companion="Pedro"))
        await db.commit()
        first = await Svc.check_in_by_code(db, f"{QR_PREFIX}tok-Ana", user_id=7)
        assert first["result"] == "checked_in"
        assert first["attendee"]["seats_reserved"] == 2 and first["attendee"]["companion_name"] == "Pedro"
        second = await Svc.check_in_by_code(db, f"{QR_PREFIX}tok-Ana", user_id=8)
        assert second["result"] == "already_checked_in"
        # no se duplica ni se pisa (SQLite devuelve la fecha sin zona: se compara sin ella)
        assert second["attendee"]["checked_in_at"].replace(tzinfo=None) == first["attendee"]["checked_in_at"].replace(tzinfo=None)
        row = (await db.execute(EventAttendee.__table__.select())).fetchone()
        assert row.checked_in_by == 7
    _run(scenario)


def test_acepta_token_suelto_o_enlace_y_rechaza_codigos_invalidos():
    async def scenario(db, event):
        db.add_all([_attendee(event, "Ana"), _attendee(event, "Luis")])
        await db.commit()
        assert (await Svc.check_in_by_code(db, "  tok-Ana  ", None))["result"] == "checked_in"
        link = "https://app.gloint.com/evento/asistencia/tok-Luis?accion=confirmar"
        assert (await Svc.check_in_by_code(db, link, None))["attendee"]["full_name"] == "Luis"
        for bad in ["", "   ", "no-existe", "x" * 65]:
            with pytest.raises(HTTPException) as exc:
                await Svc.check_in_by_code(db, bad, None)
            assert exc.value.status_code == 404
    _run(scenario)


def test_virtuales_y_cancelados_no_ingresan():
    async def scenario(db, event):
        db.add_all([_attendee(event, "Virt", mode="virtual"), _attendee(event, "Cancel", status="cancelled")])
        await db.commit()
        for code in ("tok-Virt", "tok-Cancel"):
            with pytest.raises(HTTPException) as exc:
                await Svc.check_in_by_code(db, code, None)
            assert exc.value.status_code == 403
    _run(scenario)


def test_registro_manual_y_deshacer():
    async def scenario(db, event):
        a = _attendee(event, "Ana")
        db.add(a)
        await db.commit()
        assert (await Svc.check_in_by_id(db, a.id, 5))["result"] == "checked_in"
        await Svc.undo_check_in(db, a.id)
        assert (await Svc.get_attendance(db))["in_person_checked_in"] == 0
        assert (await Svc.check_in_by_id(db, a.id, 5))["result"] == "checked_in"
        with pytest.raises(HTTPException) as exc:
            await Svc.check_in_by_id(db, 9999, 5)
        assert exc.value.status_code == 404
    _run(scenario)


def test_lista_unificada_de_los_cuatro_grupos():
    async def scenario(db, event):
        pi = _attendee(event, "InvPres", kind="investor", seats=2, companion="Acomp")
        pe = _attendee(event, "ExtPres")
        vi = _attendee(event, "InvVirt", mode="virtual", kind="investor")
        ve = _attendee(event, "ExtVirt", mode="virtual")
        ve_no = _attendee(event, "ExtVirtNo", mode="virtual")
        cancelled = _attendee(event, "Fuera", status="cancelled")
        db.add_all([pi, pe, vi, ve, ve_no, cancelled])
        await db.commit()
        now = datetime.now(timezone.utc)
        db.add_all([
            EventLiveSession(event_id=1, attendee_id=vi.id, session_id="s1", first_joined_at=now, last_seen_at=now, watch_seconds=600),
            EventLiveSession(event_id=1, attendee_id=ve.id, session_id="s2", first_joined_at=now, last_seen_at=now, watch_seconds=90),
        ])
        await db.commit()
        await Svc.check_in_by_id(db, pi.id, 1)   # entra el inversionista presencial; el externo presencial no

        r = await Svc.get_attendance(db)
        assert len(r["attendees"]) == 5   # el cancelado no cuenta
        assert r["groups"] == {
            "investor:in_person": {"registered": 1, "attended": 1},
            "investor:virtual": {"registered": 1, "attended": 1},
            "external:in_person": {"registered": 1, "attended": 0},
            "external:virtual": {"registered": 2, "attended": 1},
        }
        assert (r["in_person_registered"], r["in_person_checked_in"]) == (2, 1)
        assert (r["seats_expected"], r["seats_checked_in"]) == (3, 2)
        virt = next(x for x in r["attendees"] if x["full_name"] == "InvVirt")
        assert virt["attended"] is True and virt["live_watch_minutes"] == 10.0
    _run(scenario)


def test_el_qr_lleva_un_enlace_y_la_puerta_extrae_el_codigo_de_el(monkeypatch):
    """El QR ya no es texto suelto: abre la página del inscrito, y el escáner de entrada sigue leyendo el código."""
    from src.services import event_attendance_service as svc
    monkeypatch.setattr(svc.settings, "FRONTEND_URL", "https://pruebas.gloint.com.co/")
    content = qr_content("AbC-123_xyz")
    assert content == "https://pruebas.gloint.com.co/evento/asistencia/AbC-123_xyz"      # sin doble barra
    assert _normalize_code(content) == "AbC-123_xyz"                                       # formato nuevo
    assert _normalize_code(f"{QR_PREFIX}AbC-123_xyz") == "AbC-123_xyz"                     # QR viejos ya enviados
    assert _normalize_code("AbC-123_xyz") == "AbC-123_xyz"                                 # código suelto (lector USB)


def test_escanear_el_qr_nuevo_registra_la_entrada(monkeypatch):
    from src.services import event_attendance_service as svc
    monkeypatch.setattr(svc.settings, "FRONTEND_URL", "https://pruebas.gloint.com.co")

    async def scenario(db, event):
        db.add(_attendee(event, "Ana"))
        await db.commit()
        result = await Svc.check_in_by_code(db, qr_content("tok-Ana"), user_id=3)
        assert result["result"] == "checked_in" and result["attendee"]["full_name"] == "Ana"
    _run(scenario)
