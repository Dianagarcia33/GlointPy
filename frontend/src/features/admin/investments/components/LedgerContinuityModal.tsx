import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { auditService, LedgerContinuityReport } from '../../../../services/audit';
import { walletTxLabel } from '../../../../utils/walletTransactionLabels';

const money = (v: number) => v.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 2 });

// Reporte de continuidad del libro mayor de billeteras (H-169): movimientos cuyo saldo resultante no es
// el saldo anterior ± el monto (faltan asientos intermedios o se cambió el saldo sin asiento)
export const LedgerContinuityModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [report, setReport] = useState<LedgerContinuityReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    setError(null);
    auditService.getLedgerContinuity()
      .then(setReport)
      .catch((err: any) => setError(err.message || 'No se pudo verificar el libro mayor'))
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50" style={{ margin: 0 }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Continuidad del Libro Mayor</h3>
            <p className="text-xs text-slate-500">Cada movimiento debe cumplir: saldo anterior ± monto = saldo resultante.</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-slate-500 text-sm">
              <Loader2 className="w-5 h-5 animate-spin" /> Recorriendo el libro mayor...
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
          ) : report ? (
            <>
              <div className={`p-4 rounded-2xl border flex items-center gap-3 text-sm ${report.breaks.length === 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
                {report.breaks.length === 0 ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
                <span>
                  {report.transactions.toLocaleString('es-CO')} movimientos, {report.pairs_checked.toLocaleString('es-CO')} pares revisados:{' '}
                  <strong>{report.breaks.length === 0 ? 'sin discontinuidades' : `${report.breaks.length} discontinuidad${report.breaks.length === 1 ? '' : 'es'}`}</strong>.
                  {report.breaks.length > 0 && ' Revísalas con Contabilidad: suele faltar un asiento intermedio.'}
                </span>
              </div>
              {report.breaks.length > 0 && (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Movimiento</th>
                      <th className="px-3 py-2 font-semibold">Usuario</th>
                      <th className="px-3 py-2 font-semibold text-right">Saldo anterior</th>
                      <th className="px-3 py-2 font-semibold text-right">Monto</th>
                      <th className="px-3 py-2 font-semibold text-right">Esperado</th>
                      <th className="px-3 py-2 font-semibold text-right">Registrado</th>
                      <th className="px-3 py-2 font-semibold text-right">Diferencia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.breaks.map(b => (
                      <tr key={b.transaction_id}>
                        <td className="px-3 py-2">
                          <div className="font-bold text-slate-800">#{b.transaction_id} · {walletTxLabel(b.type)}</div>
                          <div className="text-slate-400">{b.created_at ? new Date(b.created_at).toLocaleString('es-CO') : 'N/A'}</div>
                        </td>
                        <td className="px-3 py-2 text-slate-700">{b.user_name} <span className="text-slate-400">(#{b.user_id})</span></td>
                        <td className="px-3 py-2 text-right font-mono">{money(b.previous_balance)}</td>
                        <td className="px-3 py-2 text-right font-mono">{money(b.amount)}</td>
                        <td className="px-3 py-2 text-right font-mono">{money(b.expected_balance)}</td>
                        <td className="px-3 py-2 text-right font-mono">{money(b.balance_after)}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-red-600">{money(b.difference)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
};
