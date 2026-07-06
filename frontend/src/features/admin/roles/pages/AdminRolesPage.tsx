import React, { useEffect, useState } from 'react';
import { rolesService, Role, Permission } from '../../../../services/roles';
import { Loader2, Plus, Edit2, Shield, AlertCircle } from 'lucide-react';
import { RoleModal } from '../components/RoleModal';
import { Can } from '../../../../components/security/Can';

export const AdminRolesPage: React.FC = () => {
    const [roles, setRoles] = useState<Role[]>([]);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | undefined>(undefined);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [rolesData, permsData] = await Promise.all([
                rolesService.getAllRoles(),
                rolesService.getAllPermissions()
            ]);
            setRoles(rolesData);
            setPermissions(permsData);
        } catch (err: any) {
            setError(err.message || 'Error al cargar los datos');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreateRole = () => {
        setEditingRole(undefined);
        setIsModalOpen(true);
    };

    const handleEditRole = (role: Role) => {
        setEditingRole(role);
        setIsModalOpen(true);
    };

    const handleSaveRole = async (roleData: any) => {
        if (editingRole) {
            await rolesService.updateRole(editingRole.id, roleData);
        } else {
            await rolesService.createRole(roleData);
        }
        await fetchData(); // Recargar datos
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                    <h3 className="font-medium">Error cargando roles</h3>
                    <p className="text-sm mt-1">{error}</p>
                    <button onClick={fetchData} className="mt-2 text-sm font-semibold hover:underline">Reintentar</button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Roles y Permisos</h1>
                    <p className="text-slate-500 text-sm mt-1">Administra los roles del sistema y sus niveles de acceso</p>
                </div>
                
                <Can permission="admin.roles.manage">
                    <button
                        onClick={handleCreateRole}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors shadow-sm text-sm font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        Crear Nuevo Rol
                    </button>
                </Can>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 uppercase text-xs tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Rol</th>
                                <th className="px-6 py-4 hidden md:table-cell">Descripción</th>
                                <th className="px-6 py-4">Permisos Asignados</th>
                                <th className="px-6 py-4 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {roles.map((role) => (
                                <tr key={role.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center shrink-0">
                                                <Shield className="w-4 h-4 text-brand-600" />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-slate-800">{role.display_name}</div>
                                                <div className="text-xs text-slate-400 font-mono mt-0.5">{role.name}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 hidden md:table-cell">
                                        <p className="text-slate-600 max-w-xs truncate">{role.description || '-'}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1.5">
                                            {role.permissions.length === 0 && <span className="text-slate-400 italic text-xs">Sin permisos</span>}
                                            {role.permissions.slice(0, 5).map(p => (
                                                <span key={p.id} className="inline-flex px-2 py-0.5 bg-brand-50 text-brand-700 border border-brand-100 rounded text-[10px] font-medium whitespace-nowrap">
                                                    {p.name}
                                                </span>
                                            ))}
                                            {role.permissions.length > 5 && (
                                                <span className="inline-flex px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded text-[10px] font-medium whitespace-nowrap">
                                                    +{role.permissions.length - 5} más
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <Can permission="admin.roles.manage">
                                            <button
                                                onClick={() => handleEditRole(role)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                                <span className="hidden sm:inline">Editar</span>
                                            </button>
                                        </Can>
                                    </td>
                                </tr>
                            ))}
                            {roles.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                        No hay roles registrados en el sistema.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <RoleModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveRole}
                role={editingRole}
                allPermissions={permissions}
            />
        </div>
    );
};
