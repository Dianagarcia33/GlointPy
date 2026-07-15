from pydantic import BaseModel, ConfigDict
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
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# ==========================
# ROLES
# ==========================
class RoleBase(BaseModel):
    name: str
    description: Optional[str] = None

class RoleCreate(RoleBase):
    # Opcionalmente, se pueden enviar los IDs de los permisos a asignar al crear el rol
    permission_ids: Optional[List[int]] = []

class RoleUpdate(RoleBase):
    name: Optional[str] = None
    permission_ids: Optional[List[int]] = None

class RoleResponse(RoleBase):
    id: int
    is_system_role: str
    created_at: datetime
    updated_at: datetime
    
    # Devuelve la lista de permisos anidados
    permissions: List[PermissionResponse] = []
    
    model_config = ConfigDict(from_attributes=True)

# ==========================
# ASSIGNMENTS
# ==========================
class AssignRoleToUser(BaseModel):
    role_ids: List[int]
