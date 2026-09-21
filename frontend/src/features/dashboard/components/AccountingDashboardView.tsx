import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Calculator, 
  Coins, 
  CreditCard, 
  ArrowUpRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ExternalLink, 
  Eye, 
  FileText, 
  Landmark, 
  RefreshCw, 
  User, 
  X,
  Wallet,
  Building2,
  TrendingDown
} from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { 
  analyticsService, 
  AccountingAnalyticsDashboardData,
  PendingInvestmentRequestItem,
  PendingRechargeItem,
  PendingWithdrawalItem
} from '../../../services/analytics';
import { formatColombiaDate } from '../../../utils/format';

export const AccountingDashboardView: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'investments' | 'recharges' | 'withdrawals'>('investments');
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery<AccountingAnalyticsDashboardData>({
    queryKey: ['accounting_analytics_dashboard'],
    queryFn: () => analyticsService.getAccountingAnalyticsDashboard(),
    refetchInterval: 30000, // Refresca cada 30 segundos automáticamente
  });

  const formatCurrency = (val: number) => {
    return `$${(val || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6 w-full min-w-0 animate-pulse">
        <div className="bg-slate-900 rounded-3xl p-8 h-40 shadow-xl"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200 h-28"></div>
          ))}
        </div>
        <div className="bg-white rounded-3xl p-8 border border-slate-200 h-96"></div>
      </div>
    );
  }

  const cards = data?.summary_cards || {
    pending_investments_count: 0,
    pending_investments_amount: 0,
    pending_recharges_count: 0,
    pending_recharges_amount: 0,
    pending_withdrawals_count: 0,
    pending_withdrawals_amount: 0,
    total_pending_action_amount: 0,
  };

  const pendingInvestments = data?.pending_investment_requests || [];
  const pendingRecharges = data?.pending_recharges || [];
  const pendingWithdrawals = data?.pending_withdrawals || [];

  const totalItemsCount = 
    cards.pending_investments_count + 
    cards.pending_recharges_count + 
    cards.pending_withdrawals_count;

  return (
    <div className="space-y-6 w-full min-w-0">
      
      {/* Header Ejecutivo de Contabilidad & Tesorería */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-white/10 rounded-full text-xs font-bold text-emerald-300 backdrop-blur-sm font-montserrat">
            <Calculator className="w-4 h-4 text-emerald-400" /> Dirección Contable, Conciliación & Pagos
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight font-montserrat">
            Hola, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            Centro de operaciones financieras. Monitorea y concilia solicitudes de inversión, recargas bancarias y pagos a inversionistas.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-right">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block font-montserrat">
              Pendientes de Acción
            </span>
            <span className="text-lg font-black text-amber-400 font-mono">
              {totalItemsCount} ítems
            </span>
          </div>

          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl border border-white/10 transition-all cursor-pointer"
            title="Refrescar datos contables"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tarjetas de KPIs Financieros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 w-full min-w-0">
        
        {/* Card 1: Solicitudes de Inversión */}
        <div 
          onClick={() => setActiveTab('investments')}
          className={`bg-white border rounded-2xl p-5 shadow-xs transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
            activeTab === 'investments' 
              ? 'border-brand-500 ring-2 ring-brand-500/20 shadow-md' 
              : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block font-montserrat">
              Solicitudes Inversión
            </span>
            <span className="w-7 h-7 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <FileText className="w-3.5 h-3.5" />
            </span>
          </div>
          <span className="text-xl sm:text-2xl font-black text-brand-700 block tracking-tight font-mono truncate" title={formatCurrency(cards.pending_investments_amount)}>
            {formatCurrency(cards.pending_investments_amount)}
          </span>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
            <span className="text-slate-500 font-semibold">
              {cards.pending_investments_count} por aprobar
            </span>
            <span className="text-[10px] font-bold text-brand-600">Ver listado →</span>
          </div>
        </div>

        {/* Card 2: Recargas de Billetera */}
        <div 
          onClick={() => setActiveTab('recharges')}
          className={`bg-white border rounded-2xl p-5 shadow-xs transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
            activeTab === 'recharges' 
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md' 
              : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block font-montserrat">
              Recargas Billetera
            </span>
            <span className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Wallet className="w-3.5 h-3.5" />
            </span>
          </div>
          <span className="text-xl sm:text-2xl font-black text-emerald-700 block tracking-tight font-mono truncate" title={formatCurrency(cards.pending_recharges_amount)}>
            {formatCurrency(cards.pending_recharges_amount)}
          </span>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
            <span className="text-slate-500 font-semibold">
              {cards.pending_recharges_count} por conciliar
            </span>
            <span className="text-[10px] font-bold text-emerald-600">Ver listado →</span>
          </div>
        </div>

        {/* Card 3: Pagos / Retiros */}
        <div 
          onClick={() => setActiveTab('withdrawals')}
          className={`bg-white border rounded-2xl p-5 shadow-xs transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
            activeTab === 'withdrawals' 
              ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-md' 
              : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block font-montserrat">
              Retiros / Pagos
            </span>
            <span className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Landmark className="w-3.5 h-3.5" />
            </span>
          </div>
          <span className="text-xl sm:text-2xl font-black text-amber-700 block tracking-tight font-mono truncate" title={formatCurrency(cards.pending_withdrawals_amount)}>
            {formatCurrency(cards.pending_withdrawals_amount)}
          </span>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
            <span className="text-slate-500 font-semibold">
              {cards.pending_withdrawals_count} por transferir
            </span>
            <span className="text-[10px] font-bold text-amber-700">Ver listado →</span>
          </div>
        </div>

        {/* Card 4: Total Pendiente */}
        <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block font-montserrat">
              Total Operaciones
            </span>
            <span className="w-7 h-7 rounded-xl bg-white/10 text-white flex items-center justify-center">
              <Coins className="w-3.5 h-3.5" />
            </span>
          </div>
          <span className="text-xl sm:text-2xl font-black text-emerald-400 block tracking-tight font-mono truncate" title={formatCurrency(cards.total_pending_action_amount)}>
            {formatCurrency(cards.total_pending_action_amount)}
          </span>
          <div className="text-xs pt-1 border-t border-slate-800 text-slate-400">
            Flujo financiero pendiente de gestión
          </div>
        </div>

      </div>

      {/* Tabs de Detalle y Gestión */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        
        {/* Cabecera de Tabs */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setActiveTab('investments')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 font-montserrat whitespace-nowrap ${
                activeTab === 'investments'
                  ? 'bg-brand-50 text-brand-700 border border-brand-200 shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Solicitudes de Inversión</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                activeTab === 'investments' ? 'bg-brand-200 text-brand-900' : 'bg-slate-100 text-slate-600'
              }`}>
                {cards.pending_investments_count}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('recharges')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 font-montserrat whitespace-nowrap ${
                activeTab === 'recharges'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Recargas de Billetera</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                activeTab === 'recharges' ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-100 text-slate-600'
              }`}>
                {cards.pending_recharges_count}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('withdrawals')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 font-montserrat whitespace-nowrap ${
                activeTab === 'withdrawals'
                  ? 'bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Landmark className="w-3.5 h-3.5" />
              <span>Retiros / Pagos</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                activeTab === 'withdrawals' ? 'bg-amber-200 text-amber-900' : 'bg-slate-100 text-slate-600'
              }`}>
                {cards.pending_withdrawals_count}
              </span>
            </button>
          </div>

          {/* Enlace al módulo completo correspondiente */}
          <div>
            {activeTab === 'investments' && (
              <button
                onClick={() => navigate('/dashboard/investments')}
                className="text-xs font-bold text-brand-600 hover:text-brand-800 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Módulo de Inversiones</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
            {activeTab === 'recharges' && (
              <button
                onClick={() => navigate('/dashboard/wallet')}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-800 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Módulo de Billeteras</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
            {activeTab === 'withdrawals' && (
              <button
                onClick={() => navigate('/dashboard/payments')}
                className="text-xs font-bold text-amber-700 hover:text-amber-900 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Módulo de Pagos</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: SOLICITUDES DE INVERSIÓN */}
        {activeTab === 'investments' && (
          <div className="p-4 sm:p-6">
            {pendingInvestments.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-2" />
                <p className="font-bold text-slate-700 text-sm">No hay solicitudes de inversión pendientes</p>
                <p className="mt-1">Todas las inversiones han sido verificadas y aprobadas.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider font-montserrat">
                    <tr>
                      <th className="px-4 py-3">Inversionista</th>
                      <th className="px-4 py-3">Paquete Solicitado</th>
                      <th className="px-4 py-3">Monto</th>
                      <th className="px-4 py-3">Fecha Solicitud</th>
                      <th className="px-4 py-3 text-center">Comprobante</th>
                      <th className="px-4 py-3 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-xs">
                    {pendingInvestments.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="font-extrabold text-slate-900">{req.user_name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{req.user_email}</div>
                          {req.user_document && (
                            <div className="text-[10px] text-slate-400">Doc: {req.user_document}</div>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="px-2.5 py-0.5 bg-brand-50 text-brand-800 border border-brand-200 rounded-lg text-[11px] font-bold">
                            {req.package_name}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-extrabold text-slate-900 font-mono text-sm">
                          {formatCurrency(req.monto)}
                        </td>
                        <td className="px-4 py-3.5 text-slate-500">
                          {req.created_at ? formatColombiaDate(req.created_at) : 'N/A'}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {req.comprobante_path ? (
                            <button
                              onClick={() => setSelectedReceipt(req.comprobante_path || null)}
                              className="px-2.5 py-1 text-xs font-bold text-slate-700 hover:text-brand-600 hover:bg-brand-50 border border-slate-200 rounded-xl transition-all inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-brand-600" />
                              <span>Ver Soporte</span>
                            </button>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Sin soporte</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <button
                            onClick={() => navigate('/dashboard/investments')}
                            className="px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                          >
                            Gestionar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: RECARGAS DE BILLETERA */}
        {activeTab === 'recharges' && (
          <div className="p-4 sm:p-6">
            {pendingRecharges.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-2" />
                <p className="font-bold text-slate-700 text-sm">No hay recargas de billetera pendientes</p>
                <p className="mt-1">Todas las recargas reportadas han sido procesadas.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider font-montserrat">
                    <tr>
                      <th className="px-4 py-3">Usuario</th>
                      <th className="px-4 py-3">Monto Recarga</th>
                      <th className="px-4 py-3">Método / Referencia</th>
                      <th className="px-4 py-3">Fecha Reporte</th>
                      <th className="px-4 py-3 text-center">Comprobante</th>
                      <th className="px-4 py-3 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-xs">
                    {pendingRecharges.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="font-extrabold text-slate-900">{rec.user_name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{rec.user_email}</div>
                          {rec.user_document && (
                            <div className="text-[10px] text-slate-400">Doc: {rec.user_document}</div>
                          )}
                        </td>
                        <td className="px-4 py-3.5 font-extrabold text-emerald-700 font-mono text-sm">
                          {formatCurrency(rec.amount)}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-800">{rec.payment_method}</div>
                          {rec.reference_number && (
                            <div className="text-[10px] text-slate-500 font-mono">Ref: {rec.reference_number}</div>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-slate-500">
                          {rec.created_at ? formatColombiaDate(rec.created_at) : 'N/A'}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {rec.receipt_url ? (
                            <button
                              onClick={() => setSelectedReceipt(rec.receipt_url)}
                              className="px-2.5 py-1 text-xs font-bold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200 rounded-xl transition-all inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Ver Soporte</span>
                            </button>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Sin soporte</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <button
                            onClick={() => navigate('/dashboard/wallet')}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                          >
                            Conciliar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: RETIROS / PAGOS PENDIENTES */}
        {activeTab === 'withdrawals' && (
          <div className="p-4 sm:p-6">
            {pendingWithdrawals.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-2" />
                <p className="font-bold text-slate-700 text-sm">No hay retiros ni pagos pendientes</p>
                <p className="mt-1">Todos los retiros solicitados han sido procesados y transferidos.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider font-montserrat">
                    <tr>
                      <th className="px-4 py-3">Inversionista</th>
                      <th className="px-4 py-3">Monto Neto a Pagar</th>
                      <th className="px-4 py-3">Cuenta Destino</th>
                      <th className="px-4 py-3">Tipo Origen</th>
                      <th className="px-4 py-3">Fecha Solicitud</th>
                      <th className="px-4 py-3 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-xs">
                    {pendingWithdrawals.map((w) => (
                      <tr key={w.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="font-extrabold text-slate-900">{w.user_name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{w.user_email}</div>
                          {w.user_document && (
                            <div className="text-[10px] text-slate-400">Doc: {w.user_document}</div>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-extrabold text-amber-900 font-mono text-sm">
                            {formatCurrency(w.monto_neto)}
                          </div>
                          {w.impuesto > 0 && (
                            <div className="text-[10px] text-slate-400">
                              Bruto: {formatCurrency(w.monto)} • Ret: {formatCurrency(w.impuesto)}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-800 flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{w.banco || 'Banco N/A'}</span>
                          </div>
                          <div className="text-[11px] text-slate-600 font-mono">
                            {w.tipo_cuenta ? `${w.tipo_cuenta} • ` : ''}{w.numero_cuenta || 'Sin número'}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-bold uppercase">
                            {w.tipo || 'Rendimiento'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-500">
                          {w.fecha_solicitud ? formatColombiaDate(w.fecha_solicitud) : 'N/A'}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <button
                            onClick={() => navigate('/dashboard/payments')}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                          >
                            Procesar Pago
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Modal Preview de Comprobante / Soporte */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div 
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 font-montserrat flex items-center gap-2">
                <FileText className="w-4 h-4 text-brand-600" />
                <span>Soporte Bancario / Comprobante de Pago</span>
              </h3>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex items-center justify-center bg-slate-100/50 min-h-[300px]">
              {selectedReceipt.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i) || selectedReceipt.startsWith('data:image') || selectedReceipt.includes('/uploads/') ? (
                <img
                  src={selectedReceipt.startsWith('http') || selectedReceipt.startsWith('data:') ? selectedReceipt : `/${selectedReceipt}`}
                  alt="Comprobante de Pago"
                  className="max-h-[70vh] w-auto max-w-full rounded-2xl shadow-md border border-slate-200 object-contain"
                  onError={(e) => {
                    // Fallback to direct link if image rendering fails
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="text-center p-6 space-y-3">
                  <p className="text-xs text-slate-600">Este comprobante es un documento externo.</p>
                  <a
                    href={selectedReceipt.startsWith('http') ? selectedReceipt : `/${selectedReceipt}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
                  >
                    <span>Abrir en nueva pestaña</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
