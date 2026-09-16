"""create_crm_form_keys_table

Revision ID: j3k4l5m6n7o8
Revises: i2j3k4l5m6n7
Create Date: 2026-09-16

"""
from alembic import op
import sqlalchemy as sa

revision = 'j3k4l5m6n7o8'
down_revision = 'i2j3k4l5m6n7'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.execute("""
    CREATE TABLE IF NOT EXISTS `crm_form_keys` (
      `id` bigint NOT NULL AUTO_INCREMENT,
      `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
      `project_id` bigint NOT NULL,
      `api_key` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
      `is_active` tinyint(1) NOT NULL DEFAULT '1',
      `created_by` bigint DEFAULT NULL,
      `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
      `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (`id`),
      UNIQUE KEY `ux_crm_form_keys_api_key` (`api_key`),
      KEY `ix_crm_form_keys_project_id` (`project_id`),
      CONSTRAINT `fk_crm_form_keys_project_id` FOREIGN KEY (`project_id`) REFERENCES `crm_projects` (`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """)

def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS `crm_form_keys`;")
