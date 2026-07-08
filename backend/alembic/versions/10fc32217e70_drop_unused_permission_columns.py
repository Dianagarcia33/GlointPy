"""Drop unused permission columns

Revision ID: 10fc32217e70
Revises: e13284a591f4
Create Date: 2026-07-08 09:24:17.375229

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '10fc32217e70'
down_revision: Union[str, Sequence[str], None] = 'e13284a591f4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_column('permissions', 'is_active')
    op.drop_column('permissions', 'action')
    op.drop_column('permissions', 'slug')
    op.drop_column('permissions', 'updated_at')


def downgrade() -> None:
    """Downgrade schema."""
    pass
