from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from src.core.database import get_db
from src.core.config import settings
from src.models.user import User
from src.core.security import verify_password, create_access_token, create_refresh_token
from src.schemas.auth_schema import LoginRequest, Token

router = APIRouter()

@router.post("/login", response_model=Token)
async def login(
    response: Response,
    request: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    # Buscar al usuario por correo
    result = await db.execute(select(User).where(User.email == request.email))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if not verify_password(request.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuario inactivo"
        )
        
    # Generar tokens
    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id)
    
    # Inyectar el Refresh Token en una Cookie HttpOnly
    is_secure = settings.ENVIRONMENT != "development"
    
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=is_secure,
        samesite="lax",
        max_age=7200,    # 2 horas
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "is_active": user.is_active
        }
    }

@router.post("/logout")
async def logout(response: Response):
    # Borrar la cookie HttpOnly
    is_secure = settings.ENVIRONMENT != "development"
    
    response.delete_cookie(
        key="refresh_token",
        httponly=True,
        secure=is_secure,
        samesite="lax",
    )
    return {"message": "Sesión cerrada correctamente"}
