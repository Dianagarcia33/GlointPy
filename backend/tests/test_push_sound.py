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


def fake_firebase(monkeypatch):
    """Sustituye firebase_admin.messaging por un doble que guarda lo que se le pasa."""
    sent = []

    class Record:
        def __init__(self, **kwargs):
            self.__dict__.update(kwargs)

    messaging = ModuleType("firebase_admin.messaging")
    messaging.Notification = Record
    messaging.Aps = Record
    messaging.APNSPayload = Record
    messaging.APNSConfig = Record
    messaging.MulticastMessage = Record
    messaging.send_each_for_multicast = lambda message: (
        sent.append(message) or SimpleNamespace(success_count=len(message.tokens), failure_count=0)
    )
    package = ModuleType("firebase_admin")
    package.messaging = messaging
    monkeypatch.setitem(sys.modules, "firebase_admin", package)
    monkeypatch.setitem(sys.modules, "firebase_admin.messaging", messaging)
    monkeypatch.setattr(push, "_firebase_initialized", True)
    return sent


def send(monkeypatch, tokens=("tok-ios",)):
    sent = fake_firebase(monkeypatch)
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
