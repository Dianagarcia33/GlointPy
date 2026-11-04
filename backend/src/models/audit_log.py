from sqlalchemy import Column, BigInteger, String, DateTime, Text, JSON, ForeignKey
from sqlalchemy.sql import func
from src.core.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    user_id = Column(BigInteger, nullable=True, index=True)
    user_name = Column(String(255), nullable=True)
    user_email = Column(String(255), nullable=True, index=True)
    
    action = Column(String(100), nullable=False, index=True)      # e.g. 'AUTH_LOGIN', 'WITHDRAWAL_APPROVE', 'USER_UPDATE'
    module = Column(String(50), nullable=False, index=True)       # e.g. 'auth', 'withdrawals', 'investments', 'users', 'commercial', 'audit'
    
    entity_type = Column(String(100), nullable=True)              # e.g. 'Withdrawal', 'User', 'InvestmentRequest'
    entity_id = Column(String(100), nullable=True, index=True)   # ID of target entity
    
    description = Column(String(500), nullable=True)              # Human readable summary
    details = Column(JSON, nullable=True)                         # Before/After diff, amount, reason, etc.
    
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(300), nullable=True)
    status = Column(String(20), nullable=False, default="SUCCESS") # 'SUCCESS', 'FAILED', 'WARNING'
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)


# ---------------------------------------------------------------------------
# H-65: inmutabilidad del Audit Trail a nivel de aplicación.
# Los registros solo se pueden INSERTAR. Cualquier UPDATE/DELETE sobre
# `audit_logs` (por instancia, en bloque o SQL crudo) lanza AuditImmutableError.
# Nota: esto NO protege frente a quien tenga acceso directo a la base de datos;
# para eso hace falta revocar UPDATE/DELETE al usuario de la aplicación en MySQL.
# ---------------------------------------------------------------------------
import re

from sqlalchemy import event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session


class AuditImmutableError(RuntimeError):
    """Se intentó modificar o eliminar un registro del Audit Trail (inmutable)."""

    def __init__(self, operation: str = "modificar/eliminar"):
        super().__init__(
            f"Los registros de auditoría (audit_logs) son inmutables: no se permite {operation}."
        )


# 1) Por instancia (flush del ORM). Aplica también a AsyncSession, que usa Session por debajo.
@event.listens_for(AuditLog, "before_update")
def _block_audit_update(mapper, connection, target):
    raise AuditImmutableError("actualizar")


@event.listens_for(AuditLog, "before_delete")
def _block_audit_delete(mapper, connection, target):
    raise AuditImmutableError("eliminar")


# 2) Sentencias en bloque (update()/delete() ejecutados con session.execute, sync o async).
@event.listens_for(Session, "do_orm_execute")
def _block_audit_bulk(orm_execute_state):
    if not (orm_execute_state.is_update or orm_execute_state.is_delete):
        return
    table = getattr(orm_execute_state.statement, "table", None)
    if table is AuditLog.__table__:
        raise AuditImmutableError("actualizar" if orm_execute_state.is_update else "eliminar")


# 3) SQL crudo (text(...)) o cualquier ejecución por el motor: red de seguridad.
_RAW_MUTATION = re.compile(
    r"^\s*(?:UPDATE(?:\s+(?:LOW_PRIORITY|IGNORE))*\s+|DELETE\s+(?:\w+\s+)*?FROM\s+|TRUNCATE\s+(?:TABLE\s+)?)`?audit_logs`?\b",
    re.IGNORECASE,
)


@event.listens_for(Engine, "before_cursor_execute")
def _block_audit_raw_sql(conn, cursor, statement, parameters, context, executemany):
    if _RAW_MUTATION.match(statement):
        raise AuditImmutableError("actualizar/eliminar")
