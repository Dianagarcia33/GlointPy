"""create_chat_tables

Revision ID: g4d5e6f7a8b9
Revises: f3c4b5a6d7e8
Create Date: 2026-07-27

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'g4d5e6f7a8b9'
down_revision = 'f3c4b5a6d7e8'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.execute("""
    CREATE TABLE IF NOT EXISTS `chat_rooms` (
      `id` bigint unsigned NOT NULL AUTO_INCREMENT,
      `name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      `type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'direct',
      `is_active` tinyint(1) NOT NULL DEFAULT '1',
      `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
      `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """)

    op.execute("""
    CREATE TABLE IF NOT EXISTS `chat_participants` (
      `id` bigint unsigned NOT NULL AUTO_INCREMENT,
      `room_id` bigint unsigned NOT NULL,
      `user_id` bigint unsigned NOT NULL,
      `joined_at` datetime DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (`id`),
      KEY `ix_chat_participants_room_id` (`room_id`),
      KEY `ix_chat_participants_user_id` (`user_id`),
      CONSTRAINT `fk_chat_participants_room_id` FOREIGN KEY (`room_id`) REFERENCES `chat_rooms` (`id`) ON DELETE CASCADE,
      CONSTRAINT `fk_chat_participants_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """)

    op.execute("""
    CREATE TABLE IF NOT EXISTS `chat_messages` (
      `id` bigint unsigned NOT NULL AUTO_INCREMENT,
      `room_id` bigint unsigned NOT NULL,
      `sender_id` bigint unsigned NOT NULL,
      `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
      `is_read` tinyint(1) NOT NULL DEFAULT '0',
      `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (`id`),
      KEY `ix_chat_messages_room_id` (`room_id`),
      KEY `ix_chat_messages_sender_id` (`sender_id`),
      KEY `ix_chat_messages_created_at` (`created_at`),
      CONSTRAINT `fk_chat_messages_room_id` FOREIGN KEY (`room_id`) REFERENCES `chat_rooms` (`id`) ON DELETE CASCADE,
      CONSTRAINT `fk_chat_messages_sender_id` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """)

def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS `chat_messages`;")
    op.execute("DROP TABLE IF EXISTS `chat_participants`;")
    op.execute("DROP TABLE IF EXISTS `chat_rooms`;")
