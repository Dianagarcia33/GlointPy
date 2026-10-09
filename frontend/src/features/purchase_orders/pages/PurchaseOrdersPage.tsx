import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  Plus, 
  Search, 
  RefreshCw, 
  Filter, 
  CheckCircle2, 
  Clock, 
  PackageCheck, 
  XCircle, 
  Eye, 
  Check, 
  Ban,
  Building,
  DollarSign,
  AlertTriangle
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
import { CorporateResourceNav } from '../../inventory/components/CorporateResourceNav';
import { Can } from '../../../components/security/Can';

export const PurchaseOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [stats, setStats] = useState<PurchaseOrderStats | null>(null);
  const [total, setTotal] = useState(0);
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
      setTotal(ordersRes.total);
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
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            Borrador
          </span>
        );
      case 'REQUESTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
            <Clock className="w-3 h-3" /> Solicitada
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
            <Check className="w-3 h-3" /> Aprobada
          </span>
        );
      case 'RECEIVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            <PackageCheck className="w-3 h-3" /> Recibida
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
            <XCircle className="w-3 h-3" /> Cancelada
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 🧭 Navegación cruzada de recursos corporativos */}
      <CorporateResourceNav activeTab="purchase_orders" />

      {/* Header Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white font-montserrat tracking-tight flex items-center gap-2.5">
            <ShoppingCart className="w-7 h-7 text-brand-500" />
            Órdenes de Compra
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Gestión de solicitudes de abastecimiento, flujo de aprobación y recepción directa a inventario.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="p-2.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs"
            title="Recargar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <Can permissions={['purchase_orders:create', 'purchase_orders.create']}>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-xl shadow-xs shadow-brand-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Nueva Orden de Compra
            </button>
          </Can>
        </div>
      </div>

      {/* KPIs Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Órdenes</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2 font-montserrat">
            {stats?.total_orders || 0}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">Historial registrado</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Pendientes de Aprobación</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2 font-montserrat">
            {stats?.requested_orders || 0}
          </p>
          <span className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 block">Requieren visto bueno</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Aprobadas (En Espera)</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center">
              <Check className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-2 font-montserrat">
            {stats?.approved_orders || 0}
          </p>
          <span className="text-[10px] text-indigo-500 mt-1 block">Listas para recepción</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Recibido (Costo)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-2 font-montserrat truncate">
            {formatCurrency(stats?.total_received_amount)}
          </p>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 block">Ingresado al inventario</span>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por número de OC (ej. OC-2026-0001), proveedor o factura..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-hidden dark:text-white"
            />
          </form>

          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="REQUESTED">Solicitada (Pendiente)</option>
              <option value="APPROVED">Aprobada</option>
              <option value="RECEIVED">Recibida (En Stock)</option>
              <option value="CANCELLED">Cancelada</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de Órdenes */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-brand-500" />
            <span className="text-xs">Cargando órdenes de compra...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
            <ShoppingCart className="w-10 h-10 text-slate-300 dark:text-slate-700" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              No hay órdenes de compra registradas
            </p>
            <p className="text-xs text-slate-400 max-w-sm">
              Genera tu primera orden de compra para abastecer inventario o registrar compras con proveedores.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">N° Orden</th>
                  <th className="px-4 py-3.5">Proveedor</th>
                  <th className="px-4 py-3.5">Fecha Emisión</th>
                  <th className="px-4 py-3.5">Items</th>
                  <th className="px-4 py-3.5 text-right">Monto Total</th>
                  <th className="px-4 py-3.5 text-center">Estado</th>
                  <th className="px-5 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex flex-col">
                        <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">
                          {o.order_number}
                        </span>
                        {o.invoice_number && (
                          <span className="text-[10.5px] text-slate-400 font-mono mt-0.5">
                            Fact: {o.invoice_number}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {o.supplier_name || 'N/A'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {o.payment_method.replace('_', ' ')}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-4 text-slate-500">
                      {new Date(o.issue_date).toLocaleDateString('es-CO')}
                    </td>

                    <td className="px-4 py-4">
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md text-[11px] font-medium">
                        {o.items.length} {o.items.length === 1 ? 'artículo' : 'artículos'}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(Number(o.total_amount))}
                    </td>

                    <td className="px-4 py-4 text-center">
                      {getStatusBadge(o.status)}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedOrder(o);
                            setIsDetailOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-950/30 rounded-lg transition-colors cursor-pointer"
                          title="Ver detalle"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Botón Aprobar */}
                        {o.status === 'REQUESTED' && (
                          <Can permissions={['purchase_orders:approve', 'purchase_orders.approve']}>
                            <button
                              onClick={() => handleApproveOrder(o)}
                              className="px-2.5 py-1 text-[11px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
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
                              onClick={() => {
                                setSelectedOrder(o);
                                setIsReceiveOpen(true);
                              }}
                              className="px-2.5 py-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                              title="Recibir mercancía"
                            >
                              <PackageCheck className="w-3.5 h-3.5" /> Recibir
                            </button>
                          </Can>
                        )}

                        {/* Botón Anular */}
                        {o.status !== 'RECEIVED' && o.status !== 'CANCELLED' && (
                          <Can permissions={['purchase_orders:cancel', 'purchase_orders.cancel']}>
                            <button
                              onClick={() => handleCancelOrder(o)}
                              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
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
