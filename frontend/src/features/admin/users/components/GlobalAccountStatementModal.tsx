import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Download, 
  Printer, 
  Calendar, 
  Filter, 
  Loader2, 
  Wallet, 
  Building2, 
  ArrowDownToLine, 
  TrendingUp, 
  FileSpreadsheet, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Receipt,
  User as UserIcon,
  ShieldCheck,
  CreditCard,
  Briefcase,
  Search,
  RefreshCw,
  Landmark,
  Percent
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { usersService, GlobalAccountStatement } from '../../../../services/users';
import { formatTransactionType } from '../../../../utils/format';

interface GlobalAccountStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalAccountStatementModal: React.FC<GlobalAccountStatementModalProps> = ({
  isOpen,
  onClose
}) => {
  const [statement, setStatement] = useState<GlobalAccountStatement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'movements' | 'withdrawals' | 'investments'>('movements');

  // Set default to current month
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const today = now.toISOString().split('T')[0];
      setStartDate(firstDay);
      setEndDate(today);
      setSearchFilter('');
      setTypeFilter('');
      fetchStatement(firstDay, today);
    }
  }, [isOpen]);

  const fetchStatement = async (start?: string, end?: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await usersService.getGlobalStatement({
        startDate: start ?? startDate,
        endDate: end ?? endDate
      });
      setStatement(data);
    } catch (err: any) {
      console.error('Error fetching global statement:', err);
      setError(err.message || 'Error al obtener el estado de cuenta global.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStatement(startDate, endDate);
  };

  const handleQuickDatePreset = (preset: 'this_month' | 'last_month' | 'this_year' | 'all') => {
    const now = new Date();
    let start = '';
    let end = now.toISOString().split('T')[0];

    if (preset === 'this_month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    } else if (preset === 'last_month') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
    } else if (preset === 'this_year') {
      start = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
    } else if (preset === 'all') {
      start = '';
      end = '';
    }

    setStartDate(start);
    setEndDate(end);
    fetchStatement(start, end);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDateTime = (isoString?: string | null) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    });
  };

  // Export to Excel Multi-Sheet
  const handleExportExcel = () => {
    if (!statement) return;

    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Resumen General
      const summaryData = [
        ['GLOINT - ESTADO DE CUENTA FINANCIERO GLOBAL DE PLATAFORMA'],
        ['Fecha de Generación', formatDateTime(statement.statement_date)],
        ['Periodo Contable', `${statement.period.start_date} al ${statement.period.end_date}`],
        [],
        ['CONCEPTO', 'VALOR (COP)'],
        ['Saldo Total Disponible en Billeteras', statement.summary.total_wallets_balance],
        ['Total Abonos / Ingresos (+)', statement.summary.total_credits],
        ['Total Débitos / Salidas (-)', statement.summary.total_debits],
        ['Total Retiros Desembolsados a Bancos', statement.summary.total_withdrawn_paid],
        ['Total Retiros Pendientes por Desembolso', statement.summary.total_withdrawn_pending],
        ['Total Retención Impuesto GMF (4x1000)', statement.summary.total_gmf_tax],
        ['Total Capital Invertido Activo', statement.summary.total_capital_active],
        ['Total Capital Invertido Finalizado', statement.summary.total_capital_finished],
        ['Total Inversionistas con Capital Activo', statement.summary.active_investors_count]
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen Financiero');

      // Sheet 2: Libro Mayor de Movimientos
      const txRows = statement.transactions.map((t, idx) => ({
        '#': idx + 1,
        'FECHA Y HORA': formatDateTime(t.created_at),
        'USUARIO': t.user_name,
        'DOCUMENTO / CÉDULA': t.user_document,
        'TIPO DE MOVIMIENTO': formatTransactionType(t.type),
        'CONCEPTO / DESCRIPCIÓN': t.description,
        'MONTO': t.amount,
        'TIPO': t.is_credit ? 'CRÉDITO (+)' : 'DÉBITO (-)',
        'SALDO RESULTANTE': t.balance_after
      }));
      const wsTx = XLSX.utils.json_to_sheet(txRows);
      XLSX.utils.book_append_sheet(wb, wsTx, 'Libro Mayor');

      // Sheet 3: Detalle de Retiros
      const wRows = statement.withdrawals.map((w, idx) => ({
        '#': idx + 1,
        'FECHA SOLICITUD': formatDateTime(w.created_at),
        'USUARIO': w.user_name,
        'DOCUMENTO': w.user_document,
        'BANCO': w.bank_name,
        'TIPO DE CUENTA': w.account_type,
        'NÚMERO DE CUENTA': w.account_number,
        'MONTO SOLICITADO': w.amount,
        'RETENCIÓN GMF (4x1000)': w.gmf_tax,
        'MONTO NETO A TRANSFERIR': w.net_amount,
        'ESTADO': w.status.toUpperCase()
      }));
      const wsW = XLSX.utils.json_to_sheet(wRows);
      XLSX.utils.book_append_sheet(wb, wsW, 'Extracto Retiros');

      // Sheet 4: Portafolio de Inversiones
      const invRows = statement.investments.map((inv, idx) => ({
        '#': idx + 1,
        'CÓDIGO CONTRATO': inv.assigned_code,
        'INVERSIONISTA': inv.user_name,
        'DOCUMENTO': inv.user_document,
        'CAPITAL': inv.capital,
        '% MENSUAL': `${inv.porcentaje_mensual}%`,
        'PLAZO (MESES)': inv.meses,
        'FECHA INICIO': formatDate(inv.fecha_inicio),
        'ESTADO': inv.estado
      }));
      const wsInv = XLSX.utils.json_to_sheet(invRows);
      XLSX.utils.book_append_sheet(wb, wsInv, 'Portafolio Inversiones');

      XLSX.writeFile(wb, `Gloint_Estado_Cuenta_Global_${statement.period.start_date}_a_${statement.period.end_date}.xlsx`);
    } catch (e) {
      console.error('Error exporting global statement to Excel:', e);
      alert('Hubo un error al generar el archivo Excel.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  // Filtered transactions for view
  const filteredTransactions = (statement?.transactions || []).filter(t => {
    const matchesSearch = !searchFilter.trim() || 
      t.user_name.toLowerCase().includes(searchFilter.toLowerCase()) || 
      t.user_document.toLowerCase().includes(searchFilter.toLowerCase()) ||
      t.description.toLowerCase().includes(searchFilter.toLowerCase());
    
    const matchesType = !typeFilter || t.type === typeFilter || t.raw_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const filteredWithdrawals = (statement?.withdrawals || []).filter(w => {
    return !searchFilter.trim() ||
      w.user_name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      w.user_document.toLowerCase().includes(searchFilter.toLowerCase()) ||
      w.bank_name.toLowerCase().includes(searchFilter.toLowerCase());
  });

  const filteredInvestments = (statement?.investments || []).filter(inv => {
    return !searchFilter.trim() ||
      inv.user_name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      inv.user_document.toLowerCase().includes(searchFilter.toLowerCase()) ||
      inv.assigned_code.toLowerCase().includes(searchFilter.toLowerCase());
  });

  // Unique transaction types for filter
  const uniqueTypes = Array.from(new Set((statement?.transactions || []).map(t => t.type)));

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-3 sm:p-4" style={{ margin: 0 }}>
      <div className="bg-white rounded-3xl w-full max-w-6xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col border border-slate-200 animate-in fade-in duration-200">
        
        {/* Header Modal */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-brand-50 border border-brand-100 rounded-2xl text-brand-600 flex items-center justify-center shadow-xs">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold font-montserrat text-slate-900 tracking-tight">
                  Estado de Cuenta General de Plataforma
                </h2>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Consolidado Admin
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Auditoría financiera, libro mayor y extracto consolidado de retiros e inversiones
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              disabled={!statement || loading}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all cursor-pointer disabled:opacity-50"
              title="Descargar Excel Multi-Hoja"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline">Exportar Excel</span>
            </button>

            <button
              onClick={handlePrint}
              disabled={!statement || loading}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-all cursor-pointer disabled:opacity-50"
              title="Imprimir Extracto"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters & Presets Bar */}
        <div className="p-4 sm:p-5 bg-slate-50/80 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
          {/* Quick Date Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Periodo:
            </span>
            <button
              type="button"
              onClick={() => handleQuickDatePreset('this_month')}
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 transition-all cursor-pointer shadow-2xs"
            >
              Este Mes
            </button>
            <button
              type="button"
              onClick={() => handleQuickDatePreset('last_month')}
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 transition-all cursor-pointer shadow-2xs"
            >
              Mes Anterior
            </button>
            <button
              type="button"
              onClick={() => handleQuickDatePreset('this_year')}
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 transition-all cursor-pointer shadow-2xs"
            >
              Año Actual
            </button>
            <button
              type="button"
              onClick={() => handleQuickDatePreset('all')}
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 transition-all cursor-pointer shadow-2xs"
            >
              Histórico Completo
            </button>
          </div>

          {/* Date Picker Range Form */}
          <form onSubmit={handleApplyFilter} className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="focus:outline-none text-slate-800 font-medium"
                title="Fecha Inicial"
              />
              <span className="text-slate-400 font-bold">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="focus:outline-none text-slate-800 font-medium"
                title="Fecha Final"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Filter className="w-3.5 h-3.5" />}
              <span>Filtrar</span>
            </button>
          </form>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading && !statement ? (
            <div className="py-20 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-brand-600 mx-auto" />
              <p className="mt-3 text-slate-600 font-bold text-sm">Generando extracto financiero global...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-700 text-xs font-bold">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : statement ? (
            <div className="space-y-6">

              {/* Master Financial Metric Cards (5 Cards) */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
                <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Saldo en Billeteras</span>
                    <Wallet className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-lg sm:text-xl font-black font-montserrat tracking-tight text-white">
                    {formatCurrency(statement.summary.total_wallets_balance)}
                  </p>
                  <span className="text-[10px] text-slate-400 font-medium block">Total fondos en custodia</span>
                </div>

                <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200/80 space-y-1">
                  <div className="flex items-center justify-between text-emerald-800 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Abonos / Ingresos</span>
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-lg sm:text-xl font-black font-montserrat tracking-tight text-emerald-700">
                    +{formatCurrency(statement.summary.total_credits)}
                  </p>
                  <span className="text-[10px] text-slate-500 font-medium block">Rendimientos y recargas</span>
                </div>

                <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-200/80 space-y-1">
                  <div className="flex items-center justify-between text-blue-800 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Retiros Pagados</span>
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-lg sm:text-xl font-black font-montserrat tracking-tight text-blue-700">
                    {formatCurrency(statement.summary.total_withdrawn_paid)}
                  </p>
                  <span className="text-[10px] text-slate-500 font-medium block">Desembolsado a bancos</span>
                </div>

                <div className="bg-purple-50/60 p-4 rounded-2xl border border-purple-200/80 space-y-1">
                  <div className="flex items-center justify-between text-purple-800 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Retención GMF (4x1000)</span>
                    <Percent className="w-4 h-4 text-purple-600" />
                  </div>
                  <p className="text-lg sm:text-xl font-black font-montserrat tracking-tight text-purple-700">
                    {formatCurrency(statement.summary.total_gmf_tax)}
                  </p>
                  <span className="text-[10px] text-slate-500 font-medium block">Impuesto liquidado</span>
                </div>

                <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/80 space-y-1">
                  <div className="flex items-center justify-between text-amber-800 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Capital Activo</span>
                    <Briefcase className="w-4 h-4 text-amber-600" />
                  </div>
                  <p className="text-lg sm:text-xl font-black font-montserrat tracking-tight text-amber-800">
                    {formatCurrency(statement.summary.total_capital_active)}
                  </p>
                  <span className="text-[10px] text-slate-500 font-medium block">{statement.summary.active_investors_count} inversionistas</span>
                </div>
              </div>

              {/* Search & Sub-filters */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                {/* Search */}
                <div className="relative w-full sm:w-80">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Buscar por usuario o cédula..."
                    className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>

                {/* Tab Switcher */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 w-full sm:w-auto">
                  <button
                    onClick={() => setActiveTab('movements')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'movements' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Libro Mayor ({statement.transactions.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('withdrawals')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'withdrawals' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Extracto Retiros ({statement.withdrawals.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('investments')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'investments' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Portafolio ({statement.investments.length})
                  </button>
                </div>
              </div>

              {/* Tab 1: Libro Mayor de Movimientos */}
              {activeTab === 'movements' && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto max-h-[420px]">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[10px] tracking-wider sticky top-0 z-10">
                        <tr>
                          <th className="py-3 px-4">Fecha y Hora</th>
                          <th className="py-3 px-4">Inversionista / Cédula</th>
                          <th className="py-3 px-4">Tipo de Movimiento</th>
                          <th className="py-3 px-4">Concepto / Motivo</th>
                          <th className="py-3 px-4 text-right">Monto</th>
                          <th className="py-3 px-4 text-right">Saldo Resultante</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {filteredTransactions.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-10 text-center text-slate-400">
                              No se encontraron movimientos con los filtros seleccionados.
                            </td>
                          </tr>
                        ) : (
                          filteredTransactions.map((t) => (
                            <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                                {formatDateTime(t.created_at)}
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-bold text-slate-900">{t.user_name}</div>
                                <div className="text-[10px] text-slate-400 font-mono">CC: {t.user_document}</div>
                              </td>
                              <td className="py-3 px-4">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                                  t.is_credit 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}>
                                  {formatTransactionType(t.type)}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-slate-800 max-w-xs truncate" title={t.description}>
                                {t.description}
                              </td>
                              <td className={`py-3 px-4 text-right font-mono font-extrabold ${
                                t.is_credit ? 'text-emerald-600' : 'text-rose-600'
                              }`}>
                                {t.is_credit ? '+' : '-'}{formatCurrency(Math.abs(t.amount))}
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                                {formatCurrency(t.balance_after)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 2: Extracto Consolidado de Retiros */}
              {activeTab === 'withdrawals' && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto max-h-[420px]">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[10px] tracking-wider sticky top-0 z-10">
                        <tr>
                          <th className="py-3 px-4">Fecha Solicitud</th>
                          <th className="py-3 px-4">Inversionista</th>
                          <th className="py-3 px-4">Banco Destino</th>
                          <th className="py-3 px-4">Cuenta</th>
                          <th className="py-3 px-4 text-right">Monto Bruto</th>
                          <th className="py-3 px-4 text-right">4x1000 (GMF)</th>
                          <th className="py-3 px-4 text-right">Neto a Pagar</th>
                          <th className="py-3 px-4 text-center">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {filteredWithdrawals.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-10 text-center text-slate-400">
                              No se registraron solicitudes de retiro en el periodo.
                            </td>
                          </tr>
                        ) : (
                          filteredWithdrawals.map((w) => {
                            const isPaid = ['aprobado', 'approved', 'pagado', 'paid'].includes(w.status.toLowerCase());
                            return (
                              <tr key={w.id} className="hover:bg-slate-50/70 transition-colors">
                                <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                                  {formatDateTime(w.created_at)}
                                </td>
                                <td className="py-3 px-4">
                                  <div className="font-bold text-slate-900">{w.user_name}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">CC: {w.user_document}</div>
                                </td>
                                <td className="py-3 px-4 font-bold text-slate-800">
                                  {w.bank_name}
                                </td>
                                <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                                  {w.account_number} ({w.account_type})
                                </td>
                                <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                                  {formatCurrency(w.amount)}
                                </td>
                                <td className="py-3 px-4 text-right font-mono text-purple-700 font-bold">
                                  -{formatCurrency(w.gmf_tax)}
                                </td>
                                <td className="py-3 px-4 text-right font-mono font-extrabold text-blue-700">
                                  {formatCurrency(w.net_amount)}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                    isPaid 
                                      ? 'bg-emerald-100 text-emerald-800' 
                                      : w.status.toLowerCase().includes('rechaz') 
                                        ? 'bg-rose-100 text-rose-800'
                                        : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    {w.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 3: Portafolio de Inversiones */}
              {activeTab === 'investments' && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto max-h-[420px]">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[10px] tracking-wider sticky top-0 z-10">
                        <tr>
                          <th className="py-3 px-4">Código Contrato</th>
                          <th className="py-3 px-4">Inversionista</th>
                          <th className="py-3 px-4 text-right">Capital Invertido</th>
                          <th className="py-3 px-4 text-center">Rendimiento Mensual</th>
                          <th className="py-3 px-4 text-center">Plazo</th>
                          <th className="py-3 px-4">Fecha Inicio</th>
                          <th className="py-3 px-4 text-center">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {filteredInvestments.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-10 text-center text-slate-400">
                              No hay contratos de inversión registrados en el periodo.
                            </td>
                          </tr>
                        ) : (
                          filteredInvestments.map((inv) => (
                            <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-3 px-4 font-mono font-bold text-brand-600">
                                {inv.assigned_code}
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-bold text-slate-900">{inv.user_name}</div>
                                <div className="text-[10px] text-slate-400 font-mono">CC: {inv.user_document}</div>
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-extrabold text-slate-900">
                                {formatCurrency(inv.capital)}
                              </td>
                              <td className="py-3 px-4 text-center font-mono font-bold text-emerald-600">
                                {inv.porcentaje_mensual}%
                              </td>
                              <td className="py-3 px-4 text-center text-slate-700">
                                {inv.meses} meses
                              </td>
                              <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                                {formatDate(inv.fecha_inicio)}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  inv.estado === 'Activo' 
                                    ? 'bg-emerald-100 text-emerald-800' 
                                    : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {inv.estado}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">
            Corte financiero consolidado generado en tiempo real.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shadow-xs"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};
