from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from src.core.config import settings
from src.core.database import get_db
from src.models.user import User
from src.core.pbac import PBACEngine

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Valida el JWT y retorna el usuario actual con sus roles precargados."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales inválidas o expiradas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    from src.models.security import Role
    from sqlalchemy.exc import OperationalError, ProgrammingError
    
    try:
        # Buscar el usuario e intentar cargar sus roles e información de permisos
        result = await db.execute(
            select(User)
            .options(selectinload(User.roles).selectinload(Role.permissions))
            .where(User.id == int(user_id))
        )
        user = result.scalars().first()
    except (OperationalError, ProgrammingError):
        # Fallback: Si la base de datos no tiene las tablas de roles/permisos creadas aún,
        # cargamos solo el usuario básico para no tumbar toda la API (ej. Login y Dashboard).
        result = await db.execute(
            select(User).where(User.id == int(user_id))
        )
        user = result.scalars().first()
        
    if user is None or not user.is_active:
        raise credentials_exception
        
    return user

class RequirePermission:
    """
    Dependencia de FastAPI para proteger rutas basadas en PBAC.
    Uso: @router.get("/recurso", dependencies=[Depends(RequirePermission("view_recurso"))])
    """
    def __init__(self, required_permission: str):
        self.required_permission = required_permission
        
    async def __call__(self, current_user: User = Depends(get_current_user)):
        if not PBACEngine.has_permission(current_user, self.required_permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"No tienes el permiso requerido: {self.required_permission}"
            )
        return current_user
