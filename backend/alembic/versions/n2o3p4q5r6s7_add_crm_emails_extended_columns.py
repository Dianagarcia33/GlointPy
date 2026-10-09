"""add_crm_emails_extended_columns

Revision ID: n2o3p4q5r6s7
Revises: m1n2o3p4q5r6
Create Date: 2026-10-09

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.mysql import LONGTEXT

revision = 'n2o3p4q5r6s7'
down_revision = 'm1n2o3p4q5r6'
branch_labels = None
depends_on = None

def upgrade() -> None:
    for col_sql in [
        "ALTER TABLE crm_emails ADD COLUMN IF NOT EXISTS is_starred TINYINT(1) NOT NULL DEFAULT 0",
        "ALTER TABLE crm_emails ADD COLUMN IF NOT EXISTS is_archived TINYINT(1) NOT NULL DEFAULT 0",
        "ALTER TABLE crm_emails ADD COLUMN IF NOT EXISTS is_deleted TINYINT(1) NOT NULL DEFAULT 0",
        "ALTER TABLE crm_emails ADD COLUMN IF NOT EXISTS calendar_event LONGTEXT NULL",
        "ALTER TABLE crm_emails ADD COLUMN IF NOT EXISTS cc_emails VARCHAR(500) NULL",
        "ALTER TABLE crm_emails ADD COLUMN IF NOT EXISTS bcc_emails VARCHAR(500) NULL"
    ]:
        try:
            op.execute(col_sql)
        except Exception:
            pass

def downgrade() -> None:
    for col in ['is_starred', 'is_archived', 'is_deleted', 'calendar_event', 'cc_emails', 'bcc_emails']:
        try:
            op.execute(f"ALTER TABLE crm_emails DROP COLUMN IF EXISTS {col}")
        except Exception:
            pass
