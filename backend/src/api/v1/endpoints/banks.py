from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from typing import List, Optional

from src.core.database import get_db
from src.models.data_bank import DataBank
from src.schemas.data_bank import DataBankResponse
from src.api.deps import get_current_user
from src.models.user import User

router = APIRouter()

@router.get("", response_model=List[DataBankResponse])
@router.get("/", response_model=List[DataBankResponse])
async def get_banks(
    search: Optional[str] = Query(None, description="Filtrar por nombre o código de banco"),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene la lista de todos los bancos oficiales y sus códigos ACH.
    """
    query = select(DataBank)
    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.where(
            or_(
                DataBank.banck.ilike(search_pattern),
                DataBank.code_banck.ilike(search_pattern)
            )
        )
    query = query.order_by(DataBank.banck.asc())
    result = await db.execute(query)
    banks = result.scalars().all()

    if not banks and not search:
        try:
            from src.seed_banks import BANKS_DATA
            for b_info in BANKS_DATA:
                b_obj = DataBank(
                    id=b_info["id"],
                    banck=b_info["banck"],
                    code_banck=b_info["code_banck"]
                )
                db.add(b_obj)
            await db.commit()
            result = await db.execute(query)
            banks = result.scalars().all()
        except Exception:
            await db.rollback()

    return banks

@router.get("/{bank_id}", response_model=DataBankResponse)
async def get_bank(
    bank_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene un banco por su ID.
    """
    result = await db.execute(select(DataBank).where(DataBank.id == bank_id))
    bank = result.scalars().first()
    if not bank:
        raise HTTPException(status_code=404, detail="Banco no encontrado")
    return bank
