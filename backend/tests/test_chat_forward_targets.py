"""Reenviar un mensaje: los destinos deben ser chats en los que participa quien reenvía y personas que existan."""
import asyncio
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from src.api.v1.endpoints import chat as chat_endpoints
from src.api.v1.endpoints.chat import ForwardMessageRequest, forward_message_endpoint


def run(coro):
    return asyncio.run(coro)


class FakeResult:
    def __init__(self, first=None, rows=None):
        self._first, self._rows = first, rows or []

    def scalars(self):
        return self

    def first(self):
        return self._first

    def all(self):
        return self._rows


class FakeDB:
    """Devuelve, en orden, los resultados preparados para cada consulta."""

    def __init__(self, *results):
        self.results = list(results)

    async def execute(self, *_args, **_kwargs):
        return self.results.pop(0)


USER = SimpleNamespace(id=1)
ORIGINAL = SimpleNamespace(id=10, room_id=5)


@pytest.fixture
def forwarded(monkeypatch):
    """Registra las llamadas al servicio de reenvío. Por defecto: participa en las salas 5 y 6, sin permiso de administrar."""
    calls = []

    async def is_participant(_db, room_id, _user_id):
        return room_id in {5, 6}

    async def forward_message(**kwargs):
        calls.append(kwargs)
        return [{"id": 1}] * (len(kwargs["target_room_ids"]) + len(kwargs["target_user_ids"]))

    monkeypatch.setattr(chat_endpoints.ChatService, "is_participant", staticmethod(is_participant))
    monkeypatch.setattr(chat_endpoints.ChatService, "forward_message", staticmethod(forward_message))
    monkeypatch.setattr(chat_endpoints.PBACEngine, "has_permission", staticmethod(lambda *_a, **_k: False))
    return calls


def call(db, **body):
    return run(forward_message_endpoint(10, ForwardMessageRequest(**body), USER, db))


def test_reenvia_a_chats_donde_participa(forwarded):
    result = call(FakeDB(FakeResult(first=ORIGINAL)), target_room_ids=[5, 6])
    assert result["success"] and result["forwarded_count"] == 2
    assert len(forwarded) == 1


def test_rechaza_un_chat_de_destino_ajeno(forwarded):
    with pytest.raises(HTTPException) as exc:
        call(FakeDB(FakeResult(first=ORIGINAL)), target_room_ids=[5, 99])
    assert exc.value.status_code == 403 and forwarded == []   # no se reenvió ni a las salas válidas


def test_quien_administra_el_chat_puede_reenviar_a_cualquier_sala(forwarded, monkeypatch):
    monkeypatch.setattr(chat_endpoints.PBACEngine, "has_permission", staticmethod(lambda *_a, **_k: True))
    result = call(FakeDB(FakeResult(first=ORIGINAL)), target_room_ids=[99])
    assert result["forwarded_count"] == 1


def test_rechaza_personas_que_no_existen(forwarded):
    db = FakeDB(FakeResult(first=ORIGINAL), FakeResult(rows=[7]))   # piden 7 y 8, solo existe el 7
    with pytest.raises(HTTPException) as exc:
        call(db, target_user_ids=[7, 8])
    assert exc.value.status_code == 404 and forwarded == []


def test_reenvia_a_personas_que_existen(forwarded):
    db = FakeDB(FakeResult(first=ORIGINAL), FakeResult(rows=[7, 8]))
    assert call(db, target_user_ids=[7, 8])["forwarded_count"] == 2


def test_ignora_su_propio_id_entre_los_destinos(forwarded):
    # Su propio id no se consulta ni cuenta como persona de destino: no hace falta una segunda consulta
    result = call(FakeDB(FakeResult(first=ORIGINAL)), target_user_ids=[1])
    assert result["success"] and len(forwarded) == 1


def test_mensaje_original_inexistente_da_404(forwarded):
    with pytest.raises(HTTPException) as exc:
        call(FakeDB(FakeResult(first=None)), target_room_ids=[5])
    assert exc.value.status_code == 404
