from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from sqlalchemy.orm import selectinload
from typing import List, Optional, Dict, Any
import logging

from src.models.withdrawal import Withdrawal, WithdrawalStatus
from src.models.user import User
from src.models.wallet import Wallet, WalletTransaction
from src.schemas.withdrawal import WithdrawalCreate, WithdrawalUpdate
from src.services.pdf_service import PDFService
from datetime import datetime
from fastapi import HTTPException

logger = logging.getLogger(__name__)

class WithdrawalService:
    
    @staticmethod
    async def get_withdrawals(
        db: AsyncSession, 
        page: int = 1, 
        limit: int = 20, 
        search: Optional[str] = None,
        status: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict[str, Any]:
        filters = []
        
        if search:
            search_pattern = f"%{search}%"
            filters.append(
                or_(
                    User.name.ilike(search_pattern),
                    User.email.ilike(search_pattern),
                    User.document_id.ilike(search_pattern)
                )
            )
            
        if status and status.lower() != 'todos':
            filters.append(func.lower(Withdrawal.estado) == status.lower())
            
        if start_date:
            try:
                sd = datetime.strptime(start_date, "%Y-%m-%d").date()
                filters.append(Withdrawal.fecha_solicitud >= sd)
            except Exception:
                pass

        if end_date:
            try:
                ed = datetime.strptime(end_date, "%Y-%m-%d").date()
                filters.append(Withdrawal.fecha_solicitud <= ed)
            except Exception:
                pass

        query = select(Withdrawal).options(selectinload(Withdrawal.user))
        count_query = select(func.count(Withdrawal.id))
        
        if search:
            query = query.join(Withdrawal.user)
            count_query = count_query.join(Withdrawal.user)
            
        if filters:
            query = query.filter(*filters)
            count_query = count_query.filter(*filters)
            
        total_result = await db.execute(count_query)
        total = total_result.scalar_one_or_none() or 0
        
        # Order by newest first
        query = query.order_by(Withdrawal.id.desc())
        query = query.offset((page - 1) * limit).limit(limit)
        
        result = await db.execute(query)
        withdrawals = result.scalars().all()
        
        from src.schemas.withdrawal import WithdrawalResponse
        from fastapi import HTTPException
        import traceback
        
        data_res = []
        for w in withdrawals:
            try:
                data_res.append(WithdrawalResponse.model_validate(w))
            except Exception as e:
                logger.error(f"Validation error on withdrawal {w.id}: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Error validando retiro {w.id}: {str(e)}")
        
        return {
            "data": data_res,
            "total": total,
            "page": page,
            "limit": limit
        }

    @staticmethod
    async def get_withdrawal(db: AsyncSession, withdrawal_id: int) -> Optional[Withdrawal]:
        query = select(Withdrawal).options(
            selectinload(Withdrawal.user)
        ).filter(Withdrawal.id == withdrawal_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def create_withdrawal(db: AsyncSession, withdrawal_in: WithdrawalCreate) -> Withdrawal:
        db_withdrawal = Withdrawal(**withdrawal_in.model_dump())
        db.add(db_withdrawal)
        await db.commit()
        await db.refresh(db_withdrawal)
        return db_withdrawal

    @staticmethod
    async def bulk_create_withdrawals(db: AsyncSession, withdrawals_in: List[WithdrawalCreate]) -> List[Withdrawal]:
        # Validate that users exist to avoid foreign key errors
        users_result = await db.execute(select(User.id))
        valid_user_ids = set(users_result.scalars().all())

        # Fetch existing withdrawal IDs to skip duplicates
        existing_result = await db.execute(select(Withdrawal.id))
        existing_ids = set(existing_result.scalars().all())
        
        valid_withdrawals = []
        skipped_user_ids = set()
        for w in withdrawals_in:
            if w.id is not None and w.id in existing_ids:
                continue # Skip already registered
                
            if w.user_id in valid_user_ids:
                if w.aprobado_por and w.aprobado_por not in valid_user_ids:
                    w.aprobado_por = None
                if w.procesado_por and w.procesado_por not in valid_user_ids:
                    w.procesado_por = None
                valid_withdrawals.append(Withdrawal(**w.model_dump()))
            else:
                skipped_user_ids.add(w.user_id)
                logger.warning(f"Skipping withdrawal for invalid user_id: {w.user_id}")
                
        if skipped_user_ids:
            # Revert the entire batch if there are missing users so the user knows
            from fastapi import HTTPException
            raise HTTPException(
                status_code=400, 
                detail=f"Los siguientes user_id en el Excel no existen en la base de datos: {list(skipped_user_ids)[:10]}..."
            )

        if not valid_withdrawals:
            return []

        db.add_all(valid_withdrawals)
        await db.commit()
        return valid_withdrawals

    @staticmethod
    async def approve_withdrawal(db: AsyncSession, withdrawal_id: int, admin_id: int, file_path: Optional[str] = None) -> Withdrawal:
        withdrawal = await WithdrawalService.get_withdrawal(db, withdrawal_id)
        if not withdrawal:
            raise HTTPException(status_code=404, detail="Retiro no encontrado")
        
        if withdrawal.estado != WithdrawalStatus.PENDING:
            raise HTTPException(status_code=400, detail="Solo se pueden aprobar retiros pendientes")

        withdrawal.estado = WithdrawalStatus.APPROVED
        withdrawal.aprobado_por = admin_id
        withdrawal.fecha_aprobacion = datetime.utcnow()
        if file_path:
            withdrawal.comprobante_pago = file_path
            withdrawal.receipt_path = file_path

        await db.commit()
        await db.refresh(withdrawal)
        return withdrawal

    @staticmethod
    async def reject_withdrawal(db: AsyncSession, withdrawal_id: int, admin_id: int, motivo_rechazo: str) -> Withdrawal:
        withdrawal = await WithdrawalService.get_withdrawal(db, withdrawal_id)
        if not withdrawal:
            raise HTTPException(status_code=404, detail="Retiro no encontrado")
        
        if withdrawal.estado != WithdrawalStatus.PENDING:
            raise HTTPException(status_code=400, detail="Solo se pueden rechazar retiros pendientes")

        withdrawal.estado = WithdrawalStatus.REJECTED
        withdrawal.motivo_rechazo = motivo_rechazo
        withdrawal.aprobado_por = admin_id
        withdrawal.fecha_aprobacion = datetime.utcnow()

        # Si viene de wallet, devolvemos el saldo a la wallet
        if withdrawal.origen == "wallet":
            wallet_res = await db.execute(select(Wallet).where(Wallet.user_id == withdrawal.user_id))
            wallet = wallet_res.scalars().first()
            if wallet:
                wallet.balance += withdrawal.monto
                tx = WalletTransaction(
                    wallet_id=wallet.id,
                    amount=withdrawal.monto,
                    type="withdrawal_rejection",
                    description=f"Devolución por rechazo de retiro #{withdrawal.id}: {motivo_rechazo}",
                    balance_after=wallet.balance,
                    reference_type="withdrawal",
                    reference_id=withdrawal.id
                )
                db.add(tx)

        await db.commit()
        await db.refresh(withdrawal)
        return withdrawal

    @staticmethod
    async def sync_wallet_debits(db: AsyncSession, admin_id: int) -> Dict[str, Any]:
        """
        Sincroniza retroactivamente todas las transacciones de débito de billetera que no tengan un registro en la tabla de retiros.
        """
        from src.models.wallet import Wallet, WalletTransaction
        from src.models.user_bank_account import UserBankAccount
        from src.models.investor import Investor
        from src.models.withdrawal import WithdrawalType
        from decimal import Decimal
        from datetime import date

        tx_query = (
            select(WalletTransaction, Wallet.user_id)
            .join(Wallet, Wallet.id == WalletTransaction.wallet_id)
            .where(
                WalletTransaction.amount < 0,
                or_(
                    WalletTransaction.reference_type == None,
                    WalletTransaction.reference_type != "withdrawal"
                )
            )
        )
        tx_result = await db.execute(tx_query)
        rows = tx_result.all()

        synced_count = 0

        for tx, user_id in rows:
            monto_abs = abs(Decimal(str(tx.amount)))
            impuesto = (monto_abs * Decimal("0.032")).quantize(Decimal("0.01"))
            monto_neto = monto_abs - impuesto

            existing_res = await db.execute(
                select(Withdrawal).where(
                    Withdrawal.user_id == user_id,
                    Withdrawal.monto == monto_abs,
                    Withdrawal.origen == "wallet"
                )
            )
            existing_w = existing_res.scalars().first()

            if existing_w:
                tx.reference_type = "withdrawal"
                tx.reference_id = existing_w.id
                continue

            investor_res = await db.execute(select(Investor).where(Investor.user_id == user_id))
            investor = investor_res.scalars().first()
            investor_id = investor.id if investor else None

            bank_res = await db.execute(select(UserBankAccount).where(UserBankAccount.user_id == user_id, UserBankAccount.is_active == True))
            bank_account = bank_res.scalars().first()

            tx_date = tx.created_at.date() if tx.created_at else date.today()

            withdrawal = Withdrawal(
                investor_id=investor_id,
                user_id=user_id,
                origen="wallet",
                tipo=WithdrawalType.RENDIMIENTO,
                monto=monto_abs,
                impuesto=impuesto,
                monto_neto=monto_neto,
                fecha_solicitud=tx_date,
                fecha_retiro=tx_date,
                estado=WithdrawalStatus.APPROVED,
                metodo_pago="Ajuste Admin Wallet",
                banco=bank_account.banco if bank_account else None,
                tipo_cuenta=bank_account.tipo_cuenta if bank_account else None,
                numero_cuenta=bank_account.numero_cuenta if bank_account else None,
                observaciones=tx.description or "Ajuste de billetera sincronizado",
                aprobado_por=admin_id,
                fecha_aprobacion=tx.created_at or datetime.utcnow(),
                procesado_por=admin_id,
                fecha_procesamiento=tx.created_at or datetime.utcnow(),
                created_at=tx.created_at or datetime.utcnow()
            )

            db.add(withdrawal)
            await db.flush()

            tx.reference_type = "withdrawal"
            tx.reference_id = withdrawal.id
            synced_count += 1

        await db.commit()
        return {
            "message": f"Sincronización completada exitosamente. Se registraron {synced_count} retiros.",
            "synced_count": synced_count
        }

