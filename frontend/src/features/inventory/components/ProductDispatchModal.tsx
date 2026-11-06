import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowUpRight, ShoppingCart, AlertTriangle, FileText, DollarSign, Loader2, Package, Trash2 } from 'lucide-react';
import { InventoryItem, CreateMovementPayload } from '../../../services/inventoryService';

interface ProductDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDispatch: (itemId: number, payload: CreateMovementPayload) => Promise<void>;
  items: InventoryItem[];
  preselectedItem?: InventoryItem | null;
}

export const ProductDispatchModal: React.FC<ProductDispatchModalProps> = ({
  isOpen,
  onClose,
  onDispatch,
  items,
  preselectedItem,
}) => {
  const productItems = items.filter((i) => i.item_type === 'PRODUCT' && i.is_active);

  const [selectedItemId, setSelectedItemId] = useState<number | ''>('');
  const [movementType, setMovementType] = useState<'SALE' | 'WASTE'>('SALE');
  const [quantity, setQuantity] = useState<number>(1);
  const [reference, setReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (preselectedItem && preselectedItem.item_type === 'PRODUCT') {
        setSelectedItemId(preselectedItem.id);
      } else if (productItems.length > 0 && !selectedItemId) {
        setSelectedItemId(productItems[0].id);
      }
      setMovementType('SALE');
      setQuantity(1);
      setReference('');
      setNotes('');
      setError(null);
    }
  }, [isOpen, preselectedItem]);

  if (!isOpen) return null;

  const currentItem = items.find((i) => i.id === Number(selectedItemId));
  const availableStock = currentItem?.current_stock ?? 0;
  const salePrice = currentItem?.sale_price !== null && currentItem?.sale_price !== undefined ? Number(currentItem.sale_price) : 0;
  const unitCost = currentItem?.unit_cost !== null && currentItem?.unit_cost !== undefined ? Number(currentItem.unit_cost) : 0;

  const totalSaleAmount = (Number(quantity) || 0) * salePrice;
  const totalCostAmount = (Number(quantity) || 0) * unitCost;

  const isStockInsufficient = (Number(quantity) || 0) > availableStock;
  const projectedStock = Math.max(0, availableStock - (Number(quantity) || 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedItemId) {
      setError('Por favor selecciona un producto comercial.');
      return;
    }

    if (quantity <= 0) {
      setError('La cantidad a despachar debe ser mayor a 0.');
      return;
    }

    if (isStockInsufficient) {
      setError(`Stock insuficiente. Solo hay ${availableStock} ${currentItem?.unit_measure || 'unidades'} disponibles en bodega.`);
      return;
    }

    try {
      setIsLoading(true);
      const payload: CreateMovementPayload = {
        movement_type: movementType,
        quantity: Number(quantity),
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      await onDispatch(Number(selectedItemId), payload);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al registrar la salida del producto.');
    } finally {
      setIsLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera estándar GlointPy */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0 ${
              movementType === 'SALE' ? 'bg-blue-600' : 'bg-rose-600'
            }`}>
              {movementType === 'SALE' ? (
                <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 font-montserrat">
                {movementType === 'SALE' ? 'Registrar Venta de Producto' : 'Registrar Merma o Baja'}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500">
                {movementType === 'SALE' ? 'Despacho comercial de inventario por venta' : 'Salida por daño, deterioro, vencimiento o pérdida'}
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

          {/* Selector de Tipo de Salida (Venta vs Merma) */}
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => setMovementType('SALE')}
              className={`py-2 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 font-montserrat ${
                movementType === 'SALE'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Venta Comercial</span>
            </button>
            <button
              type="button"
              onClick={() => setMovementType('WASTE')}
              className={`py-2 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 font-montserrat ${
                movementType === 'WASTE'
                  ? 'bg-white text-rose-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Merma / Baja</span>
            </button>
          </div>

          {/* Selector de Producto */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat">
              Producto Comercial *
            </label>
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value ? Number(e.target.value) : '')}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            >
              <option value="">Selecciona un producto...</option>
              {productItems.map((it) => (
                <option key={it.id} value={it.id} disabled={it.current_stock <= 0}>
                  {it.name} ({it.sku}) — Stock: {it.current_stock} {it.unit_measure} {it.current_stock <= 0 ? '(Agotado)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Tarjeta de Control de Stock en Tiempo Real */}
          {currentItem && (
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <div>
                <span className="block text-[10px] sm:text-[11px] text-slate-400 font-bold uppercase tracking-wider font-montserrat">
                  Stock Disponible
                </span>
                <span className={`text-lg sm:text-xl font-bold font-mono ${availableStock <= 0 ? 'text-red-600' : 'text-slate-800'}`}>
                  {availableStock} {currentItem.unit_measure}
                </span>
              </div>
              <div>
                <span className="block text-[10px] sm:text-[11px] text-slate-400 font-bold uppercase tracking-wider font-montserrat">
                  Stock Resultante
                </span>
                <span className={`text-lg sm:text-xl font-bold font-mono ${projectedStock <= currentItem.min_stock ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {projectedStock} {currentItem.unit_measure}
                </span>
              </div>
            </div>
          )}

          {/* Cantidad a Despachar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider font-montserrat">
                Cantidad a Despachar *
              </label>
              {availableStock > 0 && (
                <button
                  type="button"
                  onClick={() => setQuantity(availableStock)}
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-bold cursor-pointer transition-colors"
                >
                  Despachar todo ({availableStock})
                </button>
              )}
            </div>
            <input
              type="number"
              min="1"
              max={availableStock || undefined}
              required
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs font-mono font-bold transition-all focus:outline-none focus:ring-2 ${
                isStockInsufficient
                  ? 'border-red-300 text-red-700 focus:ring-red-500/20 focus:border-red-500 bg-red-50/50'
                  : 'border-slate-200 text-slate-800 focus:ring-blue-500/20 focus:border-blue-500'
              }`}
            />
            {isStockInsufficient && (
              <span className="text-[11px] text-red-600 font-semibold mt-1 block">
                ⚠️ La cantidad supera el stock disponible en bodega ({availableStock}).
              </span>
            )}
          </div>

          {/* Visualización de Valor Monetario (Venta o Costo Merma) */}
          {currentItem && (
            <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
              movementType === 'SALE' 
                ? 'bg-blue-50/70 border-blue-200/80 text-blue-900' 
                : 'bg-rose-50/70 border-rose-200/80 text-rose-900'
            }`}>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 shrink-0" />
                <span className="text-xs font-bold uppercase font-montserrat">
                  {movementType === 'SALE' ? 'Total Venta:' : 'Valor de Pérdida Imputado:'}
                </span>
              </div>
              <span className="text-base font-black font-mono">
                ${(movementType === 'SALE' ? totalSaleAmount : totalCostAmount).toLocaleString('es-CO', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}

          {/* Nro. Factura / Comprobante */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {movementType === 'SALE' ? 'Nro. Factura / Pedido / Cliente (Opcional)' : 'Nro. Acta / Referencia de Merma (Opcional)'}
              </span>
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder={movementType === 'SALE' ? 'Ej. FACT-0842 o Pedido #125' : 'Ej. ACTA-BAJA-2026-03'}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Notas u Observaciones */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat">
              Notas u Observaciones (Opcional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={movementType === 'SALE' ? 'Detalles de entrega o cliente...' : 'Causa del daño, vencimiento o justificación...'}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
            />
          </div>

          {/* Botones de acción estándar */}
          <div className="pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-2xl transition-all cursor-pointer font-montserrat text-center"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || isStockInsufficient || availableStock <= 0}
              className={`w-full sm:w-auto px-6 py-2.5 text-xs font-bold text-white rounded-2xl transition-all inline-flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50 font-montserrat text-center active:scale-95 ${
                movementType === 'SALE'
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                  : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>{movementType === 'SALE' ? 'Confirmar Salida por Venta' : 'Confirmar Baja por Merma'}</span>
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
