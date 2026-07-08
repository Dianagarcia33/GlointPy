from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from src.models.user import User
from src.schemas.auth import LoginRequest, RegisterRequest
from src.core.security import verify_password, get_password_hash, create_access_token

class AuthService:
    
    @staticmethod
    async def authenticate_user(db: AsyncSession, login_data: LoginRequest) -> User:
        result = await db.execute(select(User).options(selectinload(User.roles)).where(User.email == login_data.email))
        user = result.scalars().first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Correo o contraseña incorrectos",
            )
            
        if not verify_password(login_data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Correo o contraseña incorrectos",
            )
            
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuario inactivo, contacte al administrador"
            )
            
        return user

    @staticmethod
    async def register_user(db: AsyncSession, register_data: RegisterRequest) -> User:
        # Check si ya existe
        existing = await db.execute(select(User).where(User.email == register_data.email))
        if existing.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El correo ya está registrado."
            )
            
        new_user = User(
            name=register_data.name,
            email=register_data.email,
            password_hash=get_password_hash(register_data.password)
        )
        
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        return new_user
