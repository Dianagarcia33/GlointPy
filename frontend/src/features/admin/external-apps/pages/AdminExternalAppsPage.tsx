import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Plus, 
  Key, 
  RefreshCw, 
  Edit2, 
  Trash2, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  DollarSign, 
  Activity, 
  ShoppingBag, 
  Send, 
  ExternalLink,
  Lock,
  Copy,
  Check,
  Search,
  RotateCcw,
  X
} from 'lucide-react';
import { ExternalApp, ExternalPaymentOrder, externalAppsService } from '../../../../services/externalApps';
import { ExternalAppModal } from '../components/ExternalAppModal';
import { ConfirmationModal } from '../../../../components/common/ConfirmationModal';
import { Can } from '../../../../components/security/Can';
import { formatCurrency } from '../../../../utils/format';

export const AdminExternalAppsPage: React.FC = () => {
  const [apps, setApps] = useState<ExternalApp[]>([]);
  const [orders, setOrders] = useState<ExternalPaymentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'apps' | 'orders'>('apps');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<ExternalApp | null>(null);

  // Deleting state
  const [deletingApp, setDeletingApp] = useState<ExternalApp | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Key regeneration state
  const [regeneratingApp, setRegeneratingApp] = useState<ExternalApp | null>(null);

  // Regenerated key display modal state
  const [regeneratedKeyData, setRegeneratedKeyData] = useState<{
    app_id: number;
    name: string;
    client_id: string;
    api_key: string;
    webhook_secret: string;
    message: string;
  } | null>(null);
  const [isRegenerating, setIsRegenerating] = useState<number | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Webhook resend & detail modal states
  const [resendingWebhookId, setResendingWebhookId] = useState<number | null>(null);
  const [selectedWebhookOrder, setSelectedWebhookOrder] = useState<ExternalPaymentOrder | null>(null);

  const [searchOrder, setSearchOrder] = useState('');

  const fetchApps = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await externalAppsService.getApps();
      setApps(data);
    } catch (err: any) {
      console.error('Error fetching external apps:', err);
      setError(err.message || 'Error al cargar las aplicaciones externas.');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      setOrdersLoading(true);
      const data = await externalAppsService.getAllOrders(200);
      setOrders(data);
    } catch (err: any) {
      console.error('Error fetching orders:', err);
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrders();
    }
  }, [activeTab]);

  const handleCreate = () => {
    setEditingApp(null);
    setIsModalOpen(true);
  };

  const handleEdit = (app: ExternalApp) => {
    setEditingApp(app);
    setIsModalOpen(true);
  };

  const confirmRegenerateKey = async () => {
    if (!regeneratingApp) return;
    const targetApp = regeneratingApp;
    setRegeneratingApp(null);

    try {
      setIsRegenerating(targetApp.id);
      const res = await externalAppsService.regenerateApiKey(targetApp.id);
      setRegeneratedKeyData(res);
      setSuccess(`Nueva API Key generada para ${targetApp.name}.`);
      fetchApps();
    } catch (err: any) {
      setError(err.message || 'Error al regenerar API Key.');
    } finally {
      setIsRegenerating(null);
    }
  };

  const confirmDelete = async () => {
    if (!deletingApp) return;
    try {
      setIsDeleting(true);
      await externalAppsService.deleteApp(deletingApp.id);
      setSuccess(`Aplicación "${deletingApp.name}" eliminada correctamente.`);
      setTimeout(() => setSuccess(null), 5000);
      setDeletingApp(null);
      fetchApps();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar aplicación.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleResendWebhook = async (orderId: number) => {
    try {
      setResendingWebhookId(orderId);
      setError(null);
      const res = await externalAppsService.resendWebhook(orderId);
      
      setOrders(prev => prev.map(o => o.id === orderId ? {
        ...o,
        webhook_status: res.webhook_status,
        webhook_attempts: res.webhook_attempts,
        webhook_response: res.webhook_response
      } : o));

      if (selectedWebhookOrder && selectedWebhookOrder.id === orderId) {
        setSelectedWebhookOrder(prev => prev ? {
          ...prev,
          webhook_status: res.webhook_status,
          webhook_attempts: res.webhook_attempts,
          webhook_response: res.webhook_response
        } : null);
      }

      if (res.status === 'success' || res.webhook_status === 'sent') {
        setSuccess(res.message || 'Webhook entregado exitosamente.');
      } else {
        setError(res.message || 'El webhook no pudo ser entregado.');
      }
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Error al reenviar webhook.');
    } finally {
      setResendingWebhookId(null);
    }
  };

  // Metrics
  const totalVolume = apps.reduce((sum, a) => sum + (a.total_volume_processed || 0), 0);
  const totalOrders = apps.reduce((sum, a) => sum + (a.total_orders || 0), 0);
  const activeAppsCount = apps.filter(a => a.is_active).length;

  const completedOrders = orders.filter(o => o.status === 'completed');
  const failedWebhooks = completedOrders.filter(o => o.webhook_status === 'failed');
  const webhookSuccessRate = completedOrders.length > 0 
    ? Math.round(((completedOrders.length - failedWebhooks.length) / completedOrders.length) * 100)
    : 100;
  const isGatewayHealthy = failedWebhooks.length === 0;

  const filteredOrders = orders.filter(o => {
    if (!searchOrder.trim()) return true;
    const q = searchOrder.toLowerCase();
    return o.order_reference.toLowerCase().includes(q) ||
           (o.app_name && o.app_name.toLowerCase().includes(q)) ||
           (o.user_name && o.user_name.toLowerCase().includes(q)) ||
           o.payment_token.toLowerCase().includes(q);
  });

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in duration-300">
      
      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-emerald-800 shadow-xs font-medium text-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="p-1 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer">
            <X className="w-4 h-4 text-emerald-700" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-rose-800 shadow-xs font-medium text-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="p-1 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer">
            <X className="w-4 h-4 text-rose-700" />
          </button>
        </div>
      )}

      {/* Header Ejecutivo Estandarizado */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-montserrat tracking-tight text-slate-900 flex items-center gap-3">
            <span className="p-2.5 bg-brand-50 text-brand-600 rounded-2xl border border-brand-100/60 shadow-2xs inline-flex items-center justify-center">
              <Globe className="w-6 h-6" />
            </span>
            <span>Apps Externas (Gloint Pay)</span>
          </h1>
          <p className="text-sm text-slate-500 font-normal mt-1.5 whitespace-nowrap sm:whitespace-normal">
            Conecta comercios y aplicaciones externas para cobrar y debitar automáticamente saldo de las billeteras de usuarios Gloint.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
          <button
            onClick={() => {
              fetchApps();
              if (activeTab === 'orders') fetchOrders();
            }}
            disabled={loading || ordersLoading}
            className="p-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-2xl transition-all shadow-2xs hover:border-slate-300 disabled:opacity-50 cursor-pointer"
            title="Recargar datos"
          >
            <RefreshCw className={`w-4 h-4 ${loading || ordersLoading ? 'animate-spin text-brand-600' : ''}`} />
          </button>

          <Can permission="admin.external_apps.manage">
            <button
              onClick={handleCreate}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs rounded-2xl shadow-sm transition-all cursor-pointer font-montserrat"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Aplicación</span>
            </button>
          </Can>
        </div>
      </div>

      {/* 4 Tarjetas KPI Luminosas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-montserrat">Apps Registradas</p>
            <h3 className="text-2xl font-black text-slate-800 mt-1 font-montserrat">
              {apps.length}
            </h3>
            <span className="text-[11px] text-brand-600 font-bold">{activeAppsCount} activas para cobros</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 shadow-2xs">
            <Globe className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-montserrat">Volumen Procesado</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-1 font-montserrat">
              {formatCurrency(totalVolume)}
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">en billeteras Gloint</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-2xs">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-montserrat">Órdenes Pagadas</p>
            <h3 className="text-2xl font-black text-slate-800 mt-1 font-montserrat">
              {totalOrders}
            </h3>
            <span className="text-[11px] text-blue-600 font-bold">transacciones exitosas</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-montserrat">Estado Gateway</p>
            <h3 className={`text-xl font-black mt-1 font-montserrat flex items-center gap-1.5 ${isGatewayHealthy ? 'text-emerald-700' : 'text-amber-700'}`}>
              <span className={`w-2.5 h-2.5 rounded-full ${isGatewayHealthy ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
              {isGatewayHealthy ? 'Operacional' : `${webhookSuccessRate}% entrega`}
            </h3>
            <span className={`text-[11px] font-medium ${isGatewayHealthy ? 'text-emerald-600' : 'text-rose-600'}`}>
              {isGatewayHealthy ? 'Webhooks al 100%' : `${failedWebhooks.length} webhooks pendientes`}
            </span>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xs ${
            isGatewayHealthy ? 'bg-emerald-50 border border-emerald-100 text-emerald-600' : 'bg-amber-50 border border-amber-100 text-amber-600'
          }`}>
            <Activity className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tabs Selector Cápsula */}
      <div className="flex bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('apps')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer font-montserrat ${
            activeTab === 'apps'
              ? 'bg-white text-brand-700 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Aplicaciones Conectadas ({apps.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer font-montserrat ${
            activeTab === 'orders'
              ? 'bg-white text-brand-700 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Historial de Cobros & Órdenes</span>
        </button>
      </div>

      {/* Tab 1: Apps Table */}
      {activeTab === 'apps' && (
        <div className="bg-white rounded-3xl shadow-xs border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/70 text-slate-400 font-bold border-b border-slate-100 uppercase text-[11px] tracking-wider font-montserrat">
                <tr>
                  <th className="px-4 py-3.5 text-left min-w-[160px] xl:min-w-[180px]">Comercio / App</th>
                  <th className="px-3 py-3.5 text-left whitespace-nowrap min-w-[130px]">Client ID</th>
                  <th className="px-3 py-3.5 text-left min-w-[150px] max-w-[200px]">Webhook URL</th>
                  <th className="px-3 py-3.5 text-right whitespace-nowrap min-w-[110px]">Volumen</th>
                  <th className="px-3 py-3.5 text-center whitespace-nowrap min-w-[70px]">Órdenes</th>
                  <th className="px-3 py-3.5 text-center whitespace-nowrap min-w-[90px]">Estado</th>
                  <th className="px-3 py-3.5 text-center sticky right-0 z-20 bg-slate-50 border-l border-slate-200/90 shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.06)] min-w-[130px] xl:min-w-[180px] whitespace-nowrap">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-600" />
                      Cargando aplicaciones externas...
                    </td>
                  </tr>
                ) : apps.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Globe className="w-8 h-8 text-slate-300" />
                        <p className="font-semibold text-slate-700">No hay aplicaciones externas registradas aún.</p>
                        <button onClick={handleCreate} className="text-brand-600 font-bold hover:underline text-xs mt-1 cursor-pointer">
                          + Registrar la primera aplicación externa
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  apps.map((app) => (
                    <tr key={app.id} className="group hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900 text-sm font-montserrat max-w-[160px] xl:max-w-xs truncate" title={app.name}>
                          {app.name}
                        </div>
                        {app.description && (
                          <div className="text-xs text-slate-400 max-w-[160px] xl:max-w-xs truncate" title={app.description}>
                            {app.description}
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-3.5 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-700 bg-slate-100/90 px-2 py-1 rounded-lg font-bold border border-slate-200/60">
                          <span>{app.client_id}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(app.client_id, `client_${app.id}`)}
                            className="text-slate-400 hover:text-slate-700 transition-colors p-0.5 cursor-pointer"
                            title="Copiar Client ID"
                          >
                            {copiedKey === `client_${app.id}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>

                      <td className="px-3 py-3.5">
                        {app.webhook_url ? (
                          <div className="flex items-center gap-1.5 max-w-[150px] lg:max-w-[180px] xl:max-w-[210px]">
                            {app.webhook_url.startsWith('https://') ? (
                              <span className="text-emerald-600 bg-emerald-50 border border-emerald-200/60 p-1 rounded-md shrink-0" title="Endpoint HTTPS Seguro con TLS">
                                <Lock className="w-3 h-3" />
                              </span>
                            ) : (
                              <span className="text-amber-600 bg-amber-50 border border-amber-200/60 p-1 rounded-md shrink-0" title="Advertencia: Endpoint sin cifrado HTTPS">
                                <AlertCircle className="w-3 h-3" />
                              </span>
                            )}
                            <span className="text-xs text-slate-600 font-mono truncate block" title={app.webhook_url}>
                              {app.webhook_url}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No configurado</span>
                        )}
                      </td>

                      <td className="px-3 py-3.5 text-right whitespace-nowrap">
                        <span className="font-bold text-emerald-700 font-montserrat text-sm">
                          {formatCurrency(app.total_volume_processed || 0)}
                        </span>
                      </td>

                      <td className="px-3 py-3.5 text-center whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-lg text-xs">
                          {app.total_orders || 0}
                        </span>
                      </td>

                      <td className="px-3 py-3.5 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                          app.is_active 
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${app.is_active ? 'bg-emerald-600' : 'bg-slate-400'}`}></span>
                          {app.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>

                      <td className="px-3 py-3.5 text-center sticky right-0 z-10 bg-white group-hover:bg-slate-50/95 transition-colors border-l border-slate-200/90 shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.06)] whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setRegeneratingApp(app)}
                            disabled={isRegenerating === app.id}
                            className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-bold text-amber-700 bg-amber-50/70 hover:bg-amber-100 rounded-xl transition-all border border-amber-200/80 cursor-pointer shadow-xs"
                            title="Regenerar API Key secreta"
                          >
                            {isRegenerating === app.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
                            <span className="hidden xl:inline text-[11px]">Nueva Key</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleEdit(app)}
                            className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-bold text-brand-600 bg-brand-50/70 hover:bg-brand-100 rounded-xl transition-all border border-brand-200/80 cursor-pointer shadow-xs"
                            title="Editar aplicación"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span className="hidden xl:inline text-[11px]">Editar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingApp(app)}
                            className="inline-flex items-center justify-center p-1.5 text-xs font-bold text-rose-600 bg-rose-50/70 hover:bg-rose-100 rounded-xl transition-all border border-rose-200/80 cursor-pointer shadow-xs"
                            title="Eliminar aplicación"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Orders History */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-3xl shadow-xs border border-slate-100 overflow-hidden space-y-4 p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por referencia, comercio o usuario..."
                value={searchOrder}
                onChange={(e) => setSearchOrder(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 shadow-2xs"
              />
            </div>
            <button
              onClick={fetchOrders}
              className="p-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-2xs cursor-pointer"
              title="Refrescar órdenes"
            >
              <RefreshCw className={`w-4 h-4 ${ordersLoading ? 'animate-spin text-brand-600' : ''}`} />
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-2xs">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-bold uppercase text-[11px] tracking-wider font-montserrat">
                <tr>
                  <th className="py-3.5 px-4">Fecha</th>
                  <th className="py-3.5 px-4">Comercio</th>
                  <th className="py-3.5 px-4">Referencia Orden</th>
                  <th className="py-3.5 px-4">Inversionista Pagador</th>
                  <th className="py-3.5 px-4 text-right">Monto Cobrado</th>
                  <th className="py-3.5 px-4 text-center">Estado Pago</th>
                  <th className="py-3.5 px-4 text-center">Webhook</th>
                  <th className="py-3.5 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {ordersLoading ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-600" />
                      Cargando órdenes...
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400">
                      No se encontraron órdenes registradas.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {new Date(o.created_at).toLocaleString('es-CO')}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {o.app_name}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-brand-700">
                        {o.order_reference}
                      </td>
                      <td className="py-3 px-4 text-slate-800">
                        {o.user_name || <span className="text-slate-400 italic">Pendiente de pago</span>}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-extrabold text-slate-900">
                        {formatCurrency(o.amount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          o.status === 'completed' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : o.status === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                        }`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase ${
                              o.webhook_status === 'sent'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : o.webhook_status === 'pending'
                                  ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {o.webhook_status}
                            </span>
                            {(o.webhook_attempts || 0) > 0 && (
                              <span className="text-[10px] text-slate-500 font-mono" title={`${o.webhook_attempts} intento(s) registrado(s)`}>
                                ({o.webhook_attempts})
                              </span>
                            )}
                          </div>
                          {o.webhook_response && (
                            <button
                              type="button"
                              onClick={() => setSelectedWebhookOrder(o)}
                              className="text-[10px] text-brand-600 hover:text-brand-800 underline font-medium cursor-pointer"
                              title="Ver respuesta y detalle técnico"
                            >
                              Ver detalle
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {o.status === 'completed' ? (
                          <button
                            type="button"
                            onClick={() => handleResendWebhook(o.id)}
                            disabled={resendingWebhookId === o.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-bold rounded-xl border border-brand-200 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                            title="Reenviar webhook de confirmación al comercio"
                          >
                            {resendingWebhookId === o.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <RotateCcw className="w-3.5 h-3.5" />
                            )}
                            <span>Reenviar</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">No aplica</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Nueva / Editar App */}
      <ExternalAppModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={() => fetchApps()}
        app={editingApp}
      />

      {/* Modal Nueva Llave Generada */}
      {regeneratedKeyData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4" style={{ margin: 0 }}>
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in duration-200">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100">
                <Key className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-montserrat text-slate-900">Nueva API Key Generada</h3>
                <p className="text-xs text-slate-500 font-medium">{regeneratedKeyData.name}</p>
              </div>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs">
              Guarda esta llave en un lugar seguro. La API Key anterior fue revocada y esta no volverá a mostrarse.
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-brand-700">
                API Key Secreta
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={regeneratedKeyData.api_key}
                  className="flex-1 px-3.5 py-2.5 bg-brand-50/50 border border-brand-200 rounded-xl font-mono text-xs text-brand-900 font-bold select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(regeneratedKeyData.api_key, 'regen_key')}
                  className="p-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  {copiedKey === 'regen_key' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setRegeneratedKeyData(null)}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Listo, ya la guardé
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmación Eliminar */}
      <ConfirmationModal
        isOpen={!!deletingApp}
        onClose={() => setDeletingApp(null)}
        onConfirm={confirmDelete}
        title="Eliminar Aplicación"
        description={
          deletingApp ? (
            <span>
              ¿Estás seguro de que deseas eliminar la aplicación <strong className="text-slate-800">"{deletingApp.name}"</strong>? Sus credenciales de API dejarán de funcionar permanentemente.
            </span>
          ) : undefined
        }
        confirmText="Confirmar Eliminación"
        cancelText="Cancelar"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* Modal Confirmación Regenerar Key */}
      <ConfirmationModal
        isOpen={!!regeneratingApp}
        onClose={() => setRegeneratingApp(null)}
        onConfirm={confirmRegenerateKey}
        title="Regenerar API Key Secreta"
        description={
          regeneratingApp ? (
            <span>
              ¿Estás seguro de que deseas regenerar la API Key de <strong className="text-slate-800">"{regeneratingApp.name}"</strong>? La llave anterior dejará de funcionar de inmediato y deberás actualizar tus servidores.
            </span>
          ) : undefined
        }
        confirmText="Regenerar Llave"
        cancelText="Cancelar"
        variant="warning"
        isLoading={isRegenerating === regeneratingApp?.id}
      />

      {/* Modal Detalle de Webhook */}
      {selectedWebhookOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" style={{ margin: 0 }}>
          <div className="bg-white rounded-3xl w-full max-w-xl p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-slate-900">
                <div className={`p-2.5 rounded-xl ${
                  selectedWebhookOrder.webhook_status === 'sent' 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : selectedWebhookOrder.webhook_status === 'failed'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-slate-100 text-slate-700'
                }`}>
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-montserrat">Detalle del Webhook</h3>
                  <p className="text-xs text-slate-500 font-mono">Orden: {selectedWebhookOrder.order_reference}</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedWebhookOrder(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div>
                <span className="text-slate-400 font-semibold uppercase text-[10px] block">Comercio</span>
                <span className="font-bold text-slate-800">{selectedWebhookOrder.app_name}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase text-[10px] block">Estado Entrega</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase mt-0.5 ${
                  selectedWebhookOrder.webhook_status === 'sent'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {selectedWebhookOrder.webhook_status}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 font-semibold uppercase text-[10px] block">URL de Destino</span>
                <span className="font-mono text-slate-700 break-all text-[11px] block mt-0.5">
                  {selectedWebhookOrder.webhook_url || 'No especificada'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase text-[10px] block">Intentos Realizados</span>
                <span className="font-mono font-bold text-slate-800">{selectedWebhookOrder.webhook_attempts || 0}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase text-[10px] block">Completado En</span>
                <span className="font-mono text-slate-700 text-[11px]">
                  {selectedWebhookOrder.completed_at ? new Date(selectedWebhookOrder.completed_at).toLocaleString('es-CO') : 'N/A'}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                Código / Cuerpo de Respuesta del Servidor
              </label>
              <div className="bg-slate-900 rounded-xl p-3.5 border border-slate-800 text-slate-200 font-mono text-xs overflow-x-auto max-h-48 whitespace-pre-wrap select-all">
                {selectedWebhookOrder.webhook_response || 'No hay respuesta técnica registrada para este webhook.'}
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => setSelectedWebhookOrder(null)}
                className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                Cerrar
              </button>
              
              {selectedWebhookOrder.status === 'completed' && (
                <button
                  type="button"
                  onClick={() => handleResendWebhook(selectedWebhookOrder.id)}
                  disabled={resendingWebhookId === selectedWebhookOrder.id}
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-brand-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {resendingWebhookId === selectedWebhookOrder.id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Reenviando...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      <span>Reenviar Webhook Ahora</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
