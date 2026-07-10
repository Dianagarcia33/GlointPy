"""merge heads

Revision ID: f23b2c8a14b9
Revises: d3ef512b9a7c, c3cd00420ab0
Create Date: 2026-07-10 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f23b2c8a14b9'
down_revision: Union[str, Sequence[str], None] = ('d3ef512b9a7c', 'c3cd00420ab0')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
