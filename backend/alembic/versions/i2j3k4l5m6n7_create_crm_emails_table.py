"""create_crm_emails_table

Revision ID: i2j3k4l5m6n7
Revises: h1i2j3k4l5m6
Create Date: 2026-07-27

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'i2j3k4l5m6n7'
down_revision = 'h1i2j3k4l5m6'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.execute("""
    CREATE TABLE IF NOT EXISTS `crm_emails` (
      `id` bigint NOT NULL AUTO_INCREMENT,
      `lead_id` bigint DEFAULT NULL,
      `project_id` bigint DEFAULT NULL,
      `user_id` bigint NOT NULL,
      `direction` enum('outbound','inbound') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'outbound',
      `sender_email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
      `recipient_email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
      `subject` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
      `body_html` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
      `body_text` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      `status` enum('draft','sent','delivered','failed','received') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'sent',
      `is_read` tinyint(1) NOT NULL DEFAULT '1',
      `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (`id`),
      KEY `ix_crm_emails_lead_id` (`lead_id`),
      KEY `ix_crm_emails_project_id` (`project_id`),
      KEY `ix_crm_emails_user_id` (`user_id`),
      KEY `ix_crm_emails_created_at` (`created_at`),
      CONSTRAINT `fk_crm_emails_lead_id` FOREIGN KEY (`lead_id`) REFERENCES `crm_leads` (`id`) ON DELETE CASCADE,
      CONSTRAINT `fk_crm_emails_project_id` FOREIGN KEY (`project_id`) REFERENCES `crm_projects` (`id`) ON DELETE SET NULL,
      CONSTRAINT `fk_crm_emails_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """)

def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS `crm_emails`;")
