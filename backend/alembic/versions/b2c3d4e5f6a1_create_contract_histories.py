"""create contract histories

Revision ID: b2c3d4e5f6a1
Revises: a1b2c3d4e5f6
Create Date: 2026-07-14 21:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b2c3d4e5f6a1'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('contract_histories',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('investor_id', sa.BigInteger(), nullable=False),
        sa.Column('paquete_inversion_id', sa.Integer(), nullable=True),
        sa.Column('contract_period_id', sa.Integer(), nullable=True),
        sa.Column('fecha_inicio', sa.Date(), nullable=False),
        sa.Column('fecha_fin', sa.Date(), nullable=False),
        sa.Column('dias_contrato', sa.Integer(), nullable=True),
        sa.Column('total_contrato', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('tasa_interes', sa.String(length=255), nullable=False),
        sa.Column('acciones_otorgadas', sa.Integer(), server_default='0', nullable=False),
        sa.Column('valor_total_acciones', sa.Numeric(precision=15, scale=2), server_default='0.00', nullable=False),
        sa.Column('porcentaje_participacion_accionista', sa.Numeric(precision=8, scale=5), server_default='0.00000', nullable=False),
        sa.Column('rendimiento_aprobado_mensual', sa.Numeric(precision=5, scale=2), server_default='0.00', nullable=False),
        sa.Column('rentabilidad_contrato', sa.Numeric(precision=15, scale=2), server_default='0.00', nullable=False),
        sa.Column('rendimiento_total_contrato', sa.Numeric(precision=15, scale=2), server_default='0.00', nullable=False),
        sa.Column('liquidacion_diaria_capital', sa.Numeric(precision=15, scale=2), server_default='0.00', nullable=False),
        sa.Column('liquidacion_diaria_rendimiento', sa.Numeric(precision=15, scale=2), server_default='0.00', nullable=False),
        sa.Column('rendimiento_total_generado', sa.Numeric(precision=15, scale=2), server_default='0.00', nullable=False),
        sa.Column('rendimiento_total_pagado', sa.Numeric(precision=15, scale=2), server_default='0.00', nullable=False),
        sa.Column('motivo', sa.String(length=255), nullable=False),
        sa.Column('observaciones', sa.Text(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), nullable=True),
        sa.Column('updated_at', sa.TIMESTAMP(), nullable=True),
        sa.ForeignKeyConstraint(['investor_id'], ['investors.id'], name='fk_histories_investor', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['paquete_inversion_id'], ['packages.id'], name='fk_histories_package', ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['contract_period_id'], ['periods.id'], name='fk_histories_period', ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('contract_histories')
