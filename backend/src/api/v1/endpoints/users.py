from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Optional

from src.core.database import get_db
from src.schemas.user import UserResponse, UserCreateAdmin, UserUpdateAdmin, UserPaginatedResponse
from src.schemas.security import AssignRoleToUser
from src.models.user import User
from src.models.security import Role
from src.services.user_service import UserService
from src.api.deps import RequirePermission

router = APIRouter()

@router.get("", response_model=UserPaginatedResponse, dependencies=[Depends(RequirePermission("admin.users.manage"))])
async def list_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    role_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene la lista de todos los usuarios paginada (para panel admin).
    """
    return await UserService.get_all_users(db, page, limit, search, role_id, is_active)

@router.post("", response_model=UserResponse, dependencies=[Depends(RequirePermission("admin.users.manage"))])
async def create_user(user_in: UserCreateAdmin, db: AsyncSession = Depends(get_db)):
    """
    Crea un usuario desde el panel admin (con contraseña temporal).
    """
    return await UserService.create_user_admin(db, user_in.model_dump())

@router.put("/{user_id}", response_model=UserResponse, dependencies=[Depends(RequirePermission("admin.users.manage"))])
async def update_user(user_id: int, user_in: UserUpdateAdmin, db: AsyncSession = Depends(get_db)):
    """
    Actualiza la información de un usuario desde el panel admin.
    """
    update_data = user_in.model_dump(exclude_unset=True)
    return await UserService.update_user_admin(db, user_id, update_data)

@router.post("/{user_id}/roles", response_model=UserResponse, dependencies=[Depends(RequirePermission("admin.users.manage"))])
async def assign_roles(user_id: int, assign_data: AssignRoleToUser, db: AsyncSession = Depends(get_db)):
    """
    Asigna un conjunto de roles a un usuario específico.
    Sobrescribe los roles anteriores con los nuevos proporcionados en la lista.
    """
    # 1. Buscar usuario
    result = await db.execute(select(User).options(selectinload(User.roles)).where(User.id == user_id))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # 2. Buscar los roles nuevos
    if assign_data.role_ids:
        roles_result = await db.execute(select(Role).where(Role.id.in_(assign_data.role_ids)))
        new_roles = roles_result.scalars().all()
    else:
        new_roles = []
        
    # 3. Reasignar
    user.roles = new_roles
    
    await db.commit()
    await db.refresh(user)
    
    return user

@router.post("/bulk-upload", dependencies=[Depends(RequirePermission("admin.users.manage"))])
async def bulk_upload_users(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    """
    Sube un archivo CSV y crea usuarios masivamente.
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="El archivo debe ser un CSV válido.")
    
    content = await file.read()
    try:
        csv_text = content.decode('utf-8')
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="El archivo debe tener codificación UTF-8.")
        
    result = await UserService.bulk_create_users(db, csv_text)
    return result

@router.post("/{user_id}/reset-password", dependencies=[Depends(RequirePermission("admin.users.manage"))])
async def reset_user_password(user_id: int, db: AsyncSession = Depends(get_db)):
    """
    Restablece la contraseña de un usuario a la clave temporal '123456789' y fuerza el cambio de contraseña al ingresar.
    """
    return await UserService.reset_user_password(db, user_id)
