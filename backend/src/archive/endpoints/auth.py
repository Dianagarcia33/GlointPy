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
    # Buscar al usuario por correo intentando cargar sus roles
    try:
        from sqlalchemy.orm import selectinload
        result = await db.execute(
            select(User)
            .options(selectinload(User.roles))
            .where(User.email == request.email)
        )
        user = result.scalars().first()
    except Exception as e:
        await db.rollback()
        # Fallback 2: Cargar solo el usuario básico
        result = await db.execute(select(User).where(User.email == request.email))
        user = result.scalars().first()
    
    if user:
        # 1. Extraer nombres de roles PRIMERO (seguro de MissingGreenlet)
        try:
            if hasattr(user, 'roles') and user.roles:
                user_roles_list = [r.name for r in user.roles]
            else:
                user_roles_list = []
            setattr(user, 'roles_list', user_roles_list)
        except Exception:
            setattr(user, 'roles_list', [])

        # 2. Extraer permisos desde la columna JSON de la tabla roles
        from sqlalchemy import text
        try:
            perms_result = await db.execute(
                text("""
                    SELECT r.permissions 
                    FROM roles r
                    JOIN user_roles ur ON r.id = ur.role_id
                    WHERE ur.user_id = :user_id
                """),
                {"user_id": user.id}
            )
            raw_permissions = set()
            for row in perms_result.fetchall():
                import json
                perms_data = row[0]
                if isinstance(perms_data, str):
                    try:
                        perms_list = json.loads(perms_data)
                    except:
                        perms_list = []
                elif isinstance(perms_data, list):
                    perms_list = perms_data
                else:
                    perms_list = []
                    
                for p in perms_list:
                    raw_permissions.add(p)
            
            # Mezclar con overrides individuales si existen
            try:
                if hasattr(user, 'permissions_override') and user.permissions_override:
                    import json
                    overrides = user.permissions_override
                    if isinstance(overrides, str):
                        try:
                            overrides = json.loads(overrides)
                        except:
                            overrides = {}
                            
                    if isinstance(overrides, dict):
                        for perm_name, is_granted in overrides.items():
                            if is_granted:
                                raw_permissions.add(perm_name)
                            elif perm_name in raw_permissions:
                                raw_permissions.remove(perm_name)
            except Exception as override_err:
                print(f"Ignorando error en permissions_override: {override_err}")
                
            user.permissions = list(raw_permissions)
        except Exception as perm_error:
            print(f"Error cargando permisos: {perm_error}")
            user.permissions = list(raw_permissions) if 'raw_permissions' in locals() else []
            
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
    from src.schemas.auth_schema import UserResponse
    user_response = None
    if user:
        user_response = UserResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            is_active=user.is_active,
            roles_list=getattr(user, "roles_list", []),
            permissions=getattr(user, "permissions", [])
        )
        
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": user_response
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

from src.schemas.auth_schema import InvestorRegisterRequest
from src.core.security import get_password_hash
from src.models.investment_request import InvestmentRequest, InvestmentStatus
from src.models.security import Role

