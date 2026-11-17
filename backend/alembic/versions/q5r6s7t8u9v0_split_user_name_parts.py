"""Nombre del usuario separado: first_name, middle_name, last_name y second_last_name (todas NULLABLE).

users.name se conserva como nombre completo derivado. Los usuarios existentes no se parten solos
(un nombre como "María Fernanda Restrepo Gómez" no se separa de forma fiable): se marcan con
must_update_profile para que completen sus nombres al ingresar. Los superusuarios quedan fuera,
igual que en la actualización masiva existente.

Revision ID: q5r6s7t8u9v0
Revises: p4q5r6s7t8u9
"""
from alembic import op
import sqlalchemy as sa

revision = 'q5r6s7t8u9v0'
down_revision = 'p4q5r6s7t8u9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    existing = {c['name'] for c in sa.inspect(bind).get_columns('users')}
    for col in ('first_name', 'middle_name', 'last_name', 'second_last_name'):
        if col not in existing:
            op.add_column('users', sa.Column(col, sa.String(100), nullable=True))
    op.execute("UPDATE users SET must_update_profile = TRUE WHERE first_name IS NULL AND is_superuser = FALSE")


def downgrade() -> None:
    for col in ('second_last_name', 'last_name', 'middle_name', 'first_name'):
        op.drop_column('users', col)
