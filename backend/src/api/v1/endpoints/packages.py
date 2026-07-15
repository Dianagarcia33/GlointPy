from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.api.deps import get_current_user, RequirePermission
from src.models.user import User
from src.schemas.package import PackageResponse, PackageCreate, PackageUpdate
from src.services.package_service import PackageService

router = APIRouter()

@router.get("", response_model=List[PackageResponse])
async def read_packages(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all packages.
    """
    return await PackageService.get_all_packages(db)

@router.post("", response_model=PackageResponse, dependencies=[Depends(RequirePermission("admin.packages.manage"))])
async def create_package(
    package_in: PackageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new package. Requires 'admin.packages.manage' permission.
    """
    return await PackageService.create_package(db, package_in)

@router.get("/{package_id}", response_model=PackageResponse)
async def get_package(
    package_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a package by ID.
    """
    return await PackageService.get_package_by_id(db, package_id)

@router.put("/{package_id}", response_model=PackageResponse, dependencies=[Depends(RequirePermission("admin.packages.manage"))])
async def update_package(
    package_id: int,
    package_in: PackageUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update a package. Requires 'admin.packages.manage' permission.
    """
    return await PackageService.update_package(db, package_id, package_in)

@router.delete("/{package_id}", status_code=204, dependencies=[Depends(RequirePermission("admin.packages.manage"))])
async def delete_package(
    package_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a package. Requires 'admin.packages.manage' permission.
    """
    await PackageService.delete_package(db, package_id)

@router.post("/bulk-upload", dependencies=[Depends(RequirePermission("admin.packages.manage"))])
async def bulk_upload_packages(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    """
    Upload a CSV file and create multiple packages in bulk.
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="El archivo debe ser un CSV válido.")
    
    content = await file.read()
    try:
        csv_text = content.decode('utf-8')
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="El archivo debe tener codificación UTF-8.")
        
    result = await PackageService.bulk_create_packages(db, csv_text)
    return result
