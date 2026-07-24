from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any
from src.core.database import get_db
from src.api.deps import get_current_user, RequirePermission
from src.models.user import User
from src.schemas.potential_referral import PotentialReferralCreate, PotentialReferralUpdate, PotentialReferralResponse
from src.services.potential_referral_service import PotentialReferralService

router = APIRouter(prefix="/potential-referrals", tags=["potential-referrals"])

@router.get("/me", response_model=List[PotentialReferralResponse])
async def get_my_potential_referrals(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await PotentialReferralService.get_by_user_id(db, current_user.id)

@router.post("/me", response_model=PotentialReferralResponse, status_code=status.HTTP_201_CREATED)
async def create_my_potential_referral(
    data: PotentialReferralCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await PotentialReferralService.create_by_user(db, current_user.id, data)

@router.get("/admin", dependencies=[Depends(RequirePermission("admin.users.manage"))])
async def get_all_potential_referrals_admin(
    search: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await PotentialReferralService.get_all_admin(db, search, estado, page, limit)

@router.put("/{referral_id}", response_model=PotentialReferralResponse)
async def update_potential_referral(
    referral_id: int,
    data: PotentialReferralUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await PotentialReferralService.update(db, referral_id, data)

@router.delete("/{referral_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_potential_referral(
    referral_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await PotentialReferralService.delete(db, referral_id)
    return None
