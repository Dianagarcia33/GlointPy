import React from 'react';
import { usePermissions } from '../../hooks/usePermissions';

interface CanProps {
    permission?: string;
    permissions?: string[];
    requireAll?: boolean;
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export const Can: React.FC<CanProps> = ({ 
    permission, 
    permissions, 
    requireAll = false, 
    children, 
    fallback = null 
}) => {
    const { hasPermission, hasAllPermissions, hasAnyPermission } = usePermissions();

    let isAllowed = false;

    if (permission) {
        isAllowed = hasPermission(permission);
    } else if (permissions) {
        isAllowed = requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions);
    }

    if (isAllowed) {
        return <>{children}</>;
    }

    return <>{fallback}</>;
};
