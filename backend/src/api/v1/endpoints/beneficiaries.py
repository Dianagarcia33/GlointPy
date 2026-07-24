from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from src.core.database import get_db
from src.api.deps import get_current_user, RequirePermission
from src.models.user import User
from src.schemas.beneficiary import BeneficiaryCreate, BeneficiaryUpdate, BeneficiaryResponse
from src.services.beneficiary_service import BeneficiaryService

router = APIRouter(prefix="/beneficiaries", tags=["beneficiaries"])

@router.get("/me", response_model=List[BeneficiaryResponse])
async def get_my_beneficiaries(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await BeneficiaryService.get_all_by_user(db, current_user.id)

@router.post("/me", response_model=BeneficiaryResponse, status_code=status.HTTP_201_CREATED)
async def create_my_beneficiary(
    data: BeneficiaryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await BeneficiaryService.create(db, current_user.id, data)

@router.put("/me/{beneficiary_id}", response_model=BeneficiaryResponse)
async def update_my_beneficiary(
    beneficiary_id: int,
    data: BeneficiaryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await BeneficiaryService.update(db, beneficiary_id, current_user.id, data)

@router.delete("/me/{beneficiary_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_beneficiary(
    beneficiary_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await BeneficiaryService.delete(db, beneficiary_id, current_user.id)
    return None

@router.get("/user/{user_id}", response_model=List[BeneficiaryResponse], dependencies=[Depends(RequirePermission("admin.users.manage"))])
async def get_user_beneficiaries_admin(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await BeneficiaryService.get_all_by_user(db, user_id)
