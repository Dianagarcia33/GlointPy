from typing import List
from src.models.user import User

class PBACEngine:
    """
    Motor de Control de Acceso Basado en Políticas (PBAC).
    Evalúa si un usuario tiene un permiso específico basándose en sus roles
    y en sus permisos individuales sobreescritos.
    """
    
    @staticmethod
    def get_user_permissions(user: User) -> List[str]:
        """Obtiene una lista plana de todos los permisos que tiene el usuario."""
        permissions = set()
        
        # 1. Obtener permisos de los roles del usuario
        if hasattr(user, 'roles') and user.roles:
            for role in user.roles:
                try:
                    if hasattr(role, 'permissions') and role.permissions:
                        # role.permissions es ahora un JSON (lista de strings)
                        if isinstance(role.permissions, list):
                            for perm in role.permissions:
                                permissions.add(perm)
                        elif isinstance(role.permissions, str):
                            import json
                            try:
                                parsed = json.loads(role.permissions)
                                if isinstance(parsed, list):
                                    for perm in parsed:
                                        permissions.add(perm)
                            except Exception:
                                pass
                except Exception:
                    pass
                        
        # 2. Añadir/Quitar permisos sobreescritos individuales
        if user.permissions_override:
            # permissions_override podría ser un dict {"view_wallets": True, "delete_users": False}
            for perm_name, is_granted in user.permissions_override.items():
                if is_granted:
                    permissions.add(perm_name)
                elif perm_name in permissions:
                    permissions.remove(perm_name)
                    
        return list(permissions)

    @staticmethod
    def has_permission(user: User, required_permission: str) -> bool:
        """Verifica si el usuario tiene un permiso específico."""
        # Un SuperAdmin podría tener bypass automático aquí si lo definimos
        # if any(role.name == "SuperAdmin" for role in user.roles): return True
        
        user_perms = PBACEngine.get_user_permissions(user)
        return required_permission in user_perms
