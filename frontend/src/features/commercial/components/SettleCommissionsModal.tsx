import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, DollarSign, CheckCircle2, AlertTriangle, FileText, Loader2, CreditCard } from 'lucide-react';
import { commercialService, CommercialUserOption, CommercialSale } from '../../../services/commercial';

interface SettleCommissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  commercialUsers: CommercialUserOption[];
  sales: CommercialSale[];
}

export const SettleCommissionsModal: React.FC<SettleCommissionsModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  commercialUsers,
  sales
}) => {
  const [selectedCommercialId, setSelectedCommercialId] = useState<number | null>(null);
  const [referenceCode, setReferenceCode] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && commercialUsers.length > 0 && !selectedCommercialId) {
      setSelectedCommercialId(commercialUsers[0].id);
    }
  }, [isOpen, commercialUsers]);

  if (!isOpen) return null;

  // Filtrar ventas pendientes del comercial seleccionado
  const pendingSalesForSelected = sales.filter(
    (s) => s.commercial_id === selectedCommercialId && (s.status === 'pendiente' || !s.status)
  );

  const pendingAmount = pendingSalesForSelected.reduce(
    (acc, s) => acc + (s.commission_amount || 0),
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCommercialId) {
      setError('Por favor selecciona un asesor comercial');
      return;
    }
    if (pendingSalesForSelected.length === 0) {
      setError('El asesor seleccionado no tiene comisiones pendientes de liquidar');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await commercialService.settleCommissions({
        commercial_id: selectedCommercialId,
        reference_code: referenceCode.trim() || undefined,
        notes: notes.trim() || undefined
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al liquidar las comisiones');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pt-20 bg-slate-900/50 backdrop-blur-sm" style={{ margin: 0 }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 font-montserrat">Liquidar Comisiones Comerciales</h3>
              <p className="text-xs text-slate-500">Registro de comprobante bancario y cierre de período</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Seleccionar Asesor Beneficiario */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              👤 Asesor / Directivo a Liquidar *
            </label>
            <select
              value={selectedCommercialId || ''}
              onChange={(e) => setSelectedCommercialId(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              required
            >
              {commercialUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </div>

          {/* KPI Resumen Pendiente */}
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 space-y-1">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block font-montserrat">
              Comisiones Pendientes por Liquidar
            </span>
            <div className="flex justify-between items-baseline">
              <span className="text-2xl font-extrabold text-emerald-700 font-mono">
                ${pendingAmount.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
              </span>
              <span className="text-xs font-bold text-emerald-800 bg-white/80 px-2.5 py-1 rounded-full border border-emerald-200 font-mono">
                {pendingSalesForSelected.length} cierres
              </span>
            </div>
          </div>

          {/* Referencia Bancaria / Comprobante */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              💳 Número de Comprobante / Referencia Bancaria
            </label>
            <input
              type="text"
              value={referenceCode}
              onChange={(e) => setReferenceCode(e.target.value)}
              placeholder="Ej. TR-94827103 o Nro de Transferencia"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              📝 Observaciones de la Liquidación
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Notas opcionales sobre el pago, retenciones o banco de origen..."
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Acciones */}
          <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors text-xs font-bold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || pendingSalesForSelected.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all text-xs font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-600/20 font-montserrat"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Procesando Liquidación...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Confirmar Liquidación
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>,
    document.body
  );
};
