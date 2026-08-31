import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';

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
    const { hasPermission, hasAllPermissions, hasAnyPermission } = usePermissions();

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
