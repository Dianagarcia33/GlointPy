from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any, Optional

from src.core.database import get_db
from src.core.config import settings
from src.core.security import create_access_token
from src.schemas.auth import Token, LoginRequest, RegisterRequest, ForceChangePasswordRequest, ForgotPasswordRequest, ResetPasswordRequest, SendForcePasswordOtpRequest
from src.schemas.user import UserResponse
from src.services.auth_service import AuthService
from src.api.deps import get_current_user
from src.models.user import User

router = APIRouter()

def set_auth_cookie(response: Response, access_token: str, request: Optional[Request] = None):
    # Dynamic secure detection (supports both HTTP staging and HTTPS production via reverse proxy)
    is_secure = False
    if request:
        proto = request.headers.get("x-forwarded-proto", request.url.scheme)
        is_secure = (proto == "https")
    elif getattr(settings, 'ENVIRONMENT', 'development') == 'production':
        is_secure = True

    # SameSite=None is required for cross-origin HTTPS (e.g. Vercel frontend -> API domain)
    # SameSite=Lax is used for local HTTP development (browsers reject SameSite=None without Secure)
    samesite = "none" if is_secure else "lax"
    max_age = int(getattr(settings, 'ACCESS_TOKEN_EXPIRE_MINUTES', 1440)) * 60

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=is_secure,
        samesite=samesite,
        max_age=max_age,
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
    set_auth_cookie(response, access_token, request=request)
    
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
async def register_investor(register_data: InvestorRegisterRequest, request: Request, response: Response, db: AsyncSession = Depends(get_db)) -> Any:
    """
    Registra un inversionista con sus datos personales, bancarios, KYC y la solicitud de inversión.
    """
    user = await AuthService.register_investor(db, register_data)
    access_token = create_access_token(subject=user.id)
    set_auth_cookie(response, access_token, request=request)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/validate-referral/{code}")
async def validate_referral_code(code: str, db: AsyncSession = Depends(get_db)) -> Any:
    """
    Valida si un código de referido existe en la plataforma (H-70).
    No expone datos sensibles del referente para resguardar la privacidad.
    """
    clean_code = code.strip().upper()
    from src.models.investor import Investor
    from sqlalchemy.future import select
    
    res = await db.execute(select(Investor.id).where(Investor.assigned_code == clean_code))
    if not res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"El código de referido '{clean_code}' no existe en la plataforma."
        )
    return {"valid": True, "code": clean_code}

@router.post("/send-force-password-otp")
async def send_force_password_otp(data: SendForcePasswordOtpRequest, db: AsyncSession = Depends(get_db)) -> Any:
    """
    Envía un código OTP de 6 dígitos al correo del usuario para autorizar el cambio de contraseña obligatorio (H-76).
    """
    return await AuthService.send_force_password_otp(db, data.email, data.current_password)

@router.post("/force-change-password", response_model=Token)
async def force_change_password(data: ForceChangePasswordRequest, request: Request, response: Response, db: AsyncSession = Depends(get_db)) -> Any:
    """
    Cambia la contraseña de forma obligatoria cuando must_change_password = True.
    Retorna el Token de acceso tras cambiarla exitosamente y renueva la cookie.
    """
    user = await AuthService.force_change_password(db, data)
    
    # Generar token
    access_token = create_access_token(subject=user.id)
    set_auth_cookie(response, access_token, request=request)
    
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

from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from src.models.security import Role

@router.post("/switch-account/{child_id}", response_model=Token)
async def switch_to_child_account(
    child_id: int,
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Permite a un padre/tutor cambiar a la sesión de su hijo/menor vinculado sin requerir contraseña.
    Genera un nuevo token para el hijo y actualiza la cookie de autenticación.
    """
    result = await db.execute(
        select(User).options(
            selectinload(User.roles).selectinload(Role.permissions),
            selectinload(User.parent),
            selectinload(User.children)
        ).where(
            User.id == child_id,
            User.parent_user_id == current_user.id
        )
    )
    child = result.scalars().first()
    if not child:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para acceder a esta cuenta o no está vinculada como hijo/menor a cargo."
        )

    if not child.is_active:
        raise HTTPException(status_code=400, detail="La cuenta del menor se encuentra inactiva.")

    access_token = create_access_token(subject=child.id)
    set_auth_cookie(response, access_token, request=request)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": child
    }

@router.post("/switch-back", response_model=Token)
async def switch_back_to_parent(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Permite volver a la cuenta del tutor/padre si el usuario actual es un hijo vinculado.
    """
    if not current_user.parent_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esta cuenta no tiene un tutor o padre vinculado."
        )

    result = await db.execute(
        select(User).options(
            selectinload(User.roles).selectinload(Role.permissions),
            selectinload(User.parent),
            selectinload(User.children)
        ).where(User.id == current_user.parent_user_id)
    )
    parent = result.scalars().first()
    if not parent or not parent.is_active:
        raise HTTPException(status_code=404, detail="La cuenta del tutor no se encuentra disponible o activa.")

    access_token = create_access_token(subject=parent.id)
    set_auth_cookie(response, access_token, request=request)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": parent
    }


