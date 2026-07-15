"""create_system_events

Revision ID: c12345678901
Revises: b2c3d4e5f6a1
Create Date: 2026-07-15 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision: str = 'c12345678901'
down_revision: Union[str, Sequence[str], None] = 'b2c3d4e5f6a1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'system_events',
        sa.Column('id', sa.BigInteger().with_variant(sa.BigInteger(), 'mysql'), autoincrement=True, nullable=False),
        sa.Column('type', sa.String(length=255), nullable=False),
        sa.Column('is_recurring', sa.Boolean(), server_default=sa.text('0'), nullable=False),
        sa.Column('recurrence_start_day', sa.Integer(), nullable=True),
        sa.Column('recurrence_end_day', sa.Integer(), nullable=True),
        sa.Column('start_date', sa.DateTime(), nullable=True),
        sa.Column('end_date', sa.DateTime(), nullable=True),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('1'), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('system_events_type_index', 'system_events', ['type'], unique=False)


def downgrade() -> None:
    op.drop_index('system_events_type_index', table_name='system_events')
    op.drop_table('system_events')
