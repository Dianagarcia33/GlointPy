from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from typing import Dict, Any

from src.models.user import User
from src.models.investor import Investor
from src.models.withdrawal import Withdrawal
from src.models.investment_request import InvestmentRequest

class AuditService:
    
    @staticmethod
    async def get_audit_users(db: AsyncSession, page: int = 1, limit: int = 20, search: str = None) -> Dict[str, Any]:
        # Subquery for total investments per user
        inv_subq = select(
            Investor.user_id,
            func.count(Investor.id).label("active_packages_count")
        ).group_by(Investor.user_id).subquery()
        
        # Subquery for total withdrawals (amount) per user
        with_subq = select(
            Withdrawal.user_id,
            func.sum(Withdrawal.monto_neto).label("total_withdrawals"),
            func.count(Withdrawal.id).filter(Withdrawal.estado == 'pendiente').label("pending_withdrawals_count")
        ).group_by(Withdrawal.user_id).subquery()
        
        # Subquery for total pending requests per user
        req_subq = select(
            InvestmentRequest.user_id,
            func.sum(InvestmentRequest.monto).label("total_investments"),
            func.count(InvestmentRequest.id).filter(InvestmentRequest.status == 'pending').label("pending_requests_count")
        ).group_by(InvestmentRequest.user_id).subquery()
        
        # Main query joining user with the subqueries
        query = select(
            User,
            func.coalesce(req_subq.c.total_investments, 0).label("total_investments"),
            func.coalesce(with_subq.c.total_withdrawals, 0).label("total_withdrawals"),
            func.coalesce(inv_subq.c.active_packages_count, 0).label("active_packages_count"),
            func.coalesce(req_subq.c.pending_requests_count, 0).label("pending_requests_count")
        ).outerjoin(inv_subq, User.id == inv_subq.c.user_id) \
         .outerjoin(with_subq, User.id == with_subq.c.user_id) \
         .outerjoin(req_subq, User.id == req_subq.c.user_id)
         
        # Ensure we only fetch users who have at least one record in any of these tables
        query = query.filter(
            or_(
                inv_subq.c.user_id != None,
                with_subq.c.user_id != None,
                req_subq.c.user_id != None
            )
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
            
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar_one_or_none() or 0
        
        query = query.order_by(User.id.desc()).offset((page - 1) * limit).limit(limit)
        
        result = await db.execute(query)
        rows = result.all()
        
        data = []
        for row in rows:
            user_obj = row[0]
            data.append({
                "user_id": user_obj.id,
                "name": user_obj.name,
                "email": user_obj.email,
                "document_id": user_obj.document_id,
                "total_investments": row[1],
                "total_withdrawals": row[2],
                "active_packages_count": row[3],
                "pending_requests_count": row[4]
            })
            
        return {
            "data": data,
            "total": total,
            "page": page,
            "limit": limit
        }

    @staticmethod
    async def get_user_audit_history(db: AsyncSession, user_id: int) -> Dict[str, Any]:
        # Get User details
        user_result = await db.execute(select(User).where(User.id == user_id))
        user_obj = user_result.scalars().first()
        if not user_obj:
            return None
            
        # Get Investments
        inv_result = await db.execute(
            select(Investor)
            .options(selectinload(Investor.package), selectinload(Investor.period))
            .where(Investor.user_id == user_id)
            .order_by(Investor.created_at.desc())
        )
        investments = inv_result.scalars().all()
        
        # Get Withdrawals
        with_result = await db.execute(
            select(Withdrawal)
            .where(Withdrawal.user_id == user_id)
            .order_by(Withdrawal.fecha_solicitud.desc())
        )
        withdrawals = with_result.scalars().all()
        
        # Get Requests
        req_result = await db.execute(
            select(InvestmentRequest)
            .options(selectinload(InvestmentRequest.package))
            .where(InvestmentRequest.user_id == user_id)
            .order_by(InvestmentRequest.created_at.desc())
        )
        requests = req_result.scalars().all()
        
        # We don't have accelerations mapped yet, returning empty list
        
        return {
            "user_id": user_obj.id,
            "name": user_obj.name,
            "investments": investments,
            "withdrawals": withdrawals,
            "requests": requests,
            "accelerations": []
        }
