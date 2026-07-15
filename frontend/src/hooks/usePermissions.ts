import { useAuthStore } from '../store/authStore';

export const usePermissions = () => {
    const user = useAuthStore(state => state.user);

    // Devuelve true si el usuario tiene el permiso exacto
    const hasPermission = (permission: string) => {
        if (user?.is_superuser) return true;
        if (permission === 'superadmin_tools' && user?.email === 'superadmin@gloint.com') return true;
        if (!user || !user.permissions) return false;
        return user.permissions.includes(permission);
    };

    // Devuelve true si el usuario tiene TODOS los permisos
    const hasAllPermissions = (permissions: string[]) => {
        if (user?.is_superuser) return true;
        if (!user || !user.permissions) return false;
        return permissions.every(p => user.permissions?.includes(p));
    };

    // Devuelve true si el usuario tiene AL MENOS UN permiso
    const hasAnyPermission = (permissions: string[]) => {
        if (user?.is_superuser) return true;
        if (!user || !user.permissions) return false;
        return permissions.some(p => user.permissions?.includes(p));
    };

    return { hasPermission, hasAllPermissions, hasAnyPermission };
};
