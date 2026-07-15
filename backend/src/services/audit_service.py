from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, case
from sqlalchemy.orm import selectinload
from typing import Dict, Any

from src.models.user import User
from src.models.investor import Investor
from src.models.withdrawal import Withdrawal
from src.models.investment_request import InvestmentRequest

class AuditService:
    
    @staticmethod
    async def get_audit_users(db: AsyncSession, page: int = 1, limit: int = 20, search: str = None) -> Dict[str, Any]:
        from src.models.security import Role, user_roles
        
        # Listamos solo los usuarios básicos que tengan el rol 'inversionista'
        query = (
            select(User)
            .options(
                selectinload(User.investments).selectinload(Investor.package),
                selectinload(User.investments).selectinload(Investor.period)
            )
            .join(user_roles, User.id == user_roles.c.user_id)
            .join(Role, user_roles.c.role_id == Role.id)
            .where(Role.name == 'inversionista')
            .group_by(User.id)
        )
        
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                or_(
                    User.name.ilike(search_pattern),
                    User.email.ilike(search_pattern),
                    User.document_id.ilike(search_pattern)
                )
            )
            
        count_query = (
            select(func.count(User.id.distinct()))
            .join(user_roles, User.id == user_roles.c.user_id)
            .join(Role, user_roles.c.role_id == Role.id)
            .where(Role.name == 'inversionista')
        )
        
        if search:
            count_query = count_query.filter(
                or_(
                    User.name.ilike(search_pattern),
                    User.email.ilike(search_pattern),
                    User.document_id.ilike(search_pattern)
                )
            )

        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0
        
        query = query.order_by(User.id.desc()).offset((page - 1) * limit).limit(limit)
        
        result = await db.execute(query)
        users = result.scalars().all()
        
        data = []
        for user_obj in users:
            total_inv = sum((inv.package.value if inv.package and inv.package.value else 0) for inv in user_obj.investments)
            
            data.append({
                "user_id": user_obj.id,
                "name": user_obj.name,
                "email": user_obj.email,
                "document_id": user_obj.document_id,
                "total_investments": total_inv,
                "total_withdrawals": 0,
                "active_packages_count": len(user_obj.investments),
                "pending_requests_count": 0,
                "investments": user_obj.investments
            })
            
        return {
            "data": data,
            "total": total,
            "page": page,
            "limit": limit
        }

    @staticmethod
    async def get_user_audit_history(db: AsyncSession, user_id: int) -> Dict[str, Any]:
        user_result = await db.execute(select(User).where(User.id == user_id))
        user_obj = user_result.scalars().first()
        if not user_obj:
            return None
            
        inv_result = await db.execute(
            select(Investor)
            .options(
                selectinload(Investor.package), 
                selectinload(Investor.period),
                selectinload(Investor.user).selectinload(User.bank_accounts),
                selectinload(Investor.contract_histories)
            )
            .where(Investor.user_id == user_id)
            .order_by(Investor.created_at.desc())
        )
        investments = inv_result.scalars().all()
        
        with_result = await db.execute(
            select(Withdrawal)
            .options(selectinload(Withdrawal.user).selectinload(User.bank_accounts))
            .where(Withdrawal.user_id == user_id)
            .order_by(Withdrawal.fecha_solicitud.desc())
        )
        withdrawals = with_result.scalars().all()
        
        req_result = await db.execute(
            select(InvestmentRequest)
            .options(selectinload(InvestmentRequest.package), selectinload(InvestmentRequest.user).selectinload(User.bank_accounts))
            .where(InvestmentRequest.user_id == user_id)
            .order_by(InvestmentRequest.created_at.desc())
        )
        requests = req_result.scalars().all()
        
        return {
            "user_id": user_obj.id,
            "name": user_obj.name,
            "investments": investments,
            "withdrawals": withdrawals,
            "requests": requests,
            "accelerations": []
        }
