import React, { useEffect, useState } from 'react';
import { usersService, User } from '../../../../services/users';
import { rolesService, Role } from '../../../../services/roles';
import { UserModal } from '../components/UserModal';
import { BulkUploadModal } from '../components/BulkUploadModal';
import { Plus, Edit2, User as UserIcon, AlertCircle, Loader2, UploadCloud, ChevronDown, ChevronRight } from 'lucide-react';
import { Can } from '../../../../components/security/Can';

export const AdminUsersPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination & Filters state
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string>('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});

  const toggleRow = (id: number) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const usersData = await usersService.getUsers({
        page,
        limit,
        search: search || undefined,
        role_id: roleFilter ? parseInt(roleFilter) : undefined,
        is_active: activeFilter === 'true' ? true : activeFilter === 'false' ? false : undefined,
      });
      
      const rolesData = await rolesService.getAllRoles();
      
      setUsers(usersData.data);
      setTotal(usersData.total);
      setRoles(rolesData);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los usuarios.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, search, roleFilter, activeFilter]);

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
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsBulkModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors shadow-sm text-sm font-medium"
            >
              <UploadCloud className="w-4 h-4" />
              Carga Masiva
            </button>
            <button 
              onClick={handleCreate}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors shadow-sm text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Crear Usuario
            </button>
          </div>
        </Can>
      </div>
      
      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 w-full relative">
          <input 
            type="text" 
            placeholder="Buscar por nombre, correo o documento..." 
            className="w-full pl-4 pr-10 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="w-full md:w-48">
          <select 
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos los roles</option>
            {roles.map(r => (
              <option key={r.id} value={r.id}>{r.display_name || r.name}</option>
            ))}
          </select>
        </div>
        <div className="w-full md:w-48">
          <select 
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
            value={activeFilter}
            onChange={(e) => {
              setActiveFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Cualquier estado</option>
            <option value="true">Activo</option>
            <option value="false">Inactivo</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 uppercase text-xs tracking-wider">
              <tr>
                <th className="px-4 py-4 w-10"></th>
                <th className="px-6 py-4">Usuario</th>
                <th className="px-6 py-4 hidden sm:table-cell">Documento</th>
                <th className="px-6 py-4">Roles</th>
                <th className="px-6 py-4 hidden md:table-cell">Estado</th>
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(user => (
                <React.Fragment key={user.id}>
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-4 w-10 text-center">
                    {((user.bank_accounts && user.bank_accounts.length > 0) || user.wallet) && (
                      <button 
                        onClick={() => toggleRow(user.id)}
                        className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {expandedRows[user.id] ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </td>
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
                {expandedRows[user.id] && (
                  <tr className="bg-slate-50/40">
                    <td colSpan={6} className="px-8 py-4 border-b border-slate-100">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Wallet Info Column */}
                        <div className="space-y-2">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Billetera (Wallet):</div>
                          {user.wallet ? (
                            <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex flex-col gap-2 relative overflow-hidden">
                              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 pl-1">
                                <span className="font-bold text-slate-700 uppercase tracking-wider text-xs">Saldo Disponible</span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase ${
                                  user.wallet.status === 'active' 
                                    ? 'bg-emerald-100 text-emerald-700' 
                                    : 'bg-red-100 text-red-700'
                                }`}>
                                  {user.wallet.status === 'active' ? 'ACTIVA' : 'CONGELADA'}
                                </span>
                              </div>
                              <div className="pl-1">
                                <div className="text-xl font-bold text-slate-800">
                                  {user.wallet.balance.toLocaleString('es-CO', { style: 'currency', currency: user.wallet.currency || 'COP', minimumFractionDigits: 0 })}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-lg p-4 text-center text-xs text-slate-500">
                              El usuario no tiene una billetera configurada.
                            </div>
                          )}
                        </div>

                        {/* Bank Accounts Column */}
                        <div className="space-y-2">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                            <span>Cuentas Bancarias:</span>
                            <span className="bg-slate-200 text-slate-600 px-1.5 rounded">{user.bank_accounts?.length || 0}</span>
                          </div>
                          
                          {user.bank_accounts && user.bank_accounts.length > 0 ? (
                            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                                  <tr>
                                    <th className="px-3 py-2 font-semibold">Banco</th>
                                    <th className="px-3 py-2 font-semibold">Tipo</th>
                                    <th className="px-3 py-2 font-semibold">Número</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {user.bank_accounts.map(acc => (
                                    <tr key={acc.id} className="hover:bg-slate-50/50">
                                      <td className="px-3 py-2 font-medium text-slate-700">{acc.banco}</td>
                                      <td className="px-3 py-2 text-slate-500">{acc.tipo_cuenta}</td>
                                      <td className="px-3 py-2 text-slate-600 font-mono">{acc.numero_cuenta}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-lg p-4 text-center text-xs text-slate-500">
                              No hay cuentas bancarias registradas.
                            </div>
                          )}
                        </div>

                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No se encontraron usuarios.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <div className="text-sm text-slate-500">
            Mostrando <span className="font-medium text-slate-700">{users.length}</span> de <span className="font-medium text-slate-700">{total}</span> usuarios
          </div>
          <div className="flex gap-2">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
            >
              Anterior
            </button>
            <button 
              disabled={page * limit >= total}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      <UserModal 
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSaved={handleSaved}
        user={editingUser}
        roles={roles}
      />

      <BulkUploadModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onUploaded={() => {
          setIsBulkModalOpen(false);
          fetchData();
        }}
      />
    </div>
  );
};
