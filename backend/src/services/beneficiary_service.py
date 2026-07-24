from typing import Sequence
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from fastapi import HTTPException, status
from src.models.beneficiary import Beneficiary
from src.schemas.beneficiary import BeneficiaryCreate, BeneficiaryUpdate

class BeneficiaryService:
    @staticmethod
    async def get_all_by_user(db: AsyncSession, user_id: int) -> Sequence[Beneficiary]:
        result = await db.execute(
            select(Beneficiary).where(Beneficiary.user_id == user_id).order_by(Beneficiary.id.asc())
        )
        return result.scalars().all()

    @staticmethod
    async def get_by_id(db: AsyncSession, beneficiary_id: int) -> Beneficiary:
        result = await db.execute(
            select(Beneficiary).where(Beneficiary.id == beneficiary_id)
        )
        beneficiary = result.scalars().first()
        if not beneficiary:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Beneficiario no encontrado"
            )
        return beneficiary

    @staticmethod
    async def create(db: AsyncSession, user_id: int, data: BeneficiaryCreate) -> Beneficiary:
        # Validar total de porcentaje
        existing = await BeneficiaryService.get_all_by_user(db, user_id)
        current_total = sum(float(b.percentage or 0) for b in existing)
        
        if current_total + data.percentage > 100.01:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"La suma de porcentajes no puede superar el 100%. Porcentaje disponible: {max(0, 100 - current_total):.2f}%"
            )

        payload = data.model_dump()
        payload['user_id'] = user_id

        # Renombrar 'relationship' si viene en data a la propiedad en modelo ORM
        if 'relationship' in payload:
            rel_val = payload.pop('relationship')
            payload['relationship_type'] = rel_val

        db_beneficiary = Beneficiary(**payload)
        db.add(db_beneficiary)
        await db.commit()
        await db.refresh(db_beneficiary)
        return db_beneficiary

    @staticmethod
    async def update(db: AsyncSession, beneficiary_id: int, user_id: int, data: BeneficiaryUpdate) -> Beneficiary:
        db_beneficiary = await BeneficiaryService.get_by_id(db, beneficiary_id)
        
        if db_beneficiary.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para modificar este beneficiario"
            )

        update_data = data.model_dump(exclude_unset=True)

        if 'percentage' in update_data:
            existing = await BeneficiaryService.get_all_by_user(db, user_id)
            current_total = sum(float(b.percentage or 0) for b in existing if b.id != beneficiary_id)
            if current_total + update_data['percentage'] > 100.01:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"La suma de porcentajes no puede superar el 100%. Porcentaje disponible: {max(0, 100 - current_total):.2f}%"
                )

        if 'relationship' in update_data:
            update_data['relationship_type'] = update_data.pop('relationship')

        for field, val in update_data.items():
            setattr(db_beneficiary, field, val)

        await db.commit()
        await db.refresh(db_beneficiary)
        return db_beneficiary

    @staticmethod
    async def delete(db: AsyncSession, beneficiary_id: int, user_id: int) -> None:
        db_beneficiary = await BeneficiaryService.get_by_id(db, beneficiary_id)
        if db_beneficiary.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para eliminar este beneficiario"
            )
        await db.delete(db_beneficiary)
        await db.commit()
