import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, AlertTriangle, Building2, FileText, DollarSign, Loader2 } from 'lucide-react';
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (preselectedItem) {
        setSelectedItemId(preselectedItem.id);
      } else if (supplyItems.length > 0 && !selectedItemId) {
        setSelectedItemId(supplyItems[0].id);
      }
      setQuantity(1);
      setReference('');
      setNotes('');
      setError(null);
    }
  }, [isOpen, preselectedItem]);

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
      setError('Por favor selecciona un insumo de oficina.');
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

    try {
      setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera estándar GlointPy */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center text-white bg-amber-500 shadow-sm shrink-0">
              <Send className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 font-montserrat">
                Consumo de Insumo de Oficina
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Registra la salida y computa el gasto operativo del negocio
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
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Selector de Insumo */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat">
              Insumo a Despachar *
            </label>
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
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

          {/* Stock Disponible */}
          {currentItem && (
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">Stock en Bodega:</span>
                <span className="font-bold font-mono text-slate-900">
                  {availableStock} {currentItem.unit_measure}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 font-medium">Costo unitario: </span>
                <span className="font-bold text-slate-900">${Number(unitCost).toLocaleString('es-CO', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          )}

          {/* Cantidad y Departamento Destino */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat">
                Cantidad a Tomar *
              </label>
              <input
                type="number"
                min="1"
                max={availableStock}
                required
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold border focus:outline-none focus:ring-2 transition-all ${
                  isStockInsufficient
                    ? 'bg-rose-50 border-rose-300 text-rose-700 focus:ring-rose-200'
                    : 'bg-slate-50 border-slate-200 text-slate-800 focus:ring-brand-500/20 focus:border-brand-500'
                }`}
              />
              {isStockInsufficient && (
                <span className="text-[10px] text-rose-600 mt-1 block">Supera el stock disponible ({availableStock})</span>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Área / Departamento *</span>
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
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

          {/* Desglose de Impacto Financiero */}
          <div className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-amber-600" />
              <div>
                <p className="text-[11px] font-bold text-amber-900 uppercase tracking-wider font-montserrat">Gasto de Negocio Generado</p>
                <p className="text-xs text-amber-700">Se imputará al centro de costos de {department}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-base font-black text-amber-900 font-mono">
                ${calculatedExpense.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Referencia */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Nro. Requisición / Referencia (Opcional)</span>
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Ej. REQ-2026-042 o Ticket #381"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
            />
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat">
              Motivo / Notas del Consumo
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Material para reunión comercial o capacitación interna..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all resize-none"
            />
          </div>

          {/* Botones de acción estándar */}
          <div className="pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all cursor-pointer font-montserrat text-center"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || isStockInsufficient}
              className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all inline-flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50 font-montserrat text-center"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Confirmar Salida y Registrar Gasto</span>
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
