"""Los avisos push de iOS deben pedir sonido (aps.sound = "default"); sin él llegan en silencio."""
import asyncio
import sys
from types import ModuleType, SimpleNamespace

from src.services import push_notification_service as push


class FakeDB:
    def __init__(self, tokens):
        self.tokens = tokens

    async def execute(self, *_a, **_k):
        rows = [SimpleNamespace(token=t) for t in self.tokens]
        return SimpleNamespace(scalars=lambda: SimpleNamespace(all=lambda: rows))


def fake_firebase(monkeypatch, fail_with=None):
    """Sustituye firebase_admin.messaging por un doble que guarda lo que se le pasa (y puede fallar con `fail_with`)."""
    sent = []

    def respond(message):
        sent.append(message)
        ok = fail_with is None
        items = [SimpleNamespace(success=ok, exception=fail_with) for _ in message.tokens]
        return SimpleNamespace(
            success_count=len(items) if ok else 0, failure_count=0 if ok else len(items), responses=items
        )

    class Record:
        def __init__(self, **kwargs):
            self.__dict__.update(kwargs)

    messaging = ModuleType("firebase_admin.messaging")
    messaging.Notification = Record
    messaging.Aps = Record
    messaging.APNSPayload = Record
    messaging.APNSConfig = Record
    messaging.MulticastMessage = Record
    messaging.send_each_for_multicast = respond
    package = ModuleType("firebase_admin")
    package.messaging = messaging
    monkeypatch.setitem(sys.modules, "firebase_admin", package)
    monkeypatch.setitem(sys.modules, "firebase_admin.messaging", messaging)
    monkeypatch.setattr(push, "_firebase_initialized", True)
    return sent


def send(monkeypatch, tokens=("tok-ios",), fail_with=None):
    sent = fake_firebase(monkeypatch, fail_with)
    result = asyncio.run(push.PushNotificationService.send_push_to_user(
        FakeDB(tokens), user_id=1, title="Ana", body="Hola", data={"type": "chat", "room_id": "5"}
    ))
    return result, sent


def test_el_aviso_pide_sonido_en_ios(monkeypatch):
    result, sent = send(monkeypatch)
    assert result["sent_count"] == 1 and len(sent) == 1
    assert sent[0].apns.payload.aps.sound == "default"


def test_el_sonido_no_altera_el_contenido(monkeypatch):
    _, sent = send(monkeypatch, tokens=("a", "b"))
    message = sent[0]
    assert message.tokens == ["a", "b"]
    assert (message.notification.title, message.notification.body) == ("Ana", "Hola")
    assert message.data == {"type": "chat", "room_id": "5"}


def test_registra_el_motivo_cuando_firebase_rechaza_un_aviso(monkeypatch, caplog):
    with caplog.at_level("WARNING"):
        result, _ = send(monkeypatch, tokens=("abcdef123456",), fail_with=Exception("APNs auth key invalid"))
    assert result["failed_count"] == 1
    assert "APNs auth key invalid" in caplog.text and "...123456" in caplog.text
    assert "abcdef123456" not in caplog.text          # el token completo no se escribe en el log


def test_registra_cuando_el_usuario_no_tiene_dispositivos(monkeypatch, caplog):
    fake_firebase(monkeypatch)
    with caplog.at_level("INFO"):
        result = asyncio.run(push.PushNotificationService.send_push_to_user(FakeDB([]), 7, "t", "b"))
    assert result["sent_count"] == 0
    assert "usuario 7 no tiene dispositivos" in caplog.text
