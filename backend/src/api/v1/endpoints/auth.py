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
    # Buscar al usuario por correo intentando cargar sus roles y permisos
    try:
        from src.models.security import Role
        from sqlalchemy.orm import selectinload
        result = await db.execute(
            select(User)
            .options(selectinload(User.roles))
            .where(User.email == request.email)
        )
        user = result.scalars().first()
    except Exception as e:
        await db.rollback()
        # Fallback 1: Intentar cargar SOLO los roles (por si la tabla role_permissions no existe)
        try:
            result = await db.execute(
                select(User)
                .options(selectinload(User.roles))
                .where(User.email == request.email)
            )
            user = result.scalars().first()
        except Exception as e1:
            print(f"Fallback 1 falló: {e1}")
            await db.rollback()
            # Fallback 2: Cargar solo el usuario básico
            result = await db.execute(select(User).where(User.email == request.email))
            user = result.scalars().first()
    
    if user:
        from src.core.pbac import PBACEngine
        
        # 1. Extraer nombres de roles PRIMERO (seguro de MissingGreenlet)
        try:
            if hasattr(user, 'roles') and user.roles:
                user_roles_list = [r.name for r in user.roles]
            else:
                user_roles_list = []
            setattr(user, 'roles_list', user_roles_list)
        except Exception:
            setattr(user, 'roles_list', [])

        # 2. Extraer permisos 
        try:
            user.permissions = PBACEngine.get_user_permissions(user)
        except Exception:
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
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "is_active": user.is_active,
            "roles_list": getattr(user, 'roles_list', []),
            "permissions": getattr(user, 'permissions', [])
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
