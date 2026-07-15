"""Add Package model

Revision ID: e13284a591f4
Revises: 8b7efb727ada
Create Date: 2026-07-08 09:20:51.051009

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision: str = 'e13284a591f4'
down_revision: Union[str, Sequence[str], None] = '8b7efb727ada'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('packages',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('value', sa.Integer(), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_packages_id'), 'packages', ['id'], unique=False)
    op.create_index(op.f('ix_packages_value'), 'packages', ['value'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_packages_value'), table_name='packages')
    op.drop_index(op.f('ix_packages_id'), table_name='packages')
    op.drop_table('packages')
