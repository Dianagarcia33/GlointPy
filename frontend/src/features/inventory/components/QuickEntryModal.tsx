import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowDownRight, DollarSign, AlertCircle, Loader2, Save } from 'lucide-react';
import { InventoryItem, CreateMovementPayload } from '../../../services/inventoryService';

interface QuickEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEntry: (itemId: number, payload: CreateMovementPayload) => Promise<void>;
  item: InventoryItem | null;
}

export const QuickEntryModal: React.FC<QuickEntryModalProps> = ({
  isOpen,
  onClose,
  onEntry,
  item,
}) => {
  const [quantity, setQuantity] = useState<number>(1);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [reference, setReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && item) {
      setQuantity(1);
      setUnitCost(item.unit_cost);
      setReference('');
      setNotes('');
      setError(null);
    }
  }, [item, isOpen]);

  if (!isOpen || !item) return null;

  const totalCost = (Number(quantity) || 0) * (Number(unitCost) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (quantity <= 0) {
      setError('La cantidad a ingresar debe ser mayor a 0.');
      return;
    }

    try {
      setIsLoading(true);
      const payload: CreateMovementPayload = {
        movement_type: 'ENTRY',
        quantity: Number(quantity),
        unit_cost: Number(unitCost),
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      await onEntry(item.id, payload);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al registrar la entrada de inventario.');
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
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white bg-emerald-600 shadow-sm">
              <ArrowDownRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 font-montserrat">
                Entrada de Mercancía / Compra
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

          {/* Stock Actual en Bodega */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
            <span className="text-slate-500 font-medium">Stock Actual en Bodega:</span>
            <span className="font-bold font-mono text-slate-900">
              {item.current_stock} {item.unit_measure}
            </span>
          </div>

          {/* Cantidad y Costo Unitario */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat">
                Cantidad a Ingresar *
              </label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                <span>Costo Unitario ($) *</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={unitCost}
                onChange={(e) => setUnitCost(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
          </div>

          {/* Costo Total */}
          <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-200/80 flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900 uppercase font-montserrat">Total Inversión:</span>
            <span className="text-base font-black text-emerald-900 font-mono">
              ${totalCost.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Factura / Referencia */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat">
              Nro. Factura / Proveedor (Opcional)
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Ej. FAC-9912 o Panamericana S.A."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat">
              Notas / Observaciones
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalles sobre entrega, estado del paquete o lote..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
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
              disabled={isLoading}
              className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all inline-flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Ingresando...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Registrar Entrada</span>
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
