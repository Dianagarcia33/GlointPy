import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Receipt, 
  ShieldCheck, 
  DollarSign, 
  Calendar, 
  ArrowDownRight, 
  Building2, 
  User, 
  FileSpreadsheet, 
  AlertCircle, 
  Loader2, 
  RefreshCw, 
  Search,
  CheckCircle2,
  Lock
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { paymentService } from '../services/paymentService';
import { CompanyTaxLedgerSummary, CompanyTaxLedgerItem } from '../types';

interface CompanyTaxLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CompanyTaxLedgerModal: React.FC<CompanyTaxLedgerModalProps> = ({
  isOpen,
  onClose
}) => {
  const [data, setData] = useState<CompanyTaxLedgerSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  const fetchLedger = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await paymentService.getCompanyTaxLedger();
      setData(res);
    } catch (err: any) {
      console.error('Error fetching company tax ledger:', err);
      setError(err.message || 'Error al consultar el libro fiscal corporativo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLedger();
    }
  }, [isOpen]);

  const formatCurrency = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(num || 0);
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'N/A';
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat('es-CO', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(d);
    } catch {
      return isoString;
    }
  };

  const filteredEntries = useMemo(() => {
    if (!data?.latest_transactions) return [];
    return data.latest_transactions.filter((item: CompanyTaxLedgerItem) => {
      // Filtro de estado
      if (statusFilter !== 'todos') {
        if (item.status.toUpperCase() !== statusFilter.toUpperCase()) return false;
      }
      // Filtro de búsqueda
      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      const wId = String(item.withdrawal_id || '');
      const invName = (item.investor_name || '').toLowerCase();
      const invDoc = (item.investor_document || '').toLowerCase();
      const invEmail = (item.investor_email || '').toLowerCase();
      const desc = (item.description || '').toLowerCase();

      return wId.includes(q) || invName.includes(q) || invDoc.includes(q) || invEmail.includes(q) || desc.includes(q);
    });
  }, [data, search, statusFilter]);

  const handleExportExcel = () => {
    if (!data?.latest_transactions || data.latest_transactions.length === 0) return;

    const rows = data.latest_transactions.map((t) => ({
      'ID Registro': t.id,
      'ID Retiro': t.withdrawal_id,
      'Inversionista': t.investor_name || 'N/A',
      'Documento': t.investor_document || 'N/A',
      'Correo': t.investor_email || 'N/A',
      'Monto Bruto Retiro': t.gross_amount,
      'Retención 3.2% (Tax)': t.amount,
      'Monto Neto Dispersado': t.net_amount,
      'Estado': t.status,
      'Descripción': t.description || '',
      'Fecha Registro': t.created_at || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Libro_Fiscal_3.2%');
    XLSX.writeFile(workbook, `Gloint_Caja_Fiscal_3_2_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-6" style={{ margin: 0 }}>
      <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in duration-200">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-6 sm:p-7 relative overflow-hidden flex items-center justify-between border-b border-slate-800">
          <div className="absolute right-0 top-0 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
          
          <div className="relative z-10 flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-2xl border border-white/15 text-brand-300 backdrop-blur-sm">
              <Receipt className="w-6 h-6 text-brand-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black font-montserrat tracking-tight">
                  Reporte de Impuestos (3.2%)
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-brand-500/20 text-brand-300 border border-brand-400/30">
                  <Lock className="w-3 h-3" /> Aislado de Billeteras
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
                Control contable corporativo y auditoría de retenciones en origen aplicadas a los retiros de rendimientos.
              </p>
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-2">
            <button
              type="button"
              onClick={fetchLedger}
              disabled={loading}
              className="p-2.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer disabled:opacity-50"
              title="Actualizar datos"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-400' : ''}`} />
            </button>
            <button 
              type="button"
              onClick={onClose}
              className="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50/50">
          
          {/* Security & Ledger Notice Banner */}
          <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-4 flex items-start gap-3.5 text-xs text-emerald-950">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-emerald-900 text-sm">
                Fondos Corporativos Protegidos e Inmutables
              </p>
              <p className="text-emerald-800 leading-relaxed">
                Este recaudo del 3.2% se retiene de forma automática en cada retiro de rendimientos y se almacena en este ledger corporativo independiente. 
                <strong className="font-bold"> Ningún usuario ni administrador puede solicitar retiros sobre estos fondos</strong> desde el portal de billeteras personales, garantizando su custodia para la tesorería corporativa de Gloint y la DIAN.
              </p>
            </div>
          </div>

          {/* Metric Cards Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Saldo en Caja Fiscal</span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-black text-emerald-600 font-montserrat">
                  {formatCurrency(data?.current_balance || 0)}
                </p>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">Custodia contable neta</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-brand-600 uppercase tracking-wider">Total Recaudado</span>
                <div className="p-2 bg-brand-50 text-brand-600 rounded-xl border border-brand-100">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-black text-brand-700 font-montserrat">
                  {formatCurrency(data?.total_collected || 0)}
                </p>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">3.2% retenido en origen</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Total Revertido</span>
                <div className="p-2 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
                  <ArrowDownRight className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-black text-rose-600 font-montserrat">
                  {formatCurrency(data?.total_refunded || 0)}
                </p>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">Por retiros rechazados</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Operaciones</span>
                <div className="p-2 bg-slate-100 text-slate-600 rounded-xl border border-slate-200">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900 font-montserrat">
                  {data?.total_transactions || 0}
                </p>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">Recaudos auditados</p>
              </div>
            </div>

          </div>

          {/* Filters & Export Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por ID retiro, nombre, cédula o correo..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-xs font-medium outline-none transition-all"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200">
                <button
                  type="button"
                  onClick={() => setStatusFilter('todos')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    statusFilter === 'todos' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('COLLECTED')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    statusFilter === 'COLLECTED' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Recaudados
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('REFUNDED')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    statusFilter === 'REFUNDED' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Revertidos
                </button>
              </div>

              <button
                type="button"
                onClick={handleExportExcel}
                disabled={filteredEntries.length === 0}
                className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title="Descargar extracto en Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Exportar Excel</span>
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">ID / Retiro</th>
                    <th className="px-5 py-3.5">Inversionista</th>
                    <th className="px-5 py-3.5 text-right">Monto Bruto</th>
                    <th className="px-5 py-3.5 text-right font-black text-brand-700">Retención 3.2%</th>
                    <th className="px-5 py-3.5 text-right">Monto Neto Yoint</th>
                    <th className="px-5 py-3.5 text-center">Estado</th>
                    <th className="px-5 py-3.5">Fecha Recaudo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <Loader2 className="w-7 h-7 animate-spin text-brand-600 mx-auto" />
                        <p className="mt-2 text-slate-500 text-xs font-semibold">Cargando libro fiscal corporativo...</p>
                      </td>
                    </tr>
                  ) : filteredEntries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <p className="text-slate-800 font-bold text-sm">No se encontraron movimientos fiscales</p>
                        <p className="text-slate-400 text-xs mt-0.5">Los recaudos del 3.2% aparecerán automáticamente al solicitar retiros.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredEntries.map((item) => {
                      const isCollected = item.status === 'COLLECTED' || item.status === 'SETTLED';
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-5 py-3.5">
                            <span className="font-extrabold text-slate-900 font-mono text-xs">
                              #{item.id}
                            </span>
                            <span className="block text-[11px] text-brand-600 font-semibold mt-0.5">
                              Retiro #{item.withdrawal_id}
                            </span>
                          </td>

                          <td className="px-5 py-3.5">
                            <div className="font-bold text-slate-800">{item.investor_name || 'Inversionista'}</div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                              {item.investor_document && (
                                <span className="font-mono">Doc: {item.investor_document}</span>
                              )}
                              {item.investor_email && (
                                <span>{item.investor_email}</span>
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-3.5 text-right font-medium text-slate-700">
                            {formatCurrency(item.gross_amount)}
                          </td>

                          <td className="px-5 py-3.5 text-right">
                            <span className="inline-block px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-black text-xs border border-emerald-200/60 font-montserrat">
                              +{formatCurrency(item.amount)}
                            </span>
                          </td>

                          <td className="px-5 py-3.5 text-right font-bold text-slate-900 font-montserrat">
                            {formatCurrency(item.net_amount)}
                          </td>

                          <td className="px-5 py-3.5 text-center">
                            {isCollected ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" /> RECAUDADO
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <AlertCircle className="w-3 h-3" /> REVERTIDO
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-3.5 text-slate-500 text-[11px]">
                            {formatDate(item.created_at)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-white border-t border-slate-100 flex items-center justify-between">
          <p className="text-[11px] text-slate-400">
            Total mostrado: <strong className="font-bold text-slate-700">{filteredEntries.length}</strong> movimientos
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};
