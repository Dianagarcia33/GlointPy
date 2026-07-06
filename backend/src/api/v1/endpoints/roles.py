from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List

from src.core.database import get_db
from src.core.security import get_current_user
from src.models.user import User
from src.models.security import Role, Permission
from src.schemas.roles import RoleResponse, RoleCreate, RoleUpdate, PermissionResponse

router = APIRouter()

@router.get("/permissions", response_model=List[PermissionResponse])
async def get_all_permissions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene todos los permisos disponibles en el sistema.
    """
    result = await db.execute(select(Permission).order_by(Permission.module, Permission.name))
    return result.scalars().all()

@router.get("/", response_model=List[RoleResponse])
async def get_all_roles(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lista todos los roles con sus permisos asociados.
    """
    stmt = select(Role).options(selectinload(Role.permissions)).order_by(Role.id)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/", response_model=RoleResponse, status_code=status.HTTP_201_CREATED)
async def create_role(
    role_data: RoleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Crea un nuevo rol y le asigna permisos.
    """
    # Verificar nombre duplicado
    existing = await db.execute(select(Role).where(Role.name == role_data.name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Ya existe un rol con este nombre.")
        
    new_role = Role(
        name=role_data.name,
        display_name=role_data.display_name,
        description=role_data.description,
        is_active=role_data.is_active
    )
    
    # Asignar permisos si vienen en la petición
    if role_data.permissions:
        perms_result = await db.execute(select(Permission).where(Permission.id.in_(role_data.permissions)))
        new_role.permissions = perms_result.scalars().all()
        
    db.add(new_role)
    await db.commit()
    await db.refresh(new_role)
    
    # Cargar relaciones para la respuesta
    stmt = select(Role).options(selectinload(Role.permissions)).where(Role.id == new_role.id)
    result = await db.execute(stmt)
    return result.scalar_one()

@router.put("/{role_id}", response_model=RoleResponse)
async def update_role(
    role_id: int,
    role_data: RoleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Actualiza la información de un rol y sus permisos.
    """
    stmt = select(Role).options(selectinload(Role.permissions)).where(Role.id == role_id)
    result = await db.execute(stmt)
    role = result.scalar_one_or_none()
    
    if not role:
        raise HTTPException(status_code=404, detail="Rol no encontrado.")
        
    # Validar nombre duplicado (si se cambia)
    if role_data.name and role_data.name != role.name:
        existing = await db.execute(select(Role).where(Role.name == role_data.name))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Ya existe otro rol con este nombre.")
    
    # Actualizar campos básicos
    update_data = role_data.model_dump(exclude_unset=True)
    if 'permissions' in update_data:
        perm_ids = update_data.pop('permissions')
        if perm_ids is not None:
            perms_result = await db.execute(select(Permission).where(Permission.id.in_(perm_ids)))
            role.permissions = perms_result.scalars().all()
            
    for key, value in update_data.items():
        setattr(role, key, value)
        
    await db.commit()
    await db.refresh(role)
    
    # Volver a cargar para la respuesta final
    result = await db.execute(select(Role).options(selectinload(Role.permissions)).where(Role.id == role_id))
    return result.scalar_one()

@router.delete("/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_role(
    role_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Elimina permanentemente un rol. (Podría ser soft-delete cambiando is_active, pero permitiremos delete duro si no hay usuarios vinculados)
    """
    stmt = select(Role).where(Role.id == role_id)
    result = await db.execute(stmt)
    role = result.scalar_one_or_none()
    
    if not role:
        raise HTTPException(status_code=404, detail="Rol no encontrado.")
        
    # Idealmente aquí deberíamos verificar si hay usuarios usando el rol antes de borrarlo
    
    await db.delete(role)
    await db.commit()
    return None
