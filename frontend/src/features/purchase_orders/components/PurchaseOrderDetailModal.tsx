import React from 'react';
import { X, ShoppingCart, Clock, Check, PackageCheck, XCircle } from 'lucide-react';
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
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 font-montserrat">
            Borrador
          </span>
        );
      case 'REQUESTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 font-montserrat">
            <Clock className="w-3 h-3" /> Solicitada
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 font-montserrat">
            <Check className="w-3 h-3" /> Aprobada
          </span>
        );
      case 'RECEIVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 font-montserrat">
            <PackageCheck className="w-3 h-3" /> Recibida
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 font-montserrat">
            <XCircle className="w-3 h-3" /> Cancelada
          </span>
        );
      default:
        return <span>{status}</span>;
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
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0 bg-brand-500">
              <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 font-montserrat">
                  {order.order_number}
                </h2>
                {getStatusBadge(order.status)}
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Detalle oficial de adquisición y trazabilidad de entrega
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* Metadata Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-montserrat">
                Proveedor
              </span>
              <span className="text-xs font-bold text-slate-900 block mt-0.5 truncate">
                {order.supplier_name || 'N/A'}
              </span>
              {order.supplier_nit && (
                <span className="text-[10px] text-slate-500 font-mono">
                  NIT: {order.supplier_nit}
                </span>
              )}
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-montserrat">
                Forma de Pago & Factura
              </span>
              <span className="text-xs font-bold text-slate-900 block mt-0.5">
                {order.payment_method.replace('_', ' ')}
              </span>
              <span className="text-[10px] text-slate-500 block truncate">
                Factura: {order.invoice_number || 'Pendiente'}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-montserrat">
                Fecha Emisión
              </span>
              <span className="text-xs font-bold text-slate-900 block mt-0.5">
                {new Date(order.issue_date).toLocaleDateString('es-CO')}
              </span>
              <span className="text-[10px] text-slate-500 block">
                Entrega: {order.expected_delivery_date ? new Date(order.expected_delivery_date).toLocaleDateString('es-CO') : 'Inmediata'}
              </span>
            </div>
          </div>

          {/* Tabla de Artículos */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block font-montserrat">
              Líneas de la Orden ({order.items.length})
            </span>
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs min-w-[550px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px] font-montserrat">
                  <tr>
                    <th className="px-4 py-3">Artículo / SKU</th>
                    <th className="px-4 py-3 text-center">Cant. Solicitada</th>
                    <th className="px-4 py-3 text-center">Cant. Recibida</th>
                    <th className="px-4 py-3 text-right">Costo Unitario</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-inter">
                  {order.items.map((it) => (
                    <tr key={it.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-900 block">{it.item_name}</span>
                        {it.item_sku && (
                          <span className="text-[10px] text-slate-400 font-mono">SKU: {it.item_sku}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-slate-700 font-mono">
                        {it.quantity_ordered}
                      </td>
                      <td className="px-4 py-3 text-center font-mono">
                        <span
                          className={`font-bold ${
                            it.quantity_received >= it.quantity_ordered
                              ? 'text-emerald-600'
                              : 'text-slate-500'
                          }`}
                        >
                          {it.quantity_received}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700">
                        {formatCurrency(Number(it.unit_cost))}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
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
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="font-bold text-slate-700 block mb-1 font-montserrat">
                    Notas y Observaciones:
                  </span>
                  <p className="text-slate-600 whitespace-pre-line text-xs">{order.notes}</p>
                </div>
              )}

              {/* Trazabilidad de usuarios */}
              <div className="text-[11px] text-slate-400 space-y-0.5">
                {order.created_by_name && <p>• Creada por: <strong className="text-slate-700">{order.created_by_name}</strong></p>}
                {order.approved_by_name && <p>• Aprobada por: <strong className="text-slate-700">{order.approved_by_name}</strong></p>}
                {order.received_by_name && <p>• Recibida en almacén por: <strong className="text-slate-700">{order.received_by_name}</strong> el {new Date(order.received_date!).toLocaleString('es-CO')}</p>}
              </div>
            </div>

            <div className="w-full sm:w-64 bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Subtotal:</span>
                <span className="font-mono font-semibold text-slate-800">
                  {formatCurrency(Number(order.subtotal))}
                </span>
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>IVA / Impuestos:</span>
                <span className="font-mono font-semibold text-slate-800">
                  {formatCurrency(Number(order.tax_amount))}
                </span>
              </div>
              <div className="h-px bg-slate-200 my-1" />
              <div className="flex justify-between text-sm font-extrabold text-slate-900 font-montserrat">
                <span>Total:</span>
                <span className="text-brand-600 font-mono text-base">
                  {formatCurrency(Number(order.total_amount))}
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl sm:rounded-2xl transition-colors cursor-pointer font-montserrat"
            >
              Cerrar Detalle
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
