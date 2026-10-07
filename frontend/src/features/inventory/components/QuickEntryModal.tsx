import React, { useState, useEffect } from 'react';
import { X, ArrowDownRight, CheckCircle2, DollarSign, AlertCircle } from 'lucide-react';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setQuantity(1);
      setUnitCost(item.unit_cost);
    }
    setReference('');
    setNotes('');
    setError(null);
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

    setLoading(true);
    try {
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
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-emerald-700 to-teal-800 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <ArrowDownRight className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base font-montserrat">Entrada de Inventario</h3>
              <p className="text-xs text-emerald-100">{item.name} ({item.sku})</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
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

          {/* Stock Actual */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
            <span className="text-slate-500">Stock Actual en Bodega:</span>
            <span className="font-bold font-mono text-slate-800">
              {item.current_stock} {item.unit_measure}
            </span>
          </div>

          {/* Cantidad y Costo Unitario */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Cantidad a Ingresar *
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 text-sm font-bold font-mono bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                <span>Costo Unitario ($) *</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={unitCost}
                onChange={(e) => setUnitCost(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full px-3 py-2 text-sm font-bold font-mono bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                required
              />
            </div>
          </div>

          {/* Costo Total */}
          <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200/80 flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900">Total Inversión / Compra:</span>
            <span className="text-sm font-black text-emerald-900 font-mono">
              ${totalCost.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Factura / Referencia */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Nro. Factura / Proveedor (Opcional)
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Ej: FAC-9912 o Panamericana S.A."
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Notas / Observaciones</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalles del lote, entrega o proveedor..."
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
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
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              {loading ? 'Ingresando...' : 'Registrar Entrada'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
