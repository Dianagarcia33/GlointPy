from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from src.core.database import get_db
from src.schemas.period import PeriodResponse, PeriodCreate, PeriodUpdate
from src.services.period_service import PeriodService
from src.api.deps import RequirePermission

router = APIRouter()

@router.get("", response_model=List[PeriodResponse])
async def list_periods(db: AsyncSession = Depends(get_db)):
    """
    Obtiene la lista de todos los periodos.
    """
    return await PeriodService.get_all_periods(db)

@router.post("", response_model=PeriodResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(RequirePermission("admin.periods.manage"))])
async def create_period(period_in: PeriodCreate, db: AsyncSession = Depends(get_db)):
    """
    Crea un nuevo periodo.
    """
    return await PeriodService.create_period(db, period_in)

@router.put("/{period_id}", response_model=PeriodResponse, dependencies=[Depends(RequirePermission("admin.periods.manage"))])
async def update_period(period_id: int, period_in: PeriodUpdate, db: AsyncSession = Depends(get_db)):
    """
    Actualiza la información de un periodo.
    """
    return await PeriodService.update_period(db, period_id, period_in)

@router.delete("/{period_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(RequirePermission("admin.periods.manage"))])
async def delete_period(period_id: int, db: AsyncSession = Depends(get_db)):
    """
    Elimina un periodo.
    """
    await PeriodService.delete_period(db, period_id)
