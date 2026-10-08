"""create_credits_and_config_tables

Revision ID: m1n2o3p4q5r6
Revises: l5m6n7o8p9q0
Create Date: 2026-10-07

"""
from alembic import op
import sqlalchemy as sa

revision = 'm1n2o3p4q5r6'
down_revision = 'l5m6n7o8p9q0'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # 1. Tabla credit_configs
    try:
        op.create_table(
            'credit_configs',
            sa.Column('id', sa.BigInteger(), primary_key=True, autoincrement=True),
            sa.Column('max_usury_rate_ea', sa.Numeric(6, 2), nullable=False, server_default='26.50'),
            sa.Column('max_usury_rate_monthly', sa.Numeric(6, 2), nullable=False, server_default='1.98'),
            sa.Column('default_interest_rate_monthly', sa.Numeric(6, 2), nullable=False, server_default='1.80'),
            sa.Column('min_amount', sa.Numeric(15, 2), nullable=False, server_default='100000.00'),
            sa.Column('max_amount', sa.Numeric(15, 2), nullable=False, server_default='20000000.00'),
            sa.Column('min_term_months', sa.Integer(), nullable=False, server_default='1'),
            sa.Column('max_term_months', sa.Integer(), nullable=False, server_default='24'),
            sa.Column('updated_by', sa.BigInteger(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now())
        )
    except Exception as e:
        print("credit_configs create error / already exists:", e)

    # 2. Tabla credits
    try:
        op.create_table(
            'credits',
            sa.Column('id', sa.BigInteger(), primary_key=True, autoincrement=True),
            sa.Column('user_id', sa.BigInteger(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('requested_amount', sa.Numeric(15, 2), nullable=False),
            sa.Column('approved_amount', sa.Numeric(15, 2), nullable=True),
            sa.Column('term_months', sa.Integer(), nullable=False),
            sa.Column('interest_rate', sa.Numeric(6, 2), nullable=False),
            sa.Column('frequency', sa.String(50), nullable=False, server_default='monthly'),
            sa.Column('status', sa.String(50), nullable=False, server_default='PENDING'),
            sa.Column('purpose', sa.Text(), nullable=True),
            sa.Column('user_bank_account_id', sa.BigInteger(), sa.ForeignKey('user_bank_accounts.id', ondelete='SET NULL'), nullable=True),
            sa.Column('banco', sa.String(255), nullable=False),
            sa.Column('tipo_cuenta', sa.String(255), nullable=False),
            sa.Column('numero_cuenta', sa.String(255), nullable=False),
            sa.Column('approved_by', sa.BigInteger(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('approved_at', sa.DateTime(), nullable=True),
            sa.Column('rejected_by', sa.BigInteger(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('rejected_at', sa.DateTime(), nullable=True),
            sa.Column('rejection_reason', sa.Text(), nullable=True),
            sa.Column('disbursed_at', sa.DateTime(), nullable=True),
            sa.Column('disbursement_method', sa.String(100), nullable=True, server_default='YOINT_DISPERSION'),
            sa.Column('disbursement_reference', sa.String(255), nullable=True),
            sa.Column('disbursement_receipt_url', sa.String(500), nullable=True),
            sa.Column('admin_notes', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now())
        )
        op.create_index('ix_credits_user_id', 'credits', ['user_id'])
        op.create_index('ix_credits_status', 'credits', ['status'])
    except Exception as e:
        print("credits create error / already exists:", e)

    # 3. Tabla credit_installments
    try:
        op.create_table(
            'credit_installments',
            sa.Column('id', sa.BigInteger(), primary_key=True, autoincrement=True),
            sa.Column('credit_id', sa.BigInteger(), sa.ForeignKey('credits.id', ondelete='CASCADE'), nullable=False),
            sa.Column('installment_number', sa.Integer(), nullable=False),
            sa.Column('due_date', sa.Date(), nullable=False),
            sa.Column('principal_amount', sa.Numeric(15, 2), nullable=False),
            sa.Column('interest_amount', sa.Numeric(15, 2), nullable=False, server_default='0.00'),
            sa.Column('total_amount', sa.Numeric(15, 2), nullable=False),
            sa.Column('wallet_amount_paid', sa.Numeric(15, 2), nullable=False, server_default='0.00'),
            sa.Column('external_amount_paid', sa.Numeric(15, 2), nullable=False, server_default='0.00'),
            sa.Column('paid_amount', sa.Numeric(15, 2), nullable=False, server_default='0.00'),
            sa.Column('status', sa.String(50), nullable=False, server_default='PENDING'),
            sa.Column('payment_method', sa.String(100), nullable=True),
            sa.Column('payment_reference', sa.String(100), nullable=True),
            sa.Column('receipt_url', sa.String(500), nullable=True),
            sa.Column('paid_at', sa.DateTime(), nullable=True),
            sa.Column('reviewed_by', sa.BigInteger(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('reviewed_at', sa.DateTime(), nullable=True),
            sa.Column('rejection_reason', sa.Text(), nullable=True),
            sa.Column('notes', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now())
        )
        op.create_index('ix_credit_installments_credit_id', 'credit_installments', ['credit_id'])
        op.create_index('ix_credit_installments_status', 'credit_installments', ['status'])
    except Exception as e:
        print("credit_installments create error / already exists:", e)

    # 4. Modificar yoint_dispersions
    try:
        op.add_column('yoint_dispersions', sa.Column('credit_id', sa.BigInteger(), nullable=True))
        op.create_index('ix_yoint_dispersions_credit_id', 'yoint_dispersions', ['credit_id'])
        op.create_foreign_key(
            'fk_yoint_dispersions_credit_id',
            'yoint_dispersions', 'credits',
            ['credit_id'], ['id'],
            ondelete='CASCADE'
        )
    except Exception as e:
        print("yoint_dispersions add credit_id error:", e)

    try:
        op.alter_column('yoint_dispersions', 'withdrawal_id', existing_type=sa.BigInteger(), nullable=True)
    except Exception as e:
        print("alter withdrawal_id nullable error:", e)


def downgrade() -> None:
    try:
        op.drop_constraint('fk_yoint_dispersions_credit_id', 'yoint_dispersions', type_='foreignkey')
        op.drop_index('ix_yoint_dispersions_credit_id', table_name='yoint_dispersions')
        op.drop_column('yoint_dispersions', 'credit_id')
    except Exception:
        pass

    try:
        op.drop_index('ix_credit_installments_status', table_name='credit_installments')
        op.drop_index('ix_credit_installments_credit_id', table_name='credit_installments')
        op.drop_table('credit_installments')
    except Exception:
        pass

    try:
        op.drop_index('ix_credits_status', table_name='credits')
        op.drop_index('ix_credits_user_id', table_name='credits')
        op.drop_table('credits')
    except Exception:
        pass

    try:
        op.drop_table('credit_configs')
    except Exception:
        pass
