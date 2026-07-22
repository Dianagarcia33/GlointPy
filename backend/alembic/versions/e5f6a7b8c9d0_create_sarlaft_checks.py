"""create sarlaft_checks table

Revision ID: e5f6a7b8c9d0
Revises: f23b2c8a14b9
Create Date: 2026-07-22

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'e5f6a7b8c9d0'
down_revision = 'f23b2c8a14b9'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'sarlaft_checks',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True, autoincrement=True),
        sa.Column('user_id', sa.BigInteger(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('investment_request_id', sa.Integer(), sa.ForeignKey('investment_requests.id'), nullable=True),
        sa.Column('tusdatos_job_id', sa.String(255), nullable=True),
        sa.Column('tusdatos_status', sa.String(255), nullable=True),
        sa.Column('tusdatos_report_id', sa.String(255), nullable=True),
        sa.Column('tusdatos_hallazgos', sa.Text(), nullable=True),
        sa.Column('tusdatos_msg', sa.String(255), nullable=True),
        sa.Column('tusdatos_sources', sa.Text(), nullable=True),
        sa.Column('tusdatos_justificacion', sa.Text(), nullable=True),
        sa.Column('tusdatos_evidencia_paths', sa.JSON(), nullable=True),
        sa.Column('tusdatos_hallazgos_corregidos', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('tusdatos_fecha_correccion', sa.DateTime(), nullable=True),
        sa.Column('tusdatos_corregido_por', sa.BigInteger(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('tusdatos_last_check', sa.DateTime(), nullable=True),
        sa.Column('pdf_path', sa.String(500), nullable=True),
        sa.Column('risk_level', sa.String(50), server_default='CLEAN'),
        sa.Column('has_findings', sa.Boolean(), server_default='0'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now())
    )
    op.create_index('idx_sarlaft_user_id', 'sarlaft_checks', ['user_id'])
    op.create_index('idx_sarlaft_job_id', 'sarlaft_checks', ['tusdatos_job_id'])
    op.create_index('idx_sarlaft_report_id', 'sarlaft_checks', ['tusdatos_report_id'])

def downgrade():
    op.drop_index('idx_sarlaft_report_id', table_name='sarlaft_checks')
    op.drop_index('idx_sarlaft_job_id', table_name='sarlaft_checks')
    op.drop_index('idx_sarlaft_user_id', table_name='sarlaft_checks')
    op.drop_table('sarlaft_checks')
