"""create_crm_tables

Revision ID: h1i2j3k4l5m6
Revises: g4d5e6f7a8b9
Create Date: 2026-07-27

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'h1i2j3k4l5m6'
down_revision = 'g4d5e6f7a8b9'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.execute("""
    CREATE TABLE IF NOT EXISTS `crm_projects` (
      `id` bigint NOT NULL AUTO_INCREMENT,
      `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
      `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
      `description` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      `target_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
      `raised_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
      `status` enum('activo','en_pausa','meta_alcanzada','archivado') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'activo',
      `start_date` datetime DEFAULT NULL,
      `end_date` datetime DEFAULT NULL,
      `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
      `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (`id`),
      UNIQUE KEY `ux_crm_projects_code` (`code`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """)

    op.execute("""
    CREATE TABLE IF NOT EXISTS `crm_leads` (
      `id` bigint NOT NULL AUTO_INCREMENT,
      `project_id` bigint NOT NULL,
      `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
      `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      `phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      `document_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      `estimated_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
      `stage` enum('lead_entrante','contactado','cita_presentacion','negociacion','cierre_ganado','perdido') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'lead_entrante',
      `source` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'Directo',
      `commercial_id` bigint DEFAULT NULL,
      `loss_reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
      `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (`id`),
      KEY `ix_crm_leads_project_id` (`project_id`),
      KEY `ix_crm_leads_commercial_id` (`commercial_id`),
      CONSTRAINT `fk_crm_leads_project_id` FOREIGN KEY (`project_id`) REFERENCES `crm_projects` (`id`) ON DELETE CASCADE,
      CONSTRAINT `fk_crm_leads_commercial_id` FOREIGN KEY (`commercial_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """)

    op.execute("""
    CREATE TABLE IF NOT EXISTS `crm_activities` (
      `id` bigint NOT NULL AUTO_INCREMENT,
      `lead_id` bigint NOT NULL,
      `user_id` bigint NOT NULL,
      `type` enum('nota','llamada','reunion','tarea') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'nota',
      `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
      `description` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      `due_date` datetime DEFAULT NULL,
      `is_completed` tinyint(1) NOT NULL DEFAULT '0',
      `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (`id`),
      KEY `ix_crm_activities_lead_id` (`lead_id`),
      KEY `ix_crm_activities_user_id` (`user_id`),
      CONSTRAINT `fk_crm_activities_lead_id` FOREIGN KEY (`lead_id`) REFERENCES `crm_leads` (`id`) ON DELETE CASCADE,
      CONSTRAINT `fk_crm_activities_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """)

def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS `crm_activities`;")
    op.execute("DROP TABLE IF EXISTS `crm_leads`;")
    op.execute("DROP TABLE IF EXISTS `crm_projects`;")
