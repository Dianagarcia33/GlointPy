"""Citas del calendario con invitados, enlace virtual, sala reservada y edición solo por el organizador."""
import asyncio
import datetime
from types import SimpleNamespace as NS

import pytest
from fastapi import HTTPException

from src.services import crm_calendar_service as mod
from src.services.crm_calendar_service import (
    CRMCalendarService,
    build_event_ics,
    normalize_attendees,
    parse_vevent_ics,
)
from src.services.email_service import EmailService
from src.services.room_service import RoomService

START = datetime.datetime(2030, 3, 15, 10, 0)
END = datetime.datetime(2030, 3, 15, 11, 0)
BASE = "https://caldav.test:2080"
CAL = f"{BASE}/rpc/calendars/ana@gloint.co/calendar:default/"


def _user(email="ana@gloint.co", uid=5):
    return NS(id=uid, name="Ana Organizadora", email=email, imap_password="x")


# ----------------------------------------------------------------------------- .ics

def test_ics_conserva_hora_colombia_invitados_y_enlace():
    ics = build_event_ics(
        uid="gloint_abc", title="Comité; ventas, Q1", start=START, end=END,
        organizer_name="Ana", organizer_email="ana@gloint.co",
        description="Línea 1\nLínea 2", location="Sala Norte (Piso 2)",
        url="https://meet.google.com/abc-defg-hij",
        attendees=[{"name": "Luis: Pérez", "email": "luis@gloint.co"}, {"name": "", "email": "ext@cliente.com"}],
        method="REQUEST", modality="virtual", room_id=7, sequence=2,
    )
    assert "METHOD:REQUEST" in ics and "BEGIN:VTIMEZONE" in ics
    assert "DTSTART;TZID=America/Bogota:20300315T100000" in ics
    assert all(len(line.encode()) <= 75 for line in ics.split("\r\n"))

    ev = parse_vevent_ics(ics)[0]
    assert ev["start"] == "2030-03-15T10:00:00" and ev["end"] == "2030-03-15T11:00:00"
    assert ev["title"] == "Comité; ventas, Q1"
    assert ev["description"] == "Línea 1\nLínea 2"
    assert ev["url"] == "https://meet.google.com/abc-defg-hij"
    assert [a["email"] for a in ev["attendees"]] == ["luis@gloint.co", "ext@cliente.com"]
    assert ev["organizer"]["email"] == "ana@gloint.co"
    assert (ev["modality"], ev["room_id"], ev["sequence"]) == ("virtual", 7, 2)


def test_invitados_se_validan_y_deduplican():
    out = normalize_attendees(
        [{"email": " Luis@Gloint.co "}, {"email": "luis@gloint.co"}, {"email": "ana@gloint.co"}, {"email": ""}],
        exclude_email="ana@gloint.co",
    )
    assert out == [{"name": "luis@gloint.co", "email": "luis@gloint.co"}]
    with pytest.raises(ValueError):
        normalize_attendees([{"email": "no-es-correo"}])
    with pytest.raises(ValueError):
        normalize_attendees([{"email": "a@b.co\r\nATTENDEE:mailto:x@y.z"}])


def test_solo_el_organizador_puede_editar():
    ana, luis = _user(), _user("luis@gloint.co", 6)
    ev = {"organizer": {"name": "Ana", "email": "ANA@gloint.co"}}
    assert CRMCalendarService.is_organizer(ana, ev)
    assert not CRMCalendarService.is_organizer(luis, ev)
    assert CRMCalendarService.is_organizer(luis, {"organizer": None})  # cita propia creada en el webmail


# ----------------------------------------------------------------------------- flujo completo (CalDAV y BD simulados)

class FakeResp:
    def __init__(self, status_code=200, text=""):
        self.status_code, self.text = status_code, text


class FakeClient:
    """Servidor CalDAV en memoria."""
    def __init__(self, store, put_status=201):
        self.store, self.put_status = store, put_status

    async def put(self, url, headers=None, content=None):
        if self.put_status in (200, 201, 204):
            self.store[url] = content.decode() if isinstance(content, bytes) else content
        return FakeResp(self.put_status, "boom")

    async def get(self, url):
        return FakeResp(200, self.store[url]) if url in self.store else FakeResp(404)

    async def delete(self, url, headers=None):
        return FakeResp(204 if self.store.pop(url, None) is not None else 404)

    async def aclose(self):
        pass


class FakeDb:
    def __init__(self):
        self.commits = self.rollbacks = 0
        self.added = []

    def add(self, o):
        self.added.append(o)

    async def commit(self):
        self.commits += 1

    async def rollback(self):
        self.rollbacks += 1

    async def flush(self):
        pass