import os
import shutil
import uuid
from fastapi import UploadFile, File

@router.post("/public/upload-file")
async def upload_file(file: UploadFile = File(...)):
    """
    Sube un archivo de comprobante o documento KYC con validaciones de seguridad (máximo 10MB, UUID aleatorio).
    """
    try:
        os.makedirs("uploads/comprobantes", exist_ok=True)
        os.makedirs("uploads", exist_ok=True)
        ext = os.path.splitext(file.filename)[1].lower() if file.filename else ".jpg"
        
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
        file_path = os.path.join("uploads", "comprobantes", filename)
        
        with open(file_path, "wb") as buffer:
            buffer.write(file_bytes)
            
        return {"path": f"/uploads/comprobantes/{filename}"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al procesar y guardar el archivo: {str(e)}")


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

@router.post("/public/compare-faces")
async def compare_faces_endpoint(
    document: UploadFile = File(...),
    selfie: UploadFile = File(...)
):
    """
    Compara biométricamente el rostro en la foto de la cédula contra la selfie tomada por el usuario.
    Retorna si coinciden (matched: True/False), porcentaje de similitud y mensaje descriptivo.
    """
    allowed_exts = ['.jpg', '.jpeg', '.png', '.webp']
    for f in [document, selfie]:
        ext = os.path.splitext(f.filename)[1].lower() if f.filename else ""
        if ext not in allowed_exts:
            raise HTTPException(status_code=400, detail="Solo se permiten imágenes (JPG, PNG, WEBP) para la validación biométrica.")

    try:
        from src.services.ocr_service import ocr_service
        document_bytes = await document.read()
        selfie_bytes = await selfie.read()

        if len(document_bytes) == 0 or len(selfie_bytes) == 0:
            raise HTTPException(status_code=400, detail="Los archivos de imagen no pueden estar vacíos.")

        result = ocr_service.compare_faces(document_bytes, selfie_bytes)
        return result
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error procesando compare-faces: {e}")
        return {
            "matched": False,
            "similarity": 0.0,
            "message": f"No se pudo completar la validación biométrica: {str(e)}"
        }


from pydantic import BaseModel

class TestEmailRequest(BaseModel):
    email_type: str  # "welcome" | "sarlaft_approved" | "sarlaft_findings"
    target_email: Optional[str] = None


@router.post("/test-email")
async def send_test_email(
    payload: TestEmailRequest,
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Endpoint temporal para probar los nuevos correos corporativos:
    - welcome: Bienvenida y notificación de revisión SARLAFT
    - sarlaft_approved: Validación SARLAFT aprobada y cuenta habilitada
    - sarlaft_findings: Validación SARLAFT con alertas/hallazgos
    """
    from src.services.email_service import EmailService

    recipient = payload.target_email.strip() if payload.target_email else current_user.email
    if not recipient:
        raise HTTPException(status_code=400, detail="No se encontró una dirección de correo válida para enviar la prueba.")

    user_name = current_user.name or "Inversionista Gloint"
    doc_id = current_user.document_id or "1234567890"

    email_type = payload.email_type.lower().strip()
    sent = False
    template_label = ""

    if email_type == "welcome":
        template_label = "Bienvenida y Revisión Preventiva"
        sent = await EmailService.send_welcome_and_review_email(
            to_email=recipient,
            user_name=user_name,
            document_id=doc_id,
            document_type="CC"
        )
    elif email_type == "sarlaft_approved":
        template_label = "Validación SARLAFT Aprobada"
        sent = await EmailService.send_sarlaft_result_email(
            to_email=recipient,
            user_name=user_name,
            document_id=doc_id,
            document_type="CC",
            has_findings=False,
            risk_level="CLEAN"
        )
    elif email_type == "sarlaft_findings":
        template_label = "Validación SARLAFT con Alertas / Hallazgos"
        sent = await EmailService.send_sarlaft_result_email(
            to_email=recipient,
            user_name=user_name,
            document_id=doc_id,
            document_type="CC",
            has_findings=True,
            risk_level="MEDIUM",
            hallazgos_summary="Se detectaron alertas normativas preliminares en listas de control que requieren validación documental."
        )
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo de correo no válido ('{payload.email_type}'). Opciones válidas: 'welcome', 'sarlaft_approved', 'sarlaft_findings'"
        )

    if not sent:
        return {
            "success": False,
            "message": f"El servicio intentó despachar '{template_label}' a {recipient}, pero el envío no se completó. Verifica los logs o las credenciales de RESEND_API_KEY.",
            "recipient": recipient,
            "template": template_label
        }

    return {
        "success": True,
        "message": f"¡Correo '{template_label}' enviado exitosamente a {recipient}!",
        "recipient": recipient,
        "template": template_label
    }

