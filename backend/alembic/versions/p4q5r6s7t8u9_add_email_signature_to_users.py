"""Firma de correo del usuario (users.email_signature, HTML saneado, NULL = sin firma)

Revision ID: p4q5r6s7t8u9
Revises: o3p4q5r6s7t8
"""
from alembic import op
import sqlalchemy as sa

revision = 'p4q5r6s7t8u9'
down_revision = 'o3p4q5r6s7t8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Aditiva: columna NULLABLE sin default y sin tocar datos existentes
    op.add_column('users', sa.Column('email_signature', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'email_signature')
