"""Confirmación de asistencia presencial al evento Gloint Power Tech (enlace personal + QR único)."""
import asyncio
import os
from datetime import datetime, timezone

import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

for _k, _v in {"DB_HOST": "x", "DB_USER": "x", "DB_PASSWORD": "x", "DB_NAME": "x", "SECRET_KEY": "x"}.items():
    os.environ.setdefault(_k, _v)

from src.core.database import Base  # noqa: E402
from src.models.event import Event, EventAttendee  # noqa: E402
from src.services import event_attendance_service as svc  # noqa: E402
from src.services.event_attendance_service import EventAttendanceService, build_qr_png  # noqa: E402
from src.services.event_service import EventService  # noqa: E402
from src.services.email_template_service import EmailTemplateService  # noqa: E402


def _run(coro_factory):
    """Ejecuta un escenario con una BD SQLite en memoria que solo tiene las tablas del evento."""
    async def runner():
        engine = create_async_engine("sqlite+aiosqlite://")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all, tables=[Event.__table__, EventAttendee.__table__])
        maker = async_sessionmaker(engine, expire_on_commit=False)
        async with maker() as db:
            event = Event(id=1, title="Gloint Power Tech", slug="gloint-power-tech", capacity_in_person=10,
                          event_date=datetime(2026, 11, 20, 15, 0, tzinfo=timezone.utc),
                          location="Auditorio Gloint", virtual_url="https://meet.example/secreto")
            db.add(event)
            await db.commit()
            result = await coro_factory(db, event)
        await engine.dispose()
        return result
    return asyncio.run(runner())


_ids = iter(range(1, 1000))  # SQLite no autoincrementa BIGINT: ids explícitos solo en pruebas


def _attendee(event, name, mode="in_person", status="confirmed", **kw):
    return EventAttendee(id=next(_ids), event_id=event.id, full_name=name, email=f"{name.lower()}@x.co",
                         attendee_type=kw.pop("attendee_type", "external"), attendance_mode=mode,
                         status=status, seats_reserved=kw.pop("seats", 1), **kw)


def test_qr_es_png_y_distinto_por_token():
    a, b = build_qr_png("token-a"), build_qr_png("token-b")
    assert a[:8] == b"\x89PNG\r\n\x1a\n"
    assert a != b


def test_cada_inscrito_recibe_token_unico_al_crearse():
    async def scenario(db, event):
        db.add_all([_attendee(event, "Ana"), _attendee(event, "Luis")])
        await db.commit()
        rows = (await db.execute(EventAttendee.__table__.select())).fetchall()
        tokens = [r.access_token for r in rows]
        assert all(tokens) and len(set(tokens)) == 2
    _run(scenario)


def test_vista_previa_solo_presenciales_vigentes_sin_confirmar_y_no_envia():
    async def scenario(db, event):
        db.add_all([
            _attendee(event, "Pendiente"),
            _attendee(event, "YaConfirmo", attendance_confirmed_at=datetime.now(timezone.utc)),
            _attendee(event, "Virtual", mode="virtual"),
            _attendee(event, "Cancelado", status="cancelled"),
        ])
        await db.commit()
        res = await EventAttendanceService.send_confirmation_emails(db, send=False)
        assert res["recipients"] == 1 and res["emails"] == ["pendiente@x.co"]
        row = (await db.execute(EventAttendee.__table__.select().where(EventAttendee.email == "pendiente@x.co"))).first()
        assert row.attendance_email_sent_at is None
    _run(scenario)


def test_envio_real_incluye_qr_y_enlaces_y_registra_fecha(monkeypatch):
    enviados = []
    monkeypatch.setattr(svc, "SEND_PAUSE_SECONDS", 0)
    monkeypatch.setattr(svc.EmailService, "send_event_attendance_confirmation_email",
                        classmethod(lambda cls, **kw: enviados.append(kw) or True))

    async def scenario(db, event):
        db.add(_attendee(event, "Ana", has_companion=True, companion_name="Luis", seats=2))
        await db.commit()
        res = await EventAttendanceService.send_confirmation_emails(db, send=True)
        assert res["recipients"] == 1
        for _ in range(50):
            await asyncio.sleep(0.05)
            if enviados and not svc._send_in_progress:
                break
        assert len(enviados) == 1
        job = enviados[0]
        assert job["to_email"] == "ana@x.co" and job["companion_name"] == "Luis" and job["seats_reserved"] == 2
        assert job["access_token"] and job["qr_png"][:4] == b"\x89PNG"
        row = (await db.execute(EventAttendee.__table__.select())).first()
        assert row.attendance_email_sent_at is not None
    _run(scenario)


