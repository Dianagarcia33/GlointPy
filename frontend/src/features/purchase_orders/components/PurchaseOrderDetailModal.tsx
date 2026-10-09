import React from 'react';
import { X, ShoppingCart, Calendar, User, Building, FileText, CheckCircle2, Clock, XCircle, ExternalLink } from 'lucide-react';
import { PurchaseOrder } from '../../../services/purchaseOrderService';

interface PurchaseOrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: PurchaseOrder | null;
}

export const PurchaseOrderDetailModal: React.FC<PurchaseOrderDetailModalProps> = ({
  isOpen,
  onClose,
  order,
}) => {
  if (!isOpen || !order) return null;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full font-bold text-[10.5px]">Borrador</span>;
      case 'REQUESTED':
        return <span className="px-2.5 py-1 bg-amber-50 text-amber-600 rounded-full font-bold text-[10.5px]">Solicitada / Pendiente</span>;
      case 'APPROVED':
        return <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full font-bold text-[10.5px]">Aprobada</span>;
      case 'RECEIVED':
        return <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full font-bold text-[10.5px]">Recibida (En Stock)</span>;
      case 'CANCELLED':
        return <span className="px-2.5 py-1 bg-rose-50 text-rose-600 rounded-full font-bold text-[10.5px]">Cancelada</span>;
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-500/10 dark:bg-brand-500/20 text-brand-500 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white font-montserrat">
                  {order.order_number}
                </h3>
                {getStatusBadge(order.status)}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Detalle oficial de adquisición y trazabilidad de entrega
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

        <div className="p-6 space-y-6">
          {/* Metadata Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider block">
                Proveedor
              </span>
              <span className="text-xs font-bold text-slate-900 dark:text-white block mt-0.5 truncate">
                {order.supplier_name || 'N/A'}
              </span>
              {order.supplier_nit && (
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  NIT: {order.supplier_nit}
                </span>
              )}
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider block">
                Forma de Pago & Factura
              </span>
              <span className="text-xs font-bold text-slate-900 dark:text-white block mt-0.5">
                {order.payment_method.replace('_', ' ')}
              </span>
              <span className="text-[10.5px] text-slate-500 dark:text-slate-400 block truncate">
                Factura: {order.invoice_number || 'Pendiente'}
              </span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider block">
                Fecha Emisión
              </span>
              <span className="text-xs font-bold text-slate-900 dark:text-white block mt-0.5">
                {new Date(order.issue_date).toLocaleDateString('es-CO')}
              </span>
              <span className="text-[10.5px] text-slate-500 dark:text-slate-400 block">
                Entrega: {order.expected_delivery_date ? new Date(order.expected_delivery_date).toLocaleDateString('es-CO') : 'Inmediata'}
              </span>
            </div>
          </div>

          {/* Tabla de Artículos */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
              Líneas de la Orden ({order.items.length})
            </span>
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold text-[10.5px]">
                  <tr>
                    <th className="px-4 py-2.5">Artículo / SKU</th>
                    <th className="px-4 py-2.5 text-center">Cant. Solicitada</th>
                    <th className="px-4 py-2.5 text-center">Cant. Recibida</th>
                    <th className="px-4 py-2.5 text-right">Costo Unitario</th>
                    <th className="px-4 py-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {order.items.map((it) => (
                    <tr key={it.id}>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-900 dark:text-white block">{it.item_name}</span>
                        {it.item_sku && (
                          <span className="text-[10px] text-slate-400 font-mono">SKU: {it.item_sku}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-slate-700 dark:text-slate-300">
                        {it.quantity_ordered}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`font-bold ${
                            it.quantity_received >= it.quantity_ordered
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-500'
                          }`}
                        >
                          {it.quantity_received}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700 dark:text-slate-300">
                        {formatCurrency(Number(it.unit_cost))}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {formatCurrency(Number(it.total_cost))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Resumen de Costos */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="flex-1 space-y-2 text-xs">
              {order.notes && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                    Notas y Observaciones:
                  </span>
                  <p className="text-slate-500 dark:text-slate-400 whitespace-pre-line">{order.notes}</p>
                </div>
              )}

              {/* Trazabilidad de usuarios */}
              <div className="text-[11px] text-slate-400 space-y-0.5">
                {order.created_by_name && <p>• Creada por: <strong className="text-slate-600 dark:text-slate-300">{order.created_by_name}</strong></p>}
                {order.approved_by_name && <p>• Aprobada por: <strong className="text-slate-600 dark:text-slate-300">{order.approved_by_name}</strong></p>}
                {order.received_by_name && <p>• Recibida en bodega por: <strong className="text-slate-600 dark:text-slate-300">{order.received_by_name}</strong> el {new Date(order.received_date!).toLocaleString('es-CO')}</p>}
              </div>
            </div>

            <div className="w-full sm:w-64 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Subtotal:</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {formatCurrency(Number(order.subtotal))}
                </span>
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>IVA / Impuestos:</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {formatCurrency(Number(order.tax_amount))}
                </span>
              </div>
              <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />
              <div className="flex justify-between text-sm font-extrabold text-slate-900 dark:text-white">
                <span>Total:</span>
                <span className="text-brand-600 dark:text-brand-400 font-mono text-base">
                  {formatCurrency(Number(order.total_amount))}
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={onClose}
              className="px-5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cerrar Detalle
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
