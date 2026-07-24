"""create_commercial_sales table

Revision ID: f3c4b5a6d7e8
Revises: e5f6a7b8c9d0
Create Date: 2026-07-23

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'f3c4b5a6d7e8'
down_revision = 'e5f6a7b8c9d0'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.execute("""
    CREATE TABLE IF NOT EXISTS `commercial_sales` (
      `id` bigint unsigned NOT NULL AUTO_INCREMENT,
      `commercial_id` bigint NOT NULL,
      `client_document` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
      `client_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      `sale_type` enum('contrato_nuevo','reinversion','referido') COLLATE utf8mb4_unicode_ci NOT NULL,
      `referrer_client_id` bigint DEFAULT NULL,
      `referrer_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      `amount` decimal(15,2) NOT NULL,
      `commission_rate` decimal(5,4) NOT NULL,
      `commission_amount` decimal(15,2) NOT NULL,
      `tramo_a_amount` decimal(15,2) DEFAULT '0.00',
      `tramo_b_amount` decimal(15,2) DEFAULT '0.00',
      `sale_date` date NOT NULL,
      `created_at` datetime DEFAULT NULL,
      PRIMARY KEY (`id`),
      KEY `ix_commercial_sales_client_document` (`client_document`),
      KEY `fk_commercial_sales_commercial_id` (`commercial_id`),
      KEY `fk_commercial_sales_referrer_client_id` (`referrer_client_id`),
      CONSTRAINT `fk_commercial_sales_commercial_id` FOREIGN KEY (`commercial_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
      CONSTRAINT `fk_commercial_sales_referrer_client_id` FOREIGN KEY (`referrer_client_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """)

def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS `commercial_sales`;")
