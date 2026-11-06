"""H-235: admin-dashboard y director-dashboard ya no se abren con admin.audits.manage (contabilidad)."""
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.api.deps import get_current_user
from src.api.v1.endpoints import analytics
from src.core.database import get_db


def make_user(*perms, superuser=False, role_name="rol_prueba"):
    role = SimpleNamespace(name=role_name, permissions=[SimpleNamespace(name=p) for p in perms])
    return SimpleNamespace(id=1, is_superuser=superuser, roles=[role], permissions_override=None)


@pytest.fixture
def client():
    async def fake_db():
        yield None

    app = FastAPI()
    app.include_router(analytics.router, prefix="/analytics")
    app.dependency_overrides[get_db] = fake_db
    holder = {}
    app.dependency_overrides[get_current_user] = lambda: holder["user"]
    c = TestClient(app, raise_server_exceptions=False)  # la BD falsa puede dar 500 en el handler: lo que importa es 403 o no
    c.as_user = lambda u: holder.__setitem__("user", u)
    return c


CONTABILIDAD = ("accounting:dashboard:view", "admin:audits:manage", "admin:commissions:settle",
                "admin:payments:manage", "admin:withdrawals:manage", "wallets:view", "bank_accounts:manage")
MGMT = ["/analytics/admin-dashboard", "/analytics/director-dashboard"]


@pytest.mark.parametrize("path", MGMT)
def test_contabilidad_recibe_403(client, path):
    client.as_user(make_user(*CONTABILIDAD))
    assert client.get(path).status_code == 403


@pytest.mark.parametrize("perms", [("dashboard:view_kpis", "dashboard:view_investments"), ()])
@pytest.mark.parametrize("path", MGMT)
def test_inversionista_o_sin_permisos_403(client, path, perms):
    client.as_user(make_user(*perms))
    assert client.get(path).status_code == 403


@pytest.mark.parametrize("path", MGMT)
def test_admin_con_users_manage_pasa_el_permiso(client, path):
    client.as_user(make_user("admin.users.manage"))
    assert client.get(path).status_code != 403


@pytest.mark.parametrize("path", MGMT)
def test_superusuario_pasa_el_permiso(client, path):
    client.as_user(make_user(superuser=True))
    assert client.get(path).status_code != 403


def test_directivo_solo_director_dashboard(client):
    client.as_user(make_user("director:dashboard:view"))
    assert client.get("/analytics/director-dashboard").status_code != 403
    assert client.get("/analytics/admin-dashboard").status_code == 403


def test_contabilidad_conserva_su_tablero_contable(client):
    client.as_user(make_user(*CONTABILIDAD))
    assert client.get("/analytics/accounting-dashboard").status_code != 403
