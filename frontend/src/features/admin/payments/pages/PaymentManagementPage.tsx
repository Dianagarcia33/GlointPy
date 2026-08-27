import React, { useState, useEffect, useMemo } from 'react';
import { Search, Loader2, DollarSign, Filter, RefreshCw, FileText, CheckCircle2, AlertCircle, Clock, ShieldCheck, XCircle, ChevronLeft, ChevronRight, Wallet, FileSpreadsheet, CheckSquare, Square, Check } from 'lucide-react';
import { paymentService } from '../services/paymentService';
import { Withdrawal, PaginatedWithdrawals } from '../types';
import { WithdrawalApprovalModal } from '../components/WithdrawalApprovalModal';
import { BulkPayoutPreviewModal } from '../components/BulkPayoutPreviewModal';
import { bankAccountsService, DataBank } from '../../../../services/bankAccounts';
import { Can } from '../../../../components/security/Can';

export const PaymentManagementPage: React.FC = () => {
  const [data, setData] = useState<PaginatedWithdrawals | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [page, setPage] = useState(1);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Multi-selection states
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [officialBanks, setOfficialBanks] = useState<DataBank[]>([]);
  const limit = 20;

  useEffect(() => {
    // Load official banks catalog
    bankAccountsService.getBanks()
      .then(banks => setOfficialBanks(banks))
      .catch(err => console.error('Error loading banks:', err));
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      const res = await paymentService.getWithdrawals(page, limit, search, statusFilter, startDate, endDate);
      setData(res);
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWithdrawals();
  }, [page, statusFilter, startDate, endDate]);

  const handleSyncWalletDebits = async () => {
    try {
      setIsSyncing(true);
      const res = await paymentService.syncWalletDebits();
      setToast({ message: res.message, type: 'success' });
      fetchWithdrawals();
    } catch (error: any) {
      console.error('Error syncing wallet debits:', error);
      setToast({ message: error.message || 'Error al sincronizar débitos de billetera', type: 'error' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchWithdrawals();
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(num);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; bg: string; text: string; border: string; icon: React.ReactNode }> = {
      pendiente: { label: 'PENDIENTE', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: <Clock className="w-3.5 h-3.5" /> },
      aprobado: { label: 'APROBADO', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
      procesado: { label: 'PROCESADO', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
      rechazado: { label: 'RECHAZADO', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', icon: <XCircle className="w-3.5 h-3.5" /> },
    };

    const cfg = statusMap[status.toLowerCase()] || { label: status.toUpperCase(), bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', icon: null };
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border} shadow-2xs`}>
        {cfg.icon}
        {cfg.label}
      </span>
    );
  };

  const filteredItems = (data?.data || []).filter(item => {
    if (statusFilter === 'todos') return true;
    return item.estado.toLowerCase() === statusFilter.toLowerCase();
  });

  // Calculate selection stats
  const selectedWithdrawalsList = useMemo(() => {
    const all = data?.data || [];
    return all.filter(i => selectedIds.has(i.id));
  }, [data, selectedIds]);

  const selectedTotalNet = useMemo(() => {
    return selectedWithdrawalsList.reduce((sum, i) => sum + parseFloat(i.monto_neto as any || i.monto || 0), 0);
  }, [selectedWithdrawalsList]);

  const isAllOnPageSelected = useMemo(() => {
    return filteredItems.length > 0 && filteredItems.every(i => selectedIds.has(i.id));
  }, [filteredItems, selectedIds]);

  const isSomeOnPageSelected = useMemo(() => {
    return filteredItems.some(i => selectedIds.has(i.id)) && !isAllOnPageSelected;
  }, [filteredItems, selectedIds, isAllOnPageSelected]);

  const toggleSelectAllOnPage = () => {
    const next = new Set(selectedIds);
    if (isAllOnPageSelected) {
      filteredItems.forEach(i => next.delete(i.id));
    } else {
      filteredItems.forEach(i => next.add(i.id));
    }
    setSelectedIds(next);
  };

  const toggleSelectOne = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Calculate quick stats
  const pendingCount = (data?.data || []).filter(i => i.estado === 'pendiente').length;
  const approvedCount = (data?.data || []).filter(i => i.estado === 'aprobado' || i.estado === 'procesado').length;
  const totalAmountPaid = (data?.data || [])
    .filter(i => i.estado === 'aprobado' || i.estado === 'procesado')
    .reduce((sum, i) => sum + parseFloat(i.monto_neto as any || 0), 0);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-24 animate-in fade-in duration-300 relative">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border ${
          toast.type === 'success' ? 'bg-emerald-900 text-emerald-100 border-emerald-700' : 'bg-rose-900 text-rose-100 border-rose-700'
        } animate-in slide-in-from-bottom-3 backdrop-blur-md`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-rose-400" />}
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Floating Selection Bar for Quick Batch Export */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 sm:px-6 py-3.5 rounded-3xl shadow-2xl border border-slate-700/80 flex items-center gap-4 sm:gap-6 animate-in slide-in-from-bottom-5 duration-200 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-7 h-7 bg-brand-500 text-white rounded-full text-xs font-bold font-mono shadow-sm">
              {selectedIds.size}
            </span>
            <div>
              <p className="text-xs font-bold leading-tight text-white">Seleccionados</p>
              <p className="text-[11px] text-emerald-400 font-mono font-extrabold">{formatCurrency(selectedTotalNet)}</p>
            </div>
          </div>

          <div className="h-7 w-px bg-slate-700" />

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="px-4 py-2 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md shadow-emerald-600/30 transition-all flex items-center gap-2 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Previsualizar Dispersión de Pagos
            </button>

            <button
              onClick={clearSelection}
              className="px-3 py-2 text-xs font-bold text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
            >
              Limpiar
            </button>
          </div>
        </div>
      )}

      {/* Header Ejecutivo Principal (Estilo Panel Comercial) */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute right-0 top-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-white/10 rounded-full text-xs font-bold text-brand-300 backdrop-blur-sm border border-white/10">
            <DollarSign className="w-4 h-4 text-emerald-400" /> Tesorería & Dispersión de Saldo
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight font-montserrat">
            Gestión de Pagos & Retiros
          </h1>
          <p className="text-slate-300 text-sm max-w-xl">
            Supervisión de solicitudes de retiro, verificación de cuentas bancarias en la bóveda, sincronización de débitos y recibos de transferencia.
          </p>
        </div>
      </div>

      {/* KPI Cards Summary (Estilo Panel Comercial) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm relative overflow-hidden flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Solicitudes</span>
            <div className="p-2.5 bg-brand-50 text-brand-600 rounded-2xl border border-brand-100">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-slate-900 font-montserrat tracking-tight">{data?.total || 0}</p>
            <p className="text-xs text-slate-500 font-medium mt-1">Registros en plataforma</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm relative overflow-hidden flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-widest">Pendientes por Revisar</span>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-amber-600 font-montserrat tracking-tight">{pendingCount}</p>
            <p className="text-xs text-slate-500 font-medium mt-1">Requieren atención administrativa</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm relative overflow-hidden flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest">Aprobados / Procesados</span>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-emerald-600 font-montserrat tracking-tight">{approvedCount}</p>
            <p className="text-xs text-slate-500 font-medium mt-1">Desembolsos autorizados</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm relative overflow-hidden flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Desembolsado a la Fecha</span>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-slate-900 font-montserrat tracking-tight">{formatCurrency(totalAmountPaid)}</p>
            <p className="text-xs text-slate-500 font-medium mt-1">Suma acumulada desembolsada</p>
          </div>
        </div>
      </div>

      {/* Control Bar: Filters & Search (Estilo Responsivo Estandarizado) */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
          
          {/* Búsqueda */}
          <form onSubmit={handleSearch} className="w-full lg:w-80 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por usuario, cédula o correo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none text-xs sm:text-sm font-medium"
            />
          </form>

          {/* Rangos de Fecha Responsivos */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-50 p-2.5 sm:p-2 rounded-2xl border border-slate-200/80 text-xs font-semibold w-full lg:w-auto">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-slate-500 font-bold px-1 uppercase tracking-wider text-[10px] shrink-0">Desde:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-2 flex-1">
              <span className="text-slate-500 font-bold px-1 uppercase tracking-wider text-[10px] shrink-0">Hasta:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs cursor-pointer"
              />
            </div>
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="text-xs font-bold text-rose-600 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0 self-end sm:self-center"
                title="Limpiar rango de fechas"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Filtro por Estado (Pestañas Responsivas) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 p-1.5 sm:p-2 rounded-2xl border border-slate-200/80 text-xs font-bold">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full pb-0.5 sm:pb-0">
            <span className="text-slate-400 px-2 flex items-center gap-1 shrink-0"><Filter className="w-3.5 h-3.5" /> Estado:</span>
            {['todos', 'pendiente', 'aprobado', 'procesado', 'rechazado'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`py-1.5 px-3 rounded-xl transition-all capitalize shrink-0 cursor-pointer text-xs ${
                  statusFilter === st 
                    ? 'bg-slate-900 text-white shadow-xs' 
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Quick Bulk Action Button if Selected */}
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={() => setIsBulkModalOpen(true)}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Dispersión de Pagos ({selectedIds.size})
            </button>
          )}
        </div>
      </div>

      {/* Main Table Container (Estilo Panel Comercial) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase text-[11px] tracking-widest">
              <tr>
                <th className="px-4 py-4 w-12 text-center">
                  <button
                    type="button"
                    onClick={toggleSelectAllOnPage}
                    className="w-5 h-5 rounded-md flex items-center justify-center transition-colors cursor-pointer mx-auto"
                    title={isAllOnPageSelected ? "Desmarcar todos" : "Seleccionar todos"}
                  >
                    {isAllOnPageSelected ? (
                      <CheckSquare className="w-4 h-4 text-brand-600" />
                    ) : isSomeOnPageSelected ? (
                      <div className="w-3 h-3 bg-brand-600 rounded-xs" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-4">ID / Fecha Solicitud</th>
                <th className="px-6 py-4">Inversionista</th>
                <th className="px-6 py-4">Tipo & Origen</th>
                <th className="px-6 py-4 text-right">Monto Neto a Pagar</th>
                <th className="px-6 py-4 text-center">Estado</th>
                <Can permission="admin.withdrawals.manage">
                  <th className="px-6 py-4 text-center">Acciones</th>
                </Can>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && !data ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-600 mx-auto" />
                    <p className="mt-2 text-slate-500 font-medium text-sm">Cargando solicitudes de retiro...</p>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <FileText className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-slate-900 font-bold text-base">No se encontraron solicitudes de retiro</p>
                    <p className="text-slate-500 text-sm mt-1">Ajusta los filtros de búsqueda o el estado seleccionado.</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((withdrawal) => {
                  const isSelected = selectedIds.has(withdrawal.id);
                  return (
                    <tr 
                      key={withdrawal.id} 
                      className={`transition-colors group cursor-pointer ${
                        isSelected ? 'bg-brand-50/50 hover:bg-brand-50/70' : 'hover:bg-slate-50/80'
                      }`}
                      onClick={() => withdrawal.estado === 'pendiente' && setSelectedWithdrawal(withdrawal)}
                    >
                      <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(withdrawal.id)}
                          className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300 cursor-pointer accent-brand-600"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-extrabold text-slate-900 font-mono">#{withdrawal.id}</div>
                        <div className="text-slate-500 text-xs font-medium mt-0.5">{withdrawal.fecha_solicitud}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{withdrawal.user?.name || 'N/A'}</div>
                        {withdrawal.user?.document_id && (
                          <div className="text-slate-500 text-xs font-mono">Doc: {withdrawal.user.document_id}</div>
                        )}
                        <div className="text-slate-400 text-xs">{withdrawal.user?.email || ''}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-50 text-brand-700 text-xs font-bold border border-brand-100">
                          {withdrawal.tipo.charAt(0).toUpperCase() + withdrawal.tipo.slice(1)}
                        </div>
                        <div className="text-slate-500 text-xs mt-1 capitalize font-medium">Origen: {withdrawal.origen}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="font-black text-slate-900 text-base">{formatCurrency(withdrawal.monto_neto)}</div>
                        <div className="text-slate-400 text-xs font-medium mt-0.5" title="Monto Bruto">Bruto: {formatCurrency(withdrawal.monto)}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {getStatusBadge(withdrawal.estado)}
                      </td>
                      <Can permission="admin.withdrawals.manage">
                        <td className="px-6 py-4 text-center">
                          {withdrawal.estado === 'pendiente' ? (
                            <button 
                              onClick={(e) => { e.stopPropagation(); setSelectedWithdrawal(withdrawal); }}
                              className="px-4 py-1.5 text-xs font-extrabold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-xl transition-all shadow-2xs cursor-pointer"
                            >
                              Revisar
                            </button>
                          ) : (withdrawal.estado === 'aprobado' || withdrawal.estado === 'procesado') ? (
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                const path = withdrawal.receipt_path || withdrawal.comprobante_pago;
                                if (path) {
                                  const baseUrl = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || '';
                                  const fullUrl = `${baseUrl}/${path}`.replace(/([^:]\/)\/+/g, "$1");
                                  window.open(fullUrl, '_blank');
                                } else {
                                  const baseUrl = import.meta.env.VITE_API_URL || '';
                                  window.open(`${baseUrl}/withdrawals/${withdrawal.id}/receipt`, '_blank');
                                }
                              }}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-extrabold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all shadow-2xs cursor-pointer"
                              title="Ver Comprobante de Transferencia"
                            >
                              <FileText size={14} />
                              Recibo PDF
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">-</span>
                          )}
                        </td>
                      </Can>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {data && data.total > 0 && (
          <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between bg-slate-50/60 gap-3">
            <span className="text-xs font-medium text-slate-500">
              Mostrando <span className="font-bold text-slate-900">{(page - 1) * limit + 1}</span> a{' '}
              <span className="font-bold text-slate-900">{Math.min(page * limit, data.total)}</span> de{' '}
              <span className="font-bold text-slate-900">{data.total}</span> registros
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Anterior
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * limit >= data.total}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
              >
                Siguiente <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Approval Modal */}
      {selectedWithdrawal && (
        <WithdrawalApprovalModal
          withdrawal={selectedWithdrawal}
          onClose={() => setSelectedWithdrawal(null)}
          onUpdate={() => {
            fetchWithdrawals();
          }}
        />
      )}

      {/* Bulk Payout Modal */}
      {isBulkModalOpen && (
        <BulkPayoutPreviewModal
          isOpen={isBulkModalOpen}
          onClose={() => setIsBulkModalOpen(false)}
          onSuccess={() => {
            clearSelection();
            fetchWithdrawals();
            setToast({ message: 'Solicitudes de retiro marcadas como procesadas exitosamente.', type: 'success' });
          }}
          selectedWithdrawals={selectedWithdrawalsList}
          officialBanks={officialBanks}
        />
      )}
    </div>
  );
};

