from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any

from src.core.database import get_db
from src.core.config import settings
from src.core.security import create_access_token
from src.schemas.auth import Token, LoginRequest, RegisterRequest, ForceChangePasswordRequest, ForgotPasswordRequest, ResetPasswordRequest
from src.schemas.user import UserResponse
from src.services.auth_service import AuthService
from src.api.deps import get_current_user
from src.models.user import User

router = APIRouter()

def set_auth_cookie(response: Response, access_token: str):
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False if getattr(settings, 'ENVIRONMENT', 'development') == 'development' else True,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/"
    )

def clear_auth_cookie(response: Response):
    response.delete_cookie(
        key="access_token",
        path="/"
    )

@router.post("/login", response_model=Token)
async def login(login_data: LoginRequest, request: Request, response: Response, db: AsyncSession = Depends(get_db)) -> Any:
    """
    Inicia sesión (Login). 
    Recibe email y password, devuelve un Access Token y establece la cookie HttpOnly.
    """
    user = await AuthService.authenticate_user(db, login_data, request=request)

    # Generar token
    access_token = create_access_token(subject=user.id)
    set_auth_cookie(response, access_token)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/logout")
async def logout(response: Response) -> Any:
    """
    Cierra sesión eliminando la cookie HttpOnly de autenticación.
    """
    clear_auth_cookie(response)
    return {"message": "Sesión cerrada correctamente"}

from src.schemas.auth import InvestorRegisterRequest
@router.post("/register-investor", response_model=Token)
async def register_investor(register_data: InvestorRegisterRequest, response: Response, db: AsyncSession = Depends(get_db)) -> Any:
    """
    Registra un inversionista con sus datos personales, bancarios, KYC y la solicitud de inversión.
    """
    user = await AuthService.register_investor(db, register_data)
    access_token = create_access_token(subject=user.id)
    set_auth_cookie(response, access_token)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/force-change-password", response_model=Token)
async def force_change_password(data: ForceChangePasswordRequest, response: Response, db: AsyncSession = Depends(get_db)) -> Any:
    """
    Cambia la contraseña de forma obligatoria cuando must_change_password = True.
    Retorna el Token de acceso tras cambiarla exitosamente y renueva la cookie.
    """
    user = await AuthService.force_change_password(db, data)
    
    # Generar token
    access_token = create_access_token(subject=user.id)
    set_auth_cookie(response, access_token)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

from fastapi import BackgroundTasks

@router.post("/forgot-password")
async def forgot_password(
    data: ForgotPasswordRequest, 
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Envía un correo de recuperación de contraseña si el correo existe en la base de datos.
    """
    await AuthService.request_password_reset(db, data.email, background_tasks)
    return {"message": "Si el correo está registrado, recibirás un enlace de recuperación."}


@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest, db: AsyncSession = Depends(get_db)) -> Any:
    """
    Valida el token de recuperación y establece una nueva contraseña.
    """
    await AuthService.reset_password(db, data.token, data.new_password)
    return {"message": "Tu contraseña ha sido actualizada exitosamente."}

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
    Sube un archivo de comprobante o documento KYC con validaciones de seguridad (máximo 10MB, UUID aleatorio).
    """
    os.makedirs("uploads", exist_ok=True)
    ext = os.path.splitext(file.filename)[1].lower()
    
    # Lista estricta de extensiones permitidas
    allowed_extensions = ['.jpg', '.jpeg', '.png', '.pdf', '.webp']
    if ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Extensión de archivo no permitida. Solo se permiten imágenes (JPG, PNG, WEBP) o documentos PDF.")
        
    # Verificar tamaño del archivo (máximo 10MB)
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="El archivo excede el tamaño máximo permitido de 10MB.")

    # Guardar usando UUID v4 aleatorio de alta entropía
    filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join("uploads", filename)
    
    with open(file_path, "wb") as buffer:
        buffer.write(file_bytes)
        
    return {"path": f"/uploads/{filename}"}


from sqlalchemy import select
from src.models.package import Package
from src.models.period import Period

@router.get("/public/config")
async def get_public_config(db: AsyncSession = Depends(get_db)):
    """
    Retorna la configuración pública necesaria para el registro (paquetes y periodos).
    """
    # Fetch packages
    paquetes_result = await db.execute(select(Package).where(Package.is_active == True))
    paquetes_db = paquetes_result.scalars().all()
    
    # Fetch periods
    periodos_result = await db.execute(select(Period).where(Period.is_active == True))
    periodos_db = periodos_result.scalars().all()
    
    # Format to match frontend expectations
    paquetes = [
        {
            "id": p.id,
            "paquete_accion_adquirido": f"${p.value:,.0f} COP",
            "value": p.value,
            "granted_shares": p.granted_shares
        }
        for p in paquetes_db
    ]
    
    periodos = [
        {
            "id": p.id,
            "name": f"Plazo de {p.months} Meses",
            "months": p.months,
            "days": p.days,
            "percentage": p.percentage
        }
        for p in periodos_db
    ]
    
    return {
        "paquetes": paquetes,
        "periodos": periodos
    }

@router.post("/public/ocr-extract")
async def extract_ocr_data(file: UploadFile = File(...)):
    """
    Sube un archivo de documento de identidad y usa AWS Rekognition
    para extraer heurísticamente el nombre completo y la cédula.
    """
    ext = os.path.splitext(file.filename)[1]
    if ext.lower() not in ['.jpg', '.jpeg', '.png']:
        raise HTTPException(status_code=400, detail="Solo se permiten imágenes para OCR.")
        
    try:
        from src.services.ocr_service import ocr_service
        # Read the file bytes directly into memory
        contents = await file.read()
        
        # Llama a Amazon Rekognition via nuestro servicio
        extracted_data = ocr_service.extract_colombian_id_data(contents)
        
        return extracted_data
    except Exception as e:
        print(f"Error procesando OCR: {e}")
        # Retornamos vacío si falla, el frontend hace fallback manual
        return {"document_number": "", "full_name": ""}
