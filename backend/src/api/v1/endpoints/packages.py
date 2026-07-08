from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.security import get_current_active_user
from src.models.user import User
from src.schemas.package import PackageResponse, PackageCreate
from src.services.package_service import PackageService
from src.core.pbac import require_permissions

router = APIRouter()

@router.get("/", response_model=List[PackageResponse])
async def read_packages(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all packages.
    """
    return await PackageService.get_all_packages(db)

@router.post("/", response_model=PackageResponse)
@require_permissions("admin.packages.manage")
async def create_package(
    package_in: PackageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new package. Requires 'admin.packages.manage' permission.
    """
    return await PackageService.create_package(db, package_in)
