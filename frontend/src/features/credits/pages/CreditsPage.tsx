import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Plus, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Percent, 
  TrendingDown, 
  Loader2, 
  RefreshCw,
  Building2
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
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
            Activo / Desembolsado
          </span>
        );
      case 'PENDING':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-50 text-amber-700 border border-amber-200">
            En Estudio
          </span>
        );
      case 'PAID':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-100 text-slate-700 border border-slate-200">
            Completado
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-50 text-rose-700 border border-rose-200">
            Rechazado
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-100 text-slate-600 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  const getInstallmentStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
            Pagada
          </span>
        );
      case 'IN_REVIEW':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-sky-50 text-sky-700 border border-sky-200">
            En Revisión
          </span>
        );
      case 'PARTIALLY_PAID':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-50 text-amber-700 border border-amber-200">
            Abono Parcial
          </span>
        );
      case 'OVERDUE':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-50 text-rose-700 border border-rose-200">
            Vencida
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-100 text-slate-700 border border-slate-200">
            Pendiente
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto min-w-0 pb-20 space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto min-w-0 pb-20 space-y-6 animate-in fade-in duration-300">
      
      {/* 🏛️ 1. Encabezado de Página (Estándar Soporte en Tickets) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight font-montserrat flex items-center gap-2.5">
            <span className="p-2 bg-brand-50 text-brand-600 border border-brand-200 rounded-2xl inline-flex shadow-xs">
              <CreditCard className="w-6 h-6" />
            </span>
            Línea de Crédito
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Accede a crédito rotativo y financiamiento con desembolso directo a tu cuenta bancaria registrada
          </p>
        </div>

        {/* Acciones del Header */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsRequestModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-600 to-amber-600 hover:from-brand-700 hover:to-amber-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-brand-500/20 transition-all cursor-pointer font-montserrat"
          >
            <Plus className="w-4 h-4" />
            <span>Solicitar Crédito</span>
          </button>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2.5 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 rounded-2xl hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
            title="Actualizar datos"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 📊 2. Cuadrícula de Métricas KPI (4-Stat Cards exactas al Mercado de Acciones) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Saldo por Pagar */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Saldo por Pagar</span>
            <TrendingDown className="w-4 h-4 text-amber-600" />
          </div>
          <span className="text-2xl font-black text-slate-900 font-mono block">
            ${totalPendingBalance.toLocaleString('es-CO')}
          </span>
          <span className="text-[11px] text-slate-500 font-medium block">
            {activeCredits.length} {activeCredits.length === 1 ? 'crédito activo' : 'créditos activos'}
          </span>
        </div>

        {/* Card 2: Próxima Cuota */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Próxima Cuota</span>
            <Calendar className="w-4 h-4 text-blue-600" />
          </div>
          <span className="text-2xl font-black text-slate-900 font-mono block">
            {nextInstallment ? `$${(nextInstallment.total_amount - nextInstallment.paid_amount).toLocaleString('es-CO')}` : '$0'}
          </span>
          <span className="text-[11px] text-slate-500 font-medium block">
            {nextInstallment ? `Vence el ${new Date(nextInstallment.due_date).toLocaleDateString('es-CO')}` : 'Al día con tus pagos'}
          </span>
        </div>

        {/* Card 3: Tasa de la Plataforma */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Tasa Plataforma</span>
            <Percent className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-2xl font-black text-emerald-600 font-mono block">
            {config?.default_interest_rate_monthly || 1.80}% <span className="text-xs font-normal text-slate-500">M.V.</span>
          </span>
          <span className="text-[11px] text-slate-500 font-medium block">
            Tope de usura: {config?.max_usury_rate_monthly || 1.98}% M.V.
          </span>
        </div>

        {/* Card 4: Historial Total */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Historial de Créditos</span>
            <CreditCard className="w-4 h-4 text-purple-600" />
          </div>
          <span className="text-2xl font-black text-slate-900 font-mono block">
            {credits.length}
          </span>
          <span className="text-[11px] text-slate-500 font-medium block">
            Solicitudes radicadas
          </span>
        </div>

      </div>

      {/* Si no tiene créditos, mostrar empty state invitacional */}
      {credits.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
          <div className="w-14 h-14 rounded-3xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto">
            <CreditCard className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800 font-montserrat">
            Aún no tienes créditos activos
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto font-medium">
            Como usuario e inversionista de Gloint tienes disponible una línea de financiamiento con tasas reguladas por debajo del tope de usura legal y desembolso a tu cuenta bancaria.
          </p>
          <button
            onClick={() => setIsRequestModalOpen(true)}
            className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-2xl text-xs font-bold transition-all shadow-sm shadow-brand-500/20 inline-flex items-center gap-2 cursor-pointer font-montserrat mt-2"
          >
            <Plus className="w-4 h-4" />
            <span>Radicar Solicitud de Crédito</span>
          </button>
        </div>
      ) : (
        /* Vista con Créditos Existentes */
        <div className="space-y-6">
          
          {/* Selector de Crédito si tiene varios (Segmented Pill Tabs) */}
          {credits.length > 1 && (
            <div className="flex items-center gap-2 p-1.5 bg-slate-100/80 rounded-2xl w-fit border border-slate-200/80 overflow-x-auto max-w-full">
              {credits.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCreditId(c.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer font-montserrat whitespace-nowrap ${
                    selectedCredit?.id === c.id
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Crédito #{c.id} (${(c.approved_amount || c.requested_amount).toLocaleString('es-CO')} COP)
                </button>
              ))}
            </div>
          )}

          {selectedCredit && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
              
              {/* Header del Crédito Seleccionado */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 font-montserrat">
                      Crédito #{selectedCredit.id}
                    </h3>
                    {getStatusBadge(selectedCredit.status)}
                  </div>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
                    <span>Radicado el {new Date(selectedCredit.created_at).toLocaleDateString('es-CO')}</span>
                    {selectedCredit.banco && (
                      <>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          {selectedCredit.banco} ({selectedCredit.tipo_cuenta}) N° ••••{String(selectedCredit.numero_cuenta || '').slice(-4)}
                        </span>
                      </>
                    )}
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Monto Aprobado</span>
                  <span className="text-2xl font-black text-slate-900 font-mono block">
                    ${(selectedCredit.approved_amount || selectedCredit.requested_amount).toLocaleString('es-CO')} COP
                  </span>
                  <span className="text-[11px] text-brand-600 font-bold block mt-0.5">
                    {selectedCredit.term_months} meses • {selectedCredit.interest_rate}% M.V.
                  </span>
                </div>
              </div>

              {/* Si está pendiente de aprobación */}
              {selectedCredit.status === 'PENDING' && (
                <div className="p-6 rounded-2xl bg-amber-50/80 border border-amber-200 text-center space-y-2">
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
                    Motivo: {selectedCredit.rejection_reason || 'No cumple con las políticas crediticias vigentes.'}
                  </p>
                </div>
              )}

              {/* Si está activo o completado, mostrar tabla de amortización */}
              {(selectedCredit.status === 'ACTIVE' || selectedCredit.status === 'PAID') && selectedCredit.installments && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 font-montserrat uppercase tracking-wider">
                      Calendario de Amortización & Pagos
                    </h4>
                    <span className="text-xs text-slate-500 font-medium">
                      {selectedCredit.installments.filter(i => i.status === 'PAID').length} de {selectedCredit.installments.length} cuotas cubiertas
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="bg-slate-50/75 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
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
                      <tbody className="divide-y divide-slate-100 bg-white font-medium text-slate-700">
                        {selectedCredit.installments.map((inst) => {
                          const isFullyPaid = inst.status === 'PAID';
                          const isPendingReview = inst.status === 'IN_REVIEW';

                          return (
                            <tr key={inst.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3.5 px-4 font-bold text-slate-900 font-montserrat">
                                Cuota #{inst.installment_number}
                              </td>
                              <td className="py-3.5 px-4 font-medium text-slate-600">
                                {new Date(inst.due_date).toLocaleDateString('es-CO')}
                              </td>
                              <td className="py-3.5 px-4 font-mono">
                                ${inst.principal_amount.toLocaleString('es-CO')}
                              </td>
                              <td className="py-3.5 px-4 text-amber-700 font-mono font-medium">
                                ${inst.interest_amount.toLocaleString('es-CO')}
                              </td>
                              <td className="py-3.5 px-4 font-bold text-slate-900 font-mono">
                                ${inst.total_amount.toLocaleString('es-CO')}
                              </td>
                              <td className="py-3.5 px-4 font-mono text-slate-500">
                                {inst.wallet_amount_paid > 0 ? `$${inst.wallet_amount_paid.toLocaleString('es-CO')}` : '-'}
                              </td>
                              <td className="py-3.5 px-4 font-bold font-mono text-emerald-600">
                                {inst.paid_amount > 0 ? `$${inst.paid_amount.toLocaleString('es-CO')}` : '-'}
                              </td>
                              <td className="py-3.5 px-4">
                                {getInstallmentStatusBadge(inst.status)}
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                {!isFullyPaid && !isPendingReview && (
                                  <button
                                    onClick={() => setPayingInstallment(inst)}
                                    className="px-3 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-[11px] font-montserrat uppercase transition-all shadow-xs cursor-pointer active:scale-95"
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
