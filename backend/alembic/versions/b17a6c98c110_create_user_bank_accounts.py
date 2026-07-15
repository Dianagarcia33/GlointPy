"""create user bank accounts table

Revision ID: b17a6c98c110
Revises: c3cd00420ab0
Create Date: 2026-07-09 11:23:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b17a6c98c110'
down_revision: Union[str, Sequence[str], None] = 'c3cd00420ab0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'user_bank_accounts',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.BigInteger(), nullable=False),
        sa.Column('banco', sa.String(length=255), nullable=False),
        sa.Column('tipo_cuenta', sa.String(length=255), nullable=False),
        sa.Column('numero_cuenta', sa.String(length=255), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('1')),
        sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_foreign_key(
        'fk_user_bank_accounts_users',
        'user_bank_accounts',
        'users',
        ['user_id'],
        ['id'],
        ondelete='CASCADE'
    )


def downgrade() -> None:
    op.drop_table('user_bank_accounts')
