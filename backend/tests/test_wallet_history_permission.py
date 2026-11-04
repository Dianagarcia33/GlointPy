"""H-236: wallets:view_history se aplica en el servidor a /wallets/me/movements, /withdrawals y /recharges."""
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.api.deps import get_current_user
from src.api.v1.endpoints import wallets
from src.core.database import get_db


def make_user(*perms, superuser=False, role_name="rol_prueba"):
    role = SimpleNamespace(name=role_name, permissions=[SimpleNamespace(name=p) for p in perms])
    return SimpleNamespace(id=1, is_superuser=superuser, roles=[role], permissions_override=None)


@pytest.fixture
def client():
    class FakeResult:
        def scalars(self):
            return self

        def all(self):
            return []

        def first(self):
            return None

    class FakeDB:
        async def execute(self, *_a, **_k):
            return FakeResult()

    async def fake_db():
        yield FakeDB()

    app = FastAPI()
    app.include_router(wallets.router, prefix="/wallets")
    app.dependency_overrides[get_db] = fake_db
    holder = {}
    app.dependency_overrides[get_current_user] = lambda: holder["user"]
    c = TestClient(app, raise_server_exceptions=False)
    c.as_user = lambda u: holder.__setitem__("user", u)
    return c


PATHS = ["/wallets/me/movements", "/wallets/me/withdrawals", "/wallets/me/recharges"]


@pytest.mark.parametrize("perms", [(), ("wallets:view",), ("wallets:view", "wallets:view_balance")])
def test_sin_view_history_403(client, perms):
    client.as_user(make_user(*perms))
    for path in PATHS:
        assert client.get(path).status_code == 403, path


def test_con_view_history_200(client):
    client.as_user(make_user("wallets:view_history"))
    for path in PATHS:
        assert client.get(path).status_code == 200, path


def test_superuser_accede(client):
    client.as_user(make_user(superuser=True))
    for path in PATHS:
        assert client.get(path).status_code == 200, path


def test_balance_no_exige_view_history(client):
    client.as_user(make_user("wallets:view"))
    assert client.get("/wallets/me/balance").status_code != 403
