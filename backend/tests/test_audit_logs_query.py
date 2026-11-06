"""H-65: la consulta de Auditoría filtra por usuario, tipo (detallado/automático), módulo, acción, estado y fecha."""
import asyncio
import os

for _k, _v in {"DB_USER": "u", "DB_PASSWORD": "p", "DB_HOST": "localhost", "DB_PORT": "3306", "DB_NAME": "x"}.items():
    os.environ.setdefault(_k, _v)

from src.api.v1.endpoints import audit


class Res:
    def __init__(self, scalar=0, rows=None):
        self._scalar, self._rows = scalar, rows or []

    def scalar_one(self):
        return self._scalar

    def scalars(self):
        return self

    def all(self):
        return self._rows

    def fetchall(self):
        return self._rows


class Db:
    def __init__(self):
        self.statements = []

    async def execute(self, stmt, *a, **k):
        self.statements.append(stmt)
        return Res()


def query(**kw):
    base = dict(page=1, limit=25, module=None, action=None, search=None, status=None, start_date=None,
                end_date=None, user_id=None, kind=None)
    base.update(kw)
    db = Db()
    asyncio.run(audit.get_audit_logs(db=db, **base))
    return db.statements[1]  # la 2.ª sentencia es la de datos (la 1.ª cuenta)


def sql(stmt):
    return str(stmt.compile(compile_kwargs={"literal_binds": True}))


def test_filtra_por_usuario_exacto():
    s = sql(query(user_id=42))
    assert "audit_logs.user_id = 42" in s


def test_tipo_detallado_excluye_los_automaticos():
    s = sql(query(kind="detailed"))
    assert "audit_logs.action != 'HTTP_WRITE'" in s


def test_tipo_automatico_solo_http_write():
    s = sql(query(kind="generic"))
    assert "audit_logs.action = 'HTTP_WRITE'" in s


def test_sin_tipo_no_filtra_y_combina_modulo_estado_y_fecha():
    assert "HTTP_WRITE" not in sql(query())
    s = sql(query(module="wallets", status="FAILED", start_date="2026-01-01", end_date="2026-01-31", user_id=7))
    assert "audit_logs.module = 'wallets'" in s and "audit_logs.status = 'FAILED'" in s
    assert "audit_logs.created_at >=" in s and "audit_logs.created_at <" in s and "audit_logs.user_id = 7" in s
    assert "ORDER BY audit_logs.created_at DESC" in s  # usa el índice de created_at
