"""H-223: shares:access, credits:view y credits:request se aplican en el servidor (PBAC)."""
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.api.deps import get_current_user
from src.api.v1.endpoints import credits, share_market
from src.core.database import get_db
from src.services.credit_service import CreditService
from src.services.share_market_service import ShareMarketService


def make_user(*perms, superuser=False, role_name="rol_prueba"):
    role = SimpleNamespace(name=role_name, permissions=[SimpleNamespace(name=p) for p in perms])
    return SimpleNamespace(id=1, is_superuser=superuser, roles=[role], permissions_override=None)


@pytest.fixture
def client(monkeypatch):
    async def fake_db():
        yield None

    async def empty(*_a, **_k):
        return []

    monkeypatch.setattr(ShareMarketService, "get_price_history", empty)
    monkeypatch.setattr(ShareMarketService, "get_active_listings", empty)
    monkeypatch.setattr(ShareMarketService, "get_all_trade_orders", empty)
    monkeypatch.setattr(ShareMarketService, "get_user_movements", empty)

    app = FastAPI()
    app.include_router(share_market.router, prefix="/shares-market")
    app.include_router(credits.router, prefix="/credits")
    app.dependency_overrides[get_db] = fake_db
    holder = {}
    app.dependency_overrides[get_current_user] = lambda: holder["user"]
    c = TestClient(app, raise_server_exceptions=False)  # la BD falsa puede dar 500 en el handler: lo que importa es no recibir 403
    c.as_user = lambda u: holder.__setitem__("user", u)
    return c


SHARES_READS = ["price-history", "listings", "my-orders", "movements"]
SHARES_WRITES = [("post", "listings", {}), ("post", "buy-instant", {}), ("post", "buy-surplus", {})]
CREDITS_ENDPOINTS = [("get", "me", {}), ("get", "me/bank-accounts", {}), ("post", "me/request", {}), ("get", "config", {}), ("get", "simulate", {})]


@pytest.mark.parametrize("perms", [("wallets:view",), ("wallets:view", "dashboard:view_investments"), ()])
def test_shares_sin_permiso_403_antes_de_validar(client, perms):
    client.as_user(make_user(*perms))
    for path in SHARES_READS:
        assert client.get(f"/shares-market/{path}").status_code == 403, path
    for method, path, body in SHARES_WRITES:
        assert getattr(client, method)(f"/shares-market/{path}", json=body).status_code == 403, path
    assert client.delete("/shares-market/listings/1").status_code == 403


def test_shares_con_permiso_200(client):
    client.as_user(make_user("shares:access"))
    for path in SHARES_READS:
        assert client.get(f"/shares-market/{path}").status_code == 200, path
    # con permiso ya se llega a la validación del cuerpo (422), no al 403
    assert client.post("/shares-market/listings", json={}).status_code == 422


def test_shares_lectura_admin_de_acciones_se_conserva(client):
    client.as_user(make_user("admin.shares.manage"))
    assert client.get("/shares-market/price-history").status_code == 200
    # pero operar el mercado sigue exigiendo shares:access
    assert client.post("/shares-market/listings", json={}).status_code == 403


def test_shares_superadmin_y_superuser_acceden(client):
    for u in (make_user(superuser=True), make_user(role_name="SuperAdmin")):
        client.as_user(u)
        assert client.get("/shares-market/price-history").status_code == 200
        assert client.post("/shares-market/listings", json={}).status_code == 422


@pytest.mark.parametrize("perms", [("wallets:view",), ("wallets:view", "dashboard:view_investments"), ()])
def test_credito_sin_permiso_403_antes_de_validar(client, perms):
    client.as_user(make_user(*perms))
    for method, path, body in CREDITS_ENDPOINTS:
        assert getattr(client, method)(f"/credits/{path}", **({"json": body} if method == "post" else {})).status_code == 403, path
    assert client.post("/credits/installments/1/pay", json={}).status_code == 403


def test_credito_con_credits_request_llega_a_la_validacion(client):
    client.as_user(make_user("credits:request"))
    assert client.post("/credits/me/request", json={}).status_code != 403
    assert client.get("/credits/me/bank-accounts").status_code != 403


def test_credito_con_credits_view_puede_ver_pero_no_solicitar(client, monkeypatch):
    async def cfg(_db):
        raise RuntimeError("alcanzó el handler")

    monkeypatch.setattr(CreditService, "get_or_create_config", cfg)
    client.as_user(make_user("credits:view"))
    assert client.post("/credits/me/request", json={}).status_code == 403
    assert client.get("/credits/config").status_code == 500  # pasó el permiso y llegó al handler


def test_credito_superadmin_accede(client):
    client.as_user(make_user(superuser=True))
    assert client.post("/credits/me/request", json={}).status_code == 422
    assert client.post("/credits/installments/1/pay", json={}).status_code != 403
