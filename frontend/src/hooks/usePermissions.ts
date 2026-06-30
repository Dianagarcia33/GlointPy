import { useAuthStore } from '../store/authStore';

export const usePermissions = () => {
    const user = useAuthStore(state => state.user);

    // Devuelve true si el usuario tiene el permiso exacto o es superadmin
    const hasPermission = (permission: string) => {
        if (user?.email === 'superadmin@gloint.com') return true;
        if (!user || !user.permissions) return false;
        return user.permissions.includes(permission);
    };

    // Devuelve true si el usuario tiene TODOS los permisos o es superadmin
    const hasAllPermissions = (permissions: string[]) => {
        if (user?.email === 'superadmin@gloint.com') return true;
        if (!user || !user.permissions) return false;
        return permissions.every(p => user.permissions?.includes(p));
    };

    // Devuelve true si el usuario tiene AL MENOS UN permiso o es superadmin
    const hasAnyPermission = (permissions: string[]) => {
        if (user?.email === 'superadmin@gloint.com') return true;
        if (!user || !user.permissions) return false;
        return permissions.some(p => user.permissions?.includes(p));
    };

    return { hasPermission, hasAllPermissions, hasAnyPermission };
};
