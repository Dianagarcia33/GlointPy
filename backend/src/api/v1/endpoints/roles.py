from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from src.core.database import get_db
from src.schemas.security import RoleCreate, RoleUpdate, RoleResponse, PermissionResponse
from src.services.security_service import SecurityService

router = APIRouter()

@router.get("/roles", response_model=List[RoleResponse])
async def read_roles(db: AsyncSession = Depends(get_db)):
    """
    Obtiene la lista de todos los roles junto con sus permisos.
    """
    return await SecurityService.get_all_roles(db)

@router.post("/roles", response_model=RoleResponse)
async def create_role(role_in: RoleCreate, db: AsyncSession = Depends(get_db)):
    """
    Crea un nuevo rol y le asigna los permisos indicados.
    """
    return await SecurityService.create_role(db, role_in)

@router.put("/roles/{role_id}", response_model=RoleResponse)
async def update_role(role_id: int, role_in: RoleUpdate, db: AsyncSession = Depends(get_db)):
    """
    Actualiza un rol (nombre, descripción o sus permisos).
    """
    return await SecurityService.update_role(db, role_id, role_in)

@router.delete("/roles/{role_id}")
async def delete_role(role_id: int, db: AsyncSession = Depends(get_db)):
    """
    Elimina un rol. Los roles del sistema (is_system_role='1') no se pueden borrar.
    """
    await SecurityService.delete_role(db, role_id)
    return {"msg": "Role deleted successfully"}

@router.get("/permissions", response_model=List[PermissionResponse])
async def read_permissions(db: AsyncSession = Depends(get_db)):
    """
    Obtiene la lista de todos los permisos disponibles en el sistema.
    """
    return await SecurityService.get_all_permissions(db)
