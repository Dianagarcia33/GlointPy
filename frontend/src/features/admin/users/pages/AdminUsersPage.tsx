import React, { useEffect, useState } from 'react';
import { usersService, User } from '../../../../services/users';
import { rolesService, Role } from '../../../../services/roles';
import { UserModal } from '../components/UserModal';
import { Plus, Edit2, User as UserIcon, AlertCircle, Loader2 } from 'lucide-react';
import { Can } from '../../../../components/security/Can';

export const AdminUsersPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [usersData, rolesData] = await Promise.all([
        usersService.getUsers(),
        rolesService.getAllRoles(),
      ]);
      setUsers(usersData);
      setRoles(rolesData);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los usuarios.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleSaved = () => {
    fetchData();
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
                  <h3 className="font-medium">Error cargando usuarios</h3>
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
          <h1 className="text-2xl font-bold text-slate-800">Gestión de Usuarios</h1>
          <p className="text-slate-500 text-sm mt-1">Administra los usuarios de la plataforma y sus accesos</p>
        </div>
        
        <Can permission="admin.users.manage">
          <button 
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors shadow-sm text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Crear Usuario
          </button>
        </Can>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 uppercase text-xs tracking-wider">
              <tr>
                <th className="px-6 py-4">Usuario</th>
                <th className="px-6 py-4 hidden sm:table-cell">Documento</th>
                <th className="px-6 py-4">Roles</th>
                <th className="px-6 py-4 hidden md:table-cell">Estado</th>
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center shrink-0">
                          <UserIcon className="w-4 h-4 text-brand-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800 flex items-center gap-2">
                          {user.name} 
                          {user.is_superuser && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold uppercase">Admin</span>}
                        </div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">{user.email}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{user.phone_number}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden sm:table-cell">{user.document_id || <span className="text-slate-400 italic text-xs">No registrado</span>}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {user.roles.length > 0 ? user.roles.map(r => (
                        <span key={r.id} className="inline-flex px-2 py-0.5 bg-brand-50 text-brand-700 border border-brand-100 rounded text-[10px] font-medium whitespace-nowrap">
                          {r.display_name}
                        </span>
                      )) : <span className="text-slate-400 italic text-xs">Sin roles</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    {user.is_active ? (
                      <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-medium">Activo</span>
                    ) : (
                      <span className="text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded text-[10px] font-medium">Inactivo</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Can permission="admin.users.manage">
                      <button 
                        onClick={() => handleEdit(user)} 
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                        <span className="hidden lg:inline">Editar</span>
                      </button>
                    </Can>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No hay usuarios registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <UserModal 
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSaved={handleSaved}
        user={editingUser}
        roles={roles}
      />
    </div>
  );
};
