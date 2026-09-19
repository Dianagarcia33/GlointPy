"""add_parent_user_id_to_users

Revision ID: l5m6n7o8p9q0
Revises: k4l5m6n7o8p9
Create Date: 2026-09-19

"""
from alembic import op
import sqlalchemy as sa

revision = 'l5m6n7o8p9q0'
down_revision = 'k4l5m6n7o8p9'
branch_labels = None
depends_on = None

def upgrade() -> None:
    try:
        op.add_column('users', sa.Column('parent_user_id', sa.BigInteger(), nullable=True))
        op.create_index('ix_users_parent_user_id', 'users', ['parent_user_id'])
        op.create_foreign_key(
            'fk_users_parent_user_id',
            'users', 'users',
            ['parent_user_id'], ['id'],
            ondelete='SET NULL'
        )
    except Exception:
        pass

def downgrade() -> None:
    try:
        op.drop_constraint('fk_users_parent_user_id', 'users', type_='foreignkey')
        op.drop_index('ix_users_parent_user_id', table_name='users')
        op.drop_column('users', 'parent_user_id')
    except Exception:
        pass
