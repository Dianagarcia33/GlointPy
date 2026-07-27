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
                        for perm in role.permissions:
                            if hasattr(perm, 'name'):
                                permissions.add(perm.name)
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
        # 1. Bypass para Superusuario
        if getattr(user, 'is_superuser', False) or getattr(user, 'is_admin', False):
            return True

        # Bypass para roles SuperAdmin / Admin
        if hasattr(user, 'roles') and user.roles:
            for role in user.roles:
                role_name = getattr(role, 'name', '').lower()
                if 'super' in role_name or 'admin' in role_name:
                    return True
        
        # 2. Verificar lista de permisos calculada del usuario
        user_perms = PBACEngine.get_user_permissions(user)
        return required_permission in user_perms
