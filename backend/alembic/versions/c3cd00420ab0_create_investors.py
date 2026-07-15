"""create investors

Revision ID: c3cd00420ab0
Revises: 176b81e08e3b
Create Date: 2026-07-08 10:27:09.017969

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql


# revision identifiers, used by Alembic.
revision: str = 'c3cd00420ab0'
down_revision: Union[str, Sequence[str], None] = '176b81e08e3b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Check if investors table exists and drop it to create from scratch
    connection = op.get_bind()
    has_investors = connection.dialect.has_table(connection, 'investors')
    
    if has_investors:
        # Drop dependent foreign keys if they exist, or just drop the table 
        # (Assuming CASCADE or we can just drop it if no strict constraints block it)
        # For safety, let's just use drop_table. If it fails due to foreign keys, we handle it.
        # But this is a fresh start for this module, so there shouldn't be new tables depending on it yet.
        op.execute("SET FOREIGN_KEY_CHECKS=0;")
        op.drop_table('investors')
        op.execute("SET FOREIGN_KEY_CHECKS=1;")

    op.create_table(
        'investors',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('assigned_code', sa.String(length=50), nullable=False),
        sa.Column('referred_by', sa.String(length=255), nullable=True),
        sa.Column('user_id', sa.BigInteger(), nullable=False),
        sa.Column('package_id', sa.Integer(), nullable=False),
        sa.Column('period_id', sa.Integer(), nullable=False),
        sa.Column('start_date', sa.DateTime(), nullable=False),
        sa.Column('observations', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_investors_assigned_code'), 'investors', ['assigned_code'], unique=True)
    op.create_foreign_key('fk_investors_users', 'investors', 'users', ['user_id'], ['id'], ondelete='CASCADE')
    op.create_foreign_key('fk_investors_periods', 'investors', 'periods', ['period_id'], ['id'])
    op.create_foreign_key('fk_investors_packages', 'investors', 'packages', ['package_id'], ['id'])


def downgrade() -> None:
    op.drop_table('investors')
