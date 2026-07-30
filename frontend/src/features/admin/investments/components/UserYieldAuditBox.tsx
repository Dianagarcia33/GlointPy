import React, { useState } from 'react';
import { Calculator, Loader2, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { auditService, UserYieldCalculationResult } from '../../../../services/audit';

interface UserYieldAuditBoxProps {
  userId: number;
  userName: string;
  startDate: string;
  endDate: string;
  onSuccess: () => void;
}

export const UserYieldAuditBox: React.FC<UserYieldAuditBoxProps> = ({
  userId,
  userName,
  startDate,
  endDate,
  onSuccess
}) => {
  const [isCalculating, setIsCalculating] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [result, setResult] = useState<UserYieldCalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCalculate = async () => {
    if (!startDate || !endDate) {
      setError('Debes seleccionar las fechas globales del ciclo arriba en la página.');
      return;
    }
    
    setIsCalculating(true);
    setError(null);
    setResult(null);
    
    try {
      const calcResult = await (auditService as any).calculateUserYields(userId, {
        start_date: startDate,
        end_date: endDate
      });
      setResult(calcResult);
    } catch (err: any) {
      setError(err.message || 'Error al calcular rendimientos consolidados');
    } finally {
      setIsCalculating(false);
    }
  };

  const handlePay = async () => {
    if (!result || result.total_yield <= 0) return;
    
    setIsPaying(true);
    setError(null);
    
    try {
      await (auditService as any).payUserYields(userId, {
        start_date: startDate,
        end_date: endDate
      });
      onSuccess();
      setResult(null); // Clear after success
    } catch (err: any) {
      setError(err.message || 'Error al procesar el pago consolidado');
      setIsPaying(false);
    }
  };

  return (
    <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
      <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between">
        <h4 className="font-semibold text-slate-800 flex items-center gap-2">
          <Calculator className="w-5 h-5 text-brand-600" />
          Auditoría de Ciclo: <span className="text-brand-700">{startDate || '?'}</span> a <span className="text-brand-700">{endDate || '?'}</span>
        </h4>
        <button
          onClick={handleCalculate}
          disabled={isCalculating || !startDate || !endDate}
          className="bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 font-medium px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50 text-sm flex items-center gap-2"
        >
          {isCalculating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Calcular Total'}
        </button>
      </div>

      <div className="p-4">
        {error && (
          <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg flex gap-2 text-sm border border-red-100">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
            <div className="grid gap-3">
              {result.investments_yields.map((invYield, idx) => (
                <div key={idx} className="bg-white border border-slate-200 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-100">
                    <div className="font-medium text-slate-800">Contrato #{invYield.investment_id}</div>
                    <div className="font-bold text-brand-700 text-right">
                      <div>Rendimiento: {Number(invYield.total_yield).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                      {Number(invYield.acceleration_bonus || 0) > 0 && (
                        <div className="text-emerald-600 text-xs font-semibold">
                          + Bono Aceleración: {Number(invYield.acceleration_bonus).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    {invYield.segments.map((seg, sIdx) => (
                      <div key={sIdx} className="flex justify-between items-center text-xs text-slate-600 bg-slate-50 p-2 rounded">
                        <div className="flex items-center gap-2">
                          <span>{new Date(seg.start_date + 'T12:00:00').toLocaleDateString()} <ArrowRight className="inline w-3 h-3" /> {new Date(seg.end_date + 'T12:00:00').toLocaleDateString()}</span>
                          <span className="text-slate-400 italic">({seg.note})</span>
                        </div>
                        <div className="font-mono">
                          {seg.days}d × {Number(seg.daily_yield).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 })} = {Number(seg.segment_yield).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </div>
                      </div>
                    ))}
                    {invYield.segments.length === 0 && (
                      <div className="text-xs text-slate-500 italic p-2">Sin rendimiento generado en estas fechas.</div>
                    )}
                  </div>
                </div>
              ))}
              
              {result.investments_yields.length === 0 && (
                <div className="text-center py-6 text-slate-500 bg-white rounded-lg border border-slate-200">
                  Ningún contrato de este usuario generó rendimientos en el ciclo seleccionado.
                </div>
              )}
            </div>

            {result.investments_yields.length > 0 && (
              <div className="mt-4 flex flex-col sm:flex-row justify-between items-center bg-brand-50 border border-brand-200 p-4 rounded-xl gap-4">
                <div className="space-y-0.5">
                  <div className="text-xs text-brand-600 font-semibold uppercase tracking-wider">Gran Total a Transferir a Wallet</div>
                  <div className="text-2xl font-bold text-brand-800">
                    {Number(result.grand_total ?? result.total_yield).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </div>
                  {Number(result.total_acceleration_bonus || 0) > 0 && (
                    <div className="text-xs font-semibold text-emerald-700">
                      (Rendimientos: ${Number(result.total_yield).toLocaleString('es-CO')} + Bonos Aceleración: ${Number(result.total_acceleration_bonus).toLocaleString('es-CO')})
                    </div>
                  )}
                </div>
                <button
                  onClick={handlePay}
                  disabled={isPaying}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-6 py-2.5 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm shrink-0 cursor-pointer"
                >
                  {isPaying ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                  Transferir Total a Wallet
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
