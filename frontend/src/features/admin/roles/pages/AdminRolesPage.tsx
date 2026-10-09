import React, { useEffect, useState } from 'react';
import { rolesService, Role, Permission } from '../../../../services/roles';
import { Loader2, Plus, Edit2, Shield, AlertCircle, Trash2, CheckCircle, X, RefreshCw, KeyRound, Lock, Users } from 'lucide-react';
import { RoleModal } from '../components/RoleModal';
import { Can } from '../../../../components/security/Can';
import { ConfirmationModal } from '../../../../components/common/ConfirmationModal';

export const AdminRolesPage: React.FC = () => {
    const [roles, setRoles] = useState<Role[]>([]);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
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
            setError(null);
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

    const SYSTEM_ROLE_NAMES = [
        'admin', 'superadmin', 'super_admin', 'super admin', 'superuser',
        'cliente', 'inversionista', 'operaciones',
        'directivo_de_inversiones', 'directivo_inversion',
        'contabilidad', 'contabilidad_', 'administrativo'
    ];

    const isSuperAdmin = (role: Role) => {
        const norm = (role.name || '').toLowerCase().trim();
        return ['superadmin', 'super_admin', 'super admin', 'admin'].includes(norm);
    };

    const isSystemRole = (role: Role) => {
        const norm = (role.name || '').toLowerCase().trim();
        const isSys = String(role.is_system_role || '').trim().toLowerCase();
        return isSys === "1" || isSys === "true" || SYSTEM_ROLE_NAMES.includes(norm);
    };

    const handleSaveRole = async (roleData: any) => {
        setError(null);
        setSuccess(null);
        try {
            if (editingRole) {
                await rolesService.updateRole(editingRole.id, roleData);
                setSuccess(`Rol '${roleData.name || editingRole.name}' actualizado exitosamente`);
            } else {
                await rolesService.createRole(roleData);
                setSuccess(`Rol '${roleData.name}' creado exitosamente`);
            }
            await fetchData();
            setTimeout(() => setSuccess(null), 5000);
        } catch (err: any) {
            // Relanzar el error para que RoleModal lo capture, mantenga el modal abierto y muestre el mensaje dentro del formulario
            throw err;
        }
    };

    const handleDeleteRole = (role: Role) => {
        if (isSystemRole(role)) {
            setError('No se pueden eliminar roles protegidos del sistema');
            setTimeout(() => setError(null), 5000);
            return;
        }
        setRoleToDelete(role);
    };

    const handleSyncPermissions = async () => {
        setIsSyncing(true);
        setError(null);
        setSuccess(null);
        try {
            const res = await rolesService.syncPermissions();
            setSuccess(res.message || 'Permisos del sistema sincronizados exitosamente');
            await fetchData();
            setTimeout(() => setSuccess(null), 5000);
        } catch (err: any) {
            setError(err.message || 'Error al sincronizar permisos del sistema');
            setTimeout(() => setError(null), 6000);
        } finally {
            setIsSyncing(false);
        }
    };

    const confirmDelete = async () => {
        if (!roleToDelete) return;
        
        const roleName = roleToDelete.name || roleToDelete.display_name || 'Rol';
        setIsDeleting(true);
        try {
            setError(null);
            setSuccess(null);
            await rolesService.deleteRole(roleToDelete.id);
            setSuccess(`Rol '${roleName}' eliminado exitosamente`);
            await fetchData();
            setTimeout(() => setSuccess(null), 5000);
            setRoleToDelete(null);
        } catch (err: any) {
            setError(err.message || `No se pudo eliminar el rol '${roleName}'. Es posible que tenga usuarios asociados.`);
            setRoleToDelete(null);
            await fetchData();
            setTimeout(() => setError(null), 6000);
        } finally {
            setIsDeleting(false);
        }
    };

    const systemRolesCount = roles.filter(r => isSystemRole(r)).length;
    const customRolesCount = roles.filter(r => !isSystemRole(r)).length;
    const superAdminCount = roles.filter(r => isSuperAdmin(r)).length;

    if (isLoading && roles.length === 0) {
        return (
            <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 animate-pulse font-inter">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-2">
                        <div className="h-8 w-64 bg-slate-200 rounded-xl"></div>
                        <div className="h-4 w-96 bg-slate-100 rounded-lg"></div>
                    </div>
                    <div className="flex gap-2">
                        <div className="h-10 w-36 bg-slate-200 rounded-xl"></div>
                        <div className="h-10 w-36 bg-slate-200 rounded-xl"></div>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-white border border-slate-200/90 rounded-2xl p-5 h-28 space-y-3">
                            <div className="h-4 w-24 bg-slate-100 rounded"></div>
                            <div className="h-6 w-32 bg-slate-200 rounded"></div>
                        </div>
                    ))}
                </div>
                <div className="bg-white rounded-2xl border border-slate-200/90 p-6 h-96 space-y-4">
                    <div className="h-6 w-48 bg-slate-200 rounded"></div>
                    <div className="space-y-3 pt-2">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="h-12 bg-slate-100 rounded-xl w-full"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error && roles.length === 0) {
        return (
            <div className="w-full max-w-7xl mx-auto p-6 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-4 text-rose-700 shadow-xs font-inter">
                <AlertCircle className="w-6 h-6 shrink-0 mt-0.5 text-rose-600" />
                <div>
                    <h3 className="font-bold font-montserrat text-base text-rose-900">Error cargando roles</h3>
                    <p className="text-sm mt-1 text-rose-700">{error}</p>
                    <button onClick={fetchData} className="mt-3 px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl hover:bg-rose-700 transition-all cursor-pointer font-montserrat shadow-xs">Reintentar</button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in duration-300 font-inter">
            {error && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-3 text-rose-800 shadow-xs font-medium text-sm animate-in fade-in duration-200">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
                        <span>{error}</span>
                    </div>
                    <button onClick={() => setError(null)} className="p-1 hover:bg-rose-100 rounded-lg text-rose-700 cursor-pointer">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {success && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-emerald-800 shadow-xs font-medium text-sm animate-in fade-in duration-200">
                    <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600" />
                        <span>{success}</span>
                    </div>
                    <button onClick={() => setSuccess(null)} className="p-1 hover:bg-emerald-100 rounded-lg text-emerald-700 cursor-pointer">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Header Ejecutivo Estandarizado */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-montserrat flex items-center gap-2.5 whitespace-nowrap sm:whitespace-normal">
                            <div className="p-2.5 bg-brand-50 border border-brand-200/80 rounded-2xl text-brand-700 shadow-2xs">
                                <Shield className="w-6 h-6" />
                            </div>
                            <span>Roles y Permisos</span>
                        </h1>
                        <button
                            onClick={fetchData}
                            disabled={isLoading}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                            title="Actualizar datos"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-brand-600' : ''}`} />
                        </button>
                    </div>
                    <p className="text-slate-500 text-sm mt-1 font-normal">
                        Administra los roles del sistema y configura sus políticas de control de acceso basadas en permisos (PBAC).
                    </p>
                </div>

                <Can permission="admin.roles.manage">
                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        <button
                            onClick={handleSyncPermissions}
                            disabled={isSyncing}
                            className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 px-3.5 sm:px-4 py-2.5 rounded-xl transition-all shadow-2xs text-xs font-bold font-montserrat cursor-pointer disabled:opacity-50"
                            title="Sincroniza y repara todos los permisos estándar del sistema"
                        >
                            <RefreshCw className={`w-4 h-4 text-slate-600 ${isSyncing ? 'animate-spin text-brand-600' : ''}`} />
                            <span className="whitespace-nowrap">{isSyncing ? 'Sincronizando...' : 'Sincronizar Permisos'}</span>
                        </button>
                        <button
                            onClick={handleCreateRole}
                            className="inline-flex items-center gap-2 bg-gradient-to-r from-brand-600 to-amber-600 hover:from-brand-700 hover:to-amber-700 text-white px-4 sm:px-5 py-2.5 rounded-xl transition-all shadow-md shadow-brand-500/20 text-xs font-bold font-montserrat cursor-pointer whitespace-nowrap"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Crear Nuevo Rol</span>
                        </button>
                    </div>
                </Can>
            </div>

            {/* KPI Cards Summary (4 Métricas Clave Estandarizadas) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Roles */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block font-montserrat">
                            Total Roles
                        </span>
                        <div className="p-2 bg-brand-50 text-brand-600 rounded-xl shrink-0">
                            <Shield className="w-4 h-4" />
                        </div>
                    </div>
                    <span className="text-xl sm:text-2xl font-black text-slate-900 block tracking-tight font-mono">
                        {roles.length}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium block truncate">
                        {systemRolesCount} roles protegidos del sistema
                    </span>
                </div>

                {/* Permisos Globales */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] text-emerald-700 font-bold uppercase tracking-wider block font-montserrat">
                            Permisos PBAC
                        </span>
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
                            <KeyRound className="w-4 h-4" />
                        </div>
                    </div>
                    <span className="text-xl sm:text-2xl font-black text-emerald-600 block tracking-tight font-mono">
                        {permissions.length}
                    </span>
                    <span className="text-[11px] text-emerald-600 font-medium block truncate">
                        Reglas y capacidades asignables
                    </span>
                </div>

                {/* Roles Personalizados */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] text-blue-700 font-bold uppercase tracking-wider block font-montserrat">
                            Roles Personalizados
                        </span>
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                            <Users className="w-4 h-4" />
                        </div>
                    </div>
                    <span className="text-xl sm:text-2xl font-black text-blue-700 block tracking-tight font-mono">
                        {customRolesCount}
                    </span>
                    <span className="text-[11px] text-blue-600 font-medium block truncate">
                        Roles creados por la administración
                    </span>
                </div>

                {/* SuperAdmins */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] text-amber-700 font-bold uppercase tracking-wider block font-montserrat">
                            SuperAdmins
                        </span>
                        <div className="p-2 bg-amber-50 text-amber-600 rounded-xl shrink-0">
                            <Lock className="w-4 h-4" />
                        </div>
                    </div>
                    <span className="text-xl sm:text-2xl font-black text-amber-600 block tracking-tight font-mono">
                        {superAdminCount}
                    </span>
                    <span className="text-[11px] text-amber-600 font-medium block truncate">
                        Nivel máximo de autorización
                    </span>
                </div>
            </div>

            {/* Contenedor Tabla */}
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600 border-collapse">
                        <thead className="bg-slate-50/80 text-slate-400 font-bold border-b border-slate-200/80 uppercase text-[10px] tracking-wider font-montserrat">
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
                                                <div className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                                                    <span>{role.display_name || role.name}</span>
                                                    {isSuperAdmin(role) && (
                                                        <span className="px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase bg-amber-50 text-amber-700 border border-amber-200/60 rounded-full">
                                                            SuperAdmin
                                                        </span>
                                                    )}
                                                    {isSystemRole(role) && !isSuperAdmin(role) && (
                                                        <span className="px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase bg-slate-100 text-slate-600 border border-slate-200 rounded-full">
                                                            Sistema
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[11px] text-slate-400 font-mono mt-0.5">{role.name}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 hidden md:table-cell">
                                        <p className="text-slate-600 font-medium max-w-xs truncate">{role.description || '-'}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1.5 max-w-md">
                                            {role.permissions.length === 0 ? (
                                                isSuperAdmin(role) ? (
                                                    <span className="inline-flex px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[10px] font-bold">
                                                        🛡️ Acceso Total (SuperAdmin)
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 italic text-xs">Sin permisos</span>
                                                )
                                            ) : (
                                                <>
                                                    {role.permissions.slice(0, 5).map(p => (
                                                        <span key={p.id} className="inline-flex px-2.5 py-1 bg-brand-50 text-brand-800 border border-brand-100 rounded-lg text-[10px] font-bold whitespace-nowrap font-mono">
                                                            {p.name === 'manage_system_events' ? 'admin:system_events:manage' : p.name.replace(/\./g, ':')}
                                                        </span>
                                                    ))}
                                                    {role.permissions.length > 5 && (
                                                        <span className="inline-flex px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-bold whitespace-nowrap">
                                                            +{role.permissions.length - 5} más
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <Can permission="admin.roles.manage">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => handleEditRole(role)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:text-brand-800 hover:bg-brand-100/70 bg-brand-50/70 rounded-xl transition-all border border-brand-200/80 shadow-2xs cursor-pointer font-montserrat"
                                                    title="Editar Rol"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                    <span>Editar</span>
                                                </button>
                                                {!isSystemRole(role) && (
                                                    <button
                                                        onClick={() => handleDeleteRole(role)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:text-rose-800 hover:bg-rose-100/70 bg-rose-50/70 rounded-xl transition-all border border-rose-200/80 shadow-2xs cursor-pointer font-montserrat"
                                                        title="Eliminar Rol"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                        <span>Eliminar</span>
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

            {/* Modal de Confirmación para Eliminar Rol */}
            <ConfirmationModal
                isOpen={!!roleToDelete}
                onClose={() => setRoleToDelete(null)}
                onConfirm={confirmDelete}
                title={`¿Eliminar Rol "${roleToDelete?.name || ''}"?`}
                description={`¿Estás seguro de que deseas eliminar el rol "${roleToDelete?.name || ''}"? Esta acción deshabilitará los permisos asignados y no se puede deshacer.`}
                confirmText="Sí, Eliminar Rol"
                cancelText="Cancelar"
                variant="danger"
                isLoading={isDeleting}
            />
        </div>
    );
};
