"""H-234: el catálogo público de rangos no expone users_count ni campos internos."""
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.api.v1.endpoints import investment_ranks
from src.core.database import get_db
from src.services.investment_rank_service import InvestmentRankService

RANK = {
    "id": 1, "name": "Bronce", "slug": "bronce", "min_investment": 0.0, "max_investment": 10.0,
    "bonus_percentage": 1.0, "color": "#fff", "icon": "trophy", "priority_withdrawal": False,
    "benefits": ["a"], "order": 1, "is_active": True, "users_count": 790,
    "created_at": "2026-01-01", "updated_at": "2026-01-02",
}


def make_user(*perms):
    role = SimpleNamespace(name="rol", permissions=[SimpleNamespace(name=p) for p in perms])
    return SimpleNamespace(id=1, is_superuser=False, roles=[role], permissions_override=None)


@pytest.fixture
def client(monkeypatch):
    calls = []

    async def fake_db():
        yield None

    async def fake_all(_db, only_active=False):
        calls.append(only_active)
        return [dict(RANK)]

    monkeypatch.setattr(InvestmentRankService, "get_all_ranks", fake_all)
    app = FastAPI()
    app.include_router(investment_ranks.router)
    app.dependency_overrides[get_db] = fake_db
    holder = {"user": None}
    app.dependency_overrides[investment_ranks.get_optional_user] = lambda: holder["user"]
    c = TestClient(app)
    c.as_user = lambda u: holder.__setitem__("user", u)
    c.calls = calls
    return c


def test_sin_sesion_catalogo_reducido_y_solo_activos(client):
    r = client.get("/rankings")
    assert r.status_code == 200
    body = r.json()[0]
    assert set(body) == set(investment_ranks.PUBLIC_RANK_FIELDS)
    for k in ("users_count", "is_active", "created_at", "updated_at"):
        assert k not in body
    assert client.calls == [True]


def test_usuario_sin_permiso_de_gestion_tambien_reducido(client):
    client.as_user(make_user("wallets:view"))
    assert "users_count" not in client.get("/rankings").json()[0]


def test_gestion_ve_detalle_completo(client):
    client.as_user(make_user("admin.rankings.manage"))
    body = client.get("/rankings?only_active=false").json()[0]
    assert body["users_count"] == 790 and "is_active" in body
    assert client.calls == [False]
