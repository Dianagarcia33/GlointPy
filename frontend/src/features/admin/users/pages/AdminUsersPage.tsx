import React, { useEffect, useState } from 'react';
import { usersService, User } from '../../../../services/users';
import { rolesService, Role } from '../../../../services/roles';
import { UserModal } from '../components/UserModal';

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

  if (isLoading) return <div className="p-6 text-slate-300">Cargando usuarios...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Gestión de Usuarios</h1>
          <p className="text-slate-400">Administra los usuarios de la plataforma y sus accesos</p>
        </div>
        <button 
          onClick={handleCreate}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded font-semibold transition-colors"
        >
          + Crear Usuario
        </button>
      </div>

      <div className="bg-slate-800 rounded-lg shadow overflow-hidden">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-900 text-slate-400 uppercase font-medium">
            <tr>
              <th className="px-6 py-4">Usuario</th>
              <th className="px-6 py-4">Documento</th>
              <th className="px-6 py-4">Roles</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-slate-700/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-semibold text-white">{user.name} {user.is_superuser && <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded ml-2">Admin</span>}</div>
                  <div className="text-xs text-slate-400">{user.email}</div>
                  <div className="text-xs text-slate-500">{user.phone_number}</div>
                </td>
                <td className="px-6 py-4">{user.document_id || <span className="text-slate-500 italic">No registrado</span>}</td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {user.roles.length > 0 ? user.roles.map(r => (
                      <span key={r.id} className="bg-slate-700 text-slate-200 text-xs px-2 py-1 rounded">
                        {r.display_name}
                      </span>
                    )) : <span className="text-slate-500 italic">Sin roles</span>}
                  </div>
                </td>
                <td className="px-6 py-4">
                  {user.is_active ? (
                    <span className="text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded text-xs">Activo</span>
                  ) : (
                    <span className="text-red-400 bg-red-400/10 px-2 py-1 rounded text-xs">Inactivo</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => handleEdit(user)} className="text-blue-400 hover:text-blue-300">
                    Editar
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                  No hay usuarios registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
