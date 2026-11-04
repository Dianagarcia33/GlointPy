"""H-65 nivel 1 (dinero): la auditoría detallada es atómica y trae antes/después."""
import asyncio
import os
from decimal import Decimal
from types import SimpleNamespace

for _k, _v in {"DB_USER": "u", "DB_PASSWORD": "p", "DB_HOST": "localhost", "DB_PORT": "3306", "DB_NAME": "x"}.items():
    os.environ.setdefault(_k, _v)

import pytest

from src.api.v1.endpoints import wallets
from src.api.v1.endpoints.wallets import AdminWalletAdjustRequest


class Res:
    def __init__(self, obj):
        self.obj = obj

    def scalars(self):
        return self

    def first(self):
        return self.obj


class FakeDb:
    def __init__(self, wallet):
        self.wallet, self.events, self.added = wallet, [], []

    async def execute(self, *_a, **_k):
        return Res(self.wallet)

    def add(self, o):
        self.added.append(o)

    async def flush(self):
        self.events.append("flush")

    async def commit(self):
        self.events.append("commit")

    async def rollback(self):
        self.events.append("rollback")


def _run(db, req, audit):
    wallets.audit_in_tx = audit
    admin = SimpleNamespace(id=1, name="Admin")
    return asyncio.run(wallets.admin_adjust_wallet(5, req, admin, db))


@pytest.fixture(autouse=True)
def restore():
    original = wallets.audit_in_tx
    yield
    wallets.audit_in_tx = original


def test_ajuste_admin_audita_antes_del_commit_con_saldos():
    wallet = SimpleNamespace(id=5, user_id=9, balance=Decimal("1000"))
    db = FakeDb(wallet)
    calls = []

    async def audit(_db, action, module, user, etype, eid, desc, details):
        calls.append((action, details))
        db.events.append("audit")

    _run(db, AdminWalletAdjustRequest(action="add", amount=500, description="Corrección"), audit)
    assert db.events.index("audit") < db.events.index("commit")
    action, d = calls[0]
    assert action == "WALLET_ADMIN_ADJUST"
    assert d["saldo_antes"] == 1000.0 and d["saldo_despues"] == 1500.0 and d["diferencia"] == 500.0
    assert d["motivo"] == "Corrección"


def test_si_la_auditoria_falla_no_se_confirma_el_ajuste():
    wallet = SimpleNamespace(id=5, user_id=9, balance=Decimal("1000"))
    db = FakeDb(wallet)

    async def audit(*_a, **_k):
        raise RuntimeError("audit_logs no disponible")

    with pytest.raises(RuntimeError):
        _run(db, AdminWalletAdjustRequest(action="add", amount=500, description="x"), audit)
    assert "commit" not in db.events


def test_debito_no_registra_secretos_ni_cuentas_completas():
    wallet = SimpleNamespace(id=5, user_id=9, balance=Decimal("1000"))
    db = FakeDb(wallet)
    seen = {}

    async def audit(_db, action, module, user, etype, eid, desc, details):
        seen.update(details)

    # un ajuste "add" no genera retiro; los detalles solo llevan ids, montos y motivo
    _run(db, AdminWalletAdjustRequest(action="add", amount=1, description="m"), audit)
    assert set(seen) >= {"wallet_id", "accion", "saldo_antes", "saldo_despues"}
    assert not any("cuenta" in k or "password" in k for k in seen)
