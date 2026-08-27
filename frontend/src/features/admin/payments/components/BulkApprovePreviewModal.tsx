import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle2, AlertCircle, Loader2, Building2, DollarSign, Info, ShieldCheck, User } from 'lucide-react';
import { Withdrawal } from '../types';
import { paymentService } from '../services/paymentService';

interface BulkApprovePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedWithdrawals: Withdrawal[];
}

export const BulkApprovePreviewModal: React.FC<BulkApprovePreviewModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  selectedWithdrawals
}) => {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalAmount = selectedWithdrawals.reduce(
    (sum, w) => sum + parseFloat(String(w.monto_neto || w.monto || 0)),
    0
  );

  const formatCurrency = (val: number | string) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(num || 0);
  };

  const handleApproveAll = async () => {
    try {
      setIsProcessing(true);
      setError(null);
      const ids = selectedWithdrawals.map(w => w.id);
      await paymentService.bulkApproveWithdrawals(ids);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error aprobando retiros en lote:', err);
      setError(err.message || 'Error al aprobar las solicitudes seleccionadas');
    } finally {
      setIsProcessing(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" style={{ margin: 0 }}>
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in duration-200">
        
        {/* Header Estandarizado */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-2xl">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  Previsualización de Aprobación de Pagos
                </h2>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase bg-blue-100 text-blue-800 border border-blue-200 font-mono">
                  {selectedWithdrawals.length} procesados
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Revisa los pagos procesados antes de confirmar el cambio de estado a APROBADO
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-50 text-rose-700 rounded-2xl text-xs font-bold border border-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Financial Summary Card */}
          <div className="bg-blue-50/60 rounded-2xl p-5 border border-blue-200/80 space-y-3">
            <div className="flex items-center gap-2 border-b border-blue-200/60 pb-2">
              <DollarSign className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-xs text-blue-900 uppercase tracking-wide">Resumen Financiero a Aprobar</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-500 font-medium block text-[11px]">Total Solicitudes:</span>
                <span className="font-bold text-slate-800">{selectedWithdrawals.length} pagos procesados</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium block text-[11px]">Estado Destino:</span>
                <span className="inline-flex items-center gap-1 font-bold text-emerald-700 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5" /> APROBADO
                </span>
              </div>
              <div className="col-span-2 sm:col-span-1 sm:text-right">
                <span className="text-slate-500 font-medium block text-[11px]">Monto Neto Total:</span>
                <span className="text-xl font-black text-blue-700 font-montserrat">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Records Table Card */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-600" />
                <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wide">Detalle de Solicitudes Seleccionadas</h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">Verificación de Cuentas y Destinos</span>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto max-h-64">
                <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[10px] tracking-wider sticky top-0 bg-slate-50 z-10">
                    <tr>
                      <th className="py-2.5 px-3 font-bold text-center">ID</th>
                      <th className="py-2.5 px-3 font-bold">Inversionista</th>
                      <th className="py-2.5 px-3 font-bold">Documento</th>
                      <th className="py-2.5 px-3 font-bold">Banco & Cuenta</th>
                      <th className="py-2.5 px-3 font-bold text-center">Tipo</th>
                      <th className="py-2.5 px-3 font-bold text-right">Monto Neto</th>
                      <th className="py-2.5 px-3 font-bold text-center">Estado Actual</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {selectedWithdrawals.map((w) => (
                      <tr key={w.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 text-center text-slate-900 font-mono font-extrabold text-[11px]">
                          #{w.id}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">
                          {w.user?.name || 'N/A'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">
                          {w.user?.document_id || 'N/A'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-slate-800 block text-[11px]">{w.banco || 'N/A'}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {w.tipo_cuenta || 'Ahorros'} - {w.numero_cuenta || 'N/A'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 font-bold rounded-md text-[10px] bg-brand-50 text-brand-700 border border-brand-200 capitalize">
                            {w.tipo}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-extrabold text-slate-900 text-right">
                          {formatCurrency(w.monto_neto)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 font-mono font-bold rounded-md text-[10px] bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                            {w.estado}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Info Banner */}
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Confirmación de Aprobación Definitiva:</span>
              <span className="text-emerald-800 text-[11px]">
                Al hacer clic en <strong>"Confirmar Aprobación"</strong>, estas solicitudes pasarán al estado <strong>APROBADO</strong>, se registrará la fecha y tu usuario administrativo, y se enviará la notificación push correspondiente a cada inversionista.
              </span>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-5 py-2.5 text-slate-700 bg-white border border-slate-200 font-bold text-xs hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cerrar
          </button>
          
          <button
            type="button"
            onClick={handleApproveAll}
            disabled={isProcessing || selectedWithdrawals.length === 0}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 shadow-md shadow-blue-600/20 cursor-pointer"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Confirmar Aprobación ({selectedWithdrawals.length})
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};
