import logging
from decimal import Decimal
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from src.models.user import User
from src.models.wallet import Wallet, WalletTransaction
from src.models.withdrawal import Withdrawal
from src.models.company_tax_ledger import CompanyTaxLedger

logger = logging.getLogger(__name__)

class CompanyWalletService:
    """
    Servicio de gestión del Libro Fiscal y Caja de Impuestos Corporativa de Gloint.
    
    SEGURIDAD CRÍTICA:
    El 3.2% de retención de impuestos NUNCA debe ingresar a la billetera personal de ningún 
    usuario o administrador (Wallet). Se registra de forma exclusiva y aislada en CompanyTaxLedger 
    para garantizar que ningún superadministrador ni usuario pueda solicitar el retiro de estos fondos 
    de la tesorería corporativa.
    """

    @staticmethod
    async def credit_tax_retention(
        db: AsyncSession, 
        withdrawal: Withdrawal, 
        user_name: str
    ) -> Optional[CompanyTaxLedger]:
        """
        Registra el 3.2% de retención de impuesto en el Libro Fiscal Corporativo (CompanyTaxLedger).
        Aislado por completo del saldo personal de los administradores.
        """
        tax_amount = Decimal(str(withdrawal.impuesto or 0))
        if tax_amount <= Decimal("0"):
            return None

        gross_amount = Decimal(str(withdrawal.monto or 0))
        net_amount = Decimal(str(withdrawal.monto_neto or (gross_amount - tax_amount)))

        # Idempotencia: Verificar que no se haya registrado ya para este retiro
        existing_res = await db.execute(
            select(CompanyTaxLedger).where(CompanyTaxLedger.withdrawal_id == withdrawal.id)
        )
        existing_entry = existing_res.scalars().first()
        if existing_entry:
            logger.info(f"Retención fiscal para retiro #{withdrawal.id} ya registrada previamente en CompanyTaxLedger #{existing_entry.id}")
            return existing_entry

        # Registrar exclusivamente en el libro contable de la empresa
        ledger_entry = CompanyTaxLedger(
            withdrawal_id=withdrawal.id,
            investor_id=withdrawal.user_id,
            tax_amount=tax_amount,
            gross_amount=gross_amount,
            net_amount=net_amount,
            status="COLLECTED",
            description=f"Retención 3.2% Retiro #{withdrawal.id} - Inversionista: {user_name}",
            notes=f"Recaudo corporativo retenido en origen para el retiro #{withdrawal.id}."
        )
        db.add(ledger_entry)
        await db.flush()
        logger.info(f"Registrada retención fiscal de ${tax_amount:,.2f} en CompanyTaxLedger (Retiro #{withdrawal.id})")
        return ledger_entry

    @staticmethod
    async def refund_tax_retention(
        db: AsyncSession, 
        withdrawal: Withdrawal
    ) -> Optional[CompanyTaxLedger]:
        """
        Revierte el estado de la retención en el libro corporativo en caso de que el retiro
        sea rechazado o falle la dispersión en Yoint.
        """
        tax_amount = Decimal(str(withdrawal.impuesto or 0))
        if tax_amount <= Decimal("0"):
            return None

        existing_res = await db.execute(
            select(CompanyTaxLedger).where(CompanyTaxLedger.withdrawal_id == withdrawal.id)
        )
        existing_entry = existing_res.scalars().first()
        if not existing_entry:
            return None

        if existing_entry.status == "REFUNDED":
            return existing_entry

        existing_entry.status = "REFUNDED"
        existing_entry.notes = (existing_entry.notes or "") + f" | Revertido por rechazo o fallo del retiro #{withdrawal.id}"
        await db.flush()
        logger.info(f"Revertida retención en CompanyTaxLedger para retiro #{withdrawal.id}")
        return existing_entry

    @staticmethod
    async def get_tax_wallet_summary(db: AsyncSession) -> Dict[str, Any]:
        """
        Resumen contable oficial del Libro Fiscal Corporativo (Caja de Impuestos 3.2%).
        """
        # 1. Total recaudado (COLLECTED o SETTLED)
        collected_res = await db.execute(
            select(func.coalesce(func.sum(CompanyTaxLedger.tax_amount), Decimal("0.00"))).where(
                CompanyTaxLedger.status.in_(["COLLECTED", "SETTLED"])
            )
        )
        total_collected = collected_res.scalar_one()

        # 2. Total revertido por retiros rechazados
        refunded_res = await db.execute(
            select(func.coalesce(func.sum(CompanyTaxLedger.tax_amount), Decimal("0.00"))).where(
                CompanyTaxLedger.status == "REFUNDED"
            )
        )
        total_refunded = refunded_res.scalar_one()

        # 3. Cantidad de operaciones
        count_res = await db.execute(
            select(func.count(CompanyTaxLedger.id))
        )
        total_records = count_res.scalar_one()

        # 4. Últimos registros en el libro fiscal con datos del inversionista
        from sqlalchemy.orm import selectinload
        latest_entries_res = await db.execute(
            select(CompanyTaxLedger)
            .options(selectinload(CompanyTaxLedger.investor))
            .order_by(CompanyTaxLedger.id.desc())
            .limit(100)
        )
        latest_entries = latest_entries_res.scalars().all()

        current_balance = total_collected - total_refunded

        return {
            "wallet_id": "corporate_tax_ledger",
            "current_balance": float(current_balance),
            "currency": "COP",
            "total_transactions": int(total_records),
            "total_collected": float(total_collected),
            "total_refunded": float(total_refunded),
            "latest_transactions": [
                {
                    "id": entry.id,
                    "amount": float(entry.tax_amount),
                    "gross_amount": float(entry.gross_amount),
                    "net_amount": float(entry.net_amount),
                    "type": "tax_retention" if entry.status == "COLLECTED" else ("tax_reversal" if entry.status == "REFUNDED" else entry.status.lower()),
                    "status": entry.status,
                    "description": entry.description,
                    "withdrawal_id": entry.withdrawal_id,
                    "investor_id": entry.investor_id,
                    "investor_name": entry.investor.name if entry.investor else "N/A",
                    "investor_email": entry.investor.email if entry.investor else None,
                    "investor_document": entry.investor.document_id if entry.investor else None,
                    "balance_after": float(current_balance),
                    "created_at": entry.created_at.isoformat() if entry.created_at else None
                }
                for entry in latest_entries
            ]
        }

    @staticmethod
    async def clean_leaked_admin_tax_balances(db: AsyncSession) -> Dict[str, Any]:
        """
        Sanea y depura cualquier transacción previa de tipo 'tax_retention' o 'tax_reversal'
        que se haya cargado erróneamente a la billetera personal de administradores o usuarios.
        
        1. Restaura el saldo personal exacto restando los impuestos indebidos.
        2. Migra la información a CompanyTaxLedger si aún no estaba registrada.
        3. Elimina los registros indebidos de wallet_transactions para no alterar el historial personal del admin.
        """
        stmt = select(WalletTransaction).where(
            WalletTransaction.type.in_(["tax_retention", "tax_reversal"])
        )
        leaked_txs = (await db.execute(stmt)).scalars().all()
        if not leaked_txs:
            return {"cleaned_count": 0, "total_deducted": 0.0}

        total_deducted = Decimal("0.00")
        cleaned_count = 0

        for tx in leaked_txs:
            # 1. Obtener la billetera afectada
            wallet_res = await db.execute(select(Wallet).where(Wallet.id == tx.wallet_id))
            wallet = wallet_res.scalars().first()

            if wallet:
                if tx.type == "tax_retention":
                    # Restar de la billetera del usuario el saldo cargado erróneamente
                    wallet.balance = max(Decimal("0.00"), wallet.balance - tx.amount)
                    total_deducted += tx.amount
                elif tx.type == "tax_reversal":
                    # Si hubo reversión previa en wallet, sumar de vuelta
                    wallet.balance += abs(tx.amount)

            # 2. Asegurar que esté registrado en CompanyTaxLedger
            if tx.reference_type == "withdrawal" and tx.reference_id:
                withdrawal_res = await db.execute(
                    select(Withdrawal).where(Withdrawal.id == tx.reference_id)
                )
                withdrawal = withdrawal_res.scalars().first()
                if withdrawal:
                    existing_ledger = (await db.execute(
                        select(CompanyTaxLedger).where(CompanyTaxLedger.withdrawal_id == withdrawal.id)
                    )).scalars().first()

                    if not existing_ledger:
                        gross = Decimal(str(withdrawal.monto or 0))
                        tax = Decimal(str(withdrawal.impuesto or (gross * Decimal("0.032"))))
                        net = Decimal(str(withdrawal.monto_neto or (gross - tax)))
                        ledger_entry = CompanyTaxLedger(
                            withdrawal_id=withdrawal.id,
                            investor_id=withdrawal.user_id,
                            tax_amount=tax,
                            gross_amount=gross,
                            net_amount=net,
                            status="COLLECTED" if tx.type == "tax_retention" else "REFUNDED",
                            description=tx.description or f"Recaudo migrado 3.2% Retiro #{withdrawal.id}",
                            notes="Migrado automáticamente para aislar fondos fiscales corporativos de billeteras personales."
                        )
                        db.add(ledger_entry)

            # 3. Eliminar la transacción de la billetera de usuario
            await db.delete(tx)
            cleaned_count += 1

        await db.commit()
        logger.info(f"Depuración fiscal completada: {cleaned_count} transacciones eliminadas de billeteras de usuarios, ${total_deducted:,.2f} deducidos.")
        return {"cleaned_count": cleaned_count, "total_deducted": float(total_deducted)}
