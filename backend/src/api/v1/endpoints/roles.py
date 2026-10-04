from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from src.core.database import get_db
from src.schemas.security import RoleCreate, RoleUpdate, RoleResponse, PermissionResponse
from src.services.security_service import SecurityService
from src.services.audit_trail_service import log_audit_trail
from src.api.deps import RequirePermission, get_current_user
from src.models.user import User

router = APIRouter()

@router.get("/roles", response_model=List[RoleResponse], dependencies=[Depends(RequirePermission("admin.roles.manage"))])
async def read_roles(db: AsyncSession = Depends(get_db)):
    """
    Obtiene la lista de todos los roles junto con sus permisos.
    """
    return await SecurityService.get_all_roles(db)

@router.post("/roles", response_model=RoleResponse, dependencies=[Depends(RequirePermission("admin.roles.manage"))])
async def create_role(role_in: RoleCreate, db: AsyncSession = Depends(get_db)):
    """
    Crea un nuevo rol y le asigna los permisos indicados.
    """
    return await SecurityService.create_role(db, role_in)

@router.put("/roles/{role_id}", response_model=RoleResponse, dependencies=[Depends(RequirePermission("admin.roles.manage"))])
async def update_role(
    role_id: int, 
    role_in: RoleUpdate, 
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Actualiza un rol (nombre, descripción o sus permisos).
    """
    updated_role = await SecurityService.update_role(db, role_id, role_in, current_user=current_user)

    # Registro inmutable en Audit Trail (H-65)
    await log_audit_trail(
        db=db,
        action="ROLE_UPDATE",
        module="roles",
        user=current_user,
        entity_type="Role",
        entity_id=role_id,
        description=f"Actualización de configuración/permisos para el rol '{updated_role.name}' (ID #{role_id})",
        details={"role_id": role_id, "role_name": updated_role.name, "permission_count": len(updated_role.permissions)},
        request=request
    )

    return updated_role

@router.delete("/roles/{role_id}", dependencies=[Depends(RequirePermission("admin.roles.manage"))])
async def delete_role(role_id: int, db: AsyncSession = Depends(get_db)):
    """
    Elimina un rol. Los roles del sistema (is_system_role='1') no se pueden borrar.
    """
    await SecurityService.delete_role(db, role_id)
    return {"msg": "Role deleted successfully"}

@router.get("/permissions", response_model=List[PermissionResponse], dependencies=[Depends(RequirePermission("admin.roles.manage"))])
async def read_permissions(db: AsyncSession = Depends(get_db)):
    """
    Obtiene la lista de todos los permisos disponibles en el sistema.
    """
    return await SecurityService.get_all_permissions(db)

@router.post("/sync-permissions", dependencies=[Depends(RequirePermission("admin.roles.manage"))])
async def sync_permissions_endpoint(db: AsyncSession = Depends(get_db)):
    """
    Sincroniza y actualiza todos los permisos estándar del sistema y asigna los permisos base a los roles.
    """
    return await SecurityService.sync_all_system_permissions(db)
