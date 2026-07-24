from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from src.core.database import get_db
from src.schemas.system_event import SystemEventResponse, SystemEventCreate, SystemEventUpdate
from src.services.system_event_service import SystemEventService
from src.api.deps import RequirePermission

router = APIRouter()

@router.get("", response_model=List[SystemEventResponse], dependencies=[Depends(RequirePermission("manage_system_events"))])
@router.get("/", response_model=List[SystemEventResponse], dependencies=[Depends(RequirePermission("manage_system_events"))], include_in_schema=False)
async def list_events(db: AsyncSession = Depends(get_db)):
    """
    Obtiene la lista de todos los eventos del sistema.
    """
    return await SystemEventService.get_all_events(db)

@router.post("", response_model=SystemEventResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(RequirePermission("manage_system_events"))])
@router.post("/", response_model=SystemEventResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(RequirePermission("manage_system_events"))], include_in_schema=False)
async def create_event(event_in: SystemEventCreate, db: AsyncSession = Depends(get_db)):
    """
    Crea un nuevo evento del sistema.
    """
    return await SystemEventService.create_event(db, event_in)

@router.put("/{event_id}", response_model=SystemEventResponse, dependencies=[Depends(RequirePermission("manage_system_events"))])
async def update_event(event_id: int, event_in: SystemEventUpdate, db: AsyncSession = Depends(get_db)):
    """
    Actualiza un evento del sistema.
    """
    return await SystemEventService.update_event(db, event_id, event_in)

@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(RequirePermission("manage_system_events"))])
async def delete_event(event_id: int, db: AsyncSession = Depends(get_db)):
    """
    Elimina un evento del sistema.
    """
    await SystemEventService.delete_event(db, event_id)
