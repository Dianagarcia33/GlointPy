"""H-65: el Audit Trail es inmutable desde la aplicación (solo INSERT)."""
import asyncio
import os

for _k, _v in {"DB_USER": "u", "DB_PASSWORD": "p", "DB_HOST": "localhost", "DB_PORT": "3306", "DB_NAME": "x"}.items():
    os.environ.setdefault(_k, _v)

import pytest
from sqlalchemy import create_engine, delete, select, text, update
from sqlalchemy.orm import Session

from src.models.audit_log import AuditImmutableError, AuditLog
from src.services.audit_trail_service import log_audit_trail


@pytest.fixture()
def session():
    engine = create_engine("sqlite://")
    AuditLog.__table__.create(engine)
    with Session(engine) as s:
        s.add(AuditLog(id=1, action="A", module="m", status="SUCCESS"))
        s.commit()
        yield s


def test_update_por_instancia_falla(session):
    row = session.execute(select(AuditLog)).scalars().first()
    row.description = "alterado"
    with pytest.raises(AuditImmutableError):
        session.commit()
    session.rollback()


def test_delete_por_instancia_falla(session):
    row = session.execute(select(AuditLog)).scalars().first()
    session.delete(row)
    with pytest.raises(AuditImmutableError):
        session.commit()
    session.rollback()


def test_update_y_delete_en_bloque_fallan(session):
    with pytest.raises(AuditImmutableError):
        session.execute(update(AuditLog).values(description="x"))
    with pytest.raises(AuditImmutableError):
        session.execute(delete(AuditLog))
    with pytest.raises(AuditImmutableError):
        session.execute(update(AuditLog.__table__).values(description="x"))
    with pytest.raises(AuditImmutableError):
        session.execute(delete(AuditLog.__table__).where(AuditLog.__table__.c.id == 1))


def test_sql_crudo_falla(session):
    for sql in ("UPDATE audit_logs SET description='x'", "delete from audit_logs", "DELETE FROM `audit_logs` WHERE id=1"):
        with pytest.raises(Exception) as exc:
            session.execute(text(sql))
        assert "inmutables" in str(exc.value)
    session.rollback()


def test_insert_y_lectura_siguen_funcionando(session):
    session.add(AuditLog(id=2, action="B", module="m"))
    session.commit()
    assert len(session.execute(select(AuditLog)).scalars().all()) == 2
    # SELECT sobre otra tabla con texto parecido no se bloquea
    session.execute(text("SELECT * FROM audit_logs"))


def test_log_audit_trail_inserta():
    class FakeDB:
        def __init__(self):
            self.added = []
            self.committed = False

        def add(self, obj):
            self.added.append(obj)

        async def commit(self):
            self.committed = True

    db = FakeDB()
    res = asyncio.run(log_audit_trail(db, action="X", module="audit", user_id=1, entity_id=5))
    assert res is not None and db.committed
    assert db.added[0].action == "X" and db.added[0].entity_id == "5"


def test_asyncsession_cubierta_por_listeners():
    """AsyncSession delega en Session (sync): los listeners de clase la cubren.

    (No se ejecuta contra un motor async real: no hay base de datos en las pruebas.)
    """
    from sqlalchemy import event
    from sqlalchemy.ext.asyncio import AsyncSession
    from src.models import audit_log as mod

    assert issubclass(AsyncSession.sync_session_class, Session)
    assert event.contains(Session, "do_orm_execute", mod._block_audit_bulk)
