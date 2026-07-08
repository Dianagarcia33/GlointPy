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


from sqlalchemy.engine.reflection import Inspector

def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    columns = [c['name'] for c in inspector.get_columns('permissions')]
    
    if 'is_active' in columns:
        op.drop_column('permissions', 'is_active')
    if 'action' in columns:
        op.drop_column('permissions', 'action')
    if 'slug' in columns:
        op.drop_column('permissions', 'slug')
    if 'updated_at' in columns:
        op.drop_column('permissions', 'updated_at')


def downgrade() -> None:
    """Downgrade schema."""
    pass
