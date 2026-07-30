import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Calculator, Send, Loader2, CheckCircle2, AlertTriangle, Users, DollarSign, Search, Gift, TrendingUp } from 'lucide-react';
import { auditService, BulkYieldCalculationResult, BulkPayYieldResult } from '../../../../services/audit';

interface BulkTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultStartDate?: string;
  defaultEndDate?: string;
  onSuccess?: () => void;
}

export const BulkTransferModal: React.FC<BulkTransferModalProps> = ({
  isOpen,
  onClose,
  defaultStartDate = '',
  defaultEndDate = '',
  onSuccess
}) => {
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [result, setResult] = useState<BulkYieldCalculationResult | null>(null);
  const [payResult, setPayResult] = useState<BulkPayYieldResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCalculate = async () => {
    if (!startDate || !endDate) {
      alert('Por favor selecciona las fechas de inicio y fin del ciclo.');
      return;
    }

    setIsCalculating(true);
    setError(null);
    setPayResult(null);

    try {
      const data = await (auditService as any).bulkCalculateYields({
        start_date: startDate,
        end_date: endDate
      });
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Error al calcular el resumen masivo.');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleExecutePay = async () => {
    if (!result || result.global_grand_total <= 0) {
      alert('No hay saldos pendientes para transferir en este ciclo.');
      return;
    }

    const confirmMsg = `¿Confirmas la transferencia MASIVA por un total de ${Number(result.global_grand_total).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })} a ${result.total_payable_users} usuarios? Esta acción acreditará de inmediato las billeteras.`;
    if (!window.confirm(confirmMsg)) return;

    setIsPaying(true);
    setError(null);

    try {
      const res = await (auditService as any).bulkPayYields({
        start_date: startDate,
        end_date: endDate
      });
      setPayResult(res);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Error al ejecutar la transferencia masiva.');
    } finally {
      setIsPaying(false);
    }
  };

  const formatCOP = (val: number) => {
    return Number(val || 0).toLocaleString('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  const filteredSummaries = (result?.users_summaries || []).filter(u => 
    u.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.document_id || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-100">
        
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-brand-500/20 text-brand-400 rounded-2xl border border-brand-500/30">
              <Send className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-montserrat">Transferencia Masiva General de Rendimientos & Bonos</h2>
              <p className="text-slate-400 text-xs mt-0.5">Pre-simula y acredita en 1-clic las utilidades a todas las Wallets activas</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">

          {/* Reporte de Éxito Post-Pago */}
          {payResult ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-8 text-center space-y-6 animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-emerald-900 font-montserrat">¡Transferencia Masiva Ejecutada Con Éxito!</h3>
                <p className="text-emerald-700 text-sm mt-1">{payResult.message}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto pt-2">
                <div className="bg-white p-4 rounded-2xl border border-emerald-200 text-center">
                  <p className="text-xs text-slate-500 font-bold uppercase">Usuarios Beneficiados</p>
                  <p className="text-2xl font-bold text-slate-800">{payResult.total_users_paid}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-emerald-200 text-center">
                  <p className="text-xs text-slate-500 font-bold uppercase">Total Rendimientos</p>
                  <p className="text-lg font-bold text-slate-800">{formatCOP(payResult.global_yield_total)}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-emerald-200 text-center">
                  <p className="text-xs text-slate-500 font-bold uppercase">Total Bonos Aceleración</p>
                  <p className="text-lg font-bold text-emerald-600">{formatCOP(payResult.global_acceleration_bonus_total)}</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-emerald-300 max-w-lg mx-auto">
                <p className="text-xs text-slate-500 font-bold uppercase">Gran Total Desembolsado a Wallets</p>
                <p className="text-3xl font-bold text-emerald-600 font-montserrat mt-1">{formatCOP(payResult.global_grand_total)}</p>
              </div>

              <button
                onClick={() => {
                  setPayResult(null);
                  setResult(null);
                  onClose();
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-3 rounded-xl transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                Cerrar y Volver a la Lista
              </button>
            </div>
          ) : (
            <>
              {/* Barra de Fechas y Botón 1: Calcular */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-end justify-between gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full md:w-auto flex-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Fecha Inicio del Ciclo</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Fecha Fin del Ciclo</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>

                <button
                  onClick={handleCalculate}
                  disabled={isCalculating}
                  className="w-full md:w-auto bg-brand-600 hover:bg-brand-700 text-white font-bold px-6 py-2.5 rounded-xl transition-all shadow-md shadow-brand-500/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer h-[42px]"
                >
                  {isCalculating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Calculator className="w-5 h-5" />}
                  1. Calcular Resumen Masivo
                </button>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Vista Previa de Resumen Masivo */}
              {result && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                  
                  {/* Tarjetas KPI Globales */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center gap-4">
                      <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                        <Users className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-bold uppercase">Beneficiarios</p>
                        <p className="text-xl font-bold text-slate-800">{result.total_payable_users} <span className="text-xs font-normal text-slate-400">de {result.total_users_evaluated}</span></p>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center gap-4">
                      <div className="p-3 bg-brand-100 text-brand-600 rounded-xl">
                        <TrendingUp className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-bold uppercase">Rendimientos</p>
                        <p className="text-lg font-bold text-slate-900">{formatCOP(result.global_yield_total)}</p>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center gap-4">
                      <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                        <Gift className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-bold uppercase">Bonos Aceleración</p>
                        <p className="text-lg font-bold text-emerald-700">{formatCOP(result.global_acceleration_bonus_total)}</p>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl p-4 shadow-md flex items-center gap-4">
                      <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                        <DollarSign className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-emerald-100 font-bold uppercase">GRAN TOTAL MASIVO</p>
                        <p className="text-xl font-bold text-white font-montserrat">{formatCOP(result.global_grand_total)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Tabla de Usuarios Beneficiarios */}
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/50">
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm">Desglose de Transferencias por Usuario</h3>
                        <p className="text-xs text-slate-500">Revisa los montos calculados antes de confirmar el desembolso a las billeteras</p>
                      </div>

                      <div className="relative w-full sm:w-64">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Buscar en el resumen..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                      </div>
                    </div>

                    <div className="max-h-72 overflow-y-auto">
                      <table className="w-full text-left text-xs text-slate-600">
                        <thead className="bg-slate-100 text-slate-500 font-semibold sticky top-0 uppercase tracking-wider">
                          <tr>
                            <th className="p-3">Usuario / Inversionista</th>
                            <th className="p-3">Documento</th>
                            <th className="p-3 text-center">Contratos</th>
                            <th className="p-3 text-right">Rendimiento ($)</th>
                            <th className="p-3 text-right">Bono Acel. ($)</th>
                            <th className="p-3 text-right">Total a Wallet</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredSummaries.map((u) => (
                            <tr key={u.user_id} className={`hover:bg-slate-50/70 transition-colors ${u.grand_total > 0 ? 'bg-white' : 'opacity-50'}`}>
                              <td className="p-3 font-medium text-slate-900">
                                <div>{u.user_name}</div>
                                <div className="text-[10px] text-slate-400 font-normal">{u.email}</div>
                              </td>
                              <td className="p-3 text-slate-500">{u.document_id || 'N/A'}</td>
                              <td className="p-3 text-center font-bold text-slate-700">{u.investments_count}</td>
                              <td className="p-3 text-right font-mono font-medium text-slate-800">{formatCOP(u.total_yield)}</td>
                              <td className="p-3 text-right font-mono font-semibold text-emerald-600">{formatCOP(u.total_acceleration_bonus)}</td>
                              <td className="p-3 text-right font-mono font-bold text-emerald-700">{formatCOP(u.grand_total)}</td>
                            </tr>
                          ))}

                          {filteredSummaries.length === 0 && (
                            <tr>
                              <td colSpan={6} className="text-center p-8 text-slate-400">
                                No se encontraron usuarios en la lista de pre-simulación.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Footer de Confirmación */}
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
                      <div className="text-xs text-amber-900">
                        <p className="font-bold">Atención: Acción de Desembolso Masivo</p>
                        <p>Al hacer clic en el botón, el sistema acreditará automáticamente el saldo en las billeteras de los <b>{result.total_payable_users} usuarios beneficiarios</b>.</p>
                      </div>
                    </div>

                    <button
                      onClick={handleExecutePay}
                      disabled={isPaying || result.global_grand_total <= 0}
                      className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-3 rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shrink-0"
                    >
                      {isPaying ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                      2. Confirmar y Transferir a Todas las Wallets
                    </button>
                  </div>

                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>,
    document.body
  );
};
