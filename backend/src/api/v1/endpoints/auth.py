from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any

from src.core.database import get_db
from src.core.security import create_access_token
from src.schemas.auth import Token, LoginRequest, RegisterRequest
from src.schemas.user import UserResponse
from src.services.auth_service import AuthService
from src.api.deps import get_current_user
from src.models.user import User

router = APIRouter()

@router.post("/login", response_model=Token)
async def login(login_data: LoginRequest, db: AsyncSession = Depends(get_db)) -> Any:
    """
    Inicia sesión (Login). 
    Recibe email y password, devuelve un Access Token.
    """
    user = await AuthService.authenticate_user(db, login_data)
    
    # Generar token
    access_token = create_access_token(subject=user.id)
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

@router.post("/register", response_model=UserResponse)
async def register(register_data: RegisterRequest, db: AsyncSession = Depends(get_db)) -> Any:
    """
    Registra un nuevo usuario en la base de datos.
    """
    user = await AuthService.register_user(db, register_data)
    return user

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_user)) -> Any:
    """
    Obtiene los datos del usuario actual (el dueño del token enviado en el header).
    """
    return current_user