def test_confirmar_y_cambiar_a_virtual_libera_cupos():
    async def scenario(db, event):
        a = _attendee(event, "Ana", has_companion=True, companion_name="Luis", seats=2)
        db.add(a)
        await db.commit()
        assert await EventService.get_occupied_seats(db, event.id) == 2

        res = await EventAttendanceService.confirm_in_person(db, a.access_token)
        assert res["attendance_confirmed_at"] is not None and res["attendance_mode"] == "in_person"

        res = await EventAttendanceService.switch_to_virtual(db, a.access_token)
        assert res["attendance_mode"] == "virtual" and res["companion_name"] is None
        assert res["attendance_confirmed_at"] is None
        assert await EventService.get_occupied_seats(db, event.id) == 0

        with pytest.raises(HTTPException) as exc:
            await EventAttendanceService.confirm_in_person(db, a.access_token)
        assert exc.value.status_code == 400
    _run(scenario)


def test_token_invalido_o_cancelado():
    async def scenario(db, event):
        c = _attendee(event, "Cancelado", status="cancelled")
        db.add(c)
        await db.commit()
        for bad in ("", "no-existe", "x" * 200):
            with pytest.raises(HTTPException) as exc:
                await EventAttendanceService.get_public_status(db, bad)
            assert exc.value.status_code == 404
        with pytest.raises(HTTPException) as exc:
            await EventAttendanceService.get_qr(db, c.access_token)
        assert exc.value.status_code == 404
        with pytest.raises(HTTPException) as exc:
            await EventAttendanceService.switch_to_virtual(db, c.access_token)
        assert exc.value.status_code == 400
    _run(scenario)


def test_correo_usa_plantilla_general_y_no_expone_enlace_virtual():
    subject, html = EmailTemplateService.get_event_attendance_confirmation_template(
        user_name="Ana", event_title="Gloint Power Tech", event_date=datetime(2026, 11, 20, 15, 0),
        location="Auditorio Gloint", seats_reserved=2, companion_name="Luis",
        confirm_url="https://app.test/evento/asistencia/T?accion=confirmar",
        virtual_url="https://app.test/evento/asistencia/T?accion=virtual", qr_cid="qr-asistencia")
    assert "Confirma tu asistencia presencial" in subject
    assert "cid:qr-asistencia" in html
    assert "accion=confirmar" in html and "accion=virtual" in html
    assert "meet.example" not in html
    assert "GLOINT" in html  # layout corporativo común


def test_envio_individual_envia_solo_a_ese_inscrito_y_valida_estado(monkeypatch):
    enviados = []
    monkeypatch.setattr(svc.EmailService, "send_event_attendance_confirmation_email",
                        classmethod(lambda cls, **kw: enviados.append(kw) or True))

    async def scenario(db, event):
        ana = _attendee(event, "Ana", attendance_confirmed_at=datetime.now(timezone.utc))  # ya confirmó: igual se reenvía
        luis = _attendee(event, "Luis")
        virtual = _attendee(event, "Virtual", mode="virtual")
        cancelado = _attendee(event, "Cancelado", status="cancelled")
        db.add_all([ana, luis, virtual, cancelado])
        await db.commit()

        res = await EventAttendanceService.send_confirmation_email_to_attendee(db, ana.id)
        assert res == {"sent": True, "email": "ana@x.co"}
        assert [j["to_email"] for j in enviados] == ["ana@x.co"]
        assert enviados[0]["qr_png"][:4] == b"\x89PNG"
        await db.refresh(ana)
        assert ana.attendance_email_sent_at is not None
        await db.refresh(luis)
        assert luis.attendance_email_sent_at is None  # nadie más recibe nada

        for bad in (virtual.id, cancelado.id):
            with pytest.raises(HTTPException) as exc:
                await EventAttendanceService.send_confirmation_email_to_attendee(db, bad)
            assert exc.value.status_code == 400
        with pytest.raises(HTTPException) as exc:
            await EventAttendanceService.send_confirmation_email_to_attendee(db, 9999)
        assert exc.value.status_code == 404
        assert len(enviados) == 1
    _run(scenario)


def test_envio_individual_falla_con_502_si_el_correo_no_sale_y_no_marca_enviado(monkeypatch):
    monkeypatch.setattr(svc.EmailService, "send_event_attendance_confirmation_email",
                        classmethod(lambda cls, **kw: False))

    async def scenario(db, event):
        a = _attendee(event, "Ana")
        db.add(a)
        await db.commit()
        with pytest.raises(HTTPException) as exc:
            await EventAttendanceService.send_confirmation_email_to_attendee(db, a.id)
        assert exc.value.status_code == 502
        await db.refresh(a)
        assert a.attendance_email_sent_at is None
    _run(scenario)
