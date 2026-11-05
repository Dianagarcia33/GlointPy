"""Sala en vivo del evento Gloint Power Tech: acceso por enlace personal, sesión única y permanencia."""
import asyncio
import base64
import os
from datetime import datetime, timedelta, timezone

import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

for _k, _v in {"DB_HOST": "x", "DB_USER": "x", "DB_PASSWORD": "x", "DB_NAME": "x", "SECRET_KEY": "x"}.items():
    os.environ.setdefault(_k, _v)

from src.core.config import settings  # noqa: E402
from src.core.database import Base  # noqa: E402
from src.models.event import Event, EventAttendee, EventLiveSession  # noqa: E402
from src.services import event_live_service as svc  # noqa: E402
from src.services.event_live_service import EventLiveService, build_playback_token  # noqa: E402

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


def _attendee(event, name, mode="virtual", status="confirmed", **kw):
    return EventAttendee(id=next(_ids), event_id=event.id, full_name=name, email=f"{name.lower()}@x.co",
                         attendee_type=kw.pop("attendee_type", "external"), attendance_mode=mode, status=status,
                         access_token=f"tok-{name}", **kw)


async def _open_room(db):
    await EventLiveService.update_config(db, "abc123PLAYBACK", True)


def test_no_se_entra_con_la_sala_cerrada_ni_sin_playback_id():
    async def scenario(db, event):
        db.add(_attendee(event, "Ana"))
        await db.commit()
        with pytest.raises(HTTPException) as exc:           # sala cerrada
            await EventLiveService.join(db, "tok-Ana")
        assert exc.value.status_code == 409
        with pytest.raises(HTTPException) as exc:           # no se puede abrir sin Playback ID
            await EventLiveService.update_config(db, None, True)
        assert exc.value.status_code == 400
    _run(scenario)


def test_solo_entran_virtuales_vigentes_con_token_valido():
    async def scenario(db, event):
        db.add_all([_attendee(event, "Pres", mode="in_person"), _attendee(event, "Cancel", status="cancelled")])
        await db.commit()
        await _open_room(db)
        for token, code in [("no-existe", 404), ("tok-Pres", 403), ("tok-Cancel", 403)]:
            with pytest.raises(HTTPException) as exc:
                await EventLiveService.join(db, token)
            assert exc.value.status_code == code
    _run(scenario)


def test_entrada_registra_sesion_y_entrega_playback():
    async def scenario(db, event):
        db.add(_attendee(event, "Ana"))
        await db.commit()
        await _open_room(db)
        data = await EventLiveService.join(db, "tok-Ana")
        assert data["playback_id"] == "abc123PLAYBACK" and data["session_id"]
        assert data["playback_token"] is None  # sin clave de firma configurada
        overview = await EventLiveService.get_overview(db)
        assert overview["joined"] == 1 and overview["online_now"] == 1
    _run(scenario)


def test_una_sola_sesion_activa_por_enlace():
    async def scenario(db, event):
        db.add(_attendee(event, "Ana"))
        await db.commit()
        await _open_room(db)
        first = await EventLiveService.join(db, "tok-Ana")
        second = await EventLiveService.join(db, "tok-Ana")  # otro dispositivo
        assert first["session_id"] != second["session_id"]
        with pytest.raises(HTTPException) as exc:
            await EventLiveService.heartbeat(db, "tok-Ana", first["session_id"])
        assert exc.value.status_code == 409
        assert (await EventLiveService.heartbeat(db, "tok-Ana", second["session_id"]))["live_open"] is True
        overview = await EventLiveService.get_overview(db)
        assert overview["attendees"][0]["joins"] == 2
    _run(scenario)


def test_permanencia_suma_solo_huecos_razonables():
    async def scenario(db, event):
        db.add(_attendee(event, "Ana"))
        await db.commit()
        await _open_room(db)
        sid = (await EventLiveService.join(db, "tok-Ana"))["session_id"]
        s = (await db.execute(EventLiveSession.__table__.select())).fetchone()
        sess = await db.get(EventLiveSession, s.id)

        sess.last_seen_at = datetime.now(timezone.utc) - timedelta(seconds=20)
        await db.commit()
        await EventLiveService.heartbeat(db, "tok-Ana", sid)
        await db.refresh(sess)
        assert 19 <= sess.watch_seconds <= 22

        before = sess.watch_seconds
        sess.last_seen_at = datetime.now(timezone.utc) - timedelta(minutes=30)  # pestaña dormida
        await db.commit()
        await EventLiveService.heartbeat(db, "tok-Ana", sid)
        await db.refresh(sess)
        assert sess.watch_seconds == before
    _run(scenario)


def test_desconectado_si_no_hay_latidos_recientes():
    async def scenario(db, event):
        db.add(_attendee(event, "Ana"))
        await db.commit()
        await _open_room(db)
        await EventLiveService.join(db, "tok-Ana")
        s = (await db.execute(EventLiveSession.__table__.select())).fetchone()
        sess = await db.get(EventLiveSession, s.id)
        sess.last_seen_at = datetime.now(timezone.utc) - timedelta(minutes=5)
        await db.commit()
        overview = await EventLiveService.get_overview(db)
        assert overview["joined"] == 1 and overview["online_now"] == 0
    _run(scenario)


