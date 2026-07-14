from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from sqlalchemy.orm import selectinload
from typing import List, Optional, Dict, Any
import logging

from src.models.withdrawal import Withdrawal
from src.models.user import User
from src.schemas.withdrawal import WithdrawalCreate, WithdrawalUpdate

logger = logging.getLogger(__name__)

class WithdrawalService:
    
    @staticmethod
    async def get_withdrawals(db: AsyncSession, page: int = 1, limit: int = 20, search: Optional[str] = None) -> Dict[str, Any]:
        query = select(Withdrawal).options(
            selectinload(Withdrawal.user)
        )
        
        if search:
            search_pattern = f"%{search}%"
            query = query.join(Withdrawal.user).filter(
                or_(
                    User.name.ilike(search_pattern),
                    User.email.ilike(search_pattern),
                    User.document_id.ilike(search_pattern)
                )
            )
            
        count_query = select(func.count(Withdrawal.id))
        if search:
            count_query = count_query.join(Withdrawal.user).filter(
                or_(
                    User.name.ilike(search_pattern),
                    User.email.ilike(search_pattern),
                    User.document_id.ilike(search_pattern)
                )
            )
            
        total_result = await db.execute(count_query)
        total = total_result.scalar_one_or_none() or 0
        
        # Order by newest first
        query = query.order_by(Withdrawal.id.desc())
        query = query.offset((page - 1) * limit).limit(limit)
        
        result = await db.execute(query)
        withdrawals = result.scalars().all()
        
        return {
            "data": withdrawals,
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
