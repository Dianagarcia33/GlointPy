import React, { useState } from 'react';
import { Calculator, Loader2, CheckCircle2, AlertCircle, ArrowRight, Calendar, Edit3, X } from 'lucide-react';
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
  const [payMode, setPayMode] = useState<'all' | 'yields_only' | 'bonuses_only'>('all');

  // Acceleration Date Edit Modal state
  const [editingAccId, setEditingAccId] = useState<number | null>(null);
  const [newAccDate, setNewAccDate] = useState<string>('');
  const [isUpdatingDate, setIsUpdatingDate] = useState(false);

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
    if (!result) return;
    
    setIsPaying(true);
    setError(null);
    
    try {
      await (auditService as any).payUserYields(userId, {
        start_date: startDate,
        end_date: endDate,
        pay_mode: payMode
      });
      onSuccess();
      setResult(null); // Clear after success
    } catch (err: any) {
      setError(err.message || 'Error al procesar el pago consolidado');
      setIsPaying(false);
    }
  };

  const handleUpdateAccDate = async () => {
    if (!editingAccId || !newAccDate) return;
    setIsUpdatingDate(true);
    try {
      await auditService.updateAccelerationDate(editingAccId, newAccDate);
      setEditingAccId(null);
      setNewAccDate('');
      // Recalculate yields automatically
      await handleCalculate();
    } catch (err: any) {
      alert(err.message || 'Error al actualizar la fecha del bono');
    } finally {
      setIsUpdatingDate(false);
    }
  };

  const calculatePayableTotal = () => {
    if (!result) return 0;
    if (payMode === 'yields_only') return Number(result.total_yield || 0);
    if (payMode === 'bonuses_only') return Number(result.total_acceleration_bonus || 0);
    return Number(result.grand_total ?? ((result.total_yield || 0) + (result.total_acceleration_bonus || 0)));
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
          className="bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 font-medium px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50 text-sm flex items-center gap-2 cursor-pointer"
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
            
            {/* Mode Selector */}
            <div className="bg-slate-100 p-1.5 rounded-xl flex items-center gap-1 text-xs font-semibold">
              <span className="text-slate-500 px-2">Modo de Transferencia:</span>
              <button
                type="button"
                onClick={() => setPayMode('all')}
                className={`flex-1 py-1.5 px-3 rounded-lg transition-all text-center cursor-pointer ${
                  payMode === 'all' 
                    ? 'bg-brand-600 text-white shadow-xs font-bold' 
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                🟢 Todo (Rendimientos + Bonos)
              </button>
              <button
                type="button"
                onClick={() => setPayMode('yields_only')}
                className={`flex-1 py-1.5 px-3 rounded-lg transition-all text-center cursor-pointer ${
                  payMode === 'yields_only' 
                    ? 'bg-blue-600 text-white shadow-xs font-bold' 
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                🔵 Solo Rendimientos
              </button>
              <button
                type="button"
                onClick={() => setPayMode('bonuses_only')}
                className={`flex-1 py-1.5 px-3 rounded-lg transition-all text-center cursor-pointer ${
                  payMode === 'bonuses_only' 
                    ? 'bg-amber-600 text-white shadow-xs font-bold' 
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                🟡 Solo Bonos de Aceleración
              </button>
            </div>

            <div className="grid gap-3">
              {result.investments_yields.map((invYield, idx) => (
                <div key={idx} className="bg-white border border-slate-200 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-100">
                    <div>
                      <div className="font-bold text-slate-900">
                        Contrato {invYield.assigned_code ? invYield.assigned_code : `#${invYield.investment_id}`}
                        {invYield.package_name && <span className="ml-2 font-normal text-xs text-brand-600 font-mono">({invYield.package_name})</span>}
                      </div>
                      <div className="text-xs text-slate-500 font-medium mt-0.5">
                        Valor Contrato: <span className="font-semibold text-slate-700">{Number(invYield.package_value || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}</span>
                      </div>
                    </div>
                    <div className="font-bold text-brand-700 text-right">
                      <div>Rendimiento: {Number(invYield.total_yield).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                      {Number(invYield.acceleration_bonus || 0) > 0 && (
                        <div className="text-emerald-600 text-xs font-semibold flex items-center justify-end gap-1.5 mt-0.5">
                          <span>+ Bono Aceleración: {Number(invYield.acceleration_bonus).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
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
                  <div className="text-xs text-brand-600 font-semibold uppercase tracking-wider">
                    Total a Transferir a Wallet ({payMode === 'all' ? 'Todo' : payMode === 'yields_only' ? 'Solo Rendimientos' : 'Solo Bonos'})
                  </div>
                  <div className="text-2xl font-bold text-brand-800">
                    {calculatePayableTotal().toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </div>
                  {Number(result.total_acceleration_bonus || 0) > 0 && (
                    <div className="text-xs font-semibold text-emerald-700">
                      (Rendimientos: ${Number(result.total_yield).toLocaleString('es-CO')} + Bonos Aceleración: ${Number(result.total_acceleration_bonus).toLocaleString('es-CO')})
                    </div>
                  )}
                </div>
                <button
                  onClick={handlePay}
                  disabled={isPaying || calculatePayableTotal() <= 0}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-6 py-2.5 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm shrink-0 cursor-pointer"
                >
                  {isPaying ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                  Transferir a Wallet
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Date Edit Modal */}
      {editingAccId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-brand-600" />
                Cambiar Fecha de Bono
              </h4>
              <button onClick={() => setEditingAccId(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-600">Nueva Fecha del Bono</label>
              <input
                type="date"
                value={newAccDate}
                onChange={(e) => setNewAccDate(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingAccId(null)}
                className="px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleUpdateAccDate}
                disabled={isUpdatingDate || !newAccDate}
                className="px-4 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-lg disabled:opacity-50 flex items-center gap-1.5"
              >
                {isUpdatingDate && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Guardar Fecha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
