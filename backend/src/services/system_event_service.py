from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import HTTPException, status
from typing import List
from datetime import datetime
import pytz

from src.models.system_event import SystemEvent
from src.schemas.system_event import SystemEventCreate, SystemEventUpdate

LOCAL_TZ = pytz.timezone("America/Bogota")

class SystemEventService:
    @staticmethod
    async def get_all_events(db: AsyncSession) -> List[SystemEvent]:
        result = await db.execute(select(SystemEvent))
        return result.scalars().all()

    @staticmethod
    async def create_event(db: AsyncSession, event_in: SystemEventCreate) -> SystemEvent:
        new_event = SystemEvent(**event_in.model_dump())
        db.add(new_event)
        await db.commit()
        await db.refresh(new_event)
        return new_event

    @staticmethod
    async def update_event(db: AsyncSession, event_id: int, event_in: SystemEventUpdate) -> SystemEvent:
        result = await db.execute(select(SystemEvent).where(SystemEvent.id == event_id))
        event = result.scalar_one_or_none()
        if not event:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
        
        update_data = event_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(event, field, value)
            
        await db.commit()
        await db.refresh(event)
        return event

    @staticmethod
    async def delete_event(db: AsyncSession, event_id: int):
        result = await db.execute(select(SystemEvent).where(SystemEvent.id == event_id))
        event = result.scalar_one_or_none()
        if not event:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
            
        await db.delete(event)
        await db.commit()

    @staticmethod
    async def is_event_active(db: AsyncSession, event_type: str) -> bool:
        """
        Check if a specific system event type is currently active, 
        evaluating recurrences and start/end dates using the local timezone.
        """
        result = await db.execute(
            select(SystemEvent)
            .where(SystemEvent.type == event_type)
            .where(SystemEvent.is_active == True)
        )
        events = result.scalars().all()
        if not events:
            return False

        # Get current time in America/Bogota
        now_utc = datetime.utcnow().replace(tzinfo=pytz.utc)
        now_local = now_utc.astimezone(LOCAL_TZ)
        current_day = now_local.day

        for event in events:
            # 1. Evaluate Recurrence
            if event.is_recurring:
                if event.recurrence_start_day and event.recurrence_end_day:
                    # e.g., active between 15th and 18th of every month
                    if event.recurrence_start_day <= event.recurrence_end_day:
                        if event.recurrence_start_day <= current_day <= event.recurrence_end_day:
                            return True
                    else:
                        # cross-month recurrence (e.g. 28th to 5th)
                        if current_day >= event.recurrence_start_day or current_day <= event.recurrence_end_day:
                            return True

            # 2. Evaluate Specific Date Range
            if event.start_date and event.end_date:
                # Ensure the DB dates are localized to our timezone for correct comparison
                # Assuming the DB stores dates in UTC if timezone-aware, or naive but meant as local.
                # If they are naive, we treat them as America/Bogota local times.
                start = event.start_date
                if start.tzinfo is None:
                    start = LOCAL_TZ.localize(start)
                else:
                    start = start.astimezone(LOCAL_TZ)
                    
                end = event.end_date
                if end.tzinfo is None:
                    end = LOCAL_TZ.localize(end)
                else:
                    end = end.astimezone(LOCAL_TZ)

                if start <= now_local <= end:
                    return True

        return False
