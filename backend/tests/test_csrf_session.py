"""H-33 Fase 2: CSRF para sesión por cookie, precedencia Bearer->cookie y Origin en WebSockets."""
import asyncio
import os

for _k, _v in {"DB_USER": "u", "DB_PASSWORD": "p", "DB_HOST": "localhost", "DB_PORT": "3306", "DB_NAME": "x"}.items():
    os.environ.setdefault(_k, _v)

import pytest
from fastapi import FastAPI, Request
from fastapi.testclient import TestClient

from src.core.csrf import CSRFMiddleware, origin_allowed

OK = "https://gloint.com.co"
EVIL = "https://evil.example"


def make_client(mode="on"):
    app = FastAPI()

    @app.post("/api/v1/x")
    def post_x():
        return {"ok": True}

    @app.get("/api/v1/x")
    def get_x():
        return {"ok": True}

    @app.post("/api/v1/crm/public/contact-form")
    def public_form():
        return {"ok": True}

    app.add_middleware(CSRFMiddleware, allowed_origins=[OK], mode=mode)
    return TestClient(app, base_url="https://gloint.com.co")


COOKIE = {"Cookie": "access_token=abc"}
WEB = {"X-Gloint-Client": "web"}


def test_post_con_cookie_sin_cabecera_es_403():
    assert make_client().post("/api/v1/x", headers=COOKIE).status_code == 403


def test_post_con_cookie_y_cabecera_pasa():
    assert make_client().post("/api/v1/x", headers={**COOKIE, **WEB}).status_code == 200


def test_cabecera_con_origin_ajeno_es_403():
    h = {**COOKIE, **WEB, "Origin": EVIL}
    assert make_client().post("/api/v1/x", headers=h).status_code == 403


def test_origin_propio_o_listado_pasa():
    c = make_client()
    assert c.post("/api/v1/x", headers={**COOKIE, **WEB, "Origin": OK}).status_code == 200
    # mismo host que la petición aunque no esté en la lista (staging detrás del proxy)
    h = {**COOKIE, **WEB, "Origin": "https://pruebas.gloint.com.co", "X-Forwarded-Host": "pruebas.gloint.com.co"}
    assert c.post("/api/v1/x", headers=h).status_code == 200


def test_referer_ajeno_sin_origin_es_403():
    h = {**COOKIE, **WEB, "Referer": EVIL + "/pagina"}
    assert make_client().post("/api/v1/x", headers=h).status_code == 403


def test_bearer_no_necesita_cabecera():
    assert make_client().post("/api/v1/x", headers={"Authorization": "Bearer t"}).status_code == 200
    assert make_client().post("/api/v1/x", headers={**COOKIE, "Authorization": "Bearer t"}).status_code == 200


def test_sin_cookie_no_se_afecta_api_key():
    assert make_client().post("/api/v1/x", headers={"X-API-Key": "k", "Origin": EVIL}).status_code == 200


def test_get_exento():
    assert make_client().get("/api/v1/x", headers=COOKIE).status_code == 200


def test_rutas_publicas_exentas():
    assert make_client().post("/api/v1/crm/public/contact-form", headers=COOKIE).status_code == 200


def test_multipart_con_cabecera_pasa_y_sin_ella_falla():
    c = make_client()
    files = {"f": ("a.txt", b"hola")}
    assert c.post("/api/v1/x", headers={**COOKIE, **WEB}, files=files).status_code == 200
    assert c.post("/api/v1/x", headers=COOKIE, files=files).status_code == 403


def test_modo_report_no_bloquea_y_off_tampoco():
    assert make_client("report").post("/api/v1/x", headers=COOKIE).status_code == 200
    assert make_client("off").post("/api/v1/x", headers=COOKIE).status_code == 200


def test_origin_allowed():
    assert origin_allowed(None, "a.com", [])
    assert origin_allowed("https://a.com", "a.com", [])
    assert not origin_allowed("https://b.com", "a.com", [OK])
    assert origin_allowed("HTTPS://GLOINT.COM.CO/", "a.com", [OK])


# ---- Autenticación: precedencia y ?token= ----
def _req(headers=None, query=b""):
    return Request({"type": "http", "method": "GET", "path": "/", "headers": headers or [],
                    "query_string": query, "scheme": "http", "server": ("t", 80)})


def _mint(sub="1"):
    from jose import jwt
    from src.core.config import settings
    return jwt.encode({"sub": sub}, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def test_payload_prefiere_bearer_a_cookie_e_ignora_query():
    from src.api.deps import get_auth_payload
    bearer, cookie = _mint("1"), _mint("2")
    req = _req([(b"cookie", ("access_token=%s" % cookie).encode())])
    assert (asyncio.run(get_auth_payload(req, token=bearer)))["sub"] == "1"
    assert (asyncio.run(get_auth_payload(req, token=None)))["sub"] == "2"


def test_query_token_ya_no_autentica():
    from fastapi import HTTPException
    from src.api.deps import get_auth_payload
    req = _req(query=("token=%s" % _mint()).encode())
    with pytest.raises(HTTPException) as e:
        asyncio.run(get_auth_payload(req, token=None))
    assert e.value.status_code == 401


def test_auth_deps_acepta_cookie_y_rechaza_sin_token():
    from fastapi import HTTPException
    from src.api.dependencies.auth_deps import get_current_user
    with pytest.raises(HTTPException) as e:
        asyncio.run(get_current_user(_req(), token=None, db=None))
    assert e.value.status_code == 401


def test_ws_origin():
    from src.api.v1.endpoints.chat import ws_origin_ok

    class WS:
        def __init__(self, h): self.headers = h

    assert ws_origin_ok(WS({"host": "gloint.com.co"}))  # app nativa: sin Origin
    assert ws_origin_ok(WS({"host": "gloint.com.co", "origin": "https://gloint.com.co"}))
    assert not ws_origin_ok(WS({"host": "gloint.com.co", "origin": EVIL}))
