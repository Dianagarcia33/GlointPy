"""H-65: las operaciones de nivel 1 auditan en la MISMA transacción y se revierten si no se puede auditar."""
import asyncio
import os
from decimal import Decimal
from types import SimpleNamespace

for _k, _v in {"DB_USER": "u", "DB_PASSWORD": "p", "DB_HOST": "localhost", "DB_PORT": "3306", "DB_NAME": "x"}.items():
    os.environ.setdefault(_k, _v)

import pytest
from fastapi import HTTPException

from src.models.audit_log import AuditLog
from src.services import user_service as us
from src.services.purchase_order_service import PurchaseOrderService
from src.services.user_service import UserService
from src.services.security_service import SecurityService  # noqa: F401  (carga de modelos)


class Res:
    def __init__(self, obj=None):
        self.obj = obj

    def scalars(self):
        return self

    def first(self):
        return self.obj

    def scalar_one_or_none(self):
        return self.obj


class Db:
    """Registra el orden de eventos; `fail_audit` hace fallar el flush de la fila de auditoría."""

    def __init__(self, fail_audit=False):
        self.events, self.added, self.fail_audit = [], [], fail_audit

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

    async def execute(self, *_a, **_k):
        return Res(None)


def audits(db):
    return [o for o in db.added if isinstance(o, AuditLog)]


def test_aprobar_orden_de_compra_audita_y_confirma_una_vez(monkeypatch):
    order = SimpleNamespace(id=7, status="REQUESTED", approved_by_id=None, supplier_id=3, total_amount=Decimal("100"))

    async def get(_db, _id):
        return order

    monkeypatch.setattr(PurchaseOrderService, "get_purchase_order_by_id", staticmethod(get))
    db = Db()
    res = asyncio.run(PurchaseOrderService.approve_purchase_order(db, 7, SimpleNamespace(id=1, name="A", email="a@x.co")))
    assert res.status == "APPROVED" and db.events.count("commit") == 1
    a = audits(db)[0]
    assert a.action == "PURCHASE_ORDER_APPROVE" and a.details["estado_antes"] == "REQUESTED"


def test_aprobar_orden_si_falla_la_auditoria_no_se_confirma(monkeypatch):
    order = SimpleNamespace(id=7, status="REQUESTED", approved_by_id=None, supplier_id=3, total_amount=Decimal("100"))

    async def get(_db, _id):
        return order

    monkeypatch.setattr(PurchaseOrderService, "get_purchase_order_by_id", staticmethod(get))
    db = Db(fail_audit=True)
    with pytest.raises(RuntimeError):
        asyncio.run(PurchaseOrderService.approve_purchase_order(db, 7, SimpleNamespace(id=1, name="A", email="a@x.co")))
    assert "commit" not in db.events


def test_toggle_perfil_obligatorio_audita_antes_y_despues(monkeypatch):
    user = SimpleNamespace(id=5, must_update_profile=False)

    async def get(_db, _id):
        return user

    monkeypatch.setattr(UserService, "get_user_by_id", staticmethod(get))
    db = Db()
    asyncio.run(UserService.toggle_force_profile_update(db, 5, None, actor=SimpleNamespace(id=1, name="A", email="a@x.co")))
    a = audits(db)[0]
    assert a.action == "USER_FORCE_PROFILE_TOGGLE" and a.details == {"usuario_id": 5, "antes": False, "despues": True}
    assert db.events[-1] == "commit"


def test_toggle_si_falla_la_auditoria_no_hay_commit(monkeypatch):
    user = SimpleNamespace(id=5, must_update_profile=False)

    async def get(_db, _id):
        return user

    monkeypatch.setattr(UserService, "get_user_by_id", staticmethod(get))
    db = Db(fail_audit=True)
    # el toggle no hace flush propio: el fallo aparece en el flush de la auditoría estricta
    with pytest.raises(RuntimeError):
        asyncio.run(UserService.toggle_force_profile_update(db, 5, None, actor=SimpleNamespace(id=1, name="A", email="a@x.co")))
    assert "commit" not in db.events


def test_crear_billetera_audita_con_id_real_y_falla_sin_auditoria(monkeypatch):
    user = SimpleNamespace(id=9, wallet=None)

    async def get(_db, _id):
        return user

    monkeypatch.setattr(UserService, "get_user_by_id", staticmethod(get))

    class DbW(Db):
        async def flush(self):
            await super().flush()
            for o in self.added:
                if getattr(o, "id", None) is None and not isinstance(o, AuditLog):
                    o.id = 55

    db = DbW()
    asyncio.run(UserService.create_wallet_for_user(db, 9, actor=SimpleNamespace(id=1, name="A", email="a@x.co")))
    assert audits(db)[0].entity_id == "55" and db.events[-1] == "commit"

    bad = DbW(fail_audit=True)
    with pytest.raises(RuntimeError):
        asyncio.run(UserService.create_wallet_for_user(bad, 9, actor=SimpleNamespace(id=1, name="A", email="a@x.co")))
    assert "commit" not in bad.events


def test_mask_email_no_expone_el_correo_completo():
    assert us._mask_email("juan.perez@gloint.co") == "j***@gloint.co"
    assert us._mask_email(None) is None
