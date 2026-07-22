"""create sarlaft_checks table

Revision ID: e5f6a7b8c9d0
Revises: f23b2c8a14b9
Create Date: 2026-07-22

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'e5f6a7b8c9d0'
down_revision = ('d11111111111', 'b2c3d4e5f6a1')
branch_labels = None
depends_on = None

def upgrade():
    op.execute("""
    CREATE TABLE IF NOT EXISTS `sarlaft_checks` (
      `id` INT AUTO_INCREMENT PRIMARY KEY,
      `user_id` BIGINT NOT NULL,
      `investment_request_id` INT NULL,
      `tusdatos_job_id` VARCHAR(255) NULL,
      `tusdatos_status` VARCHAR(255) NULL,
      `tusdatos_report_id` VARCHAR(255) NULL,
      `tusdatos_hallazgos` LONGTEXT NULL,
      `tusdatos_msg` VARCHAR(255) NULL,
      `tusdatos_sources` LONGTEXT NULL,
      `tusdatos_justificacion` TEXT NULL,
      `tusdatos_evidencia_paths` JSON NULL,
      `tusdatos_hallazgos_corregidos` TINYINT(1) NOT NULL DEFAULT 0,
      `tusdatos_fecha_correccion` TIMESTAMP NULL,
      `tusdatos_corregido_por` BIGINT NULL,
      `tusdatos_last_check` TIMESTAMP NULL,
      `document_number` VARCHAR(50) NULL,
      `document_type` VARCHAR(20) NULL DEFAULT 'CC',
      `details` JSON NULL,
      `pdf_path` VARCHAR(500) NULL,
      `risk_level` VARCHAR(50) DEFAULT 'CLEAN',
      `has_findings` TINYINT(1) DEFAULT 0,
      `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
      `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX `idx_sarlaft_user_id` (`user_id`),
      INDEX `idx_sarlaft_job_id` (`tusdatos_job_id`),
      INDEX `idx_sarlaft_report_id` (`tusdatos_report_id`),
      CONSTRAINT `fk_sarlaft_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    -- Asegurar que existan si la tabla fue creada previamente
    ALTER TABLE `sarlaft_checks` ADD COLUMN IF NOT EXISTS `document_number` VARCHAR(50) NULL;
    ALTER TABLE `sarlaft_checks` ADD COLUMN IF NOT EXISTS `document_type` VARCHAR(20) NULL DEFAULT 'CC';
    ALTER TABLE `sarlaft_checks` ADD COLUMN IF NOT EXISTS `details` JSON NULL;
    """)

def downgrade():
    op.drop_index('idx_sarlaft_report_id', table_name='sarlaft_checks')
    op.drop_index('idx_sarlaft_job_id', table_name='sarlaft_checks')
    op.drop_index('idx_sarlaft_user_id', table_name='sarlaft_checks')
    op.drop_table('sarlaft_checks')
