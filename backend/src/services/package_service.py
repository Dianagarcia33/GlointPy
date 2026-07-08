from typing import List, Sequence
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError

from src.models.package import Package
from src.schemas.package import PackageCreate, PackageUpdate

class PackageService:
    @staticmethod
    async def get_all_packages(db: AsyncSession) -> Sequence[Package]:
        result = await db.execute(select(Package))
        return result.scalars().all()

    @staticmethod
    async def get_package_by_id(db: AsyncSession, package_id: int) -> Package:
        result = await db.execute(select(Package).where(Package.id == package_id))
        package = result.scalars().first()
        if not package:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Package not found"
            )
        return package

    @staticmethod
    async def create_package(db: AsyncSession, package_in: PackageCreate) -> Package:
        package = Package(**package_in.model_dump())
        db.add(package)
        try:
            await db.commit()
            await db.refresh(package)
            return package
        except IntegrityError:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Error creating package"
            )
