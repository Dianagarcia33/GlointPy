import { useAuthStore } from '../store/authStore';

export const usePermissions = () => {
    const user = useAuthStore(state => state.user);

    // Devuelve true SOLO si el usuario cuenta explícitamente con el permiso requerido (sin bypass por rol de admin)
    const hasPermission = (permission: string) => {
        if (!user || !user.permissions) return false;
        return user.permissions.includes(permission);
    };

    // Devuelve true si el usuario tiene TODOS los permisos especificados
    const hasAllPermissions = (permissions: string[]) => {
        if (!user || !user.permissions) return false;
        return permissions.every(p => user.permissions?.includes(p));
    };

    // Devuelve true si el usuario tiene AL MENOS UN permiso especificado
    const hasAnyPermission = (permissions: string[]) => {
        if (!user || !user.permissions) return false;
        return permissions.some(p => user.permissions?.includes(p));
    };

    return { hasPermission, hasAllPermissions, hasAnyPermission };
};
