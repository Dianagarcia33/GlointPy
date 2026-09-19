"""create_user_shares_and_movements_tables

Revision ID: k4l5m6n7o8p9
Revises: j3k4l5m6n7o8
Create Date: 2026-09-19

"""
from alembic import op
import sqlalchemy as sa

revision = 'k4l5m6n7o8p9'
down_revision = 'j3k4l5m6n7o8'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.execute("""
    CREATE TABLE IF NOT EXISTS `user_shares` (
      `id` bigint NOT NULL AUTO_INCREMENT,
      `user_id` bigint NOT NULL,
      `total_shares` int NOT NULL DEFAULT '0',
      `available_shares` int NOT NULL DEFAULT '0',
      `locked_shares` int NOT NULL DEFAULT '0',
      `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
      `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (`id`),
      UNIQUE KEY `ux_user_shares_user_id` (`user_id`),
      CONSTRAINT `fk_user_shares_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """)

    op.execute("""
    CREATE TABLE IF NOT EXISTS `share_movements` (
      `id` bigint NOT NULL AUTO_INCREMENT,
      `user_id` bigint NOT NULL,
      `movement_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
      `shares_quantity` int NOT NULL,
      `balance_before` int NOT NULL DEFAULT '0',
      `balance_after` int NOT NULL DEFAULT '0',
      `investor_id` bigint DEFAULT NULL,
      `package_id` int DEFAULT NULL,
      `trade_order_id` bigint DEFAULT NULL,
      `listing_id` bigint DEFAULT NULL,
      `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
      `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (`id`),
      KEY `ix_share_movements_user_id` (`user_id`),
      KEY `ix_share_movements_investor_id` (`investor_id`),
      KEY `ix_share_movements_package_id` (`package_id`),
      KEY `ix_share_movements_created_at` (`created_at`),
      CONSTRAINT `fk_share_movements_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
      CONSTRAINT `fk_share_movements_investor_id` FOREIGN KEY (`investor_id`) REFERENCES `investors` (`id`) ON DELETE SET NULL,
      CONSTRAINT `fk_share_movements_package_id` FOREIGN KEY (`package_id`) REFERENCES `packages` (`id`) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """)

def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS `share_movements`;")
    op.execute("DROP TABLE IF EXISTS `user_shares`;")
