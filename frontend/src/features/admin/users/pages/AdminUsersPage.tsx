import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { usersService, User } from '../../../../services/users';
import { rolesService, Role } from '../../../../services/roles';
import { UserModal } from '../components/UserModal';
import { BulkUploadModal } from '../components/BulkUploadModal';
import { UserAccountStatementModal } from '../components/UserAccountStatementModal';
import { GlobalAccountStatementModal } from '../components/GlobalAccountStatementModal';
import { Plus, Edit2, User as UserIcon, AlertCircle, Loader2, UploadCloud, ChevronDown, ChevronRight, KeyRound, CheckCircle, X, Eye, EyeOff, Receipt, Landmark, ShieldAlert, MoreVertical } from 'lucide-react';
import { Can } from '../../../../components/security/Can';
import { maskAccountNumber, formatAccountNumber, formatColombiaDate } from '../../../../utils/format';

export const AdminUsersPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revealedAccounts, setRevealedAccounts] = useState<Set<number>>(new Set());
  
  // Pagination & Filters state
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string>('');
  const [walletFilter, setWalletFilter] = useState<string>('');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isTableLoading, setIsTableLoading] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [statementUser, setStatementUser] = useState<User | null>(null);
  const [isGlobalStatementOpen, setIsGlobalStatementOpen] = useState(false);

  const [resettingUser, setResettingUser] = useState<User | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  // Forzar actualización de perfil (masiva e individual)
  const [isForceAllModalOpen, setIsForceAllModalOpen] = useState(false);
  const [isForcingAll, setIsForcingAll] = useState(false);
  const [togglingUserId, setTogglingUserId] = useState<number | null>(null);

  // Menú de acciones por fila
  const [openActionMenuId, setOpenActionMenuId] = useState<number | null>(null);

  // Cerrar menú de acciones al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.user-action-menu')) {
        setOpenActionMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isNearBottom = (index: number) => {
    return users.length > 2 && index >= users.length - 2;
  };

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const [success, setSuccess] = useState<string | null>(null);

  const handleConfirmResetPassword = async () => {
    if (!resettingUser) return;
    try {
      setIsResetting(true);
      setError(null);
      await usersService.resetPassword(resettingUser.id);
      setSuccess(`¡Contraseña restablecida exitosamente para ${resettingUser.name}! La nueva clave temporal es 123456789.`);
      setTimeout(() => setSuccess(null), 6000);
      setResettingUser(null);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Error al restablecer la contraseña.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleCreateWallet = async (userId: number, userName: string) => {
    try {
      setError(null);
      await usersService.createWallet(userId);
      setSuccess(`¡Billetera creada exitosamente para ${userName}!`);
      setTimeout(() => setSuccess(null), 5000);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Error al crear la billetera');
    }
  };

  const handleToggleForceProfile = async (targetUser: User) => {
    try {
      setTogglingUserId(targetUser.id);
      setError(null);
      const updated = await usersService.toggleForceProfile(targetUser.id);
      setSuccess(
        updated.must_update_profile
          ? `Se activó la actualización obligatoria de perfil para ${targetUser.name}.`
          : `Se desmarcó la actualización obligatoria para ${targetUser.name}.`
      );
      setTimeout(() => setSuccess(null), 5000);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Error al modificar estado de actualización.');
    } finally {
      setTogglingUserId(null);
    }
  };

  const handleConfirmForceAll = async () => {
    try {
      setIsForcingAll(true);
      setError(null);
      const res = await usersService.forceProfileUpdate(undefined, true);
      setSuccess(res.message || 'Se forzó la actualización de datos a todos los usuarios.');
      setTimeout(() => setSuccess(null), 6000);
      setIsForceAllModalOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Error al forzar actualización masiva.');
    } finally {
      setIsForcingAll(false);
    }
  };

  const toggleRevealAccount = (accId: number) => {
    const next = new Set(revealedAccounts);
    if (next.has(accId)) next.delete(accId);
    else next.add(accId);
    setRevealedAccounts(next);
  };

  const fetchData = async () => {
    setIsTableLoading(true);
    try {
      const usersData = await usersService.getUsers({
        page,
        limit,
        search: search || undefined,
        role_id: roleFilter ? parseInt(roleFilter) : undefined,
        is_active: activeFilter === 'true' ? true : activeFilter === 'false' ? false : undefined,
        has_wallet: walletFilter === 'true' ? true : walletFilter === 'false' ? false : undefined,
      });
      
      const rolesData = await rolesService.getAllRoles();
      
      setUsers(usersData.data);
      setTotal(usersData.total);
      setRoles(rolesData);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los usuarios.');
    } finally {
      setIsTableLoading(false);
      setIsInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, search, roleFilter, activeFilter, walletFilter]);

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

  if (isInitialLoading) {
      return (
          <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 animate-pulse">
              <div className="bg-slate-900/90 rounded-3xl p-8 h-40 shadow-xl relative overflow-hidden flex flex-col justify-center space-y-3">
                  <div className="h-5 w-48 bg-slate-800 rounded-full"></div>
                  <div className="h-8 w-64 bg-slate-800 rounded-xl"></div>
              </div>
              <div className="bg-white rounded-3xl border border-slate-200 p-4 h-16 w-full"></div>
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
                  <h3 className="font-bold font-montserrat text-base">Error cargando usuarios</h3>
                  <p className="text-sm mt-1">{error}</p>
                  <button onClick={fetchData} className="mt-3 px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 transition-all cursor-pointer">Reintentar</button>
              </div>
          </div>
      );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in duration-300">
      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-emerald-800 shadow-xs font-medium text-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="p-1 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer">
            <X className="w-4 h-4 text-emerald-700" />
          </button>
        </div>
      )}

      {/* Header Ejecutivo Principal */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute right-0 top-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-bold text-brand-300 backdrop-blur-sm">
            <UserIcon className="w-4 h-4 text-emerald-400" /> Administración de Identidad & Accesos
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight font-montserrat">
            Gestión de Usuarios
          </h1>
          <p className="text-slate-300 text-sm max-w-xl">
            Administra los usuarios de la plataforma, roles asignados, billeteras asociadas e historial de seguridad.
          </p>
        </div>
        
        <div className="relative z-10 flex flex-wrap items-center gap-3 shrink-0">
          <button 
            onClick={() => setIsGlobalStatementOpen(true)}
            className="flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all text-xs font-bold border border-white/10 backdrop-blur-sm cursor-pointer shadow-xs"
            title="Ver auditoría financiera y extracto general de la plataforma"
          >
            <Landmark className="w-4 h-4 text-emerald-400" />
            <span>Estado de Cuenta General</span>
          </button>

          <Can permission="admin.users.manage">
            <button 
              onClick={() => setIsForceAllModalOpen(true)}
              className="flex items-center gap-2 px-4 py-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-2xl transition-all text-xs font-bold border border-amber-500/30 backdrop-blur-sm cursor-pointer shadow-xs"
              title="Obligar a todos los usuarios a actualizar sus datos de perfil"
            >
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Forzar Actualización a Todos</span>
            </button>
          </Can>

          <Can permission="admin.users.manage">
            <button 
              onClick={handleCreate}
              className="flex items-center gap-2 px-6 py-3 bg-brand-500 text-white rounded-2xl hover:bg-brand-600 transition-all shadow-lg shadow-brand-500/30 text-sm font-bold cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Usuario</span>
            </button>
          </Can>
        </div>
      </div>
      
      {/* Filters Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-xs border border-slate-200 flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 w-full relative">
          <input 
            type="text" 
            placeholder="Buscar por nombre, correo o documento..." 
            className="w-full pl-4 pr-10 py-2.5 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          {isTableLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          )}
        </div>
        <div className="w-full md:w-48">
          <select 
            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
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
            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
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
        <div className="w-full md:w-48">
          <select 
            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
            value={walletFilter}
            onChange={(e) => {
              setWalletFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todas las billeteras</option>
            <option value="true">Con Billetera</option>
            <option value="false">Sin Billetera</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xs border border-slate-200">
        <div className="overflow-x-auto min-h-[400px] pb-12">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider font-montserrat">
              <tr>
                <th className="px-6 py-4">Usuario & Contacto</th>
                <th className="px-6 py-4 hidden md:table-cell">Billetera & Cuentas</th>
                <th className="px-6 py-4">Roles & Estado</th>
                <th className="px-6 py-4 text-center w-36">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {users.map((user, index) => (
                <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0 mt-0.5">
                          <UserIcon className="w-4 h-4 text-brand-600" />
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                          {user.name} 
                          {user.is_superuser && <span className="text-[10px] bg-purple-100 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full font-bold uppercase">Admin</span>}
                        </div>
                        <div className="text-slate-500 font-mono">{user.email}</div>
                        {user.document_id && <div className="text-slate-500">Doc: <strong className="font-bold text-slate-700">{user.document_id}</strong></div>}
                        {user.phone_number && <div className="text-slate-500">Tel: <strong className="font-bold text-slate-700">{user.phone_number}</strong></div>}
                        {user.date_of_birth && <div className="text-slate-500">Nac: <strong className="font-bold text-slate-700">{formatColombiaDate(user.date_of_birth)}</strong></div>}
                        <div className="text-[10px] text-slate-400">Reg: {formatColombiaDate(user.created_at)}</div>
                        {user.parent ? (
                          <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-md text-[10px]">
                            <span className="font-bold">Tutor:</span> {user.parent.name} {user.parent.document_id ? `(${user.parent.document_id})` : ''}
                          </div>
                        ) : (user.children && user.children.length > 0) ? (
                          <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-900 rounded-md text-[10px]">
                            <span className="font-bold">Tutor de:</span> {user.children.length} menor(es)
                          </div>
                        ) : null}
                        {user.must_update_profile && (
                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-md text-[10px] font-bold">
                              <AlertCircle className="w-3 h-3 text-amber-600" />
                              Actualización de datos obligatoria
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <div className="space-y-3">
                      {/* Billetera */}
                      <div className="text-xs">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-montserrat">Billetera</div>
                        {user.wallet ? (
                          <>
                            <div className="font-extrabold text-slate-900 font-montserrat">
                              {Number(user.wallet.balance).toLocaleString('es-CO', { style: 'currency', currency: user.wallet.currency || 'COP', minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                            </div>
                            <div className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase inline-block mt-0.5 border ${
                              user.wallet.status === 'active' 
                                ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                                : 'bg-red-100 text-red-700 border-red-200'
                            }`}>
                              {user.wallet.status === 'active' ? 'ACTIVA' : 'CONGELADA'}
                            </div>
                          </>
                        ) : (
                          <div className="space-y-1">
                            <div className="text-slate-400 italic">Sin billetera</div>
                            <button
                              onClick={() => handleCreateWallet(user.id, user.name)}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 transition-all cursor-pointer"
                            >
                              + Crear Billetera
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {/* Cuentas */}
                      <div className="text-xs">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex justify-between items-center w-48 font-montserrat">
                          <span>Cuentas Bancarias</span>
                          <span className="bg-slate-100 px-2 py-0.5 rounded-full font-bold text-slate-600">{user.bank_accounts?.length || 0}</span>
                        </div>
                        {user.bank_accounts && user.bank_accounts.length > 0 ? (
                          <div className="space-y-1.5 w-48">
                            {user.bank_accounts.map(acc => {
                              const isRevealed = revealedAccounts.has(acc.id);
                              return (
                                <div key={acc.id} className="text-[11px] bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
                                  <div className="font-bold text-slate-800 truncate">{acc.banco} - {acc.tipo_cuenta}</div>
                                  <div className="flex items-center justify-between gap-1 text-slate-600 font-mono mt-0.5">
                                    <span className="select-all">
                                      {isRevealed ? formatAccountNumber(acc.numero_cuenta) : maskAccountNumber(acc.numero_cuenta)}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => toggleRevealAccount(acc.id)}
                                      className="p-0.5 text-slate-400 hover:text-brand-600 hover:bg-slate-200 rounded transition-colors cursor-pointer"
                                      title={isRevealed ? "Ocultar número completo" : "Mostrar número completo"}
                                    >
                                      {isRevealed ? <EyeOff className="w-3 h-3 text-brand-600" /> : <Eye className="w-3 h-3" />}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-slate-400 italic">Sin cuentas registradas</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-1.5 max-w-[150px]">
                        {user.roles.length > 0 ? user.roles.map(r => (
                          <span key={r.id} className="inline-flex px-2.5 py-0.5 bg-brand-50 text-brand-800 border border-brand-100 rounded-lg text-[10px] font-bold whitespace-nowrap">
                            {r.display_name}
                          </span>
                        )) : <span className="text-slate-400 italic text-xs">Sin roles</span>}
                      </div>
                      <div>
                        {user.is_active ? (
                          <span className="text-emerald-800 bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase">Activo</span>
                        ) : (
                          <span className="text-rose-800 bg-rose-100 border border-rose-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase">Inactivo</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Can permission="admin.users.manage">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Botón Editar Principal */}
                        <button 
                          onClick={() => handleEdit(user)} 
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-xl transition-all border border-brand-200 bg-white cursor-pointer shadow-2xs"
                          title="Editar información de usuario"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>

                        {/* Menú de Más Acciones */}
                        <div className="relative inline-block text-left user-action-menu">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenActionMenuId(openActionMenuId === user.id ? null : user.id);
                            }}
                            className={`p-1.5 rounded-xl transition-all border cursor-pointer ${
                              openActionMenuId === user.id
                                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                                : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50 border-slate-200 shadow-2xs'
                            }`}
                            title="Más opciones de usuario"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {openActionMenuId === user.id && (
                            <div className={`absolute right-0 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 ${
                              isNearBottom(index) ? 'bottom-full mb-1.5 origin-bottom-right' : 'top-full mt-1.5 origin-top-right'
                            }`}>
                              {/* Estado de Cuenta */}
                              <button
                                onClick={() => {
                                  setOpenActionMenuId(null);
                                  setStatementUser(user);
                                }}
                                className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-brand-50 hover:text-brand-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                              >
                                <Receipt className="w-4 h-4 text-brand-600 shrink-0" />
                                <div>
                                  <div className="font-bold text-slate-800">Estado de Cuenta</div>
                                  <div className="text-[10px] text-slate-400 font-normal">Extractos y movimientos financieros</div>
                                </div>
                              </button>

                              {/* Forzar / Desmarcar Actualización de Perfil */}
                              <button
                                onClick={() => {
                                  setOpenActionMenuId(null);
                                  handleToggleForceProfile(user);
                                }}
                                disabled={togglingUserId === user.id}
                                className={`w-full px-4 py-2.5 text-left text-xs flex items-center gap-2.5 transition-colors cursor-pointer border-t border-slate-100 ${
                                  user.must_update_profile
                                    ? 'text-amber-800 hover:bg-amber-50 hover:text-amber-900'
                                    : 'text-slate-700 hover:bg-amber-50 hover:text-amber-800'
                                }`}
                              >
                                {togglingUserId === user.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin text-amber-600 shrink-0" />
                                ) : (
                                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                                )}
                                <div className="flex flex-col">
                                  <span className="font-bold">
                                    {user.must_update_profile ? 'Desmarcar Obligatorio' : 'Forzar Actualización'}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-normal">
                                    {user.must_update_profile ? 'Exige actualizar datos al ingresar' : 'Pedir validación de datos'}
                                  </span>
                                </div>
                              </button>

                              {/* Restablecer Contraseña */}
                              <button
                                onClick={() => {
                                  setOpenActionMenuId(null);
                                  setResettingUser(user);
                                }}
                                className="w-full px-4 py-2.5 text-left text-xs font-semibold text-rose-700 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer border-t border-slate-100"
                              >
                                <KeyRound className="w-4 h-4 text-rose-600 shrink-0" />
                                <div className="flex flex-col">
                                  <span className="font-bold">Restablecer Clave</span>
                                  <span className="text-[10px] text-slate-400 font-normal">Asignar clave temporal (123456789)</span>
                                </div>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </Can>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-medium">
                    No se encontraron usuarios.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        <div className="px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-slate-500">
            {total > 0 ? (
              <span>
                Mostrando <strong className="font-bold text-slate-800">{(page - 1) * limit + 1}</strong> a <strong className="font-bold text-slate-800">{Math.min(page * limit, total)}</strong> de <strong className="font-bold text-slate-800">{total}</strong> usuarios <span className="text-slate-400 font-normal ml-1">(Página {page} de {Math.max(1, Math.ceil(total / limit))})</span>
              </span>
            ) : (
              <span>0 usuarios</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-3.5 py-1.5 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold transition-colors cursor-pointer"
            >
              Anterior
            </button>
            <span className="px-2 font-mono text-slate-400 text-[11px]">
              {page} / {Math.max(1, Math.ceil(total / limit))}
            </span>
            <button 
              disabled={page * limit >= total}
              onClick={() => setPage(p => p + 1)}
              className="px-3.5 py-1.5 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold transition-colors cursor-pointer"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Reset Password */}
      {resettingUser && createPortal(
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 pt-20" style={{ margin: 0 }}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="p-2.5 bg-amber-100 rounded-xl">
                <KeyRound className="w-6 h-6 text-amber-700" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Restablecer Contraseña</h3>
                <p className="text-xs text-slate-500">Usuario: <strong className="text-slate-800">{resettingUser.name}</strong></p>
              </div>
            </div>

            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-2 text-amber-900">
              <p>• La contraseña se cambiará temporalmente a: <strong className="font-mono text-amber-950 font-bold bg-amber-200/80 px-2 py-0.5 rounded text-xs">123456789</strong></p>
              <p>• Se forzará el cambio obligatorio de contraseña cuando el usuario inicie sesión.</p>
              <p>• Se restablecerán los intentos fallidos de inicio de sesión.</p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setResettingUser(null)}
                disabled={isResetting}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmResetPassword}
                disabled={isResetting}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isResetting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar Restablecimiento'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal de Confirmación para Forzar Actualización Masiva */}
      {isForceAllModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-inter">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4 border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100 shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-montserrat">Forzar Actualización Masiva</h3>
                <p className="text-xs text-slate-500">Acción global para todos los usuarios</p>
              </div>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs space-y-2 text-amber-900">
              <p className="font-bold">¿Deseas obligar a todos los usuarios a actualizar sus datos de perfil?</p>
              <p>• La próxima vez que cualquier usuario navegue por la plataforma, se le presentará una pantalla obligatoria y bloqueante para completar y validar sus datos.</p>
              <p>• Deberán confirmar su nombre completo, documento de identidad, teléfono y fecha de nacimiento.</p>
              <p>• Una vez el usuario guarde sus datos, la plataforma se desbloqueará de inmediato para su sesión.</p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsForceAllModalOpen(false)}
                disabled={isForcingAll}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmForceAll}
                disabled={isForcingAll}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-amber-500/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isForcingAll ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Aplicando a todos los usuarios...</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4" />
                    <span>Sí, Forzar a Todos</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

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

      {statementUser && (
        <UserAccountStatementModal
          isOpen={!!statementUser}
          onClose={() => setStatementUser(null)}
          userId={statementUser.id}
          userName={statementUser.name}
        />
      )}

      <GlobalAccountStatementModal
        isOpen={isGlobalStatementOpen}
        onClose={() => setIsGlobalStatementOpen(false)}
      />
    </div>
  );
};
