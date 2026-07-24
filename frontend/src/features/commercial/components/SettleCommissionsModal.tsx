import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, DollarSign, CheckCircle2, AlertTriangle, Loader2, Award, Zap, ShieldCheck } from 'lucide-react';
import { commercialService, CommercialUserOption, CommercialSale, PendingSettlementBreakdown } from '../../../services/commercial';

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
  commercialUsers
}) => {
  const [selectedCommercialId, setSelectedCommercialId] = useState<number | null>(null);
  const [breakdown, setBreakdown] = useState<PendingSettlementBreakdown | null>(null);
  const [isLoadingBreakdown, setIsLoadingBreakdown] = useState(false);
  const [referenceCode, setReferenceCode] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && commercialUsers.length > 0 && !selectedCommercialId) {
      setSelectedCommercialId(commercialUsers[0].id);
    }
  }, [isOpen, commercialUsers]);

  useEffect(() => {
    if (isOpen && selectedCommercialId) {
      setIsLoadingBreakdown(true);
      commercialService.getPendingSettlementBreakdown(selectedCommercialId)
        .then((res) => setBreakdown(res))
        .catch(() => setBreakdown(null))
        .finally(() => setIsLoadingBreakdown(false));
    }
  }, [isOpen, selectedCommercialId]);

  if (!isOpen) return null;

  const totalAmount = breakdown?.total_amount || 0;
  const salesCommission = breakdown?.sales_commission_total || 0;
  const dailyBonuses = breakdown?.daily_bonuses_total || 0;
  const floorBonuses = breakdown?.floor_bonuses_total || 0;
  const welfareBonuses = breakdown?.welfare_bonuses_total || 0;
  const salesCount = breakdown?.sales_count || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCommercialId) {
      setError('Por favor selecciona un asesor comercial');
      return;
    }
    if (totalAmount <= 0) {
      setError('El asesor seleccionado no tiene comisiones ni bonos pendientes de liquidar');
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
      setError(err.message || 'Error al liquidar las comisiones y bonos');
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
              <h3 className="text-lg font-bold text-slate-800 font-montserrat">Liquidar Comisiones y Bonos</h3>
              <p className="text-xs text-slate-500">Liquidación Consolidada • Registro de comprobante bancario</p>
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

          {/* Desglose Consolidado de Liquidación */}
          {isLoadingBreakdown ? (
            <div className="p-6 bg-slate-50 rounded-2xl animate-pulse h-32 flex items-center justify-center">
              <span className="text-xs text-slate-400 font-medium">Calculando desglose consolidado...</span>
            </div>
          ) : (
            <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-3 shadow-md">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-montserrat">Concepto</span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-montserrat">Monto ($)</span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-300">Comisiones por Ventas ({salesCount} cierres):</span>
                  <span className="font-mono font-bold text-white">${salesCommission.toLocaleString('es-CO')}</span>
                </div>

                {dailyBonuses > 0 && (
                  <div className="flex justify-between">
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Bonos Meta Diaria:
                    </span>
                    <span className="font-mono font-bold text-emerald-400">+${dailyBonuses.toLocaleString('es-CO')}</span>
                  </div>
                )}

                {floorBonuses > 0 && (
                  <div className="flex justify-between">
                    <span className="text-amber-400 font-semibold flex items-center gap-1">
                      <Award className="w-3 h-3" /> Bono Piso Cumplido:
                    </span>
                    <span className="font-mono font-bold text-amber-400">+${floorBonuses.toLocaleString('es-CO')}</span>
                  </div>
                )}

                {welfareBonuses > 0 && (
                  <div className="flex justify-between">
                    <span className="text-indigo-400 font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Bono Bienestar:
                    </span>
                    <span className="font-mono font-bold text-indigo-400">+${welfareBonuses.toLocaleString('es-CO')}</span>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-montserrat">TOTAL A LIQUIDAR:</span>
                <span className="text-2xl font-extrabold text-emerald-400 font-mono">
                  ${totalAmount.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          )}

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
              rows={2}
              placeholder="Notas opcionales sobre el pago, retenciones o banco..."
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
              disabled={isSubmitting || totalAmount <= 0}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all text-xs font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-600/20 font-montserrat"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Procesando Liquidación...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Confirmar Liquidación (${totalAmount.toLocaleString('es-CO', { maximumFractionDigits: 0 })})
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
