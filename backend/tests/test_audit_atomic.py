"""H-65: modo atómico de log_audit_trail (sin commit propio, sin tragar errores)."""
import asyncio
import os

for _k, _v in {"DB_USER": "u", "DB_PASSWORD": "p", "DB_HOST": "localhost", "DB_PORT": "3306", "DB_NAME": "x"}.items():
    os.environ.setdefault(_k, _v)

import pytest

from src.core.audit_context import audit_request_ctx
from src.services.audit_trail_service import log_audit_trail


class Db:
    def __init__(self, fail_flush=False):
        self.added, self.commits, self.flushes, self.fail_flush = [], 0, 0, fail_flush

    def add(self, o):
        self.added.append(o)

    async def commit(self):
        self.commits += 1

    async def flush(self):
        if self.fail_flush:
            raise RuntimeError("tabla bloqueada")
        self.flushes += 1


def test_atomico_no_hace_commit_y_marca_detallado():
    db, ctx = Db(), {"detailed": False}
    tok = audit_request_ctx.set(ctx)
    try:
        asyncio.run(log_audit_trail(db, "X", "m", user_id=1, commit=False, strict=True))
    finally:
        audit_request_ctx.reset(tok)
    assert db.commits == 0 and db.flushes == 1 and len(db.added) == 1 and ctx["detailed"] is True


def test_estricto_propaga_el_error():
    with pytest.raises(RuntimeError):
        asyncio.run(log_audit_trail(Db(fail_flush=True), "X", "m", user_id=1, commit=False, strict=True))


def test_por_defecto_sigue_siendo_commit_y_best_effort():
    db = Db(fail_flush=True)
    assert asyncio.run(log_audit_trail(db, "X", "m", user_id=1)) is not None and db.commits == 1
