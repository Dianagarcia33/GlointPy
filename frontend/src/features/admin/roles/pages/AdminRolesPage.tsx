import React, { useEffect, useState } from 'react';
import { rolesService, Role, Permission } from '../../../../services/roles';
import { Loader2, Plus, Edit2, Shield, AlertCircle, Trash2, CheckCircle } from 'lucide-react';
import { RoleModal } from '../components/RoleModal';
import { Can } from '../../../../components/security/Can';

export const AdminRolesPage: React.FC = () => {
    const [roles, setRoles] = useState<Role[]>([]);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | undefined>(undefined);
    const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

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
        setError(null);
        setSuccess(null);
        if (editingRole) {
            await rolesService.updateRole(editingRole.id, roleData);
            setSuccess('Rol actualizado exitosamente');
        } else {
            await rolesService.createRole(roleData);
            setSuccess('Rol creado exitosamente');
        }
        await fetchData(); // Recargar datos
        
        setTimeout(() => setSuccess(null), 5000);
    };

    const handleDeleteRole = (role: Role) => {
        if (role.is_system_role === "1") {
            setError('No se pueden eliminar roles del sistema');
            return;
        }
        setRoleToDelete(role);
    };

    const confirmDelete = async () => {
        if (!roleToDelete) return;
        
        setIsDeleting(true);
        try {
            setError(null);
            setSuccess(null);
            await rolesService.deleteRole(roleToDelete.id);
            setSuccess(`Rol '${roleToDelete.display_name}' eliminado exitosamente`);
            await fetchData();
            setTimeout(() => setSuccess(null), 5000);
            setRoleToDelete(null);
        } catch (err: any) {
            setError(err.message || 'Error al eliminar el rol. Es posible que haya usuarios con este rol.');
            setRoleToDelete(null);
        } finally {
            setIsDeleting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 animate-pulse">
                <div className="bg-slate-900/90 rounded-3xl p-8 h-40 shadow-xl relative overflow-hidden flex flex-col justify-center space-y-3">
                    <div className="h-5 w-48 bg-slate-800 rounded-full"></div>
                    <div className="h-8 w-64 bg-slate-800 rounded-xl"></div>
                </div>
                <div className="bg-white rounded-3xl border border-slate-200 p-6 h-96 space-y-4">
                    <div className="h-6 w-48 bg-slate-200 rounded"></div>
                    <div className="space-y-3 pt-2">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="h-12 bg-slate-100 rounded-2xl w-full"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full max-w-7xl mx-auto p-6 bg-red-50 border border-red-200 rounded-3xl flex items-start gap-4 text-red-700 shadow-xs">
                <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
                <div>
                    <h3 className="font-bold font-montserrat text-base">Error cargando roles</h3>
                    <p className="text-sm mt-1">{error}</p>
                    <button onClick={fetchData} className="mt-3 px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 transition-all cursor-pointer">Reintentar</button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in duration-300">
            {success && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 shadow-xs font-medium text-sm">
                    <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600" />
                    <span>{success}</span>
                </div>
            )}

            {/* Header Ejecutivo Principal */}
            <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="absolute right-0 top-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div className="relative z-10 space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-bold text-brand-300 backdrop-blur-sm">
                        <Shield className="w-4 h-4 text-emerald-400" /> Seguridad & Control de Acceso PBAC
                    </div>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight font-montserrat">
                        Roles y Permisos
                    </h1>
                    <p className="text-slate-300 text-sm max-w-xl">
                        Administra los roles del sistema y configura sus políticas de control de acceso basadas en permisos.
                    </p>
                </div>

                <Can permission="admin.roles.manage">
                    <button
                        onClick={handleCreateRole}
                        className="relative z-10 flex items-center gap-2 bg-brand-500 text-white px-6 py-3 rounded-2xl hover:bg-brand-600 transition-all shadow-lg shadow-brand-500/30 text-sm font-bold cursor-pointer shrink-0"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Crear Nuevo Rol</span>
                    </button>
                </Can>
            </div>

            {/* Contenedor Tabla */}
            <div className="bg-white rounded-3xl shadow-xs border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600 border-collapse">
                        <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider font-montserrat">
                            <tr>
                                <th className="px-6 py-4">Rol</th>
                                <th className="px-6 py-4 hidden md:table-cell">Descripción</th>
                                <th className="px-6 py-4">Permisos Asignados</th>
                                <th className="px-6 py-4 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                            {roles.map((role) => (
                                <tr key={role.id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
                                                <Shield className="w-4 h-4 text-brand-600" />
                                            </div>
                                            <div>
                                                <div className="font-extrabold text-slate-900 text-sm">{role.display_name || role.name}</div>
                                                <div className="text-[11px] text-slate-400 font-mono mt-0.5">{role.name}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 hidden md:table-cell">
                                        <p className="text-slate-600 font-medium max-w-xs truncate">{role.description || '-'}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1.5 max-w-md">
                                            {role.permissions.length === 0 && <span className="text-slate-400 italic text-xs">Sin permisos</span>}
                                            {role.permissions.slice(0, 5).map(p => (
                                                <span key={p.id} className="inline-flex px-2.5 py-1 bg-brand-50 text-brand-800 border border-brand-100 rounded-lg text-[10px] font-bold whitespace-nowrap">
                                                    {p.name}
                                                </span>
                                            ))}
                                            {role.permissions.length > 5 && (
                                                <span className="inline-flex px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-bold whitespace-nowrap">
                                                    +{role.permissions.length - 5} más
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <Can permission="admin.roles.manage">
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={() => handleEditRole(role)}
                                                    className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-all"
                                                    title="Editar Rol"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                {role.is_system_role !== "1" && (
                                                    <button
                                                        onClick={() => handleDeleteRole(role)}
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                                        title="Eliminar Rol"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </Can>
                                    </td>
                                </tr>
                            ))}
                            {roles.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-medium">
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

            {roleToDelete && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={() => setRoleToDelete(null)}>
                            <div className="absolute inset-0 bg-slate-900/75 backdrop-blur-sm"></div>
                        </div>

                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                        <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="sm:flex sm:items-start">
                                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                                        <AlertCircle className="h-6 w-6 text-red-600" aria-hidden="true" />
                                    </div>
                                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                        <h3 className="text-lg leading-6 font-semibold text-slate-900">Eliminar Rol</h3>
                                        <div className="mt-2">
                                            <p className="text-sm text-slate-500">
                                                ¿Estás seguro de que deseas eliminar el rol <strong>{roleToDelete.display_name}</strong>? Esta acción no se puede deshacer.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-slate-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-2xl border-t border-slate-200">
                                <button
                                    type="button"
                                    disabled={isDeleting}
                                    className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                                    onClick={confirmDelete}
                                >
                                    {isDeleting ? 'Eliminando...' : 'Eliminar Rol'}
                                </button>
                                <button
                                    type="button"
                                    disabled={isDeleting}
                                    className="mt-3 w-full inline-flex justify-center rounded-lg border border-slate-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                                    onClick={() => setRoleToDelete(null)}
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
