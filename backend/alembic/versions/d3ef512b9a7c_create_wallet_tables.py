"""create wallet tables

Revision ID: d3ef512b9a7c
Revises: b17a6c98c110
Create Date: 2026-07-09 13:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd3ef512b9a7c'
down_revision: Union[str, Sequence[str], None] = 'b17a6c98c110'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create wallets table
    op.create_table(
        'wallets',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.BigInteger(), nullable=False),
        sa.Column('balance', sa.Numeric(precision=15, scale=2), nullable=False, server_default='0.00'),
        sa.Column('currency', sa.String(length=3), nullable=False, server_default='COP'),
        sa.Column('status', sa.Enum('active', 'frozen', name='walletstatus'), nullable=False, server_default='active'),
        sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )
    op.create_foreign_key(
        'fk_wallets_users',
        'wallets',
        'users',
        ['user_id'],
        ['id'],
        ondelete='CASCADE'
    )

    # 2. Create wallet_transactions table
    op.create_table(
        'wallet_transactions',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('wallet_id', sa.BigInteger(), nullable=False),
        sa.Column('amount', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('type', sa.String(length=255), nullable=False),
        sa.Column('reference_type', sa.String(length=255), nullable=True),
        sa.Column('reference_id', sa.BigInteger(), nullable=True),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('balance_after', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_foreign_key(
        'fk_wallet_transactions_wallets',
        'wallet_transactions',
        'wallets',
        ['wallet_id'],
        ['id'],
        ondelete='CASCADE'
    )


def downgrade() -> None:
    op.drop_table('wallet_transactions')
    op.drop_table('wallets')
