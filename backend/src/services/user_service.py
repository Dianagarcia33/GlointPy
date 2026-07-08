from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List

from src.models.user import User
from src.models.security import Role
from src.core.security import get_password_hash
from fastapi import HTTPException

class UserService:
    @staticmethod
    async def get_all_users(db: AsyncSession) -> List[User]:
        result = await db.execute(select(User).options(selectinload(User.roles)))
        return result.scalars().all()

    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: int) -> User:
        result = await db.execute(select(User).options(selectinload(User.roles)).where(User.id == user_id))
        user = result.scalars().first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user

    @staticmethod
    async def create_user_admin(db: AsyncSession, user_data: dict) -> User:
        # Check if email exists
        result = await db.execute(select(User).where(User.email == user_data["email"]))
        if result.scalars().first():
            raise HTTPException(status_code=400, detail="Email already registered")

        # Create user with default password
        user = User(
            name=user_data["name"],
            email=user_data["email"],
            document_id=user_data.get("document_id"),
            phone_number=user_data.get("phone_number"),
            date_of_birth=user_data.get("date_of_birth"),
            password_hash=get_password_hash("Temp123!"),
            must_change_password=True,
            is_active=user_data.get("is_active", True)
        )
        
        # Asignar roles si se proveen
        if "role_ids" in user_data and user_data["role_ids"]:
            roles_result = await db.execute(select(Role).where(Role.id.in_(user_data["role_ids"])))
            user.roles = roles_result.scalars().all()
        
        db.add(user)
        await db.commit()
        await db.refresh(user)
        # Fetch again to eagerly load roles for response
        return await UserService.get_user_by_id(db, user.id)

    @staticmethod
    async def update_user_admin(db: AsyncSession, user_id: int, user_data: dict) -> User:
        user = await UserService.get_user_by_id(db, user_id)
        
        # If email changed, check uniqueness
        if "email" in user_data and user_data["email"] != user.email:
            result = await db.execute(select(User).where(User.email == user_data["email"]))
            if result.scalars().first():
                raise HTTPException(status_code=400, detail="Email already registered")

        for key, value in user_data.items():
            if key != "role_ids":
                setattr(user, key, value)

        # Update roles if provided
        if "role_ids" in user_data:
            if user_data["role_ids"]:
                roles_result = await db.execute(select(Role).where(Role.id.in_(user_data["role_ids"])))
                user.roles = roles_result.scalars().all()
            else:
                user.roles = []

        await db.commit()
        await db.refresh(user)
        return await UserService.get_user_by_id(db, user.id)
