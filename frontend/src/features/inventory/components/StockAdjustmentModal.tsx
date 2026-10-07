import React, { useState, useEffect } from 'react';
import { X, SlidersHorizontal, AlertCircle, CheckCircle2 } from 'lucide-react';
import { InventoryItem, AdjustStockPayload } from '../../../services/inventoryService';

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdjust: (itemId: number, payload: AdjustStockPayload) => Promise<void>;
  item: InventoryItem | null;
}

const ADJUSTMENT_REASONS = [
  'Auditoría Física Periódica',
  'Conteo Físico Mensual de Cierre',
  'Pérdida / Deterioro / Rotura de Producto',
  'Sobrante Encontrado en Bodega',
  'Corrección por Error de Digitador',
  'Otro Motivo'
];

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  isOpen,
  onClose,
  onAdjust,
  item,
}) => {
  const [actualStock, setActualStock] = useState<number>(0);
  const [reason, setReason] = useState<string>(ADJUSTMENT_REASONS[0]);
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setActualStock(item.current_stock);
    }
    setReason(ADJUSTMENT_REASONS[0]);
    setNotes('');
    setError(null);
  }, [item, isOpen]);

  if (!isOpen || !item) return null;

  const currentStock = item.current_stock;
  const difference = actualStock - currentStock;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (actualStock < 0) {
      setError('El stock físico real no puede ser negativo.');
      return;
    }

    if (difference === 0) {
      setError('El nuevo conteo físico es idéntico al stock actual del sistema. No se requiere ajuste.');
      return;
    }

    setLoading(true);
    try {
      const payload: AdjustStockPayload = {
        actual_stock: Number(actualStock),
        reason: reason,
        notes: notes.trim() || undefined,
      };
      await onAdjust(item.id, payload);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al guardar el ajuste de stock.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-800 rounded-xl border border-slate-700">
              <SlidersHorizontal className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <h3 className="font-bold text-base font-montserrat">Ajuste de Auditoría Física</h3>
              <p className="text-xs text-slate-400">{item.name} ({item.sku})</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Comparativo de Stock */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <div>
              <span className="block text-[11px] text-slate-400 font-semibold uppercase">Stock Sistema</span>
              <span className="text-xl font-bold font-mono text-slate-700">{currentStock} {item.unit_measure}</span>
            </div>
            <div>
              <span className="block text-[11px] text-slate-400 font-semibold uppercase">Diferencia</span>
              <span
                className={`text-xl font-bold font-mono ${
                  difference > 0
                    ? 'text-emerald-600'
                    : difference < 0
                    ? 'text-red-600'
                    : 'text-slate-500'
                }`}
              >
                {difference > 0 ? `+${difference}` : difference} {item.unit_measure}
              </span>
            </div>
          </div>

          {/* Input de Conteo Físico Real */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Conteo Físico Real Reportado *
            </label>
            <input
              type="number"
              min="0"
              value={actualStock}
              onChange={(e) => setActualStock(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full px-3 py-2 text-base font-bold font-mono bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              required
            />
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Motivo del Ajuste *</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              required
            >
              {ADJUSTMENT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Observaciones de Auditoría</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalles sobre quién contó, circunstancias o justificación del ajuste..."
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none"
            />
          </div>

          {/* Botones */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || difference === 0}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-md hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {loading ? 'Aplicando...' : 'Aplicar Ajuste al Kardex'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
