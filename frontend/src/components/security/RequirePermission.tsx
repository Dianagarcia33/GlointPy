import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuthStore } from '../../store/authStore';

interface RequirePermissionProps {
    permission?: string;
    permissions?: string[];
    requireAll?: boolean;
    children: React.ReactNode;
}

export const RequirePermission: React.FC<RequirePermissionProps> = ({ 
    permission, 
    permissions, 
    requireAll = false, 
    children 
}) => {
    const user = useAuthStore(state => state.user);
    const isAuthenticated = useAuthStore(state => state.isAuthenticated);
    const { hasPermission, hasAllPermissions, hasAnyPermission } = usePermissions();

    if (isAuthenticated && !user) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
            </div>
        );
    }

    let isAllowed = false;

    if (permission) {
        isAllowed = hasPermission(permission);
    } else if (permissions) {
        isAllowed = requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions);
    }

    if (!isAllowed) {
        // Redirige al dashboard por defecto si no tiene permisos
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
};
