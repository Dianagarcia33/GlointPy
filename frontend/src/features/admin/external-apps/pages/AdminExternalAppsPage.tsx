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
  X
} from 'lucide-react';
import { ExternalApp, ExternalPaymentOrder, externalAppsService } from '../../../../services/externalApps';
import { ExternalAppModal } from '../components/ExternalAppModal';
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

  const handleRegenerateKey = async (app: ExternalApp) => {
    if (!window.confirm(`¿Estás seguro de regenerar la API Key de "${app.name}"? La llave anterior dejará de funcionar de inmediato.`)) {
      return;
    }

    try {
      setIsRegenerating(app.id);
      const res = await externalAppsService.regenerateApiKey(app.id);
      setRegeneratedKeyData(res);
      setSuccess(`Nueva API Key generada para ${app.name}.`);
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

  // Metrics
  const totalVolume = apps.reduce((sum, a) => sum + (a.total_volume_processed || 0), 0);
  const totalOrders = apps.reduce((sum, a) => sum + (a.total_orders || 0), 0);
  const activeAppsCount = apps.filter(a => a.is_active).length;

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

      {/* Header Ejecutivo Principal */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute right-0 top-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-bold text-brand-300 backdrop-blur-sm">
            <Globe className="w-4 h-4 text-emerald-400" /> Pasarela de Pagos & API Externa
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight font-montserrat">
            Apps Externas (Gloint Pay)
          </h1>
          <p className="text-slate-300 text-sm max-w-xl">
            Conecta comercios y aplicaciones externas para cobrar y debitar automáticamente saldo de las billeteras de usuarios Gloint.
          </p>
        </div>
        
        <div className="relative z-10 flex flex-wrap items-center gap-3 shrink-0">
          <button 
            onClick={handleCreate}
            className="flex items-center gap-2 px-6 py-3 bg-brand-500 text-white rounded-2xl hover:bg-brand-600 transition-all shadow-lg shadow-brand-500/30 text-sm font-bold cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Aplicación</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider font-montserrat">Apps Registradas</span>
            <Globe className="w-4 h-4 text-brand-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-montserrat">{apps.length}</p>
          <span className="text-[11px] text-slate-500 font-medium">{activeAppsCount} activas para cobros</span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider font-montserrat">Volumen Procesado</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600 font-montserrat">{formatCurrency(totalVolume)}</p>
          <span className="text-[11px] text-slate-500 font-medium">Cobrado en billeteras Gloint</span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider font-montserrat">Órdenes Completadas</span>
            <ShoppingBag className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-montserrat">{totalOrders}</p>
          <span className="text-[11px] text-slate-500 font-medium">Transacciones exitosas</span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider font-montserrat">Estado del Gateway</span>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-lg font-black text-emerald-700 font-montserrat flex items-center gap-1.5 mt-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Operacional (100%)
          </p>
          <span className="text-[11px] text-slate-500 font-medium">Checkout y Webhooks listos</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('apps')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'apps'
              ? 'border-brand-600 text-brand-600 bg-brand-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-t-xl'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Aplicaciones Conectadas ({apps.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'orders'
              ? 'border-brand-600 text-brand-600 bg-brand-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-t-xl'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Historial de Cobros & Órdenes</span>
        </button>
      </div>

      {/* Tab 1: Apps Table */}
      {activeTab === 'apps' && (
        <div className="bg-white rounded-3xl shadow-xs border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider font-montserrat">
                <tr>
                  <th className="px-6 py-4">Comercio / App</th>
                  <th className="px-6 py-4">Client ID</th>
                  <th className="px-6 py-4">Webhook URL</th>
                  <th className="px-6 py-4">Volumen Cobrado</th>
                  <th className="px-6 py-4 text-center">Órdenes</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-center">Acciones</th>
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
                    <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 text-sm font-montserrat">{app.name}</div>
                        {app.description && <div className="text-xs text-slate-400 max-w-xs truncate">{app.description}</div>}
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-mono text-xs text-slate-700 bg-slate-100 px-2 py-1 rounded-md font-bold">
                          {app.client_id}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        {app.webhook_url ? (
                          <span className="text-xs text-slate-600 font-mono max-w-xs truncate block" title={app.webhook_url}>
                            {app.webhook_url}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No configurado</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-bold text-emerald-700 font-montserrat text-sm">
                          {formatCurrency(app.total_volume_processed || 0)}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-xl text-xs">
                          {app.total_orders || 0}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${
                          app.is_active 
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${app.is_active ? 'bg-emerald-600' : 'bg-slate-400'}`}></span>
                          {app.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleRegenerateKey(app)}
                            disabled={isRegenerating === app.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-50 rounded-xl transition-all border border-amber-200 cursor-pointer"
                            title="Regenerar API Key secreta"
                          >
                            {isRegenerating === app.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
                            <span className="hidden sm:inline">Nueva Key</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleEdit(app)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-brand-600 hover:bg-brand-50 rounded-xl transition-all border border-brand-200 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingApp(app)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-rose-200 cursor-pointer"
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
        <div className="bg-white rounded-3xl shadow-xs border border-slate-200 overflow-hidden space-y-4 p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por referencia, comercio o usuario..."
                value={searchOrder}
                onChange={(e) => setSearchOrder(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
            <button
              onClick={fetchOrders}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Refrescar órdenes"
            >
              <RefreshCw className={`w-4 h-4 ${ordersLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Comercio</th>
                  <th className="py-3 px-4">Referencia Orden</th>
                  <th className="py-3 px-4">Inversionista Pagador</th>
                  <th className="py-3 px-4 text-right">Monto Cobrado</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-center">Webhook</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {ordersLoading ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-600" />
                      Cargando órdenes...
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
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
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase ${
                          o.webhook_status === 'sent'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : o.webhook_status === 'pending'
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {o.webhook_status}
                        </span>
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
      {deletingApp && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200" style={{ margin: 0 }}>
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-100 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold font-montserrat text-slate-900">Eliminar Aplicación</h3>
            </div>
            <p className="text-slate-600 text-sm">
              ¿Estás seguro de que deseas eliminar la aplicación <strong className="text-slate-800">"{deletingApp.name}"</strong>? Sus credenciales de API dejarán de funcionar permanentemente.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={() => setDeletingApp(null)}
                disabled={isDeleting}
                className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-rose-600/20 flex items-center gap-2 cursor-pointer"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar Eliminación'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
