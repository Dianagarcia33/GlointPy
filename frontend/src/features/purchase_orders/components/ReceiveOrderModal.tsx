import React, { useState, useEffect } from 'react';
import { X, PackageCheck, AlertCircle, Info, Loader2 } from 'lucide-react';
import { PurchaseOrder, ReceiveOrderPayload } from '../../../services/purchaseOrderService';

interface ReceiveOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: PurchaseOrder | null;
  onConfirm: (data: ReceiveOrderPayload) => Promise<void>;
}

export const ReceiveOrderModal: React.FC<ReceiveOrderModalProps> = ({
  isOpen,
  onClose,
  order,
  onConfirm,
}) => {
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceUrl, setInvoiceUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [itemQuantities, setItemQuantities] = useState<{ [key: number]: number }>({});
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (order && isOpen) {
      setInvoiceNumber(order.invoice_number || '');
      setInvoiceUrl(order.invoice_url || '');
      setNotes('');
      const initialMap: { [key: number]: number } = {};
      order.items.forEach((it) => {
        initialMap[it.id] = it.quantity_ordered;
      });
      setItemQuantities(initialMap);
      setError(null);
    }
  }, [order, isOpen]);

  if (!isOpen || !order) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      const itemsPayload = order.items.map((it) => ({
        order_item_id: it.id,
        quantity_received: itemQuantities[it.id] !== undefined ? itemQuantities[it.id] : it.quantity_ordered,
        unit_cost: it.unit_cost,
      }));

      await onConfirm({
        invoice_number: invoiceNumber.trim() || undefined,
        invoice_url: invoiceUrl.trim() || undefined,
        notes: notes.trim() || undefined,
        items: itemsPayload,
      });

      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al procesar la recepción de mercancía.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0 bg-emerald-600">
              <PackageCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 font-montserrat">
                Recepción Física: {order.order_number}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Proveedor: {order.supplier_name || 'N/A'} • Total: ${Number(order.total_amount).toLocaleString('es-CO')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Banner Informativo Kardex */}
        <div className="mx-4 sm:mx-6 mt-4 p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-start gap-3 text-xs text-blue-900">
          <Info className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
          <div>
            <span className="font-bold font-montserrat block">Integración Automática con Kardex</span>
            Al confirmar la recepción, el stock físico en el Inventario aumentará inmediatamente y se registrará la entrada formal en la bitácora Kardex vinculada a la orden <strong>{order.order_number}</strong>.
          </div>
        </div>

        {error && (
          <div className="mx-4 sm:mx-6 mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* Factura & URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat">
                Número de Factura del Proveedor (Opcional)
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Ej. FACT-98432"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat">
                Enlace a Comprobante Digital (Opcional)
              </label>
              <input
                type="text"
                value={invoiceUrl}
                onChange={(e) => setInvoiceUrl(e.target.value)}
                placeholder="https://... o enlace a documento"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
          </div>

          {/* Tabla de Artículos a Recibir */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block font-montserrat">
              Cantidades Físicas Recibidas en Bodega
            </span>
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px] font-montserrat">
                  <tr>
                    <th className="px-4 py-3">Artículo / SKU</th>
                    <th className="px-4 py-3 text-center">Cant. Solicitada</th>
                    <th className="px-4 py-3 text-center w-36">Cant. Recibida</th>
                    <th className="px-4 py-3 text-right">Costo Unitario</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-inter">
                  {order.items.map((it) => (
                    <tr key={it.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{it.item_name}</span>
                          {it.item_sku && (
                            <span className="text-[10px] text-slate-500 font-mono mt-0.5">SKU: {it.item_sku}</span>
                          )}
                          {it.item_id ? (
                            <span className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                              ✓ Vinculado a Inventario Central
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 mt-0.5">
                              Artículo no inventariable / Gasto directo
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center font-bold text-slate-700 font-mono">
                        {it.quantity_ordered}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max={it.quantity_ordered}
                          value={itemQuantities[it.id] !== undefined ? itemQuantities[it.id] : it.quantity_ordered}
                          onChange={(e) =>
                            setItemQuantities({
                              ...itemQuantities,
                              [it.id]: Math.max(0, parseInt(e.target.value) || 0),
                            })
                          }
                          className="w-24 px-2 py-1.5 bg-white border border-slate-300 rounded-xl text-center font-bold text-xs text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-hidden"
                        />
                      </td>

                      <td className="px-4 py-3 text-right font-mono text-slate-700">
                        ${Number(it.unit_cost).toLocaleString('es-CO')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notas de Recepción */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat">
              Observaciones de Entrega / Estado de Empaques
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Mercancía recibida en perfecto estado, sellos originales..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all resize-none"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl sm:rounded-2xl transition-colors cursor-pointer font-montserrat"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl sm:rounded-2xl shadow-md shadow-emerald-600/20 hover:scale-[1.01] active:scale-95 transition-all cursor-pointer font-montserrat disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-4 h-4" />}
              <span>{loading ? 'Procesando Entrada...' : 'Confirmar Recepción y Cargar Inventario'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