def test_token_firmado_de_mux_es_rs256_con_kid_y_playback_id(monkeypatch):
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    pem = key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8,
                            serialization.NoEncryption())
    monkeypatch.setattr(settings, "MUX_SIGNING_KEY_ID", "kid-123")
    monkeypatch.setattr(settings, "MUX_SIGNING_PRIVATE_KEY", base64.b64encode(pem).decode())
    token = build_playback_token("abc123PLAYBACK")
    assert jwt.get_unverified_header(token) == {"alg": "RS256", "typ": "JWT", "kid": "kid-123"}
    claims = jwt.decode(token, key.public_key(), algorithms=["RS256"], audience="v")
    assert claims["sub"] == "abc123PLAYBACK"


def test_modo_simulado_no_firma_token_aunque_haya_clave(monkeypatch):
    monkeypatch.setattr(settings, "MUX_SIGNING_KEY_ID", "kid-123")
    monkeypatch.setattr(settings, "MUX_SIGNING_PRIVATE_KEY", "no-es-una-llave")
    assert build_playback_token(svc.SIMULATED_PLAYBACK_ID) is None

    async def scenario(db, event):
        db.add(_attendee(event, "Ana"))
        await db.commit()
        await EventLiveService.update_config(db, svc.SIMULATED_PLAYBACK_ID, True)
        data = await EventLiveService.join(db, "tok-Ana")
        assert data["playback_id"] == "simulado" and data["playback_token"] is None
    _run(scenario)


def test_playback_id_invalido_se_rechaza():
    async def scenario(db, event):
        for bad in ["abc def", "a/b", "x" * 101]:
            with pytest.raises(HTTPException) as exc:
                await EventLiveService.update_config(db, bad, None)
            assert exc.value.status_code == 422
    _run(scenario)


def test_invitaciones_vista_previa_y_envio_individual(monkeypatch):
    sent = []

    def fake_send(**job):
        sent.append(job)
        return True

    monkeypatch.setattr(svc.EmailService, "send_event_live_invitation_email", staticmethod(fake_send))

    async def scenario(db, event):
        db.add_all([_attendee(event, "Ana"), _attendee(event, "Luis"),
                    _attendee(event, "Pres", mode="in_person"), _attendee(event, "Cancel", status="cancelled")])
        await db.commit()
        preview = await EventLiveService.send_invitations(db, False)
        assert preview["recipients"] == 2 and sorted(preview["emails"]) == ["ana@x.co", "luis@x.co"]
        assert sent == []

        result = await EventLiveService.send_invitation_to_attendee(db, 1)  # Ana (id 1 en este escenario)
        assert result == {"sent": True, "email": "ana@x.co"}
        assert sent[0]["access_token"] == "tok-Ana"
        with pytest.raises(HTTPException) as exc:           # presencial: no aplica
            await EventLiveService.send_invitation_to_attendee(db, 3)
        assert exc.value.status_code == 400

        after = await EventLiveService.send_invitations(db, False)
        assert after["emails"] == ["luis@x.co"]  # Ana ya fue invitada
    # ids de _attendee son globales: se reinician para que Ana sea 1
    global _ids
    _ids = iter(range(1, 1000))
    _run(scenario)


def test_plantilla_de_invitacion_lleva_enlace_personal():
    from src.services.email_template_service import EmailTemplateService
    subject, html = EmailTemplateService.get_event_live_invitation_template(
        "Ana", "Gloint Power Tech", datetime(2026, 11, 20, 15, 0), "https://x.co/evento/en-vivo/tok-Ana")
    assert "transmisión en vivo" in subject.lower()
    assert "https://x.co/evento/en-vivo/tok-Ana" in html and "intransferible" in html


def test_mi_acceso_entrega_enlace_y_estado_solo_de_la_propia_inscripcion():
    """Un inversionista con sesión ve su enlace personal y si la sala/preguntas/encuesta están abiertas."""
    from types import SimpleNamespace

    async def scenario(db, event):
        mine = _attendee(event, "Ana", attendee_type="investor", user_id=7)
        other = _attendee(event, "Luis", attendee_type="investor", user_id=8)
        db.add_all([mine, other])
        await db.commit()
        from src.services.event_attendance_service import EventAttendanceService
        user = SimpleNamespace(id=7, email="ana@x.co", document_number=None, document_id=None)

        closed = await EventAttendanceService.get_my_access(db, user)
        assert closed.access_token == "tok-Ana" and closed.attendance_mode == "virtual"
        assert (closed.live_open, closed.questions_open, closed.survey_open) == (False, False, False)

        event_row = await db.get(Event, 1)
        event_row.live_open, event_row.questions_open, event_row.survey_open = True, True, True
        await db.commit()
        opened = await EventAttendanceService.get_my_access(db, user)
        assert (opened.live_open, opened.questions_open, opened.survey_open) == (True, True, True)

        stranger = SimpleNamespace(id=99, email="nadie@x.co", document_number=None, document_id=None)
        assert await EventAttendanceService.get_my_access(db, stranger) is None   # sin inscripción: nada
    _run(scenario)
