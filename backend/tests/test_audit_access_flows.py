"""H-65 nivel 1 (acceso): roles, SARLAFT, cuentas bancarias, apps externas y suplantación de cuenta."""
import asyncio
import os
from types import SimpleNamespace

for _k, _v in {"DB_USER": "u", "DB_PASSWORD": "p", "DB_HOST": "localhost", "DB_PORT": "3306", "DB_NAME": "x"}.items():
    os.environ.setdefault(_k, _v)

import pytest
from fastapi import HTTPException

from src.models.audit_log import AuditLog

ADMIN = SimpleNamespace(id=1, name="Admin", email="admin@gloint.co")


class Res:
    def __init__(self, obj=None):
        self.obj = obj

    def scalars(self):
        return self

    def first(self):
        return self.obj

    def scalar(self):
        return self.obj


class Db:
    def __init__(self, *results, fail_audit=False):
        self.results, self.fail_audit, self.events, self.added = list(results), fail_audit, [], []

    async def execute(self, *_a, **_k):
        return self.results.pop(0) if self.results else Res(None)

    def add(self, o):
        self.added.append(o)

    async def flush(self):
        if self.fail_audit and any(isinstance(o, AuditLog) for o in self.added):
            raise RuntimeError("audit_logs no disponible")
        self.events.append("flush")

    async def commit(self):
        self.events.append("commit")

    async def rollback(self):
        self.events.append("rollback")

    async def refresh(self, _o):
        pass

    async def delete(self, _o):
        self.events.append("delete")


def run(c):
    return asyncio.run(c)


def audits(db):
    return [o for o in db.added if isinstance(o, AuditLog)]


# ---------------------------------------------------------------- cuentas bancarias
def _acc(**kw):
    base = dict(id=4, user_id=1, banco="Bancolombia", tipo_cuenta="Ahorros", numero_cuenta="1234567890123", is_active=True)
    base.update(kw)
    return SimpleNamespace(**base)


def test_editar_cuenta_bancaria_audita_antes_y_despues_solo_con_ultimos_4(monkeypatch):
    from src.api.v1.endpoints import bank_accounts as ba

    async def otp(*_a, **_k):
        return None

    monkeypatch.setattr(ba, "_verify_otp_code", otp)
    req = SimpleNamespace(code="123456", banco=None, tipo_cuenta=None, numero_cuenta="9999000011112222")
    db = Db(Res(_acc()))
    run(ba.update_my_bank_account(4, req, ADMIN, db))
    row = audits(db)[0]
    assert row.action == "BANK_ACCOUNT_UPDATE" and db.events == ["flush", "commit"]  # auditoría vaciada y UNA sola confirmación (cambio + auditoría)
    d = row.details
    assert d["antes"]["cuenta_ultimos4"] == "0123" and d["despues"]["cuenta_ultimos4"] == "2222"
    assert "1234567890123" not in str(d) and "9999000011112222" not in str(d)


def test_cuenta_bancaria_si_falla_la_auditoria_se_revierte_con_error_claro(monkeypatch):
    from src.api.v1.endpoints import bank_accounts as ba

    async def otp(*_a, **_k):
        return None

    monkeypatch.setattr(ba, "_verify_otp_code", otp)
    req = SimpleNamespace(code="123456")
    # la auditoría de borrado se agrega a la sesión y su flush falla
    class DbBad(Db):
        async def execute(self, *a, **k):
            return Res(_acc())

    bad = DbBad(fail_audit=True)

    async def go():
        # audit_in_tx hace flush estricto: aquí lo forzamos a fallar y el endpoint debe devolver 500 y revertir
        return await ba.delete_my_bank_account(4, req, ADMIN, bad)

    with pytest.raises(HTTPException) as e:
        run(go())
    assert e.value.status_code == 500 and "rollback" in bad.events and "commit" not in bad.events


# ---------------------------------------------------------------- roles
def test_borrar_rol_audita_y_falla_sin_auditoria(monkeypatch):
    from src.services.security_service import SecurityService
    role = SimpleNamespace(id=9, name="auditor", is_system_role="0")

    async def get_role(_db, _id):
        return role

    monkeypatch.setattr(SecurityService, "get_role", staticmethod(get_role))
    db = Db(Res(0))
    run(SecurityService.delete_role(db, 9, actor=ADMIN))
    assert [a.action for a in audits(db)] == ["ROLE_DELETE"] and "delete" in db.events and db.events[-1] == "commit"
    bad = Db(Res(0), fail_audit=True)
    # el borrado del rol no hace flush propio: el fallo aparece al auditar (flush estricto)
    with pytest.raises(RuntimeError):
        run(SecurityService.delete_role(bad, 9, actor=ADMIN))
    assert "commit" not in bad.events and "delete" not in bad.events


