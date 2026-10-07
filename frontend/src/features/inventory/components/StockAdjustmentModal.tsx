import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, SlidersHorizontal, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && item) {
      setActualStock(item.current_stock);
      setReason(ADJUSTMENT_REASONS[0]);
      setNotes('');
      setError(null);
    }
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

    try {
      setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera estándar GlointPy */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white bg-purple-600 shadow-sm">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 font-montserrat">
                Ajuste de Auditoría Física
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                {item.name} ({item.sku})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Comparativo de Stock */}
          <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
            <div>
              <span className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider font-montserrat">Stock Sistema</span>
              <span className="text-xl font-bold font-mono text-slate-700">{currentStock} {item.unit_measure}</span>
            </div>
            <div>
              <span className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider font-montserrat">Diferencia</span>
              <span
                className={`text-xl font-bold font-mono ${
                  difference > 0
                    ? 'text-emerald-600'
                    : difference < 0
                    ? 'text-rose-600'
                    : 'text-slate-500'
                }`}
              >
                {difference > 0 ? `+${difference}` : difference} {item.unit_measure}
              </span>
            </div>
          </div>

          {/* Conteo Físico Real */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat">
              Conteo Físico Real Reportado *
            </label>
            <input
              type="number"
              min="0"
              required
              value={actualStock}
              onChange={(e) => setActualStock(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
            />
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat">
              Motivo del Ajuste *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
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
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat">
              Observaciones de Auditoría
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalles sobre quién contó, circunstancias o justificación del ajuste..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all resize-none"
            />
          </div>

          {/* Botones de acción estándar */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || difference === 0}
              className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all inline-flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Aplicando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Aplicar Ajuste al Kardex</span>
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
