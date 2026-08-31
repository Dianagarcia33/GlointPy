import { useAuthStore } from '../store/authStore';

const normalizeVariants = (p: string): string[] => {
    if (!p) return [];
    const clean = p.trim().toLowerCase();
    const withDot = clean.replace(/:/g, '.');
    const withColon = clean.replace(/\./g, ':');
    const withoutAdminDot = withDot.replace(/^admin\./, '');
    const withoutAdminColon = withColon.replace(/^admin:/, '');
    const withAdminDot = `admin.${withoutAdminDot}`;
    const withAdminColon = `admin:${withoutAdminColon}`;
    return Array.from(new Set([
        clean,
        withDot,
        withColon,
        withoutAdminDot,
        withoutAdminColon,
        withAdminDot,
        withAdminColon,
        clean.replace(/-/g, '_'),
        withDot.replace(/-/g, '_'),
        withColon.replace(/-/g, '_')
    ]));
};

export const usePermissions = () => {
    const user = useAuthStore(state => state.user);

    const isAdmin = () => {
        if (!user) return false;
        if (user.is_superuser) return true;
        if (user.permissions?.includes('admin.users.manage') || user.permissions?.includes('admin.roles.manage')) return true;
        const u = user as any;
        const userRoles = u.roles_list || u.roles;
        if (userRoles && Array.isArray(userRoles)) {
            return userRoles.some((r: any) => {
                const name = typeof r === 'string' ? r : r?.name;
                return name?.toLowerCase().includes('admin') || name?.toLowerCase().includes('super') || name?.toLowerCase().includes('director');
            });
        }
        return false;
    };

    const isSuperuser = () => {
        if (!user) return false;
        return user.is_superuser === true;
    };

    const matchSinglePermission = (required: string, userPerms: string[]): boolean => {
        const reqVariants = normalizeVariants(required);
        const allUserVariants = new Set<string>();
        for (const up of userPerms) {
            for (const v of normalizeVariants(up)) {
                allUserVariants.add(v);
            }
        }
        return reqVariants.some(rv => allUserVariants.has(rv));
    };

    // Devuelve true si el usuario tiene el permiso o es superusuario/admin
    const hasPermission = (permission: string) => {
        if (!user) return false;
        if (isSuperuser()) return true;
        if (isAdmin()) return true;
        if (!user.permissions || !Array.isArray(user.permissions)) return false;
        return matchSinglePermission(permission, user.permissions);
    };

    // Devuelve true si el usuario tiene TODOS los permisos especificados
    const hasAllPermissions = (permissions: string[]) => {
        if (!user) return false;
        if (isSuperuser()) return true;
        if (isAdmin()) return true;
        if (!user.permissions || !Array.isArray(user.permissions)) return false;
        return permissions.every(p => matchSinglePermission(p, user.permissions!));
    };

    // Devuelve true si el usuario tiene AL MENOS UN permiso especificado
    const hasAnyPermission = (permissions: string[]) => {
        if (!user) return false;
        if (isSuperuser()) return true;
        if (isAdmin()) return true;
        if (!user.permissions || !Array.isArray(user.permissions)) return false;
        return permissions.some(p => matchSinglePermission(p, user.permissions!));
    };

    return { hasPermission, hasAllPermissions, hasAnyPermission, isAdmin, isSuperuser };
};

