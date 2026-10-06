from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional
from datetime import datetime

# ==========================
# PERMISSIONS
# ==========================
class PermissionBase(BaseModel):
    name: str
    description: Optional[str] = None
    module: Optional[str] = None

class PermissionResponse(PermissionBase):
    id: int
    created_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)

# ==========================
# ROLES
# ==========================
ROLE_NAME_REGEX = r"^[a-z][a-z0-9_]{2,49}$"

class RoleBase(BaseModel):
    name: str
    description: Optional[str] = None

class RoleCreate(RoleBase):
    name: str = Field(
        ...,
        pattern=ROLE_NAME_REGEX,
        description="Identificador del rol en formato snake_case (ej. operador_crm)"
    )
    # Opcionalmente, se pueden enviar los IDs de los permisos a asignar al crear el rol
    permission_ids: Optional[List[int]] = []

class RoleUpdate(BaseModel):
    name: Optional[str] = Field(
        None,
        pattern=ROLE_NAME_REGEX,
        description="Identificador del rol en formato snake_case (ej. operador_crm)"
    )
    description: Optional[str] = None
    permission_ids: Optional[List[int]] = None

class RoleResponse(RoleBase):
    id: int
    is_system_role: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    # Devuelve la lista de permisos anidados
    permissions: List[PermissionResponse] = []
    
    model_config = ConfigDict(from_attributes=True)

# ==========================
# ASSIGNMENTS
# ==========================
class AssignRoleToUser(BaseModel):
    role_ids: List[int]
