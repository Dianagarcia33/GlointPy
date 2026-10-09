import React, { useState, useEffect } from 'react';
import { X, PackageCheck, AlertCircle, FileCheck, Layers, Info } from 'lucide-react';
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
      // Inicializar con la cantidad pedida
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-emerald-50/40 dark:bg-emerald-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white font-montserrat">
                Recepción Física de Mercancía: {order.order_number}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Proveedor: {order.supplier_name || 'N/A'} • Total: ${order.total_amount.toLocaleString()}
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

        {/* Banner Informativo Kardex */}
        <div className="mx-6 mt-4 p-3.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 rounded-2xl flex items-start gap-3 text-xs text-blue-800 dark:text-blue-300">
          <Info className="w-5 h-5 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <span className="font-bold block">Integración Automática con Inventario & Kardex</span>
            Al confirmar la recepción, el stock físico en el Inventario aumentará inmediatamente según las cantidades recibidas y se generará una entrada oficial en la bitácora Kardex vinculada a la orden <strong>{order.order_number}</strong>.
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-3 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl flex items-center gap-2.5 text-xs text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Factura & URL */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Número de Factura del Proveedor (Opcional)
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Ej. FACT-98432"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Enlace a Comprobante / Factura Digital
              </label>
              <input
                type="text"
                value={invoiceUrl}
                onChange={(e) => setInvoiceUrl(e.target.value)}
                placeholder="https://... o ruta del archivo"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden dark:text-white"
              />
            </div>
          </div>

          {/* Tabla de Artículos a Recibir */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
              Cantidades Físicas Recibidas
            </span>
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold text-[10.5px]">
                  <tr>
                    <th className="px-4 py-2.5">Artículo / SKU</th>
                    <th className="px-4 py-2.5 text-center">Cant. Solicitada</th>
                    <th className="px-4 py-2.5 text-center w-36">Cant. Recibida</th>
                    <th className="px-4 py-2.5 text-right">Costo Unitario</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {order.items.map((it) => (
                    <tr key={it.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900 dark:text-white">{it.item_name}</span>
                          {it.item_sku && (
                            <span className="text-[10.5px] text-slate-400 font-mono">SKU: {it.item_sku}</span>
                          )}
                          {it.item_id ? (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                              ✓ Vinculado a Inventario Central
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">
                              Artículo no inventariable / Gasto directo
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center font-bold text-slate-700 dark:text-slate-300">
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
                          className="w-24 px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-center font-bold text-xs dark:text-white focus:ring-2 focus:ring-emerald-500"
                        />
                      </td>

                      <td className="px-4 py-3 text-right font-mono text-slate-700 dark:text-slate-300">
                        ${Number(it.unit_cost).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notas de Recepción */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Observaciones de Entrega / Estado de Empaques
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Mercancía recibida en perfecto estado, sellos originales..."
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white resize-none"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
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
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs shadow-emerald-600/20 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <PackageCheck className="w-4 h-4" />
              {loading ? 'Procesando Entrada...' : 'Confirmar Recepción y Cargar Inventario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
