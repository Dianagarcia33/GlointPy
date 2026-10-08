import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Plus, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Landmark, 
  Calendar, 
  Percent, 
  DollarSign, 
  ChevronRight, 
  FileText,
  ShieldCheck,
  TrendingDown,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { 
  Credit, 
  CreditConfig, 
  CreditInstallment, 
  UserBankAccountOption, 
  getMyCredits, 
  getCreditConfig, 
  getMyCreditBankAccounts 
} from '../../../services/credits';
import { RequestCreditModal } from '../components/RequestCreditModal';
import { PayInstallmentModal } from '../components/PayInstallmentModal';

export const CreditsPage: React.FC = () => {
  const [credits, setCredits] = useState<Credit[]>([]);
  const [config, setConfig] = useState<CreditConfig | null>(null);
  const [bankAccounts, setBankAccounts] = useState<UserBankAccountOption[]>([]);
  const [selectedCreditId, setSelectedCreditId] = useState<number | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  
  // Modal de pago de cuota
  const [payingInstallment, setPayingInstallment] = useState<CreditInstallment | null>(null);

  const loadData = async () => {
    try {
      const [creditsResult, configResult, banksResult] = await Promise.allSettled([
        getMyCredits(),
        getCreditConfig(),
        getMyCreditBankAccounts()
      ]);

      if (creditsResult.status === 'fulfilled') {
        const creditsRes = creditsResult.value;
        setCredits(creditsRes);
        if (creditsRes.length > 0 && selectedCreditId === null) {
          // Seleccionar por defecto el crédito activo o el primero
          const activeCredit = creditsRes.find(c => c.status === 'ACTIVE') || creditsRes[0];
          setSelectedCreditId(activeCredit.id);
        }
      } else {
        console.warn('Error cargando créditos de usuario:', creditsResult.reason);
      }

      if (configResult.status === 'fulfilled') {
        setConfig(configResult.value);
      } else {
        console.warn('Error cargando configuración de créditos:', configResult.reason);
      }

      if (banksResult.status === 'fulfilled') {
        setBankAccounts(banksResult.value);
      } else {
        console.warn('Error cargando cuentas bancarias:', banksResult.reason);
      }
    } catch (err) {
      console.error('Error cargando datos de créditos:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const selectedCredit = credits.find(c => c.id === selectedCreditId) || credits[0] || null;

  // Cálculos consolidados
  const activeCredits = credits.filter(c => c.status === 'ACTIVE');
  const totalPendingBalance = activeCredits.reduce((acc, c) => acc + (c.remaining_balance || 0), 0);
  
  // Próxima cuota pendiente de pago
  let nextInstallment: CreditInstallment | null = null;
  if (selectedCredit && selectedCredit.installments) {
    nextInstallment = selectedCredit.installments.find(i => i.status === 'PENDING' || i.status === 'PARTIALLY_PAID') || null;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Activo / Desembolsado</span>;
      case 'PENDING':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">En Estudio</span>;
      case 'PAID':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">Completado</span>;
      case 'REJECTED':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Rechazado</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">{status}</span>;
    }
  };

  const getInstallmentStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Pagada</span>;
      case 'IN_REVIEW':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800">En Revisión</span>;
      case 'PARTIALLY_PAID':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">Abono Parcial</span>;
      case 'OVERDUE':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">Vencida</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">Pendiente</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-12">
      
      {/* Top Banner / Título */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-montserrat tracking-tight">
              Línea de Crédito Fintech
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 uppercase tracking-wider font-montserrat">
              Gloint Capital
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Accede a crédito rotativo y liquidez con desembolso directo a tu cuenta bancaria registrada.
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
            onClick={() => setIsRequestModalOpen(true)}
            className="py-2.5 px-5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs font-montserrat uppercase tracking-wider shadow-md shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Solicitar Crédito</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Cartera Pendiente */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs relative overflow-hidden group hover:border-amber-300 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider font-montserrat text-slate-500">Saldo por Pagar</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-montserrat">
            ${totalPendingBalance.toLocaleString('es-CO')} COP
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {activeCredits.length} {activeCredits.length === 1 ? 'crédito activo' : 'créditos activos'}
          </span>
        </div>

        {/* Próxima Cuota */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs relative overflow-hidden group hover:border-amber-300 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider font-montserrat text-slate-500">Próxima Cuota</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-montserrat">
            {nextInstallment ? `$${(nextInstallment.total_amount - nextInstallment.paid_amount).toLocaleString('es-CO')}` : 'Sin cuotas'}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {nextInstallment ? `Vence el ${new Date(nextInstallment.due_date).toLocaleDateString('es-CO')}` : 'Al día con tus pagos'}
          </span>
        </div>

        {/* Tasa de Usura Legal */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs relative overflow-hidden group hover:border-amber-300 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider font-montserrat text-slate-500">Tasa de la Plataforma</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-montserrat">
            {config?.default_interest_rate_monthly || 1.80}% <span className="text-xs font-normal text-slate-500">M.V.</span>
          </div>
          <span className="text-[11px] text-emerald-600 font-medium mt-1 block">
            Tope de usura: {config?.max_usury_rate_monthly || 1.98}% M.V.
          </span>
        </div>

        {/* Total Créditos */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs relative overflow-hidden group hover:border-amber-300 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider font-montserrat text-slate-500">Historial Total</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-montserrat">
            {credits.length}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Solicitudes radicadas
          </span>
        </div>

      </div>

      {/* Si no tiene créditos, mostrar empty state invitacional */}
      {credits.length === 0 ? (
        <div className="p-12 bg-white rounded-3xl border border-slate-200 text-center max-w-xl mx-auto space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
            <CreditCard className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 font-montserrat">
            Aún no tienes créditos activos
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-md mx-auto">
            Como usuario e inversionista de Gloint tienes disponible una línea de financiamiento con tasas reguladas por debajo del tope de usura legal y desembolso inmediato a tu cuenta bancaria.
          </p>
          <button
            onClick={() => setIsRequestModalOpen(true)}
            className="mt-2 py-3 px-6 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs font-montserrat uppercase tracking-wider transition-all shadow-md shadow-amber-500/25 cursor-pointer inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Radicar mi Primera Solicitud</span>
          </button>
        </div>
      ) : (
        /* Vista con Créditos Existentes */
        <div className="space-y-6">
          
          {/* Selector de Crédito si tiene varios */}
          {credits.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {credits.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCreditId(c.id)}
                  className={`px-4 py-2 rounded-2xl text-xs font-bold font-montserrat transition-all cursor-pointer whitespace-nowrap border ${
                    selectedCredit?.id === c.id
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Crédito #{c.id} (${(c.approved_amount || c.requested_amount).toLocaleString('es-CO')} COP)
                </button>
              ))}
            </div>
          )}

          {selectedCredit && (
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
              
              {/* Header del Crédito Seleccionado */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-montserrat">
                      Crédito #{selectedCredit.id}
                    </h2>
                    {getStatusBadge(selectedCredit.status)}
                  </div>
                  <p className="text-xs text-slate-500">
                    Radicado el {new Date(selectedCredit.created_at).toLocaleDateString('es-CO')} • Desembolso a <strong className="text-slate-800">{selectedCredit.banco} ({selectedCredit.tipo_cuenta}) N° {selectedCredit.numero_cuenta}</strong>
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-400 block font-medium">Monto Aprobado</span>
                  <span className="text-2xl font-black text-slate-900 font-montserrat">
                    ${(selectedCredit.approved_amount || selectedCredit.requested_amount).toLocaleString('es-CO')} COP
                  </span>
                  <span className="text-[11px] text-amber-600 font-bold block">
                    {selectedCredit.term_months} meses • {selectedCredit.interest_rate}% M.V.
                  </span>
                </div>
              </div>

              {/* Si está pendiente de aprobación */}
              {selectedCredit.status === 'PENDING' && (
                <div className="p-6 rounded-2xl bg-amber-50/70 border border-amber-200 text-center space-y-2">
                  <Clock className="w-8 h-8 text-amber-600 mx-auto" />
                  <h4 className="text-base font-bold text-slate-900 font-montserrat">Solicitud en Estudio Administrativo</h4>
                  <p className="text-xs text-slate-600 max-w-md mx-auto">
                    Tu solicitud está siendo validada por la mesa de crédito. Una vez aprobada, el sistema desembolsará los fondos de forma automática hacia tu cuenta bancaria registrada.
                  </p>
                </div>
              )}

              {/* Si está rechazado */}
              {selectedCredit.status === 'REJECTED' && (
                <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-center space-y-2">
                  <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
                  <h4 className="text-base font-bold text-slate-900 font-montserrat">Solicitud No Aprobada</h4>
                  <p className="text-xs text-rose-700 max-w-md mx-auto">
                    Motivo: {selectedCredit.rejection_reason || 'No cumple con las políticas crediticias actuales.'}
                  </p>
                </div>
              )}

              {/* Si está activo o completado, mostrar tabla de amortización */}
              {(selectedCredit.status === 'ACTIVE' || selectedCredit.status === 'PAID') && selectedCredit.installments && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800 font-montserrat uppercase tracking-wider">
                      Calendario de Amortización & Pagos
                    </h3>
                    <span className="text-xs text-slate-500 font-medium">
                      {selectedCredit.installments.filter(i => i.status === 'PAID').length} de {selectedCredit.installments.length} cuotas cubiertas
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="bg-slate-50 text-[11px] font-bold text-slate-700 font-montserrat uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4"># Cuota</th>
                          <th className="py-3 px-4">Fecha Límite</th>
                          <th className="py-3 px-4">Abono Capital</th>
                          <th className="py-3 px-4">Intereses</th>
                          <th className="py-3 px-4">Total Cuota</th>
                          <th className="py-3 px-4">Abono Wallet</th>
                          <th className="py-3 px-4">Total Pagado</th>
                          <th className="py-3 px-4">Estado</th>
                          <th className="py-3 px-4 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {selectedCredit.installments.map((inst) => {
                          const isFullyPaid = inst.status === 'PAID';
                          const isPendingReview = inst.status === 'IN_REVIEW';

                          return (
                            <tr key={inst.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3.5 px-4 font-bold text-slate-900 font-montserrat">
                                Cuota #{inst.installment_number}
                              </td>
                              <td className="py-3.5 px-4 font-medium">
                                {new Date(inst.due_date).toLocaleDateString('es-CO')}
                              </td>
                              <td className="py-3.5 px-4">
                                ${inst.principal_amount.toLocaleString('es-CO')}
                              </td>
                              <td className="py-3.5 px-4 text-amber-700 font-medium">
                                ${inst.interest_amount.toLocaleString('es-CO')}
                              </td>
                              <td className="py-3.5 px-4 font-bold text-slate-900 font-montserrat">
                                ${inst.total_amount.toLocaleString('es-CO')}
                              </td>
                              <td className="py-3.5 px-4 text-slate-600">
                                {inst.wallet_amount_paid > 0 ? `$${inst.wallet_amount_paid.toLocaleString('es-CO')}` : '-'}
                              </td>
                              <td className="py-3.5 px-4 font-bold text-emerald-600">
                                {inst.paid_amount > 0 ? `$${inst.paid_amount.toLocaleString('es-CO')}` : '-'}
                              </td>
                              <td className="py-3.5 px-4">
                                {getInstallmentStatusBadge(inst.status)}
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                {!isFullyPaid && !isPendingReview && (
                                  <button
                                    onClick={() => setPayingInstallment(inst)}
                                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] font-montserrat uppercase transition-all shadow-xs cursor-pointer active:scale-95"
                                  >
                                    Pagar Cuota
                                  </button>
                                )}
                                {isPendingReview && (
                                  <span className="text-[11px] text-sky-600 font-medium">
                                    En validación
                                  </span>
                                )}
                                {isFullyPaid && (
                                  <span className="text-[11px] text-emerald-600 font-bold flex items-center justify-end gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Pagada
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      )}

      {/* Modal para solicitar nuevo crédito */}
      <RequestCreditModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        onSuccess={loadData}
        config={config}
        bankAccounts={bankAccounts}
      />

      {/* Modal para pagar cuota */}
      {payingInstallment && selectedCredit && (
        <PayInstallmentModal
          isOpen={true}
          onClose={() => setPayingInstallment(null)}
          onSuccess={loadData}
          installment={payingInstallment}
          creditId={selectedCredit.id}
        />
      )}

    </div>
  );
};
