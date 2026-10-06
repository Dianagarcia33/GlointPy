from typing import List, Sequence
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError, DataError
from src.models.package import Package
from src.schemas.package import PackageCreate, PackageUpdate

class PackageService:
    @staticmethod
    async def get_all_packages(db: AsyncSession) -> Sequence[Package]:
        result = await db.execute(select(Package).order_by(Package.value.asc()))
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
        except DataError:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El valor o las acciones ingresadas exceden el límite numérico admitido."
            )
        except IntegrityError:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Error creating package"
            )

    @staticmethod
    async def update_package(db: AsyncSession, package_id: int, package_in: PackageUpdate) -> Package:
        package = await PackageService.get_package_by_id(db, package_id)
        update_data = package_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(package, field, value)
        
        try:
            await db.commit()
            await db.refresh(package)
            return package
        except DataError:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El valor o las acciones ingresadas exceden el límite numérico admitido."
            )
        except IntegrityError:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Error updating package"
            )

    @staticmethod
    async def delete_package(db: AsyncSession, package_id: int) -> None:
        package = await PackageService.get_package_by_id(db, package_id)
        try:
            await db.delete(package)
            await db.commit()
        except IntegrityError:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete package, it might be in use"
            )
