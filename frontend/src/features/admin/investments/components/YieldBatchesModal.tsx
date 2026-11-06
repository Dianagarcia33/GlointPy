import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, History, RotateCcw, Zap, CheckCircle2, AlertTriangle, Loader2, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
import { auditService, YieldBatch } from '../../../../services/audit';
import { ConfirmationModal } from '../../../../components/common/ConfirmationModal';

interface YieldBatchesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBatchUpdated?: () => void;
}

export const YieldBatchesModal: React.FC<YieldBatchesModalProps> = ({
  isOpen,
  onClose,
  onBatchUpdated
}) => {
  const [batches, setBatches] = useState<YieldBatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isForcingRun, setIsForcingRun] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Rollback target
  const [batchToRollback, setBatchToRollback] = useState<YieldBatch | null>(null);
  const [rollbackReason, setRollbackReason] = useState('');

  const fetchBatches = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await auditService.getYieldBatches(30);
      setBatches(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar el historial de lotes.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBatches();
      setSuccess(null);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleForceAutomatic = async () => {
    setIsForcingRun(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await auditService.executeDailyAutomatic();
      setSuccess(res.message || 'Liquidación automática ejecutada exitosamente.');
      await fetchBatches();
      if (onBatchUpdated) onBatchUpdated();
      setTimeout(() => setSuccess(null), 6000);
    } catch (err: any) {
      setError(err.message || 'Error al ejecutar liquidación diaria.');
    } finally {
      setIsForcingRun(false);
    }
  };

  const handleConfirmRollback = async () => {
    if (!batchToRollback) return;
    setIsRollingBack(true);
    setError(null);
    try {
      const res = await auditService.rollbackYieldBatch(batchToRollback.batch_id, rollbackReason.trim() || undefined);
      setSuccess(`Lote ${batchToRollback.batch_id} reversado: Se debitaron $${res.total_reverted_amount.toLocaleString('es-CO')} COP en ${res.total_transfers_reverted} movimientos.`);
      setBatchToRollback(null);
      setRollbackReason('');
      await fetchBatches();
      if (onBatchUpdated) onBatchUpdated();
      setTimeout(() => setSuccess(null), 8000);
    } catch (err: any) {
      setError(err.message || 'Error al reversar el lote.');
    } finally {
      setIsRollingBack(false);
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

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-brand-100 flex items-center justify-center text-brand-700 shrink-0">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-montserrat">Historial de Lotes de Rendimientos</h2>
              <p className="text-[11px] sm:text-xs text-slate-500">Trazabilidad forense, liquidaciones automáticas (00:00 COT) y reversión de lotes</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleForceAutomatic}
              disabled={isForcingRun}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl border border-amber-200 transition-all cursor-pointer disabled:opacity-50"
              title="Disparar manualmente la liquidación del día anterior"
            >
              {isForcingRun ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              <span>Ejecutar Cierre Diario Ahora</span>
            </button>

            <button
              onClick={fetchBatches}
              disabled={isLoading}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              title="Refrescar lista"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-brand-600' : ''}`} />
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 text-emerald-800 text-sm rounded-xl border border-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Banner Informativo */}
          <div className="p-3.5 sm:p-4 bg-blue-50/70 border border-blue-100 rounded-2xl flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900 leading-relaxed">
              <strong className="font-bold">Proceso 100% Automático a Medianoche:</strong> El sistema dispersa diariamente a las <strong>00:00 COT (05:00 UTC)</strong> los rendimientos del día anterior con estricta idempotencia (nunca paga dos veces un mismo día por contrato). Cada movimiento queda registrado en auditoría y puede ser <strong>reversado</strong> si se requiere.
            </div>
          </div>

          {/* Tabla de Lotes */}
          {isLoading && batches.length === 0 ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
              <p className="text-sm font-medium">Consultando historial de auditoría...</p>
            </div>
          ) : batches.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <p className="text-sm font-medium">No se han registrado ejecuciones de dispersión aún.</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl overflow-x-auto shadow-sm">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200 text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Lote / Identificador</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Ciclo Evaluado</th>
                    <th className="px-4 py-3">Hora COT</th>
                    <th className="px-4 py-3 text-center">Usuarios</th>
                    <th className="px-4 py-3 text-right">Total Dispersado</th>
                    <th className="px-4 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {batches.map((b) => {
                    const isRollback = b.action === 'YIELD_BATCH_ROLLBACK';
                    return (
                      <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="font-mono text-slate-800 font-bold">{b.batch_id || `#${b.id}`}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-xs">{b.description}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          {isRollback ? (
                            <span className="inline-flex px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                              Reverso
                            </span>
                          ) : b.is_automatic ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                              <Zap className="w-2.5 h-2.5" /> Automático
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Manual
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {b.cycle_start_date && b.cycle_end_date ? (
                            <span className="font-mono text-slate-700">
                              {b.cycle_start_date} <ArrowRight className="inline w-3 h-3 text-slate-400" /> {b.cycle_end_date}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                          {b.executed_at_cot || b.created_at || '-'}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="inline-flex px-2 py-0.5 text-xs font-bold rounded-lg bg-slate-100 text-slate-700">
                            {b.total_users_paid} users ({b.total_transfers_count} mvts)
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-extrabold text-slate-900 font-mono">
                          {formatCOP(b.global_grand_total)}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {!isRollback && b.total_transfers_count > 0 && (
                            <button
                              onClick={() => {
                                setBatchToRollback(b);
                                setRollbackReason('');
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-all cursor-pointer"
                              title="Reversar este lote de dispersión"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Reversar</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end bg-slate-50/50">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 bg-slate-100 rounded-xl transition-all cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Confirmation Modal para Reversión */}
      <ConfirmationModal
        isOpen={batchToRollback !== null}
        onClose={() => setBatchToRollback(null)}
        onConfirm={handleConfirmRollback}
        title="¿Reversar Lote de Rendimientos?"
        variant="danger"
        confirmText="Confirmar y Reversar Saldo"
        cancelText="Cancelar"
        isLoading={isRollingBack}
        description={
          <div className="space-y-3 text-xs text-slate-600">
            <p>
              Estás a punto de reversar todas las transferencias realizadas en el lote:
            </p>
            <div className="p-3 bg-slate-100 rounded-xl font-mono text-slate-800 font-bold space-y-1">
              <div>Lote: {batchToRollback?.batch_id}</div>
              <div>Monto total a debitar: {formatCOP(batchToRollback?.global_grand_total || 0)}</div>
              <div>Movimientos afectados: {batchToRollback?.total_transfers_count}</div>
            </div>
            <p className="text-rose-600 font-semibold">
              ⚠️ Esta acción debitará automáticamente los saldos acreditados en las billeteras de los inversionistas y generará las contrapartidas contables correspondientes (EGRESO).
            </p>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Motivo de la reversión (opcional):</label>
              <input
                type="text"
                value={rollbackReason}
                onChange={(e) => setRollbackReason(e.target.value)}
                placeholder="ej: Ajuste por recalculo extraordinario de fechas..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>
          </div>
        }
      />
    </div>,
    document.body
  );
};
