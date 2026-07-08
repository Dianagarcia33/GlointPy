"""add_user_identification_fields

Revision ID: 89742f23f547
Revises: c1763ef98c00
Create Date: 2026-07-08 03:49:23.357637

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '89742f23f547'
down_revision: Union[str, Sequence[str], None] = 'c1763ef98c00'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('document_id', sa.String(length=50), nullable=True))
    op.add_column('users', sa.Column('phone_number', sa.String(length=50), nullable=True))
    op.create_index(op.f('ix_users_document_id'), 'users', ['document_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_users_document_id'), table_name='users')
    op.drop_column('users', 'phone_number')
    op.drop_column('users', 'document_id')
