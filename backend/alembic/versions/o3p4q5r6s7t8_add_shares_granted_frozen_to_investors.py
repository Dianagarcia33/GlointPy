"""H-192: acciones congeladas por compra (investors.shares_granted_frozen, NULL = desconocido)

Revision ID: o3p4q5r6s7t8
Revises: n2o3p4q5r6s7
"""
from alembic import op
import sqlalchemy as sa

revision = 'o3p4q5r6s7t8'
down_revision = 'n2o3p4q5r6s7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Aditiva: columna NULLABLE sin default y sin tocar datos existentes
    op.add_column('investors', sa.Column('shares_granted_frozen', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('investors', 'shares_granted_frozen')
