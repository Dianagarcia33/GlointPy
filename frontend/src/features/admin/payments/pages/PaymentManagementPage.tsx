import React, { useState, useEffect } from 'react';
import { Search, Loader2, DollarSign, Filter, RefreshCw, FileText, CheckCircle2, AlertCircle, Clock, ShieldCheck, XCircle, ChevronLeft, ChevronRight, Wallet } from 'lucide-react';
import { paymentService } from '../services/paymentService';
import { Withdrawal, PaginatedWithdrawals } from '../types';
import { WithdrawalApprovalModal } from '../components/WithdrawalApprovalModal';
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
  const limit = 20;

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

  // Calculate quick stats
  const pendingCount = (data?.data || []).filter(i => i.estado === 'pendiente').length;
  const approvedCount = (data?.data || []).filter(i => i.estado === 'aprobado' || i.estado === 'procesado').length;
  const totalAmountPaid = (data?.data || [])
    .filter(i => i.estado === 'aprobado' || i.estado === 'procesado')
    .reduce((sum, i) => sum + parseFloat(i.monto_neto as any || 0), 0);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border ${
          toast.type === 'success' ? 'bg-emerald-900 text-emerald-100 border-emerald-700' : 'bg-rose-900 text-rose-100 border-rose-700'
        } animate-in slide-in-from-bottom-3 backdrop-blur-md`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-rose-400" />}
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Header Ejecutivo */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border border-slate-800">
        <div className="absolute right-0 top-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-bold text-brand-300 backdrop-blur-sm">
            <DollarSign className="w-4 h-4 text-emerald-400" /> Tesorería & Pagos
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight font-montserrat">
            Gestión de Retiros
          </h1>
          <p className="text-slate-300 text-sm max-w-xl">
            Administra las solicitudes de retiro de billetera y capital, verifica cuentas bancarias y descarga recibos de transferencia.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3 shrink-0">
          <Can permission="admin.withdrawals.manage">
            <button 
              onClick={handleSyncWalletDebits}
              disabled={isSyncing}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-5 py-3 rounded-2xl transition-all text-sm font-bold backdrop-blur-sm shadow-md cursor-pointer disabled:opacity-50"
              title="Sincronizar débitos pasados de billetera"
            >
              {isSyncing ? <Loader2 className="w-4 h-4 animate-spin text-brand-400" /> : <RefreshCw className="w-4 h-4 text-brand-400" />}
              <span>Sincronizar Billeteras</span>
            </button>
          </Can>
          <button 
            onClick={fetchWithdrawals}
            className="flex items-center gap-2 bg-brand-500 text-white px-5 py-3 rounded-2xl hover:bg-brand-600 transition-all shadow-lg shadow-brand-500/30 text-sm font-bold cursor-pointer"
            title="Refrescar Lista"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-brand-50 text-brand-600 rounded-xl">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Solicitudes</p>
            <p className="text-2xl font-black text-slate-900">{data?.total || 0}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Pendientes por Revisar</p>
            <p className="text-2xl font-black text-amber-600">{pendingCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Aprobados / Procesados</p>
            <p className="text-2xl font-black text-emerald-600">{approvedCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Desembolsado en Página</p>
            <p className="text-xl font-extrabold text-slate-900">{formatCurrency(totalAmountPaid)}</p>
          </div>
        </div>
      </div>

      {/* Control Bar: Filters & Search */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col xl:flex-row gap-4 items-center justify-between">
        <form onSubmit={handleSearch} className="w-full xl:w-80 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar por usuario, cédula o correo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none text-sm font-medium transition-all"
          />
        </form>

        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          {/* Rangos de Fecha */}
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200 text-xs font-semibold">
            <span className="text-slate-500 font-bold px-1.5 uppercase tracking-wider text-[10px]">Desde:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs cursor-pointer"
            />
            <span className="text-slate-500 font-bold px-1.5 uppercase tracking-wider text-[10px]">Hasta:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs cursor-pointer"
            />
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="text-xs font-bold text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                title="Limpiar rango de fechas"
              >
                Limpiar Fechas
              </button>
            )}
          </div>

          {/* Filtro por Estado */}
          <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-2xl border border-slate-200 text-xs font-bold overflow-x-auto">
            <span className="text-slate-400 px-2 flex items-center gap-1"><Filter className="w-3.5 h-3.5" /> Estado:</span>
            {['todos', 'pendiente', 'aprobado', 'procesado', 'rechazado'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`py-1.5 px-3 rounded-xl transition-all capitalize shrink-0 cursor-pointer ${
                  statusFilter === st 
                    ? 'bg-slate-900 text-white shadow-xs' 
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px] tracking-wider">
              <tr>
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
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-600 mx-auto" />
                    <p className="mt-2 text-slate-500 font-medium text-sm">Cargando solicitudes de retiro...</p>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <FileText className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-slate-900 font-bold text-base">No se encontraron solicitudes de retiro</p>
                    <p className="text-slate-500 text-sm mt-1">Ajusta los filtros de búsqueda o el estado seleccionado.</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((withdrawal) => (
                  <tr 
                    key={withdrawal.id} 
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    onClick={() => withdrawal.estado === 'pendiente' && setSelectedWithdrawal(withdrawal)}
                  >
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
                ))
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
                className="px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-2xs flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" /> Anterior
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * limit >= data.total}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-2xs flex items-center gap-1"
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
    </div>
  );
};

