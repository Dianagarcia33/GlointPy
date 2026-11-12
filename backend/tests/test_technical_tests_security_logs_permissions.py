"""Pruebas Técnicas Jr y Logs de Seguridad tienen permisos propios (antes: cualquier sesión o permisos prestados)."""
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.api.deps import get_current_user
from src.api.v1.endpoints import audit, technical_test
from src.core.database import get_db


def make_user(*perms):
    role = SimpleNamespace(name="rol_prueba", permissions=[SimpleNamespace(name=p) for p in perms])
    return SimpleNamespace(id=1, is_superuser=False, roles=[role], permissions_override=None)


@pytest.fixture
def client():
    async def fake_db():
        yield None

    app = FastAPI()
    app.include_router(technical_test.router, prefix="/technical-test")
    app.include_router(audit.router, prefix="/audit")
    app.dependency_overrides[get_db] = fake_db
    holder = {}
    app.dependency_overrides[get_current_user] = lambda: holder["user"]
    c = TestClient(app, raise_server_exceptions=False)  # la BD falsa puede dar 500: lo que importa es 403 o no
    c.as_user = lambda u: holder.__setitem__("user", u)
    return c


PIN = {"X-Access-Pin": technical_test.TEST_CONFIG["access_pin"]}


def test_sesion_sin_permiso_no_abre_el_panel_de_pruebas(client):
    client.as_user(make_user("wallets:view", "admin:users:manage"))
    assert client.get("/technical-test/submissions").status_code == 403
    assert client.get("/technical-test/config").status_code == 403
    assert client.post("/technical-test/toggle-config", json={"is_active": False}).status_code == 403
    assert technical_test.TEST_CONFIG["is_active"] is True


def test_el_pin_de_candidatos_ya_no_abre_el_panel(client):
    client.as_user(make_user())
    assert client.get("/technical-test/submissions", headers=PIN).status_code == 403
    assert client.get("/technical-test/config", params={"pin": PIN["X-Access-Pin"]}).status_code == 403
    assert client.post("/technical-test/toggle-config", json={"is_active": False}, headers=PIN).status_code == 403


def test_ver_no_permite_administrar(client):
    client.as_user(make_user("admin:technical_tests:view"))
    assert client.get("/technical-test/config").status_code == 200
    assert client.post("/technical-test/toggle-config", json={"is_active": False}).status_code == 403


def test_administrar_cambia_la_configuracion(client):
    client.as_user(make_user("admin:technical_tests:manage"))
    try:
        res = client.post("/technical-test/toggle-config", json={"is_active": False})
        assert res.status_code == 200 and technical_test.TEST_CONFIG["is_active"] is False
    finally:
        technical_test.TEST_CONFIG["is_active"] = True


@pytest.mark.parametrize("perms,allowed", [
    (("admin:security_logs:view",), True),
    (("admin:audits:manage",), True),
    (("admin:roles:manage",), False),
    (("wallets:view",), False),
])
def test_logs_de_seguridad(client, perms, allowed):
    client.as_user(make_user(*perms))
    assert (client.get("/audit/logs").status_code != 403) is allowed
