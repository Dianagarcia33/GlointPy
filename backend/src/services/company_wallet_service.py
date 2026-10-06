import logging
from decimal import Decimal
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from src.models.user import User
from src.models.wallet import Wallet, WalletTransaction, WalletStatus
from src.models.withdrawal import Withdrawal

logger = logging.getLogger(__name__)

class CompanyWalletService:
    """
    Servicio de gestión de la Billetera Corporativa de Gloint (Caja de Impuestos / Tesorería).
    Garantiza el recaudo transparente del 3.2% de retención sobre retiros de rendimientos.
    """

    @staticmethod
    async def get_or_create_company_wallet(db: AsyncSession) -> Wallet:
        """
        Obtiene o crea la billetera del Administrador / Sistema de Gloint.
        Prioriza:
        1. Usuario con email 'admin@gloint.com.co'
        2. Usuario con is_superuser = True
        3. Usuario con id = 1
        """
        # 1. Buscar admin oficial
        admin_res = await db.execute(
            select(User).where(User.email == "admin@gloint.com.co")
        )
        admin_user = admin_res.scalars().first()

        if not admin_user:
            # 2. Buscar superusuario
            super_res = await db.execute(
                select(User).where(User.is_superuser == True).order_by(User.id.asc())
            )
            admin_user = super_res.scalars().first()

        if not admin_user:
            # 3. Primer usuario del sistema
            first_res = await db.execute(
                select(User).order_by(User.id.asc())
            )
            admin_user = first_res.scalars().first()

        if not admin_user:
            raise RuntimeError("No se encontró ningún usuario administrador en el sistema para la Billetera Corporativa.")

        # Buscar billetera del admin
        w_res = await db.execute(
            select(Wallet).where(Wallet.user_id == admin_user.id)
        )
        wallet = w_res.scalars().first()

        if not wallet:
            wallet = Wallet(
                user_id=admin_user.id,
                balance=Decimal("0.00"),
                currency="COP",
                status=WalletStatus.ACTIVE
            )
            db.add(wallet)
            await db.flush()
            logger.info(f"Creada Billetera Corporativa para admin user_id={admin_user.id}")

        return wallet

    @staticmethod
    async def credit_tax_retention(
        db: AsyncSession, 
        withdrawal: Withdrawal, 
        user_name: str
    ) -> Optional[WalletTransaction]:
        """
        Acredita el 3.2% de impuesto a la Billetera Corporativa con validación de idempotencia.
        """
        tax_amount = Decimal(str(withdrawal.impuesto or 0))
        if tax_amount <= Decimal("0"):
            return None

        company_wallet = await CompanyWalletService.get_or_create_company_wallet(db)

        # Idempotencia: Verificar que no se haya acreditado ya este mismo retiro
        existing_tx_res = await db.execute(
            select(WalletTransaction).where(
                WalletTransaction.wallet_id == company_wallet.id,
                WalletTransaction.reference_type == "withdrawal",
                WalletTransaction.reference_id == withdrawal.id,
                WalletTransaction.type == "tax_retention"
            )
        )
        existing_tx = existing_tx_res.scalars().first()
        if existing_tx:
            logger.info(f"Impuesto para retiro #{withdrawal.id} ya había sido acreditado previamente en tx #{existing_tx.id}")
            return existing_tx

        # Acreditar saldo a la Billetera Corporativa
        company_wallet.balance += tax_amount
        tx = WalletTransaction(
            wallet_id=company_wallet.id,
            amount=tax_amount,
            type="tax_retention",
            reference_type="withdrawal",
            reference_id=withdrawal.id,
            description=f"Recaudo 3.2% Retención Retiro #{withdrawal.id} - Inversionista: {user_name}",
            balance_after=company_wallet.balance
        )
        db.add(tx)
        await db.flush()
        logger.info(f"Acreditados ${tax_amount:,.2f} a Billetera Corporativa por Retiro #{withdrawal.id}")
        return tx

    @staticmethod
    async def refund_tax_retention(
        db: AsyncSession, 
        withdrawal: Withdrawal
    ) -> Optional[WalletTransaction]:
        """
        Revierte el 3.2% acreditado previamente en caso de que el retiro sea rechazado o falle en Yoint.
        """
        tax_amount = Decimal(str(withdrawal.impuesto or 0))
        if tax_amount <= Decimal("0"):
            return None

        company_wallet = await CompanyWalletService.get_or_create_company_wallet(db)

        # Verificar si hubo un recaudo previo
        existing_credit_res = await db.execute(
            select(WalletTransaction).where(
                WalletTransaction.wallet_id == company_wallet.id,
                WalletTransaction.reference_type == "withdrawal",
                WalletTransaction.reference_id == withdrawal.id,
                WalletTransaction.type == "tax_retention"
            )
        )
        has_credit = existing_credit_res.scalars().first()
        if not has_credit:
            return None # No había sido acreditado, nada que revertir

        # Idempotencia: Verificar que no se haya revertido ya
        existing_rev_res = await db.execute(
            select(WalletTransaction).where(
                WalletTransaction.wallet_id == company_wallet.id,
                WalletTransaction.reference_type == "withdrawal",
                WalletTransaction.reference_id == withdrawal.id,
                WalletTransaction.type == "tax_reversal"
            )
        )
        if existing_rev_res.scalars().first():
            return None # Ya fue revertido

        company_wallet.balance -= tax_amount
        tx = WalletTransaction(
            wallet_id=company_wallet.id,
            amount=-tax_amount,
            type="tax_reversal",
            reference_type="withdrawal",
            reference_id=withdrawal.id,
            description=f"Reversión 3.2% Retención por Rechazo de Retiro #{withdrawal.id}",
            balance_after=company_wallet.balance
        )
        db.add(tx)
        await db.flush()
        logger.info(f"Revertidos ${tax_amount:,.2f} de Billetera Corporativa por Rechazo de Retiro #{withdrawal.id}")
        return tx

    @staticmethod
    async def get_tax_wallet_summary(db: AsyncSession) -> Dict[str, Any]:
        """
        Resumen contable de la Billetera Corporativa (Caja de Impuestos).
        """
        company_wallet = await CompanyWalletService.get_or_create_company_wallet(db)

        # Métricas agregadas de transacciones de impuestos
        stats_query = select(
            func.count(WalletTransaction.id).label("total_txs"),
            func.coalesce(func.sum(case((WalletTransaction.type == 'tax_retention', WalletTransaction.amount), else_=0)), 0).label("total_collected"),
            func.coalesce(func.sum(case((WalletTransaction.type == 'tax_reversal', func.abs(WalletTransaction.amount)), else_=0)), 0).label("total_refunded")
        ).where(WalletTransaction.wallet_id == company_wallet.id)

        from sqlalchemy import case
        stats_res = await db.execute(stats_query)
        stats = stats_res.one_or_none()

        # Últimos movimientos
        latest_txs_res = await db.execute(
            select(WalletTransaction)
            .where(WalletTransaction.wallet_id == company_wallet.id)
            .order_by(WalletTransaction.id.desc())
            .limit(20)
        )
        latest_txs = latest_txs_res.scalars().all()

        return {
            "wallet_id": company_wallet.id,
            "current_balance": float(company_wallet.balance),
            "currency": company_wallet.currency,
            "total_transactions": int(stats.total_txs) if stats else 0,
            "total_collected": float(stats.total_collected) if stats else 0.0,
            "total_refunded": float(stats.total_refunded) if stats else 0.0,
            "latest_transactions": [
                {
                    "id": t.id,
                    "amount": float(t.amount),
                    "type": t.type,
                    "description": t.description,
                    "reference_id": t.reference_id,
                    "balance_after": float(t.balance_after),
                    "created_at": t.created_at.isoformat() if t.created_at else None
                }
                for t in latest_txs
            ]
        }
