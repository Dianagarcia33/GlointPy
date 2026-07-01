from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from datetime import datetime

from src.core.database import get_db
from src.models.user import User
from src.models.system_events import SystemEvent
from src.api.dependencies.auth_deps import get_current_user
from src.schemas.system_event import SystemEventCreate, SystemEventUpdate, SystemEventResponse

router = APIRouter()

async def check_manage_events_permission(current_user: User):
    has_permission = any(perm.name == 'manage_system_events' for role in current_user.roles for perm in role.permissions)
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para gestionar eventos del sistema"
        )
    return current_user

@router.get("/", response_model=List[SystemEventResponse])
async def get_system_events(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await check_manage_events_permission(current_user)
    stmt = select(SystemEvent).order_by(SystemEvent.id.desc())
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/", response_model=SystemEventResponse)
async def create_system_event(
    event_data: SystemEventCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await check_manage_events_permission(current_user)
    
    # Validaciones básicas
    if event_data.is_recurring == 1:
        if event_data.recurrence_start_day is None or event_data.recurrence_end_day is None:
            raise HTTPException(status_code=400, detail="Debes especificar los días de inicio y fin para eventos recurrentes.")
        if event_data.recurrence_start_day > event_data.recurrence_end_day:
            raise HTTPException(status_code=400, detail="El día de inicio no puede ser mayor al día de fin.")
    else:
        if event_data.start_date is None or event_data.end_date is None:
            raise HTTPException(status_code=400, detail="Debes especificar las fechas de inicio y fin para eventos no recurrentes.")
        if event_data.start_date > event_data.end_date:
            raise HTTPException(status_code=400, detail="La fecha de inicio no puede ser mayor a la fecha de fin.")

    new_event = SystemEvent(
        type=event_data.type,
        is_recurring=event_data.is_recurring,
        recurrence_start_day=event_data.recurrence_start_day,
        recurrence_end_day=event_data.recurrence_end_day,
        start_date=event_data.start_date,
        end_date=event_data.end_date,
        description=event_data.description,
        is_active=event_data.is_active,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    db.add(new_event)
    await db.commit()
    await db.refresh(new_event)
    return new_event

@router.put("/{event_id}", response_model=SystemEventResponse)
async def update_system_event(
    event_id: int,
    event_data: SystemEventUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await check_manage_events_permission(current_user)
    
    stmt = select(SystemEvent).where(SystemEvent.id == event_id)
    result = await db.execute(stmt)
    event = result.scalars().first()
    
    if not event:
        raise HTTPException(status_code=404, detail="Evento no encontrado.")
        
    update_data = event_data.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(event, key, value)
        
    event.updated_at = datetime.utcnow()
    
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event

@router.delete("/{event_id}")
async def delete_system_event(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await check_manage_events_permission(current_user)
    
    stmt = select(SystemEvent).where(SystemEvent.id == event_id)
    result = await db.execute(stmt)
    event = result.scalars().first()
    
    if not event:
        raise HTTPException(status_code=404, detail="Evento no encontrado.")
        
    await db.delete(event)
    await db.commit()
    return {"status": "success", "message": "Evento eliminado correctamente."}
