import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { usersService, User } from '../../../../services/users';
import { rolesService, Role } from '../../../../services/roles';
import { sarlaftService } from '../../../../services/sarlaft';
import { UserModal } from '../components/UserModal';
import { BulkUploadModal } from '../components/BulkUploadModal';
import { UserAccountStatementModal } from '../components/UserAccountStatementModal';
import { GlobalAccountStatementModal } from '../components/GlobalAccountStatementModal';
import { Plus, Edit2, User as UserIcon, AlertCircle, Loader2, UploadCloud, ChevronDown, ChevronRight, KeyRound, CheckCircle, X, Eye, EyeOff, Receipt, Landmark, ShieldAlert, MoreVertical, Copy, Check, ShieldCheck } from 'lucide-react';
import { Can } from '../../../../components/security/Can';
import { maskAccountNumber, formatAccountNumber, formatColombiaDate, formatCurrency } from '../../../../utils/format';

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

  // Validación masiva SARLAFT para inversionistas (botón temporal)
  const [isBatchSarlaftModalOpen, setIsBatchSarlaftModalOpen] = useState(false);
  const [isBatchSarlaftLoading, setIsBatchSarlaftLoading] = useState(false);
  const [batchSarlaftResult, setBatchSarlaftResult] = useState<{ message: string; processed_users: number; updated_count: number; reverted_count?: number } | null>(null);

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
  const [tempPasswordModal, setTempPasswordModal] = useState<{
    userName: string;
    email: string;
    tempPassword: string;
    actionType: 'reset' | 'create';
  } | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);

  const handleCopyPassword = () => {
    if (tempPasswordModal?.tempPassword) {
      navigator.clipboard.writeText(tempPasswordModal.tempPassword);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2500);
    }
  };

  const handleConfirmResetPassword = async () => {
    if (!resettingUser) return;
    try {
      setIsResetting(true);
      setError(null);
      const res = await usersService.resetPassword(resettingUser.id);
      const userReset = resettingUser;
      setResettingUser(null);
      if (res.temp_password) {
        setTempPasswordModal({
          userName: userReset.name,
          email: userReset.email,
          tempPassword: res.temp_password,
          actionType: 'reset'
        });
      } else {
        setSuccess(`¡Contraseña restablecida exitosamente para ${userReset.name}!`);
        setTimeout(() => setSuccess(null), 5000);
      }
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

  const handleBatchValidateSarlaft = async () => {
    try {
      setIsBatchSarlaftLoading(true);
      setError(null);
      const res = await sarlaftService.validateExistingInvestors();
      setSuccess(res.message);
      setBatchSarlaftResult(res);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Error al validar SARLAFT masivo.');
    } finally {
      setIsBatchSarlaftLoading(false);
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

  const handleSaved = (savedUser?: any) => {
    fetchData();
    if (savedUser?.temp_password) {
      setTempPasswordModal({
        userName: savedUser.name,
        email: savedUser.email,
        tempPassword: savedUser.temp_password,
        actionType: 'create'
      });
    }
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
      <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 md:p-7 shadow-xl relative overflow-hidden flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
        <div className="absolute right-0 top-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="relative z-10 space-y-1.5 flex-1 min-w-[280px]">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-white/10 rounded-full text-[11px] font-bold text-brand-300 backdrop-blur-sm">
            <UserIcon className="w-3.5 h-3.5 text-emerald-400" /> Administración de Identidad & Accesos
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-montserrat text-white whitespace-nowrap">
            Gestión de Usuarios
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm max-w-lg">
            Administra usuarios de la plataforma, roles asignados, billeteras asociadas y seguridad.
          </p>
        </div>
        
        <div className="relative z-10 flex flex-wrap items-center gap-2.5 shrink-0">
          <button 
            onClick={() => setIsGlobalStatementOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all text-xs font-bold border border-white/10 backdrop-blur-sm cursor-pointer shadow-xs"
            title="Ver auditoría financiera y extracto general de la plataforma"
          >
            <Landmark className="w-4 h-4 text-emerald-400" />
            <span>Estado General</span>
          </button>

          <Can permission="admin.users.manage">
            <button 
              onClick={() => {
                setBatchSarlaftResult(null);
                setIsBatchSarlaftModalOpen(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-xl transition-all text-xs font-bold border border-emerald-500/30 backdrop-blur-sm cursor-pointer shadow-xs"
              title="Aprobar SARLAFT masivamente a usuarios que ya cuentan con inversiones"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Validar SARLAFT</span>
            </button>
          </Can>

          <Can permission="admin.users.manage">
            <button 
              onClick={() => setIsForceAllModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-xl transition-all text-xs font-bold border border-amber-500/30 backdrop-blur-sm cursor-pointer shadow-xs"
              title="Obligar a todos los usuarios a actualizar sus datos de perfil"
            >
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Forzar Perfil</span>
            </button>
          </Can>

          <Can permission="admin.users.manage">
            <button 
              onClick={handleCreate}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-all shadow-lg shadow-brand-500/30 text-xs sm:text-sm font-bold cursor-pointer shrink-0"
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

      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/90 text-slate-500 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider font-montserrat">
              <tr>
                <th className="px-3.5 py-3 w-[24%]">Usuario</th>
                <th className="px-3.5 py-3 w-[18%]">Identificación & Contacto</th>
                <th className="px-3.5 py-3 w-[13%]">Roles</th>
                <th className="px-3.5 py-3 w-[23%]">Billetera & Cuentas</th>
                <th className="px-3.5 py-3 w-[11%]">Estado</th>
                <th className="px-3.5 py-3 text-center w-[11%]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {users.map((user, index) => (
                <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* 1. Usuario */}
                  <td className="px-3.5 py-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-50 to-brand-100/90 border border-brand-200/60 flex items-center justify-center shrink-0 text-brand-700 font-extrabold text-xs shadow-2xs">
                        {user.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-3.5 h-3.5 text-brand-600" />}
                      </div>
                      <div className="min-w-0">
                        <div className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5 truncate">
                          <span className="truncate">{user.name}</span>
                          {user.is_superuser && (
                            <span className="text-[8px] bg-purple-100 text-purple-700 border border-purple-200 px-1.5 py-0.2 rounded font-bold uppercase shrink-0">Admin</span>
                          )}
                        </div>
                        <div className="text-slate-400 font-mono text-[11px] truncate" title={user.email}>
                          {user.email}
                        </div>
                        {user.parent ? (
                          <div className="text-[10px] text-amber-800 truncate">
                            <span className="font-bold">Tutor:</span> {user.parent.name}
                          </div>
                        ) : (user.children && user.children.length > 0) ? (
                          <div className="text-[10px] text-blue-800">
                            <span className="font-bold">Tutor de:</span> {user.children.length} menor(es)
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </td>

                  {/* 2. Identificación & Contacto */}
                  <td className="px-3.5 py-3">
                    <div className="space-y-0.5 text-xs">
                      <div className="font-bold text-slate-800 font-mono text-xs">
                        {user.document_id ? `CC ${user.document_id}` : <span className="text-slate-400 font-normal italic">Sin documento</span>}
                      </div>
                      <div className="text-slate-500 text-[11px] flex items-center gap-1">
                        <span>{user.phone_number || '—'}</span>
                        {user.date_of_birth && (
                          <span className="text-slate-400 text-[10px]">
                            · {formatColombiaDate(user.date_of_birth)}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* 3. Roles */}
                  <td className="px-3.5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {user.roles && user.roles.length > 0 ? (
                        user.roles.map(r => (
                          <span key={r.id} className="inline-flex px-2 py-0.5 bg-brand-50 text-brand-800 border border-brand-200/60 rounded-md text-[10px] font-bold whitespace-nowrap">
                            {r.display_name || r.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Sin roles</span>
                      )}
                    </div>
                  </td>

                  {/* 4. Billetera & Cuentas (Consolidada) */}
                  <td className="px-3.5 py-3">
                    <div className="space-y-1">
                      {/* Saldo y Estado de Billetera */}
                      <div className="flex items-center gap-2">
                        {user.wallet ? (
                          <>
                            <span className="font-extrabold text-slate-900 font-mono text-xs tracking-tight">
                              {formatCurrency(Number(user.wallet.balance))}
                            </span>
                            <span className={`text-[8px] px-1.5 py-0.2 rounded-full font-bold uppercase border ${
                              user.wallet.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>
                              {user.wallet.status === 'active' ? 'Activa' : 'Congelada'}
                            </span>
                          </>
                        ) : (
                          <button
                            onClick={() => handleCreateWallet(user.id, user.name)}
                            className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 underline cursor-pointer"
                          >
                            + Crear Billetera
                          </button>
                        )}
                      </div>

                      {/* Cuentas Bancarias */}
                      {user.bank_accounts && user.bank_accounts.length > 0 && user.bank_accounts[0] ? (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                          <span className="font-semibold text-slate-700 truncate max-w-[90px]" title={user.bank_accounts[0].banco}>
                            {user.bank_accounts[0].banco}
                          </span>
                          <span className="font-mono text-slate-500 text-[10px]">
                            {revealedAccounts.has(user.bank_accounts[0].id)
                              ? formatAccountNumber(user.bank_accounts[0].numero_cuenta)
                              : maskAccountNumber(user.bank_accounts[0].numero_cuenta)}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const accId = user.bank_accounts?.[0]?.id;
                              if (accId !== undefined) toggleRevealAccount(accId);
                            }}
                            className="p-0.5 text-slate-400 hover:text-brand-600 rounded cursor-pointer"
                            title={revealedAccounts.has(user.bank_accounts[0].id) ? "Ocultar" : "Mostrar"}
                          >
                            {revealedAccounts.has(user.bank_accounts[0].id) ? <EyeOff className="w-2.5 h-2.5 text-brand-600" /> : <Eye className="w-2.5 h-2.5" />}
                          </button>
                          {user.bank_accounts.length > 1 && (
                            <span className="text-[9px] px-1 rounded bg-slate-100 text-slate-600 font-bold" title={`${user.bank_accounts.length} cuentas registradas`}>
                              +{user.bank_accounts.length - 1}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400 italic">Sin cuentas</div>
                      )}
                    </div>
                  </td>

                  {/* 5. Estado & Registro */}
                  <td className="px-3.5 py-3">
                    <div className="space-y-0.5 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                          user.is_active 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {user.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                        {user.must_update_profile && (
                          <span className="p-0.5 text-amber-600" title="Actualización obligatoria de datos">
                            <AlertCircle className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {formatColombiaDate(user.created_at)}
                      </div>
                    </div>
                  </td>

                  {/* 6. Acciones */}
                  <td className="px-3.5 py-3 text-center">
                    <Can permission="admin.users.manage">
                      <div className="flex items-center justify-center gap-1">
                        <button 
                          onClick={() => handleEdit(user)} 
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-all border border-brand-200 bg-white cursor-pointer shadow-2xs"
                          title="Editar información de usuario"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Editar</span>
                        </button>

                        <div className="relative inline-block text-left user-action-menu">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenActionMenuId(openActionMenuId === user.id ? null : user.id);
                            }}
                            className={`p-1 rounded-lg transition-all border cursor-pointer ${
                              openActionMenuId === user.id
                                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-slate-200 shadow-2xs'
                            }`}
                            title="Más opciones de usuario"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>

                          {openActionMenuId === user.id && (
                            <div className={`absolute right-0 w-60 bg-white rounded-2xl shadow-2xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 ${
                              isNearBottom(index) ? 'bottom-full mb-1.5 origin-bottom-right' : 'top-full mt-1.5 origin-top-right'
                            }`}>
                              {/* Estado de Cuenta */}
                              <button
                                onClick={() => {
                                  setOpenActionMenuId(null);
                                  setStatementUser(user);
                                }}
                                className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-700 hover:bg-brand-50 hover:text-brand-700 flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <Receipt className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                                <div>
                                  <div className="font-bold text-slate-800">Estado de Cuenta</div>
                                  <div className="text-[10px] text-slate-400 font-normal">Extractos y movimientos</div>
                                </div>
                              </button>

                              {/* Forzar / Desmarcar Actualización de Perfil */}
                              <button
                                onClick={() => {
                                  setOpenActionMenuId(null);
                                  handleToggleForceProfile(user);
                                }}
                                disabled={togglingUserId === user.id}
                                className={`w-full px-3.5 py-2 text-left text-xs flex items-center gap-2 transition-colors cursor-pointer border-t border-slate-100 ${
                                  user.must_update_profile
                                    ? 'text-amber-800 hover:bg-amber-50 hover:text-amber-900'
                                    : 'text-slate-700 hover:bg-amber-50 hover:text-amber-800'
                                }`}
                              >
                                {togglingUserId === user.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600 shrink-0" />
                                ) : (
                                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                )}
                                <div className="flex flex-col">
                                  <span className="font-bold">
                                    {user.must_update_profile ? 'Desmarcar Obligatorio' : 'Forzar Actualización'}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-normal">
                                    {user.must_update_profile ? 'Exige actualizar datos' : 'Pedir validación'}
                                  </span>
                                </div>
                              </button>

                              {/* Restablecer Contraseña */}
                              <button
                                onClick={() => {
                                  setOpenActionMenuId(null);
                                  setResettingUser(user);
                                }}
                                className="w-full px-3.5 py-2 text-left text-xs font-semibold text-rose-700 hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer border-t border-slate-100"
                              >
                                <KeyRound className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                <div className="flex flex-col">
                                  <span className="font-bold">Restablecer Clave</span>
                                  <span className="text-[10px] text-slate-400 font-normal">Asignar clave temporal</span>
                                </div>
                              </button>

                              {/* Crear Billetera si no tiene */}
                              {!user.wallet && (
                                <button
                                  onClick={() => {
                                    setOpenActionMenuId(null);
                                    handleCreateWallet(user.id, user.name);
                                  }}
                                  className="w-full px-3.5 py-2 text-left text-xs font-bold text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 transition-colors cursor-pointer border-t border-slate-100"
                                >
                                  <Landmark className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <div>
                                    <div className="font-bold text-emerald-800">Crear Billetera</div>
                                    <div className="text-[10px] text-emerald-600 font-normal">Habilita balance financiero</div>
                                  </div>
                                </button>
                              )}
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
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium">
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
              <p>• Se generará una <strong>contraseña temporal aleatoria y segura</strong>.</p>
              <p>• Se forzará el cambio obligatorio de contraseña cuando el usuario inicie sesión, validando un código OTP enviado a su correo.</p>
              <p>• Se restablecerán los intentos fallidos y el bloqueo de inicio de sesión.</p>
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

      {/* Modal para mostrar y copiar la contraseña temporal generada (H-76) */}
      {tempPasswordModal && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" style={{ margin: 0 }}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100 rounded-xl text-emerald-700">
                <KeyRound className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {tempPasswordModal.actionType === 'create' ? 'Usuario Creado con Éxito' : 'Contraseña Restablecida'}
                </h3>
                <p className="text-xs text-slate-500">
                  Para: <strong className="text-slate-800">{tempPasswordModal.userName}</strong> ({tempPasswordModal.email})
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center space-y-2">
              <span className="text-xs text-slate-500 font-medium">Contraseña Temporal Generada:</span>
              <div className="flex items-center justify-center gap-2">
                <span className="font-mono text-base font-bold text-slate-900 bg-white px-3.5 py-2 rounded-lg border border-slate-200 select-all tracking-wider">
                  {tempPasswordModal.tempPassword}
                </span>
                <button
                  type="button"
                  onClick={handleCopyPassword}
                  className="px-3.5 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                >
                  {copiedPassword ? (
                    <>
                      <Check className="w-4 h-4 text-white" />
                      <span>¡Copiada!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-white" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Seguridad Obligatoria:
              </p>
              <p className="text-blue-800 leading-relaxed">
                Esta contraseña temporal única solo se muestra en este momento. Compártala por un canal privado con el usuario. Al iniciar sesión, el sistema le exigirá definir su nueva contraseña personal validando un <strong>código OTP de 6 dígitos</strong> enviado a su correo registrado.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setTempPasswordModal(null);
                  setCopiedPassword(false);
                }}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                Entendido y Cerrar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Temporal para Validación Masiva SARLAFT de Inversionistas */}
      {isBatchSarlaftModalOpen && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in duration-200 border border-slate-100">
            <div className="flex items-start gap-4">
              <div className="p-3.5 bg-emerald-100/80 rounded-2xl text-emerald-700 shrink-0">
                <ShieldCheck className="w-7 h-7 text-emerald-600" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900 font-montserrat">
                  Validación Masiva SARLAFT (Inversionistas)
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Aprueba administrativamente el estado preventivo de SARLAFT para los usuarios existentes en la base de datos que ya tienen inversiones registradas.
                </p>
              </div>
            </div>

            {batchSarlaftResult ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <span>¡Validación Actualizada!</span>
                </div>
                <p className="text-xs text-emerald-700">
                  {batchSarlaftResult.message}
                </p>
                <div className="text-[11px] text-emerald-600 font-mono">
                  Inversionistas evaluados: {batchSarlaftResult.processed_users} | Aprobados: {batchSarlaftResult.updated_count}
                  {batchSarlaftResult.reverted_count ? ` | Revocados: ${batchSarlaftResult.reverted_count}` : ''}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs text-slate-600 space-y-2">
                  <p className="font-semibold text-slate-800">
                    Alcance de la validación:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-slate-600">
                    <li>Se evaluarán <strong>únicamente los usuarios que cuentan con inversiones reales</strong> registradas en el sistema.</li>
                    <li>Los usuarios sin inversiones continuarán con el flujo regular de verificación previa.</li>
                    <li>Cualquier aprobación previa asignada por error a usuarios sin inversiones será revocada automáticamente.</li>
                  </ul>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsBatchSarlaftModalOpen(false);
                  setBatchSarlaftResult(null);
                }}
                disabled={isBatchSarlaftLoading}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                {batchSarlaftResult ? 'Cerrar' : 'Cancelar'}
              </button>

              {!batchSarlaftResult && (
                <button
                  type="button"
                  onClick={handleBatchValidateSarlaft}
                  disabled={isBatchSarlaftLoading}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isBatchSarlaftLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Validando...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Confirmar Validación Masiva</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      <GlobalAccountStatementModal
        isOpen={isGlobalStatementOpen}
        onClose={() => setIsGlobalStatementOpen(false)}
      />
    </div>
  );
};
