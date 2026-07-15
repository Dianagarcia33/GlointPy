"""add period model

Revision ID: 8b7efb727ada
Revises: 89742f23f547
Create Date: 2026-07-08 05:40:16.006061

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8b7efb727ada'
down_revision: Union[str, Sequence[str], None] = '89742f23f547'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('periods',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('percentage', sa.Float(), nullable=False),
    sa.Column('months', sa.Integer(), nullable=False),
    sa.Column('days', sa.Integer(), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_periods_id'), 'periods', ['id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_periods_id'), table_name='periods')
    op.drop_table('periods')

