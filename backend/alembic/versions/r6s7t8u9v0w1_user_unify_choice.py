"""Elección del usuario con documento repetido: users.unify_keep_user_id y users.unify_answered_at (NULLABLE).

Cuando un mismo documento tiene varias cuentas, el usuario indica con cuál correo seguirá iniciando sesión.
Solo se guarda la respuesta; la unificación real de las cuentas la hace el equipo.

Revision ID: r6s7t8u9v0w1
Revises: q5r6s7t8u9v0
"""
from alembic import op
import sqlalchemy as sa

revision = 'r6s7t8u9v0w1'
down_revision = 'q5r6s7t8u9v0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    existing = {c['name'] for c in sa.inspect(bind).get_columns('users')}
    if 'unify_keep_user_id' not in existing:
        op.add_column('users', sa.Column('unify_keep_user_id', sa.BigInteger(), nullable=True))
    if 'unify_answered_at' not in existing:
        op.add_column('users', sa.Column('unify_answered_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'unify_answered_at')
    op.drop_column('users', 'unify_keep_user_id')
