import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  X,
  AlertCircle, 
  Zap, 
  Percent, 
  Settings, 
  RefreshCw, 
  Eye, 
  ExternalLink, 
  User, 
  Landmark, 
  DollarSign, 
  Calendar,
  Loader2,
  FileText,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { 
  Credit, 
  CreditConfig, 
  getAdminCredits, 
  getCreditConfig, 
  rejectCredit, 
  getPendingReviewInstallments, 
  reviewInstallment 
} from '../../../../services/credits';
import { ApproveCreditModal } from '../components/ApproveCreditModal';
import { CreditConfigModal } from '../components/CreditConfigModal';

export const AdminCreditsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'PENDING' | 'ACTIVE' | 'REVIEW_INSTALLMENTS' | 'HISTORY'>('PENDING');
  const [credits, setCredits] = useState<Credit[]>([]);
  const [totalCredits, setTotalCredits] = useState<number>(0);
  const [config, setConfig] = useState<CreditConfig | null>(null);
  const [pendingInstallments, setPendingInstallments] = useState<any[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');

  // Modales
  const [approvingCredit, setApprovingCredit] = useState<Credit | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);
  const [rejectingCredit, setRejectingCredit] = useState<Credit | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [isRejecting, setIsRejecting] = useState<boolean>(false);

  // Detalle de crédito seleccionado (drawer o modal)
  const [inspectingCredit, setInspectingCredit] = useState<Credit | null>(null);

  // Visualizador de comprobante
  const [viewingReceiptUrl, setViewingReceiptUrl] = useState<string | null>(null);
  const [reviewingInstallmentId, setReviewingInstallmentId] = useState<number | null>(null);
  const [isProcessingReview, setIsProcessingReview] = useState<boolean>(false);

  const loadData = async () => {
    try {
      const [creditsRes, configRes, pendingInstRes] = await Promise.all([
        getAdminCredits({
          status: activeTab === 'REVIEW_INSTALLMENTS' ? 'ALL' : (activeTab === 'HISTORY' ? 'PAID' : activeTab),
          search: search.trim() || undefined
        }),
        getCreditConfig(),
        getPendingReviewInstallments()
      ]);

      setCredits(creditsRes.items);
      setTotalCredits(creditsRes.total);
      setConfig(configRes);
      setPendingInstallments(pendingInstRes);
    } catch (err) {
      console.error('Error cargando créditos admin:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, search]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleConfirmReject = async () => {
    if (!rejectingCredit || !rejectReason.trim()) return;

    try {
      setIsRejecting(true);
      await rejectCredit(rejectingCredit.id, rejectReason.trim());
      setRejectingCredit(null);
      setRejectReason('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error al rechazar el crédito');
    } finally {
      setIsRejecting(false);
    }
  };

  const handleReviewInstallment = async (installmentId: number, approve: boolean) => {
    let rejectionReason: string | undefined = undefined;
    if (!approve) {
      const reason = window.prompt('Indica el motivo de rechazo del comprobante:');
      if (!reason || !reason.trim()) return;
      rejectionReason = reason.trim();
    }

    try {
      setIsProcessingReview(true);
      await reviewInstallment(installmentId, { approve, rejection_reason: rejectionReason });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error al procesar la revisión');
    } finally {
      setIsProcessingReview(false);
    }
  };

  const pendingCount = credits.filter(c => c.status === 'PENDING').length;
  const activeCount = credits.filter(c => c.status === 'ACTIVE').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-12 font-inter">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-montserrat tracking-tight">
              Mesa de Créditos & Fintech
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 uppercase tracking-wider font-montserrat">
              Yoint Dispersions
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Evaluación crediticia, desembolso en 1 clic y auditoría de cartera bajo tope de usura legal.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2.5 rounded-2xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-xs cursor-pointer"
            title="Refrescar"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsConfigModalOpen(true)}
            className="py-2.5 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs font-montserrat uppercase tracking-wider shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Settings className="w-4 h-4 text-amber-400" />
            <span>Tasa de Usura & Config</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Solicitudes Pendientes */}
        <div 
          onClick={() => setActiveTab('PENDING')}
          className={`bg-white border rounded-3xl p-5 shadow-xs transition-all cursor-pointer ${
            activeTab === 'PENDING' ? 'border-amber-500 ring-2 ring-amber-500/10' : 'border-slate-200/80 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider font-montserrat text-slate-500">Solicitudes por Evaluar</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-montserrat">
            {pendingCount}
          </div>
          <span className="text-[11px] text-amber-700 font-semibold mt-1 block">
            {pendingCount > 0 ? '⚡ Requieren desembolso o revisión' : 'Todo al día'}
          </span>
        </div>

        {/* Cartera Activa */}
        <div 
          onClick={() => setActiveTab('ACTIVE')}
          className={`bg-white border rounded-3xl p-5 shadow-xs transition-all cursor-pointer ${
            activeTab === 'ACTIVE' ? 'border-amber-500 ring-2 ring-amber-500/10' : 'border-slate-200/80 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider font-montserrat text-slate-500">Créditos Vigentes</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-montserrat">
            {activeCount}
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
            Cartera en amortización
          </span>
        </div>

        {/* Cuotas por Validar */}
        <div 
          onClick={() => setActiveTab('REVIEW_INSTALLMENTS')}
          className={`bg-white border rounded-3xl p-5 shadow-xs transition-all cursor-pointer ${
            activeTab === 'REVIEW_INSTALLMENTS' ? 'border-amber-500 ring-2 ring-amber-500/10' : 'border-slate-200/80 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider font-montserrat text-slate-500">Cuotas por Validar</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-montserrat">
            {pendingInstallments.length}
          </div>
          <span className="text-[11px] text-sky-600 font-semibold mt-1 block">
            Comprobantes adjuntos
          </span>
        </div>

        {/* Tope Legal de Usura */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider font-montserrat text-slate-500">Tasa Usura Legal</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-montserrat">
            {config?.max_usury_rate_monthly || 1.98}% <span className="text-xs font-normal text-slate-400">M.V.</span>
          </div>
          <span className="text-[11px] text-purple-700 font-semibold mt-1 block">
            Tope Anual: {config?.max_usury_rate_ea || 26.50}% E.A.
          </span>
        </div>

      </div>

      {/* Selector de Pestañas & Buscador */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('PENDING')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold font-montserrat transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'PENDING'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            Solicitudes Pendientes ({pendingCount})
          </button>

          <button
            onClick={() => setActiveTab('ACTIVE')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold font-montserrat transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'ACTIVE'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            Créditos Activos & Cartera ({activeCount})
          </button>

          <button
            onClick={() => setActiveTab('REVIEW_INSTALLMENTS')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold font-montserrat transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'REVIEW_INSTALLMENTS'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            Cuotas por Revisar ({pendingInstallments.length})
          </button>

          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold font-montserrat transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'HISTORY'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            Historial / Liquidados
          </button>
        </div>

        {/* Buscador */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente, cédula o cuenta..."
            className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Contenido según Pestaña */}
      {loading ? (
        <div className="py-20 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto" />
        </div>
      ) : activeTab === 'REVIEW_INSTALLMENTS' ? (
        /* Pestaña: Cuotas por Validar */
        <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs">
          {pendingInstallments.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">No hay cuotas pendientes de validación</p>
              <p className="text-xs text-slate-400">Todos los comprobantes han sido procesados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-700 font-montserrat uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Cuota / Crédito</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Fecha Vence</th>
                    <th className="py-3 px-4">Total Cuota</th>
                    <th className="py-3 px-4">Abono Wallet</th>
                    <th className="py-3 px-4">Transferencia</th>
                    <th className="py-3 px-4">Comprobante</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {pendingInstallments.map((inst) => (
                    <tr key={inst.installment_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 font-montserrat">
                        Cuota #{inst.installment_number}
                        <span className="text-[11px] text-slate-400 block font-normal">Crédito #{inst.credit_id}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <strong className="text-slate-900 block">{inst.user_name}</strong>
                        <span className="text-[11px] text-slate-500">{inst.user_email || '-'}</span>
                      </td>
                      <td className="py-3.5 px-4 font-medium">
                        {new Date(inst.due_date).toLocaleDateString('es-CO')}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        ${inst.total_amount.toLocaleString('es-CO')}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-amber-700">
                        {inst.wallet_amount_paid > 0 ? `$${inst.wallet_amount_paid.toLocaleString('es-CO')}` : '-'}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-600">
                        ${inst.external_amount_paid.toLocaleString('es-CO')}
                      </td>
                      <td className="py-3.5 px-4">
                        {inst.receipt_url ? (
                          <button
                            onClick={() => setViewingReceiptUrl(inst.receipt_url)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 font-bold text-[11px] transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Ver Recibo
                          </button>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleReviewInstallment(inst.installment_id, true)}
                            disabled={isProcessingReview}
                            className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] font-montserrat uppercase transition-all shadow-xs cursor-pointer"
                          >
                            Aprobar
                          </button>
                          <button
                            onClick={() => handleReviewInstallment(inst.installment_id, false)}
                            disabled={isProcessingReview}
                            className="px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] transition-colors cursor-pointer"
                          >
                            Rechazar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Pestañas de Créditos: PENDING, ACTIVE, HISTORY */
        <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs">
          {credits.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <CreditCard className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">No hay créditos en este estado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-700 font-montserrat uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4"># Crédito</th>
                    <th className="py-3 px-4">Solicitante</th>
                    <th className="py-3 px-4">Monto Solicitado</th>
                    <th className="py-3 px-4">Plazo</th>
                    <th className="py-3 px-4">Cuenta Destino (Yoint)</th>
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {credits.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 font-montserrat">
                        #{c.id}
                      </td>
                      <td className="py-3.5 px-4">
                        <strong className="text-slate-900 block">{c.user_name || 'Inversionista'}</strong>
                        <span className="text-[11px] text-slate-500 font-mono">CC: {c.user_document || 'N/A'}</span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 font-montserrat">
                        ${(c.approved_amount || c.requested_amount).toLocaleString('es-CO')} COP
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        {c.term_months} meses
                        <span className="text-[10px] text-slate-400 block">{c.interest_rate}% M.V.</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                          <Landmark className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>{c.banco}</span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {c.tipo_cuenta} • {c.numero_cuenta}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {new Date(c.created_at).toLocaleDateString('es-CO')}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          c.status === 'ACTIVE' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : (c.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-700')
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {c.status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setApprovingCredit(c)}
                              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-[11px] font-montserrat uppercase tracking-wider transition-all shadow-xs flex items-center gap-1 cursor-pointer active:scale-95"
                            >
                              <Zap className="w-3.5 h-3.5 fill-white" />
                              <span>Aprobar Yoint</span>
                            </button>
                            <button
                              onClick={() => setRejectingCredit(c)}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 text-[11px] font-semibold transition-colors cursor-pointer"
                            >
                              Rechazar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setInspectingCredit(c)}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] font-montserrat uppercase transition-all cursor-pointer inline-flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver Cuotas</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal de Aprobación en 1 Clic con Yoint */}
      {approvingCredit && (
        <ApproveCreditModal
          isOpen={true}
          onClose={() => setApprovingCredit(null)}
          onSuccess={loadData}
          credit={approvingCredit}
          config={config}
        />
      )}

      {/* Modal de Configuración y Tasa de Usura */}
      <CreditConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        onSuccess={(updated) => {
          setConfig(updated);
          loadData();
        }}
        currentConfig={config}
      />

      {/* Modal de Rechazo de Solicitud */}
      {rejectingCredit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 font-montserrat">
              Rechazar Solicitud de Crédito #{rejectingCredit.id}
            </h3>
            <p className="text-xs text-slate-500">
              Indica el motivo de rechazo que se mostrará al inversionista.
            </p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ej. Capacidad de endeudamiento, falta de garantías o inconsistencia en cuenta bancaria..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-rose-500 font-medium"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectingCredit(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isRejecting || !rejectReason.trim()}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {isRejecting ? 'Rechazando...' : 'Confirmar Rechazo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Visor de Comprobante de Cuota */}
      {viewingReceiptUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 font-montserrat">Comprobante de Pago Adjunto</h3>
              <button
                onClick={() => setViewingReceiptUrl(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-slate-50 rounded-2xl p-2 border flex items-center justify-center">
              {viewingReceiptUrl.endsWith('.pdf') ? (
                <iframe src={viewingReceiptUrl} className="w-full h-96 rounded-xl" title="Comprobante PDF" />
              ) : (
                <img src={viewingReceiptUrl} alt="Comprobante" className="max-w-full max-h-[60vh] object-contain rounded-xl" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalle de Cuotas de Crédito Activo */}
      {inspectingCredit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden p-6 space-y-6 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-montserrat">
                  Amortización Crédito #{inspectingCredit.id}
                </h3>
                <p className="text-xs text-slate-500">
                  {inspectingCredit.user_name} • Desembolso Yoint: <strong>{inspectingCredit.disbursement_reference || 'N/A'}</strong>
                </p>
              </div>
              <button
                onClick={() => setInspectingCredit(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-700 font-montserrat uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3"># Cuota</th>
                    <th className="py-2.5 px-3">Fecha Vence</th>
                    <th className="py-2.5 px-3">Capital</th>
                    <th className="py-2.5 px-3">Interés</th>
                    <th className="py-2.5 px-3">Total Cuota</th>
                    <th className="py-2.5 px-3">Wallet</th>
                    <th className="py-2.5 px-3">Pagado</th>
                    <th className="py-2.5 px-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inspectingCredit.installments.map((i) => (
                    <tr key={i.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-bold text-slate-900">Cuota #{i.installment_number}</td>
                      <td className="py-2.5 px-3">{new Date(i.due_date).toLocaleDateString('es-CO')}</td>
                      <td className="py-2.5 px-3">${i.principal_amount.toLocaleString('es-CO')}</td>
                      <td className="py-2.5 px-3">${i.interest_amount.toLocaleString('es-CO')}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">${i.total_amount.toLocaleString('es-CO')}</td>
                      <td className="py-2.5 px-3 text-amber-700 font-medium">
                        {i.wallet_amount_paid > 0 ? `$${i.wallet_amount_paid.toLocaleString('es-CO')}` : '-'}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-emerald-600">
                        {i.paid_amount > 0 ? `$${i.paid_amount.toLocaleString('es-CO')}` : '-'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          i.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {i.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
