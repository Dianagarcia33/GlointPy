"""H-33: CORS con lista blanca (credenciales solo para orígenes propios) y cookie SameSite=Lax."""
import os

for _k, _v in {"DB_USER": "u", "DB_PASSWORD": "p", "DB_HOST": "localhost", "DB_PORT": "3306", "DB_NAME": "x"}.items():
    os.environ.setdefault(_k, _v)

import pytest
from fastapi import FastAPI, Request, Response
from fastapi.testclient import TestClient

from src.core.config import Settings
from src.core.cors import SplitCORSMiddleware, parse_origins

LISTED = "https://gloint.com.co"
LOCAL = "http://localhost:5173"
EVIL = "https://evil.example"


@pytest.fixture()
def client():
    app = FastAPI()

    @app.get("/ping")
    def ping():
        return {"ok": True}

    @app.post("/public/form")
    def form():
        return {"ok": True}

    app.add_middleware(SplitCORSMiddleware, credentialed_origins=[LISTED, LOCAL + "/"])
    return TestClient(app)


def _h(resp):
    return {k.lower(): v for k, v in resp.headers.items()}


@pytest.mark.parametrize("origin", [LISTED, LOCAL])
def test_origen_listado_recibe_credenciales(client, origin):
    h = _h(client.get("/ping", headers={"Origin": origin}))
    assert h["access-control-allow-origin"] == origin
    assert h["access-control-allow-credentials"] == "true"
    assert "origin" in h["vary"].lower()


def test_preflight_origen_listado(client):
    r = client.options("/ping", headers={
        "Origin": LISTED, "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "authorization, x-api-key, content-type"})
    h = _h(r)
    assert r.status_code == 200
    assert h["access-control-allow-origin"] == LISTED
    assert h["access-control-allow-credentials"] == "true"
    assert "authorization" in h["access-control-allow-headers"].lower()


def test_origen_no_listado_sin_credenciales(client):
    h = _h(client.get("/ping", headers={"Origin": EVIL}))
    assert h["access-control-allow-origin"] == "*"
    assert "access-control-allow-credentials" not in h
    assert "origin" in h["vary"].lower()


def test_preflight_origen_no_listado_sin_credenciales(client):
    r = client.options("/public/form", headers={
        "Origin": EVIL, "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "x-api-key, authorization, content-type"})
    h = _h(r)
    assert r.status_code == 200
    assert h["access-control-allow-origin"] == "*"
    assert "access-control-allow-credentials" not in h
    allowed = h["access-control-allow-headers"].lower()
    assert "x-api-key" in allowed and "authorization" in allowed


def test_formulario_externo_post_funciona_sin_credenciales(client):
    r = client.post("/public/form", headers={"Origin": "https://landing.example", "X-API-Key": "k"})
    assert r.status_code == 200
    assert _h(r)["access-control-allow-origin"] == "*"


def test_origen_parecido_no_cuenta_como_listado(client):
    for fake in ("https://gloint.com.co.evil.example", "http://gloint.com.co", "https://evil.gloint.com.co"):
        h = _h(client.get("/ping", headers={"Origin": fake}))
        assert h["access-control-allow-origin"] == "*"
        assert "access-control-allow-credentials" not in h


def test_sin_origin_no_hay_cabeceras_cors(client):
    h = _h(client.get("/ping"))
    assert "access-control-allow-origin" not in h
    assert "access-control-allow-credentials" not in h


def test_parse_origins_normaliza():
    assert parse_origins(" https://A.com/ ,,https://a.com, http://b:1 ") == ["https://a.com", "http://b:1"]


def test_settings_une_frontend_url():
    s = Settings(CORS_ALLOWED_ORIGINS="https://gloint.com.co/", FRONTEND_URL="https://pruebas.gloint.com.co/app")
    assert s.get_credentialed_origins() == ["https://gloint.com.co", "https://pruebas.gloint.com.co"]


# ---- Cookie de sesión ----
def _cookie(proto, samesite=None, monkeypatch=None):
    from src.api.v1.endpoints.auth import set_auth_cookie
    from src.core.config import settings
    if samesite is not None:
        monkeypatch.setattr(settings, "COOKIE_SAMESITE", samesite)
    scope = {"type": "http", "method": "POST", "path": "/", "headers": [(b"x-forwarded-proto", proto.encode())],
             "scheme": "http", "server": ("t", 80), "query_string": b""}
    resp = Response()
    set_auth_cookie(resp, "tok", request=Request(scope))
    return resp.headers["set-cookie"].lower()


def test_cookie_https_es_lax_httponly_secure():
    c = _cookie("https")
    assert "samesite=lax" in c and "httponly" in c and "secure" in c


def test_cookie_http_es_lax_sin_secure():
    c = _cookie("http")
    assert "samesite=lax" in c and "httponly" in c and "secure" not in c


def test_cookie_reversa_none_solo_con_https(monkeypatch):
    assert "samesite=none" in _cookie("https", "none", monkeypatch)
    assert "samesite=lax" in _cookie("http", "none", monkeypatch)


def test_cookie_valor_invalido_cae_a_lax(monkeypatch):
    assert "samesite=lax" in _cookie("https", "raro", monkeypatch)
