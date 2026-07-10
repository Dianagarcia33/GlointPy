from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any

from src.core.database import get_db
from src.core.security import create_access_token
from src.schemas.auth import Token, LoginRequest, RegisterRequest, ForceChangePasswordRequest
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
        "token_type": "bearer",
        "user": user
    }

@router.post("/register", response_model=Token)
async def register(register_data: RegisterRequest, db: AsyncSession = Depends(get_db)) -> Any:
    """
    Registra un nuevo usuario en la base de datos y lo loguea automáticamente.
    """
    user = await AuthService.register_user(db, register_data)
    access_token = create_access_token(subject=user.id)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/force-change-password", response_model=Token)
async def force_change_password(data: ForceChangePasswordRequest, db: AsyncSession = Depends(get_db)) -> Any:
    """
    Cambia la contraseña de forma obligatoria cuando must_change_password = True.
    Retorna el Token de acceso tras cambiarla exitosamente.
    """
    user = await AuthService.force_change_password(db, data)
    
    # Generar token
    access_token = create_access_token(subject=user.id)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_user)) -> Any:
    """
    Obtiene los datos del usuario actual (el dueño del token enviado en el header).
    """
    return current_user


import os
import shutil
import uuid
from fastapi import UploadFile, File

@router.post("/public/upload-file")
async def upload_file(file: UploadFile = File(...)):
    """
    Sube un archivo públicamente (comprobantes, documentos KYC) y retorna su ruta de acceso.
    """
    ext = os.path.splitext(file.filename)[1]
    if ext.lower() not in ['.jpg', '.jpeg', '.png', '.pdf']:
        raise HTTPException(status_code=400, detail="Extensión de archivo no permitida.")
        
    filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join("uploads", filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {"path": f"/uploads/{filename}"}

