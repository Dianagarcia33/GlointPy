import React, { useState, useEffect } from 'react';
import { X, Send, AlertTriangle, Building2, FileText, DollarSign, CheckCircle2 } from 'lucide-react';
import { InventoryItem, CreateMovementPayload } from '../../../services/inventoryService';

interface SupplyDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDispatch: (itemId: number, payload: CreateMovementPayload) => Promise<void>;
  items: InventoryItem[];
  preselectedItem?: InventoryItem | null;
}

const DEPARTMENTS = [
  'Administración y Gerencia',
  'Comercial y Ventas',
  'Operaciones y Logística',
  'Sistemas y Tecnología',
  'Contabilidad y Finanzas',
  'Cafetería y Servicios Generales',
  'Recursos Humanos',
  'Dirección de Inversiones'
];

export const SupplyDispatchModal: React.FC<SupplyDispatchModalProps> = ({
  isOpen,
  onClose,
  onDispatch,
  items,
  preselectedItem,
}) => {
  const supplyItems = items.filter((i) => i.item_type === 'OFFICE_SUPPLY' && i.is_active);

  const [selectedItemId, setSelectedItemId] = useState<number | ''>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [department, setDepartment] = useState<string>(DEPARTMENTS[0]);
  const [reference, setReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (preselectedItem) {
      setSelectedItemId(preselectedItem.id);
    } else if (supplyItems.length > 0 && !selectedItemId) {
      setSelectedItemId(supplyItems[0].id);
    }
    setQuantity(1);
    setReference('');
    setNotes('');
    setError(null);
  }, [preselectedItem, isOpen]);

  if (!isOpen) return null;

  const currentItem = items.find((i) => i.id === Number(selectedItemId));
  const availableStock = currentItem?.current_stock ?? 0;
  const unitCost = currentItem?.unit_cost ?? 0;
  const calculatedExpense = (Number(quantity) || 0) * Number(unitCost);
  const isStockInsufficient = quantity > availableStock;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedItemId) {
      setError('Debes seleccionar un insumo de oficina.');
      return;
    }

    if (quantity <= 0) {
      setError('La cantidad a despachar debe ser mayor a 0.');
      return;
    }

    if (isStockInsufficient) {
      setError(`Stock insuficiente. Solo hay ${availableStock} ${currentItem?.unit_measure || 'unidades'} disponibles.`);
      return;
    }

    if (!department) {
      setError('Debes seleccionar el departamento receptor.');
      return;
    }

    setLoading(true);
    try {
      const payload: CreateMovementPayload = {
        movement_type: 'DISPATCH_OFFICE',
        quantity: Number(quantity),
        destination_department: department,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      await onDispatch(Number(selectedItemId), payload);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al procesar el consumo de insumo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-amber-600 to-brand-600 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Send className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base font-montserrat">Consumo de Insumo de Oficina</h3>
              <p className="text-xs text-amber-100">Registrar salida y computar gasto operativo del negocio</p>
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
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Selector de Insumo */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Insumo a Despachar *</label>
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium"
              required
            >
              <option value="">Selecciona un insumo...</option>
              {supplyItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.sku}) — Disp: {item.current_stock} {item.unit_measure}
                </option>
              ))}
            </select>
          </div>

          {/* Indicador de Stock Disponible */}
          {currentItem && (
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Stock Actual en Bodega:</span>
                <span className="font-bold font-mono text-slate-800">
                  {availableStock} {currentItem.unit_measure}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-500">Costo unitario: </span>
                <span className="font-bold text-slate-800">${Number(unitCost).toLocaleString('es-CO', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          )}

          {/* Cantidad y Departamento Destino */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Cantidad a Tomar *</label>
              <input
                type="number"
                min="1"
                max={availableStock}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className={`w-full px-3 py-2 text-sm rounded-xl font-bold font-mono focus:ring-2 border ${
                  isStockInsufficient
                    ? 'bg-red-50 border-red-300 text-red-700 focus:ring-red-200'
                    : 'bg-slate-50 border-slate-200 text-slate-800 focus:ring-brand-500/20 focus:border-brand-500'
                }`}
                required
              />
              {isStockInsufficient && (
                <span className="text-[10px] text-red-600 mt-1 block">Supera el stock actual ({availableStock})</span>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Área / Departamento *</span>
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium"
                required
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Desglose de Impacto Financiero (Gasto Registrado) */}
          <div className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-amber-600" />
              <div>
                <p className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">Gasto de Negocio Generado</p>
                <p className="text-xs text-amber-700">Se imputará al centro de costos de {department}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-base font-black text-amber-900 font-mono">
                ${calculatedExpense.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Consecutivo / Referencia */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Referencia / Nro. Requisición (Opcional)</span>
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Ej: SOL-042 o Ticket #381"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          {/* Justificación / Notas */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Motivo / Notas del Consumo</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Material solicitado para reunión con inversionistas..."
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none"
            />
          </div>

          {/* Botones de Acción */}
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
              disabled={loading || isStockInsufficient}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-amber-600 to-brand-600 hover:from-amber-700 hover:to-brand-700 rounded-xl shadow-md shadow-amber-500/20 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              {loading ? 'Procesando...' : 'Confirmar Salida y Registrar Gasto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