@pytest.fixture
def env(monkeypatch):
    store, sent, room_calls = {}, [], []
    state = NS(store=store, sent=sent, room_calls=room_calls, put_status=201, reservation=None, room_error=None)

    async def fake_client(cls, user, password_override=None):
        return FakeClient(store, state.put_status), "ana@gloint.co", "x"

    async def fake_discover(cls, user, password_override=None):
        return [CAL]

    async def fake_sync(db, user_id, uid, data, cancel_reason=""):
        room_calls.append((uid, data))
        if data is None:
            return None, None
        if state.room_error:
            raise state.room_error
        return NS(id=99), NS(id=data.room_id, name="Sala Norte", location="Piso 2")

    async def fake_get_res(db, uid):
        return state.reservation

    def fake_send(**kw):
        sent.append(kw)
        return True

    monkeypatch.setattr(CRMCalendarService, "_get_base_url", staticmethod(lambda: BASE))
    monkeypatch.setattr(CRMCalendarService, "_get_auth_client", classmethod(fake_client))
    monkeypatch.setattr(CRMCalendarService, "discover_calendars", classmethod(fake_discover))
    monkeypatch.setattr(RoomService, "sync_calendar_reservation", staticmethod(fake_sync))
    monkeypatch.setattr(RoomService, "get_calendar_reservation", staticmethod(fake_get_res))
    monkeypatch.setattr(EmailService, "send_crm_custom_email", staticmethod(fake_send))
    return state


def _create(env, db=None, **kw):
    args = dict(
        user=_user(), db=db or FakeDb(), title="Comité comercial",
        start_datetime="2030-03-15T10:00:00", end_datetime="2030-03-15T11:00:00",
    )
    args.update(kw)
    return asyncio.run(CRMCalendarService.create_event(**args))


def test_cita_virtual_envia_invitacion_con_el_meet(env):
    out = _create(env, meeting_url="https://meet.google.com/abc-defg-hij",
                  attendees=[{"email": "luis@gloint.co", "name": "Luis"}, {"email": "ext@cliente.com"}])
    assert out["modality"] == "virtual" and out["invitations"]["sent"] == ["luis@gloint.co", "ext@cliente.com"]
    assert [m["to_email"] for m in env.sent] == ["luis@gloint.co", "ext@cliente.com"]
    mail = env.sent[0]
    assert mail["subject"] == "Invitación: Comité comercial"
    assert "https://meet.google.com/abc-defg-hij" in mail["html_content"] and "Unirse a la reunión" in mail["html_content"]
    att = mail["attachments"][0]
    assert att["filename"].endswith(".ics") and "METHOD:REQUEST" in att["content"]
    assert "URL:https://meet.google.com/abc-defg-hij" in att["content"]
    stored = parse_vevent_ics(next(iter(env.store.values())))[0]
    assert stored["url"] == "https://meet.google.com/abc-defg-hij" and len(stored["attendees"]) == 2


def test_cita_presencial_reserva_la_sala(env):
    db = FakeDb()
    out = _create(env, db=db, room_id=7, attendees=[{"email": "luis@gloint.co"}])
    uid, data = env.room_calls[0]
    assert uid == out["uid"] and data.room_id == 7 and data.attendees_count == 2
    assert data.start_time == START and data.end_time == END
    assert out["location"] == "Sala Norte (Piso 2)" and out["modality"] == "presencial" and out["room_id"] == 7
    assert db.commits == 1 and db.rollbacks == 0
    assert "Sala Norte (Piso 2)" in env.sent[0]["html_content"]


def test_sala_ocupada_no_crea_la_cita_ni_envia_correos(env):
    env.room_error = HTTPException(status_code=400, detail="La sala ya tiene una reserva en ese horario")
    db = FakeDb()
    with pytest.raises(HTTPException):
        _create(env, db=db, room_id=7, attendees=[{"email": "luis@gloint.co"}])
    assert env.store == {} and env.sent == [] and db.rollbacks == 1 and db.commits == 0


def test_si_falla_el_calendario_se_deshace_la_reserva(env):
    env.put_status = 500
    db = FakeDb()
    with pytest.raises(Exception):
        _create(env, db=db, room_id=7, attendees=[{"email": "luis@gloint.co"}])
    assert db.rollbacks == 1 and db.commits == 0 and env.sent == []


