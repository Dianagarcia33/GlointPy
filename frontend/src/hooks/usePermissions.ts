import { useAuthStore } from '../store/authStore';

export const usePermissions = () => {
    const user = useAuthStore(state => state.user);

    const isAdmin = () => {
        if (!user) return false;
        if (user.permissions?.includes('admin.users.manage') || user.permissions?.includes('admin.roles.manage')) return true;
        if (user.roles && Array.isArray(user.roles)) {
            return user.roles.some((r: any) => {
                const name = typeof r === 'string' ? r : r.name;
                return name?.toLowerCase().includes('admin') || name?.toLowerCase().includes('super');
            });
        }
        return false;
    };

    // Devuelve true si el usuario tiene el permiso o es administrador
    const hasPermission = (permission: string) => {
        if (!user) return false;
        if (isAdmin()) return true;
        if (!user.permissions) return false;
        return user.permissions.includes(permission);
    };

    // Devuelve true si el usuario tiene TODOS los permisos especificados
    const hasAllPermissions = (permissions: string[]) => {
        if (!user) return false;
        if (isAdmin()) return true;
        if (!user.permissions) return false;
        return permissions.every(p => user.permissions?.includes(p));
    };

    // Devuelve true si el usuario tiene AL MENOS UN permiso especificado
    const hasAnyPermission = (permissions: string[]) => {
        if (!user) return false;
        if (isAdmin()) return true;
        if (!user.permissions) return false;
        return permissions.some(p => user.permissions?.includes(p));
    };

    return { hasPermission, hasAllPermissions, hasAnyPermission };
};
