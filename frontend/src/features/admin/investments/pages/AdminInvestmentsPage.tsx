import React, { useEffect, useState } from 'react';
import { 
  Briefcase, 
  Search, 
  Loader2, 
  AlertCircle, 
  User as UserIcon, 
  Calendar, 
  ChevronDown, 
  ChevronRight, 
  ChevronUp, 
  Eye, 
  FileText, 
  Send, 
  History, 
  Zap, 
  RefreshCw, 
  Wallet, 
  TrendingUp, 
  Users, 
  DollarSign, 
  CheckCircle, 
  X,
  RotateCcw
} from 'lucide-react';
import { auditService, AuditUser } from '../../../../services/audit';
import { UserYieldAuditBox } from '../components/UserYieldAuditBox';
import { UserWalletHistoryBox } from '../components/UserWalletHistoryBox';
import { BulkTransferModal } from '../components/BulkTransferModal';
import { YieldBatchesModal } from '../components/YieldBatchesModal';

export const AdminInvestmentsPage: React.FC = () => {
  const [users, setUsers] = useState<AuditUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Bulk Transfer & Batches Modal State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isBatchesModalOpen, setIsBatchesModalOpen] = useState(false);

  // Expanded rows state
  const [expandedUsers, setExpandedUsers] = useState<Set<number>>(new Set());
  const [isCreatingWallet, setIsCreatingWallet] = useState<number | null>(null);

  // Global Cycle Filters
  const [cycleStartDate, setCycleStartDate] = useState('');
  const [cycleEndDate, setCycleEndDate] = useState('');

  // Pagination & Filters
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const usersData = await auditService.getUsers({
        page,
        limit,
        search: search || undefined,
      });
      setUsers(usersData.data || []);
      setTotal(usersData.total || 0);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los usuarios.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, search]);

  const toggleExpand = (userId: number) => {
    const newSet = new Set(expandedUsers);
    if (newSet.has(userId)) newSet.delete(userId);
    else newSet.add(userId);
    setExpandedUsers(newSet);
  };

  const handleCreateWallet = async (userId: number) => {
    setIsCreatingWallet(userId);
    try {
      await (auditService as any).createWallet(userId);
      setSuccess('Billetera creada y vinculada correctamente.');
      setTimeout(() => setSuccess(null), 4000);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Error al crear la billetera');
    } finally {
      setIsCreatingWallet(null);
    }
  };

  // KPI Calculations
  const usersWithWallet = users.filter(u => !!u.wallet).length;
  
  const totalCapitalAuditado = users.reduce((acc, user) => {
    const userInvSum = (user.investments || []).reduce((invAcc: number, inv: any) => {
      return invAcc + Number(inv.capital_total || inv.package?.value || 0);
    }, 0);
    return acc + userInvSum;
  }, 0);

  const totalCapitalDisponible = users.reduce((acc, user) => {
    return acc + Number((user as any).total_capital_disponible || 0);
  }, 0);

  const totalSaldosBilletera = users.reduce((acc, user) => {
    return acc + (user.wallet ? Number(user.wallet.balance || 0) : 0);
  }, 0);

  const totalContratos = users.reduce((acc, user) => acc + (user.investments?.length || 0), 0);

  if (isLoading && users.length === 0) {
    return (
      <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 animate-pulse font-inter">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 w-72 bg-slate-200 rounded-xl"></div>
            <div className="h-4 w-96 bg-slate-100 rounded-lg"></div>
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-36 bg-slate-200 rounded-xl"></div>
            <div className="h-10 w-44 bg-slate-200 rounded-xl"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-slate-200/90 rounded-2xl p-5 h-28 space-y-3">
              <div className="h-4 w-28 bg-slate-100 rounded"></div>
              <div className="h-6 w-36 bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 h-96 space-y-4">
          <div className="h-6 w-48 bg-slate-200 rounded"></div>
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 bg-slate-100 rounded-xl w-full"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in duration-300 font-inter">
      <BulkTransferModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        defaultStartDate={cycleStartDate}
        defaultEndDate={cycleEndDate}
        onSuccess={() => fetchData()}
      />

      <YieldBatchesModal
        isOpen={isBatchesModalOpen}
        onClose={() => setIsBatchesModalOpen(false)}
        onBatchUpdated={() => fetchData()}
      />

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

      {error && (
        <div className="w-full p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start justify-between text-rose-700 shadow-xs">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
            <div>
              <h3 className="font-bold font-montserrat text-sm text-rose-900">Error en el módulo de auditoría</h3>
              <p className="text-xs mt-0.5 text-rose-700">{error}</p>
            </div>
          </div>
          <button 
            onClick={fetchData} 
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer font-montserrat shadow-xs shrink-0"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Header Ejecutivo Estandarizado */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-montserrat flex items-center gap-2.5 whitespace-nowrap sm:whitespace-normal">
              <div className="p-2.5 bg-brand-50 border border-brand-200/80 rounded-2xl text-brand-700 shadow-2xs">
                <Briefcase className="w-6 h-6" />
              </div>
              <span>Auditoría & Cruce Contable</span>
            </h1>
            <button
              onClick={fetchData}
              disabled={isLoading}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              title="Actualizar datos"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-brand-600' : ''}`} />
            </button>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200/80 rounded-full text-xs font-bold font-montserrat shadow-2xs">
              <Zap className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <span>00:00 COT</span>
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1 font-normal">
            Supervisión integral de contratos, balances en billeteras, rendimientos y transferencias masivas a inversionistas.
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => setIsBatchesModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 rounded-xl transition-all border border-slate-200/90 shadow-2xs cursor-pointer font-montserrat"
            title="Ver historial de lotes, liquidaciones automáticas y reversión"
          >
            <History className="w-4 h-4 text-slate-600 shrink-0" />
            <span className="whitespace-nowrap">Historial de Lotes</span>
          </button>

          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl transition-all shadow-md shadow-emerald-500/20 cursor-pointer font-montserrat whitespace-nowrap"
          >
            <Send className="w-4 h-4 shrink-0" />
            <span>Transferencia Masiva</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Summary (4 Métricas Clave Estandarizadas) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Inversionistas */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block font-montserrat">
              Inversionistas Auditados
            </span>
            <div className="p-2 bg-brand-50 text-brand-600 rounded-xl shrink-0">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-black text-slate-900 block tracking-tight font-mono">
            {total}
          </span>
          <span className="text-[11px] text-slate-500 font-medium block truncate">
            {usersWithWallet} billeteras activas (página actual)
          </span>
        </div>

        {/* Capital Auditado Total */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-blue-700 font-bold uppercase tracking-wider block font-montserrat">
              Capital en Custodia (Pág.)
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl shrink-0">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-black text-blue-700 block tracking-tight font-mono">
            {totalCapitalAuditado.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
          </span>
          <span className="text-[11px] text-blue-600 font-medium block truncate">
            {totalContratos} contratos de inversión registrados
          </span>
        </div>

        {/* Capital Disponible Retiro */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-emerald-700 font-bold uppercase tracking-wider block font-montserrat">
              Capital Disponible (Retiro)
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-black text-emerald-600 block tracking-tight font-mono">
            {totalCapitalDisponible.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
          </span>
          <span className="text-[11px] text-emerald-600 font-medium block truncate">
            Saldo acumulado listo para liquidación
          </span>
        </div>

        {/* Saldos en Billetera */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-amber-700 font-bold uppercase tracking-wider block font-montserrat">
              Saldos en Billetera
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-black text-amber-600 block tracking-tight font-mono">
            {totalSaldosBilletera.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
          </span>
          <span className="text-[11px] text-amber-600 font-medium block truncate">
            Fondos monetarios acreditados en cuenta
          </span>
        </div>
      </div>

      {/* Barra de Filtros y Rango de Ciclo */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row gap-4 items-stretch md:items-center">
        <div className="flex-1 relative w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, email o número de documento..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm border border-slate-200/90 bg-slate-50/50 focus:bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-inter"
          />
        </div>

        <div className="flex flex-wrap sm:flex-nowrap gap-2.5 items-center w-full md:w-auto bg-slate-50/80 p-1.5 sm:p-2 rounded-xl border border-slate-200/70">
          <div className="flex-1 sm:flex-initial">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 ml-1 font-montserrat">
              Inicio Ciclo
            </label>
            <div className="relative">
              <input
                type="date"
                value={cycleStartDate}
                onChange={(e) => setCycleStartDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg md:w-36 px-2.5 py-1.5 text-xs font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
          </div>
          <div className="flex-1 sm:flex-initial">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 ml-1 font-montserrat">
              Fin Ciclo
            </label>
            <div className="relative">
              <input
                type="date"
                value={cycleEndDate}
                onChange={(e) => setCycleEndDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg md:w-36 px-2.5 py-1.5 text-xs font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
          </div>
          {(cycleStartDate || cycleEndDate) && (
            <button
              onClick={() => {
                setCycleStartDate('');
                setCycleEndDate('');
              }}
              className="mt-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
              title="Limpiar fechas de ciclo"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 border-collapse">
            <thead className="bg-slate-50/80 text-slate-400 font-bold border-b border-slate-200/80 uppercase text-[10px] tracking-wider font-montserrat">
              <tr>
                <th className="px-4 py-4 w-12 text-center"></th>
                <th className="px-6 py-4">Inversionista</th>
                <th className="px-6 py-4">Billetera</th>
                <th className="px-6 py-4">Capital Disponible (Retiro)</th>
                <th className="px-6 py-4">Resumen Inversiones</th>
                <th className="px-6 py-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {users.map(user => (
                <React.Fragment key={user.id}>
                  {/* Fila principal del Usuario */}
                  <tr 
                    className={`hover:bg-slate-50/70 transition-colors cursor-pointer ${
                      expandedUsers.has(user.id) ? 'bg-slate-50/80' : 'bg-white'
                    }`}
                    onClick={() => toggleExpand(user.id)}
                  >
                    <td className="px-4 py-4 text-center align-top">
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center transition-colors mx-auto ${
                        expandedUsers.has(user.id) ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {expandedUsers.has(user.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-brand-50 border border-brand-100/80 flex items-center justify-center text-brand-600 shrink-0 mt-0.5">
                          <UserIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900 text-sm font-montserrat">{user.name}</div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">{user.email}</div>
                          {user.document_id && (
                            <div className="text-[10px] text-slate-500 font-semibold mt-1 inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded-md">
                              Doc: {user.document_id}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      {user.wallet ? (
                        <div>
                          <div className="font-black text-slate-900 text-sm font-mono">
                            {Number(user.wallet.balance).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
                          </div>
                          <div className="mt-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                              user.wallet.status === 'active' 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80' 
                                : 'bg-rose-50 text-rose-700 border-rose-200/80'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${user.wallet.status === 'active' ? 'bg-emerald-600' : 'bg-rose-600'}`}></span>
                              {user.wallet.status}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-start gap-1.5">
                          <span className="text-xs text-slate-400 italic">Sin billetera vinculada</span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCreateWallet(user.id);
                            }}
                            disabled={isCreatingWallet === user.id}
                            className="text-[10px] font-bold text-brand-700 bg-brand-50 hover:bg-brand-100/80 px-2.5 py-1 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1 border border-brand-200/80 cursor-pointer font-montserrat shadow-2xs"
                          >
                            {isCreatingWallet === user.id && <Loader2 className="w-3 h-3 animate-spin" />}
                            Crear Billetera
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div>
                        <div className="font-black text-emerald-700 text-sm font-mono">
                          {Number((user as any).total_capital_disponible || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1 font-medium">
                          Liberado: {Number((user as any).total_capital_liberado || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
                        </div>
                        {(user as any).total_capital_retirado > 0 && (
                          <div className="text-[10px] text-amber-600 font-semibold mt-0.5">
                            Retirado: -{Number((user as any).total_capital_retirado || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-50/70 border border-brand-200/80 rounded-xl text-brand-700 text-xs font-bold font-montserrat shadow-2xs">
                        <Briefcase className="w-3.5 h-3.5 text-brand-600" />
                        <span>
                          {user.investments ? user.investments.length : 0} {user.investments?.length === 1 ? 'Contrato' : 'Contratos'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center align-top" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => toggleExpand(user.id)}
                        className={`text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-2xs cursor-pointer flex items-center justify-center gap-1.5 mx-auto font-montserrat ${
                          expandedUsers.has(user.id)
                            ? 'bg-slate-900 text-white hover:bg-slate-800 border border-slate-900'
                            : 'text-brand-700 bg-brand-50/70 hover:bg-brand-100/80 border border-brand-200/80'
                        }`}
                      >
                        {expandedUsers.has(user.id) ? (
                          <>
                            <ChevronUp className="w-3.5 h-3.5" />
                            <span>Ocultar Detalle</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            <span>Auditar Inversor</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>

                  {/* Fila expandida con las inversiones y auditoría */}
                  {expandedUsers.has(user.id) && (
                    <tr>
                      <td colSpan={6} className="p-0 bg-slate-50/60 border-b border-slate-200/90">
                        <div className="px-6 sm:px-8 py-6 space-y-6">
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 font-montserrat">
                                <FileText className="w-4 h-4 text-brand-600" />
                                <span>Detalle de Inversiones y Liberación de Capital por Ciclos (60 días)</span>
                              </h3>
                              <span className="text-xs text-slate-400 font-mono">ID Inversor: #{user.id}</span>
                            </div>

                            {user.investments && user.investments.length > 0 ? (
                              <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200/90 shadow-xs">
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-slate-50/80 text-slate-400 uppercase tracking-wider font-bold text-[10px] font-montserrat border-b border-slate-200/80">
                                    <tr>
                                      <th className="px-4 py-3">Código</th>
                                      <th className="px-4 py-3">Capital Total</th>
                                      <th className="px-4 py-3">Liberación Capital (Ciclos 60d)</th>
                                      <th className="px-4 py-3">Capital Disponible (Retiro)</th>
                                      <th className="px-4 py-3">Periodo / Tasa</th>
                                      <th className="px-4 py-3">Fechas</th>
                                      <th className="px-4 py-3">Detalles</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 font-medium">
                                    {user.investments.map(inv => {
                                      const capTotal = Number(inv.capital_total || inv.package?.value || 0);
                                      const capLiberado = Number(inv.capital_liberado || 0);
                                      const capDisponible = Number(inv.capital_disponible || 0);
                                      const capRetirado = Number(inv.capital_retirado || 0);
                                      const capDiario = Number(inv.capital_diario || 0);
                                      const diasTranscurridos = Number(inv.dias_transcurridos || 0);
                                      const bloques60d = Number(inv.bloques_60_dias_cumplidos || 0);
                                      const diasProxima = Number(inv.dias_proxima_liberacion || 0);
                                      const diasTotales = Number(inv.dias_totales || inv.period?.days || 547);
                                      const pctLiberado = capTotal > 0 ? Math.min(100, Math.round((capLiberado / capTotal) * 100)) : 0;

                                      return (
                                        <React.Fragment key={inv.id}>
                                          <tr className="hover:bg-slate-50/60 transition-colors">
                                            <td className="px-4 py-3 align-top">
                                              <div className="font-extrabold text-slate-900 font-montserrat">{inv.assigned_code}</div>
                                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">ID: #{inv.id}</div>
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                              <div className="font-black text-slate-900 font-mono text-sm">
                                                {capTotal.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
                                              </div>
                                              {inv.package?.granted_shares > 0 && (
                                                <div className="text-[10px] text-brand-600 mt-0.5 font-bold">+{inv.package.granted_shares} acciones</div>
                                              )}
                                            </td>
                                            <td className="px-4 py-3 align-top min-w-[220px]">
                                              <div className="space-y-1">
                                                <div className="flex justify-between items-center text-[11px]">
                                                  <span className="text-slate-500 font-medium">Rend. Diario Capital:</span>
                                                  <span className="font-bold text-slate-800 font-mono">
                                                    {capDiario.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })} / día
                                                  </span>
                                                </div>
                                                <div className="flex justify-between items-center text-[11px]">
                                                  <span className="text-slate-500 font-medium">Tiempo Transcurrido:</span>
                                                  <span className="font-semibold text-slate-700">
                                                    {diasTranscurridos}d ({bloques60d} {bloques60d === 1 ? 'ciclo' : 'ciclos'} de 60d)
                                                  </span>
                                                </div>
                                                <div className="flex justify-between items-center text-[11px] pt-0.5">
                                                  <span className="text-slate-600 font-bold">Capital Liberado ({pctLiberado}%):</span>
                                                  <span className="font-bold text-emerald-700 font-mono">
                                                    {capLiberado.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
                                                  </span>
                                                </div>
                                                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                  <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-1.5 rounded-full" style={{ width: `${pctLiberado}%` }}></div>
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-medium">
                                                  {diasProxima > 0 ? `Próxima liberación en ${diasProxima} días` : '100% de capital liberado'}
                                                </div>
                                              </div>
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                              <div className="font-extrabold text-emerald-700 text-sm font-mono">
                                                {capDisponible.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
                                              </div>
                                              {capRetirado > 0 && (
                                                <div className="text-[10px] text-amber-600 font-semibold mt-0.5">
                                                  Retirado: -{capRetirado.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
                                                </div>
                                              )}
                                              <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                capDisponible > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80' : 'bg-slate-100 text-slate-500'
                                              }`}>
                                                {capDisponible > 0 ? 'Disponible' : 'Sin saldo disponible'}
                                              </span>
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                              <div className="font-bold text-slate-800 font-montserrat">
                                                {diasTotales} días
                                              </div>
                                              {inv.period && (
                                                <div className="text-[10px] text-slate-500 mt-0.5 font-medium">{inv.period.percentage}% mensual</div>
                                              )}
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                              <div className="text-[10px] text-slate-500"><span className="font-semibold text-slate-700">Inicio:</span> {inv.start_date ? new Date(inv.start_date).toLocaleDateString('es-CO') : 'N/A'}</div>
                                              <div className="text-[10px] text-slate-500 mt-0.5"><span className="font-semibold text-slate-700">Fin (Est.):</span> {inv.end_date ? new Date(inv.end_date).toLocaleDateString('es-CO') : 'N/A'}</div>
                                            </td>
                                            <td className="px-4 py-3 align-top max-w-[180px]">
                                              {inv.referred_by && <div className="text-[10px] text-slate-500"><span className="font-semibold text-slate-700">Ref:</span> {inv.referred_by}</div>}
                                              {inv.observations && <div className="text-[10px] text-slate-500 mt-0.5 italic truncate" title={inv.observations}><span className="font-semibold not-italic text-slate-700">Obs:</span> {inv.observations}</div>}
                                              <div className="text-[10px] text-brand-600 font-semibold mt-1">Historiales: {inv.contract_histories ? inv.contract_histories.length : 0}</div>
                                            </td>
                                          </tr>

                                          {/* Retiros de Capital para esta inversión */}
                                          {inv.withdrawals && inv.withdrawals.filter((w: any) => w.tipo === 'capital').length > 0 && (
                                            <tr className="bg-slate-50/40">
                                              <td colSpan={7} className="px-4 py-3 border-t border-slate-100">
                                                <div className="pl-4 border-l-2 border-amber-400">
                                                  <h4 className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1.5 font-montserrat">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                                                    Retiros de Capital ({inv.withdrawals.filter((w: any) => w.tipo === 'capital').length})
                                                  </h4>
                                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                    {inv.withdrawals.filter((w: any) => w.tipo === 'capital').map((w: any) => (
                                                      <div key={w.id} className="bg-white border border-slate-200/90 rounded-xl p-3 text-[10px] shadow-2xs">
                                                        <div className="flex justify-between items-center mb-1.5">
                                                          <span className="font-semibold text-slate-700">{new Date(w.fecha_solicitud).toLocaleDateString()}</span>
                                                          <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[9px] ${
                                                            w.estado === 'procesado' || w.estado === 'aprobado' 
                                                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80' 
                                                              : w.estado === 'rechazado' || w.estado === 'cancelado' 
                                                              ? 'bg-rose-50 text-rose-700 border border-rose-200/80' 
                                                              : 'bg-amber-50 text-amber-700 border border-amber-200/80'
                                                          }`}>
                                                            {w.estado}
                                                          </span>
                                                        </div>
                                                        <div className="flex justify-between items-end">
                                                          <div className="text-slate-500">
                                                            <div className="font-black text-slate-900 text-xs font-mono">
                                                              {Number(w.monto_neto).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
                                                            </div>
                                                            <div className="mt-0.5 truncate max-w-[140px]" title={w.metodo_pago ? `${w.metodo_pago} - ${w.banco || ''} ${w.numero_cuenta || ''}` : ''}>
                                                              {w.metodo_pago ? `${w.metodo_pago} - ${w.banco || ''}` : 'Sin método de pago'}
                                                            </div>
                                                          </div>
                                                        </div>
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>
                                              </td>
                                            </tr>
                                          )}
                                        </React.Fragment>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="bg-white p-4 rounded-2xl border border-slate-200/90 text-xs text-slate-500 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                                <span>Este usuario no registra contratos de inversión asociados.</span>
                              </div>
                            )}
                          </div>

                          <UserYieldAuditBox 
                            userId={user.id}
                            userName={user.name}
                            startDate={cycleStartDate}
                            endDate={cycleEndDate}
                            onSuccess={() => fetchData()}
                          />
                          
                          <UserWalletHistoryBox userId={user.id} />
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}

              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Briefcase className="w-8 h-8 text-slate-300" />
                      <p className="font-semibold text-slate-700">No se encontraron registros de inversión para auditar.</p>
                      <p className="text-xs text-slate-400">Intenta con otro término de búsqueda o rango de fechas.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs gap-3 text-xs">
        <div className="text-slate-500 font-medium">
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
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3.5 py-1.5 border border-slate-200/90 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer font-montserrat shadow-2xs"
          >
            Anterior
          </button>
          <span className="px-2 font-mono text-slate-500 font-semibold text-xs">
            {page} / {Math.max(1, Math.ceil(total / limit))}
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page * limit >= total}
            className="px-3.5 py-1.5 border border-slate-200/90 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer font-montserrat shadow-2xs"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
};