def test_editar_avisa_a_nuevos_actuales_y_retirados(env):
    out = _create(env, meeting_url="https://meet.google.com/abc-defg-hij",
                  attendees=[{"email": "luis@gloint.co"}, {"email": "sale@gloint.co"}])
    env.sent.clear()
    res = asyncio.run(CRMCalendarService.update_event(
        user=_user(), db=FakeDb(), event_uid=out["uid"], calendar_url=CAL, title="Comité comercial",
        start_datetime="2030-03-15T15:00:00", end_datetime="2030-03-15T16:00:00",
        meeting_url="https://meet.google.com/abc-defg-hij",
        attendees=[{"email": "luis@gloint.co"}, {"email": "nueva@gloint.co"}],
    ))
    assert res["success"]
    kinds = {m["to_email"]: m["subject"].split(":")[0] for m in env.sent}
    assert kinds == {"nueva@gloint.co": "Invitación", "sale@gloint.co": "Cancelada", "luis@gloint.co": "Actualizada"}
    stored = parse_vevent_ics(next(iter(env.store.values())))[0]
    assert stored["start"] == "2030-03-15T15:00:00" and stored["sequence"] == 1


def test_editar_sin_cambios_relevantes_no_reenvia(env):
    out = _create(env, meeting_url="https://meet.google.com/abc-defg-hij", attendees=[{"email": "luis@gloint.co"}])
    env.sent.clear()
    asyncio.run(CRMCalendarService.update_event(
        user=_user(), db=FakeDb(), event_uid=out["uid"], calendar_url=CAL, title="Comité comercial",
        start_datetime="2030-03-15T10:00:00", end_datetime="2030-03-15T11:00:00", description="Notas nuevas",
        meeting_url="https://meet.google.com/abc-defg-hij", attendees=[{"email": "luis@gloint.co"}],
    ))
    assert env.sent == []


def test_un_invitado_no_puede_editar(env):
    out = _create(env, attendees=[{"email": "luis@gloint.co"}], location="Oficina")
    before = dict(env.store)
    env.sent.clear()
    with pytest.raises(PermissionError):
        asyncio.run(CRMCalendarService.update_event(
            user=_user("luis@gloint.co", 6), db=FakeDb(), event_uid=out["uid"], calendar_url=CAL,
            title="Hackeada", start_datetime="2030-03-15T10:00:00", end_datetime="2030-03-15T11:00:00",
        ))
    assert env.store == before and env.sent == []


def test_aceptar_invitacion_conserva_al_organizador_original(env):
    luis = _user("luis@gloint.co", 6)
    out = _create(env, user=luis, organizer={"name": "Ana", "email": "ana@gloint.co"},
                  attendees=[{"email": "luis@gloint.co"}], room_id=7, send_invitations=False)
    stored = parse_vevent_ics(next(iter(env.store.values())))[0]
    assert stored["organizer"]["email"] == "ana@gloint.co"
    assert not CRMCalendarService.is_organizer(luis, stored)
    assert env.sent == [] and out["room_id"] is None  # un invitado no reserva sala ni reenvía invitaciones


def test_eliminar_libera_la_sala_y_avisa(env):
    out = _create(env, room_id=7, attendees=[{"email": "luis@gloint.co"}])
    env.sent.clear()
    env.reservation = NS(user_id=5, status="confirmed", cancelled_reason=None)
    db = FakeDb()
    res = asyncio.run(CRMCalendarService.delete_event(user=_user(), event_uid=out["uid"], calendar_url=CAL, db=db))
    assert res["success"] and env.store == {}
    assert env.reservation.status == "cancelled" and db.commits == 1
    assert env.sent[0]["subject"].startswith("Cancelada") and "METHOD:CANCEL" in env.sent[0]["attachments"][0]["content"]


def test_invitado_que_elimina_solo_la_quita_de_su_calendario(env):
    luis = _user("luis@gloint.co", 6)
    out = _create(env, user=luis, organizer={"name": "Ana", "email": "ana@gloint.co"},
                  attendees=[{"email": "luis@gloint.co"}, {"email": "otro@gloint.co"}], send_invitations=False)
    env.reservation = NS(user_id=5, status="confirmed", cancelled_reason=None)
    asyncio.run(CRMCalendarService.delete_event(user=luis, event_uid=out["uid"], calendar_url=CAL, db=FakeDb()))
    assert env.store == {} and env.sent == [] and env.reservation.status == "confirmed"


def test_calendar_url_ajena_al_servidor_se_rechaza(env):
    with pytest.raises(ValueError):
        asyncio.run(CRMCalendarService.delete_event(
            user=_user(), event_uid="gloint_x", calendar_url="https://evil.example/cal/", db=FakeDb()))
