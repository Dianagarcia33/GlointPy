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

        # 2. Extraer permisos usando una consulta SQL directa 100% a prueba de balas
        from sqlalchemy import text
        try:
            perms_result = await db.execute(
                text("""
                    SELECT p.name 
                    FROM permissions p
                    JOIN role_permissions rp ON p.id = rp.permission_id
                    JOIN user_roles ur ON rp.role_id = ur.role_id
                    WHERE ur.user_id = :user_id
                """),
                {"user_id": user.id}
            )
            raw_permissions = set([row[0] for row in perms_result.fetchall()])
            
            # Mezclar con overrides individuales si existen
            if user.permissions_override:
                for perm_name, is_granted in user.permissions_override.items():
                    if is_granted:
                        raw_permissions.add(perm_name)
                    elif perm_name in raw_permissions:
                        raw_permissions.remove(perm_name)
                        
            user.permissions = list(raw_permissions)
        except Exception as perm_error:
            print(f"Error cargando permisos: {perm_error}")
            user.permissions = []
            
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
