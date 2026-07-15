"""fix_system_events

Revision ID: d11111111111
Revises: c12345678901
Create Date: 2026-07-15 01:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision: str = 'd11111111111'
down_revision: Union[str, Sequence[str], None] = 'c12345678901'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Usamos execute con IF NOT EXISTS para que no falle si la tabla ya está
    # o la cree si alguien la borró manualmente.
    op.execute("""
    CREATE TABLE IF NOT EXISTS `system_events` (
      `id` bigint unsigned NOT NULL AUTO_INCREMENT,
      `type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
      `is_recurring` tinyint(1) NOT NULL DEFAULT '0',
      `recurrence_start_day` int DEFAULT NULL,
      `recurrence_end_day` int DEFAULT NULL,
      `start_date` datetime DEFAULT NULL,
      `end_date` datetime DEFAULT NULL,
      `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      `is_active` tinyint(1) NOT NULL DEFAULT '1',
      `created_at` timestamp NULL DEFAULT NULL,
      `updated_at` timestamp NULL DEFAULT NULL,
      PRIMARY KEY (`id`),
      KEY `system_events_type_index` (`type`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """)

def downgrade() -> None:
    op.drop_table('system_events')
