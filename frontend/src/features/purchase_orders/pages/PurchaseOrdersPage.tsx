import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  Plus, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  PackageCheck, 
  XCircle, 
  Eye, 
  Check, 
  Ban,
  DollarSign
} from 'lucide-react';
import { 
  PurchaseOrder, 
  purchaseOrderService, 
  PurchaseOrderStats, 
  CreatePurchaseOrderPayload, 
  ReceiveOrderPayload 
} from '../../../services/purchaseOrderService';
import { PurchaseOrderModal } from '../components/PurchaseOrderModal';
import { ReceiveOrderModal } from '../components/ReceiveOrderModal';
import { PurchaseOrderDetailModal } from '../components/PurchaseOrderDetailModal';
import { Can } from '../../../components/security/Can';

export const PurchaseOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [stats, setStats] = useState<PurchaseOrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modales
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isReceiveOpen, setIsReceiveOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const [ordersRes, statsRes] = await Promise.all([
        purchaseOrderService.getOrders({
          search: search.trim() || undefined,
          status: statusFilter,
          limit: 100,
        }),
        purchaseOrderService.getStats(),
      ]);

      setOrders(ordersRes.items);
      setStats(statsRes);
    } catch (err) {
      console.error('Error fetching purchase orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders();
  };

  const handleCreateOrder = async (data: CreatePurchaseOrderPayload) => {
    await purchaseOrderService.createOrder(data);
    await fetchOrders();
  };

  const handleApproveOrder = async (order: PurchaseOrder) => {
    if (!window.confirm(`¿Aprobar la orden de compra ${order.order_number}?`)) return;
    try {
      await purchaseOrderService.approveOrder(order.id);
      await fetchOrders();
    } catch (err: any) {
      alert(err.message || 'Error al aprobar la orden.');
    }
  };

  const handleReceiveOrderConfirm = async (data: ReceiveOrderPayload) => {
    if (!selectedOrder) return;
    await purchaseOrderService.receiveOrder(selectedOrder.id, data);
    await fetchOrders();
  };

  const handleCancelOrder = async (order: PurchaseOrder) => {
    const reason = window.prompt(`Motivo de anulación para la orden ${order.order_number}:`);
    if (reason === null) return;

    try {
      await purchaseOrderService.cancelOrder(order.id, reason);
      await fetchOrders();
    } catch (err: any) {
      alert(err.message || 'Error al anular la orden.');
    }
  };

  const formatCurrency = (val?: number) => {
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
    <div className="space-y-6">
      {/* Header Principal */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black font-montserrat text-slate-900 tracking-tight flex items-center gap-2.5">
              <span className="p-2 bg-brand-50 text-brand-600 border border-brand-200 rounded-2xl inline-flex shadow-2xs">
                <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
              </span>
              Órdenes de Compra
            </h1>
            <span className="px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold bg-brand-50 text-brand-600 border border-brand-200 rounded-full font-montserrat">
              Abastecimiento y Kardex
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Gestión de solicitudes de abastecimiento, flujo de aprobación y recepción directa a inventario.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={fetchOrders}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-3 sm:px-3.5 py-2 sm:py-2.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl shadow-xs hover:border-slate-300 transition-all cursor-pointer font-montserrat"
            title="Recargar"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <Can permissions={['purchase_orders:create', 'purchase_orders.create']}>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-bold text-white bg-gradient-to-r from-brand-500 to-amber-600 hover:from-brand-600 hover:to-amber-700 rounded-xl sm:rounded-2xl shadow-md shadow-brand-500/20 hover:scale-[1.01] active:scale-95 transition-all cursor-pointer font-montserrat"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Nueva Orden de Compra</span>
            </button>
          </Can>
        </div>
      </div>

      {/* Tarjetas KPI de Resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider font-montserrat truncate">Total Órdenes</span>
            <ShoppingCart className="w-4 h-4 text-brand-500 shrink-0" />
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900 block truncate">
              {stats?.total_orders || 0}
            </span>
            <span className="block text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">Historial registrado</span>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider font-montserrat truncate">Por Aprobar</span>
            <Clock className="w-4 h-4 text-amber-500 shrink-0" />
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-bold font-mono text-amber-600 block truncate">
              {stats?.requested_orders || 0}
            </span>
            <span className="block text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">Requieren visto bueno</span>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider font-montserrat truncate">Aprobadas / En Espera</span>
            <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-bold font-mono text-blue-600 block truncate">
              {stats?.approved_orders || 0}
            </span>
            <span className="block text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">Listas para recepción</span>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider font-montserrat truncate">Total Recibido</span>
            <DollarSign className="w-4 h-4 text-emerald-500 shrink-0" />
          </div>
          <div>
            <span className="text-lg sm:text-xl font-bold font-mono text-slate-900 block truncate">
              {formatCurrency(stats?.total_received_amount)}
            </span>
            <span className="block text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">Ingresado al inventario</span>
          </div>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por número de OC (ej. OC-2026-0001), proveedor o factura..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
          />
        </form>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 cursor-pointer"
          >
            <option value="ALL">Todos los Estados</option>
            <option value="REQUESTED">Solicitada (Pendiente)</option>
            <option value="APPROVED">Aprobada</option>
            <option value="RECEIVED">Recibida (En Stock)</option>
            <option value="CANCELLED">Cancelada</option>
          </select>
        </div>
      </div>

      {/* Tabla de Órdenes */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 bg-white p-8">
            <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mb-2" />
            <span className="text-xs font-semibold text-slate-400">Cargando órdenes de compra...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 bg-white p-8 text-center">
            <ShoppingCart className="w-12 h-12 text-slate-300 stroke-1 mb-2" />
            <h4 className="text-sm font-bold text-slate-700 font-montserrat">No hay órdenes de compra</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Genera tu primera orden de compra para abastecer inventario o registrar adquisiciones con proveedores.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[850px] text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200 select-none font-montserrat">
                <tr>
                  <th className="py-3.5 px-4 sm:px-5">N° Orden</th>
                  <th className="py-3.5 px-4">Proveedor</th>
                  <th className="py-3.5 px-4">Fecha Emisión</th>
                  <th className="py-3.5 px-4">Items</th>
                  <th className="py-3.5 px-4 text-right">Monto Total</th>
                  <th className="py-3.5 px-4 text-center">Estado</th>
                  <th className="py-3.5 px-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-inter">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/70 transition-colors group">
                    <td className="py-3.5 px-5">
                      <div className="flex flex-col">
                        <span className="font-mono font-bold text-slate-900 text-xs">
                          {o.order_number}
                        </span>
                        {o.invoice_number && (
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Fact: {o.invoice_number}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800 text-xs">
                          {o.supplier_name || 'N/A'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {o.payment_method.replace('_', ' ')}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(o.issue_date).toLocaleDateString('es-CO')}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10.5px] font-medium font-mono">
                        {o.items.length} {o.items.length === 1 ? 'artículo' : 'artículos'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(Number(o.total_amount))}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {getStatusBadge(o.status)}
                    </td>

                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedOrder(o);
                            setIsDetailOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-colors cursor-pointer"
                          title="Ver detalle de orden"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Botón Aprobar */}
                        {o.status === 'REQUESTED' && (
                          <Can permissions={['purchase_orders:approve', 'purchase_orders.approve']}>
                            <button
                              type="button"
                              onClick={() => handleApproveOrder(o)}
                              className="px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1 font-montserrat"
                              title="Aprobar orden"
                            >
                              <Check className="w-3.5 h-3.5" /> Aprobar
                            </button>
                          </Can>
                        )}

                        {/* Botón Recibir */}
                        {(o.status === 'APPROVED' || o.status === 'REQUESTED') && (
                          <Can permissions={['purchase_orders:receive', 'purchase_orders.receive']}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedOrder(o);
                                setIsReceiveOpen(true);
                              }}
                              className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1 font-montserrat"
                              title="Recibir mercancía en almacén"
                            >
                              <PackageCheck className="w-3.5 h-3.5" /> Recibir
                            </button>
                          </Can>
                        )}

                        {/* Botón Anular */}
                        {o.status !== 'RECEIVED' && o.status !== 'CANCELLED' && (
                          <Can permissions={['purchase_orders:cancel', 'purchase_orders.cancel']}>
                            <button
                              type="button"
                              onClick={() => handleCancelOrder(o)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                              title="Anular orden"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          </Can>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modales */}
      <PurchaseOrderModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSave={handleCreateOrder}
      />

      <ReceiveOrderModal
        isOpen={isReceiveOpen}
        onClose={() => setIsReceiveOpen(false)}
        order={selectedOrder}
        onConfirm={handleReceiveOrderConfirm}
      />

      <PurchaseOrderDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        order={selectedOrder}
      />
    </div>
  );
};
