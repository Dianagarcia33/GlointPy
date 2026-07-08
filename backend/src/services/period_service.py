from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import HTTPException
from typing import List

from src.models.period import Period
from src.schemas.period import PeriodCreate, PeriodUpdate

class PeriodService:
    @staticmethod
    async def get_all_periods(db: AsyncSession) -> List[Period]:
        result = await db.execute(select(Period).order_by(Period.months.asc(), Period.days.asc()))
        return result.scalars().all()

    @staticmethod
    async def get_period_by_id(db: AsyncSession, period_id: int) -> Period:
        result = await db.execute(select(Period).where(Period.id == period_id))
        period = result.scalars().first()
        if not period:
            raise HTTPException(status_code=404, detail="Periodo no encontrado")
        return period

    @staticmethod
    async def create_period(db: AsyncSession, period_data: PeriodCreate) -> Period:
        # Prevent exact duplicates (same months, days, percentage) if needed, but not strictly required
        period = Period(
            percentage=period_data.percentage,
            months=period_data.months,
            days=period_data.days,
            is_active=period_data.is_active
        )
        db.add(period)
        await db.commit()
        await db.refresh(period)
        return period

    @staticmethod
    async def update_period(db: AsyncSession, period_id: int, period_data: PeriodUpdate) -> Period:
        period = await PeriodService.get_period_by_id(db, period_id)
        
        update_dict = period_data.model_dump(exclude_unset=True)
        for key, value in update_dict.items():
            setattr(period, key, value)
            
        await db.commit()
        await db.refresh(period)
        return period

    @staticmethod
    async def delete_period(db: AsyncSession, period_id: int):
        period = await PeriodService.get_period_by_id(db, period_id)
        # Instead of hard delete, we can just deactivate it or hard delete if not used. 
        # For safety, let's just delete it for now, unless there's a foreign key constraint later.
        await db.delete(period)
        await db.commit()
        return {"detail": "Periodo eliminado correctamente"}
