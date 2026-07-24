from typing import Sequence, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_, func
from fastapi import HTTPException, status
from datetime import datetime
from src.models.potential_referral import PotentialReferral
from src.models.investor import Investor
from src.schemas.potential_referral import PotentialReferralCreate, PotentialReferralUpdate

class PotentialReferralService:
    @staticmethod
    async def get_by_user_id(db: AsyncSession, user_id: int) -> Sequence[PotentialReferral]:
        # Buscar investor del usuario
        result = await db.execute(select(Investor).where(Investor.user_id == user_id))
        investors = result.scalars().all()
        if not investors:
            return []
        
        investor_ids = [inv.id for inv in investors]
        ref_result = await db.execute(
            select(PotentialReferral)
            .where(PotentialReferral.investor_id.in_(investor_ids))
            .order_by(PotentialReferral.id.desc())
        )
        return ref_result.scalars().all()

    @staticmethod
    async def get_all_admin(
        db: AsyncSession, 
        search: Optional[str] = None, 
        estado: Optional[str] = None,
        page: int = 1,
        limit: int = 20
    ) -> Dict[str, Any]:
        query = select(PotentialReferral)

        if search:
            search_term = f"%{search}%"
            query = query.where(
                or_(
                    PotentialReferral.nombre.ilike(search_term),
                    PotentialReferral.telefono.ilike(search_term),
                    PotentialReferral.email.ilike(search_term),
                    PotentialReferral.codigo_referido.ilike(search_term)
                )
            )

        if estado:
            query = query.where(PotentialReferral.estado == estado)

        count_query = select(func.count()).select_from(query.subquery())
        total_res = await db.execute(count_query)
        total = total_res.scalar_one()

        offset = (page - 1) * limit
        query = query.order_by(PotentialReferral.id.desc()).offset(offset).limit(limit)
        result = await db.execute(query)
        referrals = result.scalars().all()

        return {
            "data": referrals,
            "total": total,
            "page": page,
            "limit": limit
        }

    @staticmethod
    async def create_by_user(db: AsyncSession, user_id: int, data: PotentialReferralCreate) -> PotentialReferral:
        # Obtener el investor del usuario
        res = await db.execute(select(Investor).where(Investor.user_id == user_id))
        investor = res.scalars().first()
        if not investor:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Debes tener un contrato de inversión activo para registrar referidos."
            )

        codigo = data.codigo_referido or investor.assigned_code

        payload = data.model_dump()
        payload["investor_id"] = investor.id
        payload["codigo_referido"] = codigo
        payload["estado"] = "pendiente"

        db_ref = PotentialReferral(**payload)
        db.add(db_ref)
        await db.commit()
        await db.refresh(db_ref)
        return db_ref

    @staticmethod
    async def update(db: AsyncSession, referral_id: int, data: PotentialReferralUpdate) -> PotentialReferral:
        res = await db.execute(select(PotentialReferral).where(PotentialReferral.id == referral_id))
        db_ref = res.scalars().first()
        if not db_ref:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Referido potencial no encontrado"
            )

        update_data = data.model_dump(exclude_unset=True)
        for field, val in update_data.items():
            setattr(db_ref, field, val)

        await db.commit()
        await db.refresh(db_ref)
        return db_ref

    @staticmethod
    async def delete(db: AsyncSession, referral_id: int) -> None:
        res = await db.execute(select(PotentialReferral).where(PotentialReferral.id == referral_id))
        db_ref = res.scalars().first()
        if not db_ref:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Referido potencial no encontrado"
            )

        await db.delete(db_ref)
        await db.commit()
