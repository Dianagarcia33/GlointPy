"""H-65: registro genérico de escrituras autenticadas (middleware ASGI)."""
import os

for _k, _v in {"DB_USER": "u", "DB_PASSWORD": "p", "DB_HOST": "localhost", "DB_PORT": "3306", "DB_NAME": "x"}.items():
    os.environ.setdefault(_k, _v)

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from jose import jwt

from src.core import audit_middleware as am
from src.core.audit_context import mark_detailed_logged
from src.core.config import settings


def _token(uid=7, **extra):
    return jwt.encode({"sub": str(uid), **extra}, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


@pytest.fixture()
def env(monkeypatch):
    entries = []
    monkeypatch.setattr(am, "enqueue", entries.append)
    app = FastAPI()

    @app.post("/api/v1/withdrawals/{withdrawal_id}/approve")
    async def approve(withdrawal_id: int):
        return {"ok": True}

    @app.post("/api/v1/wallets/admin/denied")
    async def denied():
        raise HTTPException(403, "no")

    @app.post("/api/v1/wallets/boom")
    async def boom():
        raise RuntimeError("x")

    @app.post("/api/v1/wallets/detailed")
    async def detailed():
        mark_detailed_logged()
        return {}

    @app.post("/api/v1/notifications/mark-all-read")
    async def noisy():
        return {}

    @app.get("/api/v1/withdrawals/{withdrawal_id}")
    async def read(withdrawal_id: int):
        return {}

    app.add_middleware(am.AuditWriteMiddleware)
    return TestClient(app, raise_server_exceptions=False), entries


def test_post_autenticado_registra_con_plantilla_ip_y_ua(env):
    client, entries = env
    r = client.post("/api/v1/withdrawals/55/approve?token=SECRETO", headers={
        "Authorization": f"Bearer {_token()}", "X-Forwarded-For": "9.9.9.9, 10.0.0.1", "User-Agent": "UA-test"})
    assert r.status_code == 200
    e = entries[0]
    assert e["action"] == "HTTP_WRITE" and e["status"] == "SUCCESS" and e["user_id"] == 7
    assert e["module"] == "withdrawals" and e["entity_id"] == "55"
    assert e["details"]["route"] == "/withdrawals/{withdrawal_id}/approve"
    assert e["ip_address"] == "9.9.9.9" and e["user_agent"] == "UA-test"
    assert "SECRETO" not in str(e)


def test_cookie_tambien_identifica_al_actor(env):
    client, entries = env
    client.cookies.set("access_token", _token(3))
    client.post("/api/v1/withdrawals/1/approve")
    assert entries[0]["user_id"] == 3


def test_get_sin_token_y_token_invalido_no_registran(env):
    client, entries = env
    client.get("/api/v1/withdrawals/1", headers={"Authorization": f"Bearer {_token()}"})
    client.post("/api/v1/withdrawals/1/approve")
    client.post("/api/v1/withdrawals/1/approve", headers={"Authorization": "Bearer basura"})
    assert entries == []


def test_403_queda_como_failed_y_500_se_registra(env):
    client, entries = env
    h = {"Authorization": f"Bearer {_token()}"}
    client.post("/api/v1/wallets/admin/denied", headers=h)
    r = client.post("/api/v1/wallets/boom", headers=h)
    assert r.status_code == 500
    assert [(e["status"], e["details"]["status_code"]) for e in entries] == [("FAILED", 403), ("FAILED", 500)]


def test_suplantacion_y_ruta_excluida_y_detallado(env):
    client, entries = env
    h = {"Authorization": f"Bearer {_token(imp_by=1)}"}
    client.post("/api/v1/notifications/mark-all-read", headers=h)
    client.post("/api/v1/wallets/detailed", headers=h)
    assert entries == []
    client.post("/api/v1/withdrawals/2/approve", headers=h)
    assert entries[0]["details"]["impersonated_by"] == "1"


def test_interruptor_apaga_el_registro(env, monkeypatch):
    client, entries = env
    monkeypatch.setenv("AUDIT_HTTP_WRITES_ENABLED", "false")
    client.post("/api/v1/withdrawals/2/approve", headers={"Authorization": f"Bearer {_token()}"})
    assert entries == []


def test_fallo_del_encolado_no_rompe_la_peticion(monkeypatch):
    def bad(_e):
        raise RuntimeError("cola rota")
    monkeypatch.setattr(am, "enqueue", bad)
    app = FastAPI()

    @app.post("/api/v1/x/{x_id}")
    async def x(x_id: int):
        return {"ok": 1}

    app.add_middleware(am.AuditWriteMiddleware)
    r = TestClient(app).post("/api/v1/x/1", headers={"Authorization": f"Bearer {_token()}"})
    assert r.status_code == 200


def test_enqueue_con_cola_llena_descarta_sin_error(monkeypatch):
    import asyncio

    async def go():
        monkeypatch.setattr(am, "_queue", asyncio.Queue(maxsize=1))
        monkeypatch.setattr(am, "_worker", asyncio.get_running_loop().create_future())
        am._queue.put_nowait({})
        am.enqueue({"a": 1})  # no lanza
    asyncio.run(go())