# ---------------------------------------------------------------- SARLAFT
def test_sarlaft_set_status_audita_estado_antes_y_despues():
    from src.api.v1.endpoints import sarlaft
    user = SimpleNamespace(id=7, name="Ana", document_id="1")
    req = SimpleNamespace(user_id=7, status="approved", justification="Verificado por el oficial")
    db = Db(Res(user), Res(None))
    out = run(sarlaft.set_user_sarlaft_status(req, ADMIN, db))
    assert out["status"] == "approved"
    row = audits(db)[0]
    assert row.action == "SARLAFT_STATUS_SET" and row.details["estado_despues"] == "approved"
    assert db.events.index("flush") < db.events.index("commit")
    bad = Db(Res(user), Res(None), fail_audit=True)
    with pytest.raises(RuntimeError):
        run(sarlaft.set_user_sarlaft_status(req, ADMIN, bad))
    assert "commit" not in bad.events


# ---------------------------------------------------------------- apps externas
def test_regenerar_clave_no_guarda_la_clave_ni_el_secreto(monkeypatch):
    from src.services.external_app_service import ExternalAppService
    app = SimpleNamespace(id=2, name="Tienda", client_id="cli_123", api_key_hash="h", webhook_secret="s", is_active=True,
                          webhook_url="https://tienda.co/hook?token=SECRETO", redirect_urls=["https://a"])

    async def get(_db, _id):
        return app

    monkeypatch.setattr(ExternalAppService, "get_app_by_id", staticmethod(get))
    db = Db()
    _, api_key = run(ExternalAppService.regenerate_api_key(db, 2, actor=ADMIN))
    row = audits(db)[0]
    text = str(row.details) + str(row.description)
    assert row.action == "EXTERNAL_APP_KEY_REGENERATE" and api_key not in text and app.webhook_secret not in text
    bad = Db(fail_audit=True)
    with pytest.raises(RuntimeError):
        run(ExternalAppService.regenerate_api_key(bad, 2, actor=ADMIN))
    assert "commit" not in bad.events


def test_editar_app_externa_solo_audita_el_dominio_del_webhook(monkeypatch):
    from src.schemas.external_app import ExternalAppUpdate
    from src.services.external_app_service import ExternalAppService
    app = SimpleNamespace(id=2, name="Tienda", client_id="cli_1", is_active=True,
                          webhook_url="https://tienda.co/hook?token=SECRETO", redirect_urls=[])

    async def get(_db, _id):
        return app

    async def safe(_url):
        return True, ""

    from src.services import external_app_service as mod
    monkeypatch.setattr(ExternalAppService, "get_app_by_id", staticmethod(get))
    monkeypatch.setattr(mod, "verify_webhook_destination_safety", safe)
    db = Db()
    run(ExternalAppService.update_app(db, 2, ExternalAppUpdate(is_active=False), actor=ADMIN))
    d = audits(db)[0].details
    assert d["antes"]["activa"] is True and d["despues"]["activa"] is False
    assert d["antes"]["webhook_dominio"] == "tienda.co" and "SECRETO" not in str(d)


# ---------------------------------------------------------------- suplantación de cuenta
def test_cambiar_a_cuenta_de_menor_audita_antes_de_emitir_el_token(monkeypatch):
    from src.api.v1.endpoints import auth
    issued = []
    monkeypatch.setattr(auth, "create_access_token", lambda **kw: issued.append(kw) or "tok")
    monkeypatch.setattr(auth, "set_auth_cookie", lambda *a, **k: None)
    child = SimpleNamespace(id=3, is_active=True, token_version=0)
    tutor = SimpleNamespace(id=1, name="Tutor", email="t@x.co", token_version=2)
    db = Db(Res(child))
    out = run(auth.switch_to_child_account(3, SimpleNamespace(), SimpleNamespace(), tutor, db))
    assert out["access_token"] == "tok" and issued[0]["extra_claims"]["imp_by"] == 1
    assert audits(db)[0].action == "ACCOUNT_SWITCH"

    bad = Db(Res(child), fail_audit=True)
    issued.clear()
    with pytest.raises(RuntimeError):
        run(auth.switch_to_child_account(3, SimpleNamespace(), SimpleNamespace(), tutor, bad))
    assert issued == [] and "commit" not in bad.events  # sin rastro no se entrega la sesión
