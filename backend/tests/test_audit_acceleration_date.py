"""H-65 (pieza pequeña): cambiar la fecha de un bono de aceleración deja rastro en el Audit Trail."""
import asyncio
from datetime import datetime
from types import SimpleNamespace

from src.api.v1.endpoints import audit


class FakeResult:
    def __init__(self, obj):
        self._obj = obj

    def scalars(self):
        return self

    def first(self):
        return self._obj


class FakeDb:
    def __init__(self, acc):
        self.acc = acc

    async def execute(self, *_a, **_k):
        return FakeResult(self.acc)

    async def commit(self):
        pass

    async def refresh(self, _o):
        pass


def test_cambio_de_fecha_registra_antes_y_despues(monkeypatch):
    calls = []

    async def fake_log(**kw):
        calls.append(kw)

    import src.services.audit_trail_service as svc
    monkeypatch.setattr(svc, "log_audit_trail", fake_log)
    acc = SimpleNamespace(id=353, investor_id=9, created_at=datetime(2026, 10, 1, 12, 0))
    user = SimpleNamespace(id=5)
    out = asyncio.run(audit.update_acceleration_date(
        353, audit.UpdateAccelerationDateRequest(created_at="2026-10-15T12:00:00"),
        request=None, current_user=user, db=FakeDb(acc)))
    assert out["id"] == 353
    assert len(calls) == 1
    c = calls[0]
    assert c["action"] == "ACCELERATION_DATE_UPDATE" and c["entity_id"] == 353 and c["user"] is user
    assert c["details"]["before"].startswith("2026-10-01") and c["details"]["after"].startswith("2026-10-15")
