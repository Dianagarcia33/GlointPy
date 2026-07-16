import React, { useState } from 'react';
import { X, Calculator, Loader2, CheckCircle2, AlertCircle, Calendar, ArrowRight } from 'lucide-react';
import { auditService, YieldCalculationResult } from '../../../../services/audit';

interface AuditInvestmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  investment: any;
  onSuccess: () => void;
}

export const AuditInvestmentModal: React.FC<AuditInvestmentModalProps> = ({
  isOpen,
  onClose,
  investment,
  onSuccess,
}) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [isCalculating, setIsCalculating] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [result, setResult] = useState<YieldCalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !investment) return null;

  const handleCalculate = async () => {
    if (!startDate || !endDate) {
      setError('Debes seleccionar ambas fechas');
      return;
    }
    
    setIsCalculating(true);
    setError(null);
    setResult(null);
    
    try {
      // Temporary cast as any since we hacked the types into Object.assign in auditService
      const calcResult = await (auditService as any).calculateYield(investment.id, {
        start_date: startDate,
        end_date: endDate
      });
      setResult(calcResult);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Error al calcular rendimientos');
    } finally {
      setIsCalculating(false);
    }
  };

  const handlePay = async () => {
    if (!result || result.total_yield <= 0) return;
    
    setIsPaying(true);
    setError(null);
    
    try {
      await (auditService as any).payYield(investment.id, {
        start_date: startDate,
        end_date: endDate
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Error al procesar el pago');
      setIsPaying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Calculator className="w-6 h-6 text-brand-600" />
              Auditar Rendimientos de Inversión
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Inversión: <span className="font-bold text-slate-700">{investment.assigned_code}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-xl flex gap-3 text-sm border border-red-100">
              <AlertCircle className="w-5 h-5 shrink-0" />
              {error}
            </div>
          )}

          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 mb-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-500" />
              Seleccionar Rango de Ciclo
            </h3>
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <label className="block text-xs font-medium text-slate-500 mb-1">Fecha Inicio</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
              <div className="flex-1 w-full">
                <label className="block text-xs font-medium text-slate-500 mb-1">Fecha Fin</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={handleCalculate}
                disabled={isCalculating || !startDate || !endDate}
                className="w-full sm:w-auto bg-brand-600 hover:bg-brand-700 text-white font-medium px-6 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center min-w-[120px]"
              >
                {isCalculating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Calcular'}
              </button>
            </div>
          </div>

          {result && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white border border-brand-200 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-brand-50 px-5 py-3 border-b border-brand-100 flex justify-between items-center">
                  <h3 className="font-semibold text-brand-800">Resultado del Cálculo</h3>
                  <div className="text-xs font-medium text-brand-600 bg-brand-100 px-2 py-1 rounded">
                    {result.total_days} días liquidados
                  </div>
                </div>
                
                <div className="p-0">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-5 py-3">Rango de Fechas</th>
                        <th className="px-5 py-3 text-right">Días</th>
                        <th className="px-5 py-3 text-right">Capital Activo</th>
                        <th className="px-5 py-3 text-right">Rend. Diario</th>
                        <th className="px-5 py-3 text-right font-bold text-slate-700">Total Segmento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {result.segments.map((seg, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-700">{new Date(seg.start_date).toLocaleDateString()}</span>
                              <ArrowRight className="w-3 h-3 text-slate-400" />
                              <span className="font-medium text-slate-700">{new Date(seg.end_date).toLocaleDateString()}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1">{seg.note}</div>
                          </td>
                          <td className="px-5 py-3 text-right text-slate-600">{seg.days}</td>
                          <td className="px-5 py-3 text-right font-mono text-slate-600">
                            {Number(seg.active_capital).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
                          </td>
                          <td className="px-5 py-3 text-right font-mono text-slate-600">
                            {Number(seg.daily_yield).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
                          </td>
                          <td className="px-5 py-3 text-right font-mono font-bold text-brand-600">
                            {Number(seg.segment_yield).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
                          </td>
                        </tr>
                      ))}
                      
                      {result.segments.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-5 py-8 text-center text-slate-500 italic">
                            No hay días válidos para liquidar en este rango. Revisa las fechas efectivas del contrato.
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {result.segments.length > 0 && (
                      <tfoot className="bg-slate-50 border-t border-slate-200">
                        <tr>
                          <td colSpan={3} className="px-5 py-4 text-right font-semibold text-slate-600">
                            Total a Transferir:
                          </td>
                          <td colSpan={2} className="px-5 py-4 text-right">
                            <span className="text-xl font-bold text-emerald-600">
                              {Number(result.total_yield).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
                            </span>
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handlePay}
            disabled={!result || result.total_yield <= 0 || isPaying}
            className="px-5 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
          >
            {isPaying ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            Aprobar y Transferir a Wallet
          </button>
        </div>
      </div>
    </div>
  );
};