@router.post("/register-investor", response_model=Token)
async def register_investor(
    response: Response,
    request: InvestorRegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    # 1. Validate if user exists
    existing_user_stmt = select(User).where(User.email == request.email)
    existing_user_res = await db.execute(existing_user_stmt)
    if existing_user_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un usuario con ese correo electrónico"
        )
    
    # 2. Assign role (Query first to avoid MissingGreenlet on async lazy load)
    role_stmt = select(Role).where(Role.name.in_(["investor", "inversionista"]))
    role_res = await db.execute(role_stmt)
    inv_role = role_res.scalars().first()

    # 3. Create User
    hashed_password = get_password_hash(request.password)
    new_user = User(
        name=request.name,
        email=request.email,
        password=hashed_password,
        is_active=True,
        roles=[inv_role] if inv_role else []
    )
    db.add(new_user)
    await db.flush()

    # 4. Construct extra_data
    extra_data = {
        "periodo_contrato": request.contract_period_id,
        "is_custom_monto": request.paquete_id is None,
        "kyc_docs": request.kyc_docs,
        "personal_info": {
            "nombre_completo": request.name,
            "correo_electronico": request.email,
            "tipo_documento": request.tipo_documento,
            "documento": request.documento,
            "numero_celular": request.numero_celular,
            "ciudad": request.ciudad,
            "fecha_nacimiento": request.fecha_nacimiento.isoformat() if request.fecha_nacimiento else None
        },
        "bank_info": {
            "banco": request.banco,
            "tipo_cuenta": request.tipo_cuenta,
            "numero_cuenta": request.numero_cuenta
        }
    }

    # 5. Handle package ID (if none, assign dummy 1 to satisfy constraint temporarily)
    paquete_id = request.paquete_id
    if not paquete_id:
        # Import PaqueteInversion here to avoid circular imports if needed
        from src.models.paquete_inversion import PaqueteInversion
        stmt_pkg = select(PaqueteInversion).limit(1)
        pkg_res = await db.execute(stmt_pkg)
        first_pkg = pkg_res.scalar_one_or_none()
        paquete_id = first_pkg.id if first_pkg else 1

    try:
        # 6. Create InvestmentRequest
        new_request = InvestmentRequest(
            user_id=new_user.id,
            paquete_inversion_id=paquete_id,
            monto=request.monto,
            comprobante_path=request.comprobante_path,
            status=InvestmentStatus.pending,
            extra_data=extra_data
        )
        db.add(new_request)
        
        await db.commit()
        await db.refresh(new_user)
    except Exception as e:
        await db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error creando solicitud de inversion: {str(e)}")

    # 7. Generate tokens and login
    access_token = create_access_token(subject=new_user.id)
    refresh_token = create_refresh_token(subject=new_user.id)
    
    is_secure = settings.ENVIRONMENT != "development"
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=is_secure,
        samesite="lax",
        max_age=7200,
    )

    # Re-fetch user with roles to format response correctly
    from sqlalchemy.orm import selectinload
    stmt = select(User).options(selectinload(User.roles)).where(User.id == new_user.id)
    res = await db.execute(stmt)
    full_user = res.scalars().first()
    
    roles_list = []
    if hasattr(full_user, 'roles') and full_user.roles:
        roles_list = [r.name for r in full_user.roles]

    from sqlalchemy import text
    try:
        perms_result = await db.execute(
            text("""
                SELECT r.permissions 
                FROM roles r
                JOIN user_roles ur ON r.id = ur.role_id
                WHERE ur.user_id = :user_id
            """),
            {"user_id": full_user.id}
        )
        raw_permissions = set()
        for row in perms_result.fetchall():
            import json
            perms_data = row[0]
            if isinstance(perms_data, str):
                try:
                    perms_list = json.loads(perms_data)
                except:
                    perms_list = []
            elif isinstance(perms_data, list):
                perms_list = perms_data
            else:
                perms_list = []
                
            for p in perms_list:
                raw_permissions.add(p)
    except Exception as e:
        raw_permissions = set()
                    
    from src.schemas.auth_schema import UserResponse
    user_response = UserResponse(
        id=full_user.id,
        name=full_user.name,
        email=full_user.email,
        is_active=full_user.is_active,
        roles_list=roles_list,
        permissions=list(raw_permissions)
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_response
    }

from src.models.paquete_inversion import PaqueteInversion
from src.models.contract_period import ContractPeriod
from fastapi import UploadFile, File
import shutil
import os
from pathlib import Path

@router.get("/public/config")
async def get_public_config(db: AsyncSession = Depends(get_db)):
    """Retorna los paquetes y periodos de inversión públicamente para el formulario de registro"""
    # Paquetes
    stmt_pkgs = select(PaqueteInversion).order_by(PaqueteInversion.id)
    res_pkgs = await db.execute(stmt_pkgs)
    paquetes = res_pkgs.scalars().all()
    
    # Periodos
    stmt_periods = select(ContractPeriod).order_by(ContractPeriod.id)
    res_periods = await db.execute(stmt_periods)
    periodos = res_periods.scalars().all()
    
    return {
        "paquetes": paquetes,
        "periodos": periodos
    }

@router.post("/public/upload-file")
async def public_upload_file(file: UploadFile = File(...)):
    """Sube un archivo de forma pública (para el proceso de registro)"""
    upload_dir = Path("uploads/temp")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    file_extension = os.path.splitext(file.filename)[1]
    safe_filename = f"temp_{os.urandom(8).hex()}{file_extension}"
    file_path = upload_dir / safe_filename
    
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {"path": str(file_path)}

@router.post("/public/kyc-validate")
async def kyc_validate(
    front: UploadFile = File(...),
    back: UploadFile = File(...),
    selfie: UploadFile = File(...)
):
    """
    Recibe las imágenes KYC y realiza extracción OCR por coordenadas 
    junto con la validación biométrica facial.
    """
    from src.services.aws_kyc_service import process_kyc_documents
    
    upload_dir = Path("uploads/temp")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    paths = []
    
    front_bytes = await front.read()
    back_bytes = await back.read()
    selfie_bytes = await selfie.read()
    
    for file_obj, fbytes in [(front, front_bytes), (back, back_bytes), (selfie, selfie_bytes)]:
        file_extension = os.path.splitext(file_obj.filename)[1]
        safe_filename = f"kyc_{os.urandom(8).hex()}{file_extension}"
        file_path = upload_dir / safe_filename
        with file_path.open("wb") as buffer:
            buffer.write(fbytes)
        paths.append(str(file_path))
        
    try:
        extracted_data = process_kyc_documents(front_bytes, back_bytes, selfie_bytes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Server Error KYC: {e}")
        raise HTTPException(status_code=500, detail="Error de servidor al validar identidad.")
        
    return {
        "paths": paths,
        "extracted_data": extracted_data
    }
