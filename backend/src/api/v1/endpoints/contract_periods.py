from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from src.core.database import get_db
from src.models.contract_period import ContractPeriod
from src.schemas.contract_period import ContractPeriodResponse

router = APIRouter()

@router.get("", response_model=List[ContractPeriodResponse])
async def read_contract_periods(db: AsyncSession = Depends(get_db)):
    """
    Retrieve all contract periods.
    """
    result = await db.execute(select(ContractPeriod).order_by(ContractPeriod.months))
    periods = result.scalars().all()
    return periods
