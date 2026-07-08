import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';

interface RequirePermissionProps {
    permission: string;
    children: React.ReactNode;
}

export const RequirePermission: React.FC<RequirePermissionProps> = ({ permission, children }) => {
    const { hasPermission } = usePermissions();

    if (!hasPermission(permission)) {
        // Redirige al dashboard por defecto si no tiene permisos
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
};
