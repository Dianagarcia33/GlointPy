import React, { useState } from 'react';
import { X, CornerDownLeft, AlertCircle, Check } from 'lucide-react';
import { CompanyAsset, ReturnAssetPayload } from '../../../services/companyAssetService';

interface AssetReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: CompanyAsset | null;
  onReturn: (data: ReturnAssetPayload) => Promise<void>;
}

export const AssetReturnModal: React.FC<AssetReturnModalProps> = ({
  isOpen,
  onClose,
  asset,
  onReturn,
}) => {
  const [condition, setCondition] = useState('GOOD');
  const [newStatus, setNewStatus] = useState('AVAILABLE');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !asset) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);
      await onReturn({
        condition_on_return: condition,
        new_status: newStatus,
        return_notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al procesar la devolución.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-amber-50/40 dark:bg-amber-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <CornerDownLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white font-montserrat">
                Devolución de Custodia
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Custodio actual: <strong className="text-slate-700 dark:text-slate-300">{asset.current_holder_name || 'Desconocido'}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl flex items-center gap-2.5 text-xs text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Condición Física al Recibir
            </label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-hidden dark:text-white cursor-pointer"
            >
              <option value="EXCELLENT">Excelente / Sin rasguños</option>
              <option value="GOOD">Bueno / Funcional</option>
              <option value="FAIR">Aceptable / Desgaste cosmético</option>
              <option value="POOR">Malo / Requiere reparación</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Destino / Nuevo Estado del Activo
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-hidden dark:text-white cursor-pointer"
            >
              <option value="AVAILABLE">Disponible en Bodega (Listo para reasignar)</option>
              <option value="IN_MAINTENANCE">En Mantenimiento / Limpieza</option>
              <option value="DAMAGED">Dañado / Esperando Repuesto</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Observaciones de Devolución
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Indica motivo de devolución (fin de contrato, rotación de equipo) y estado de entrega..."
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs shadow-amber-600/20 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" />
              {loading ? 'Procesando...' : 'Confirmar Devolución'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
