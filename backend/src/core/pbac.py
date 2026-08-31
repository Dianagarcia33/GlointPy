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
    def normalize_variants(perm: str) -> set[str]:
        if not perm:
            return set()
        clean = perm.strip().lower()
        with_dot = clean.replace(":", ".")
        with_colon = clean.replace(".", ":")
        without_admin_dot = with_dot[6:] if with_dot.startswith("admin.") else with_dot
        without_admin_colon = with_colon[6:] if with_colon.startswith("admin:") else with_colon
        with_admin_dot = f"admin.{without_admin_dot}"
        with_admin_colon = f"admin:{without_admin_colon}"
        return {
            clean,
            with_dot,
            with_colon,
            without_admin_dot,
            without_admin_colon,
            with_admin_dot,
            with_admin_colon,
            clean.replace("-", "_"),
            with_dot.replace("-", "_"),
            with_colon.replace("-", "_"),
        }

    @staticmethod
    def has_permission(user: User, required_permission: str) -> bool:
        """Verifica si el usuario tiene un permiso específico."""
        # 1. Bypass para Superusuario / Admin
        if getattr(user, 'is_superuser', False) or getattr(user, 'is_admin', False):
            return True

        # Bypass para roles SuperAdmin / Admin / Directores
        if hasattr(user, 'roles') and user.roles:
            for role in user.roles:
                role_name = getattr(role, 'name', '').lower()
                if any(kw in role_name for kw in ['super', 'admin', 'gerente', 'director']):
                    return True
        
        # 2. Verificar lista de permisos calculada del usuario con resolución normalizada
        user_perms = PBACEngine.get_user_permissions(user)
        user_variants = set()
        for up in user_perms:
            user_variants.update(PBACEngine.normalize_variants(up))

        if isinstance(required_permission, (list, tuple, set)):
            req_list = list(required_permission)
        else:
            req_list = [required_permission]

        for req in req_list:
            req_vars = PBACEngine.normalize_variants(req)
            if any(rv in user_variants for rv in req_vars):
                return True

        return False
