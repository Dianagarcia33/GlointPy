import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Plus, Zap, TrendingUp, DollarSign, Users, Award, ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react';
import { commercialService, CommercialSummary, LeaderboardResponse } from '../../../services/commercial';
import { RegisterCommercialSaleModal } from '../components/RegisterCommercialSaleModal';

export const CommercialDashboardPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const { data: summary, isLoading: isLoadingSummary, refetch: refetchSummary } = useQuery<CommercialSummary>({
    queryKey: ['my_commercial_summary'],
    queryFn: () => commercialService.getMySummary()
  });

  const { data: leaderboardData, isLoading: isLoadingLeaderboard, refetch: refetchLeaderboard } = useQuery<LeaderboardResponse>({
    queryKey: ['commercial_leaderboard'],
    queryFn: () => commercialService.getLeaderboard()
  });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSuccess = () => {
    showToast('¡Venta registrada exitosamente! Comisión acreditada a tu Wallet.', 'success');
    refetchSummary();
    refetchLeaderboard();
  };

  const directAccum = summary?.direct_accumulated || 0;
  const threshold = summary?.threshold_36m || 36000000;
  const remaining = summary?.remaining_for_36m || 0;
  const progressPercent = Math.min(100, Math.round((directAccum / threshold) * 100));

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-brand-100 text-brand-700 rounded-2xl">
            <Trophy className="w-7 h-7 text-brand-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Panel Comercial & Ranking</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Gestión de ventas, partición marginal del 3.5% y comisiones en tiempo real
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all shadow-md shadow-brand-600/20 text-sm font-semibold cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Registrar / Adjudicar Venta
        </button>
      </div>

      {/* Alerta Estratégica de Proximidad al Tramo del 3.5% ($36M) */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Progreso de Tramo Marginal ($36.000.000)</h3>
              <p className="text-xs text-slate-300">
                {summary?.has_reached_36m ? (
                  <span className="text-emerald-400 font-bold">¡Felicidades! Has superado los $36.000.000. Todas tus ventas directas cotizan al 3.5%.</span>
                ) : (
                  <span>Te faltan <strong className="text-emerald-400 font-bold">${remaining.toLocaleString('es-CO')} COP</strong> en ventas directas para desbloquear la comisión al 3.5%.</span>
                )}
              </p>
            </div>
          </div>

          <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-bold text-emerald-400 border border-white/10">
            Tasa Actual: {(summary?.current_rate ? summary.current_rate * 100 : 3.0).toFixed(1)}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="space-y-1 pt-1">
          <div className="flex justify-between text-[11px] text-slate-400 font-medium">
            <span>Acumulado Directo: ${directAccum.toLocaleString('es-CO')} COP</span>
            <span>Meta Piso 2: ${threshold.toLocaleString('es-CO')} COP</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-brand-500 to-emerald-400 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Ventas Directas</span>
          <span className="text-2xl font-extrabold text-slate-800 block">
            ${directAccum.toLocaleString('es-CO')} COP
          </span>
          <span className="text-[11px] text-slate-500">Contratos Nuevos + Reinversiones</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Ventas Referidos</span>
          <span className="text-2xl font-extrabold text-amber-800 block">
            ${(summary?.referral_accumulated || 0).toLocaleString('es-CO')} COP
          </span>
          <span className="text-[11px] text-amber-700 font-medium">Tasa fija del 1.8%</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Ventas Totales Mes</span>
          <span className="text-2xl font-extrabold text-brand-700 block">
            ${(summary?.total_accumulated || 0).toLocaleString('es-CO')} COP
          </span>
          <span className="text-[11px] text-slate-500">Consolidado general</span>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5 shadow-xs space-y-2">
          <span className="text-xs text-emerald-800 font-semibold uppercase tracking-wider block">Comisiones Ganadas</span>
          <span className="text-2xl font-extrabold text-emerald-700 block">
            +${(summary?.total_commissions || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })} COP
          </span>
          <span className="text-[11px] text-emerald-700 font-medium">Acreditadas a tu Wallet</span>
        </div>
      </div>

      {/* Main Grid: Leaderboard & Recent Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Ranking / Leaderboard (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <h2 className="font-bold text-slate-800 text-base">Ranking de Ventas (Leaderboard)</h2>
            </div>
            <span className="text-xs text-slate-400 font-medium">Mes en Curso</span>
          </div>

          {isLoadingLeaderboard ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />)}
            </div>
          ) : !leaderboardData?.leaderboard?.length ? (
            <p className="text-center text-xs text-slate-400 py-8">Aún no hay registros en el ranking de ventas de este mes.</p>
          ) : (
            <div className="space-y-3">
              {leaderboardData.leaderboard.map((entry) => (
                <div
                  key={entry.commercial_id}
                  className={`p-4 rounded-xl border transition-all flex items-center justify-between gap-4 ${
                    entry.is_me
                      ? 'bg-brand-50/70 border-brand-300 ring-2 ring-brand-500/20'
                      : 'bg-slate-50/60 border-slate-200/80 hover:bg-slate-100/60'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                      entry.rank === 1 ? 'bg-amber-400 text-amber-950 shadow-sm' :
                      entry.rank === 2 ? 'bg-slate-300 text-slate-800' :
                      entry.rank === 3 ? 'bg-amber-700 text-white' :
                      'bg-slate-200 text-slate-600'
                    }`}>
                      #{entry.rank}
                    </div>

                    <div>
                      <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <span>{entry.commercial_name}</span>
                        {entry.is_me && <span className="text-[10px] bg-brand-500 text-white px-2 py-0.5 rounded-full font-extrabold uppercase">Tú</span>}
                      </div>
                      <span className="text-xs text-slate-500 font-medium">
                        {entry.total_closures} {entry.total_closures === 1 ? 'cierre' : 'cierres'} este mes
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-extrabold text-slate-800 text-base block">
                      ${entry.total_volume.toLocaleString('es-CO')} COP
                    </span>
                    
                    {/* Next-Target (Indicador de Brecha Operativa) */}
                    {entry.is_me && entry.next_target_amount > 0 && (
                      <span className="text-[11px] font-bold text-emerald-700 block mt-0.5">
                        🎯 Faltan ${entry.next_target_amount.toLocaleString('es-CO')} COP para alcanzar el puesto #{entry.rank - 1}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Historial Reciente de Ventas (1 col) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h2 className="font-bold text-slate-800 text-base border-b border-slate-100 pb-3">Mis Últimas Ventas</h2>
          
          {!summary?.recent_sales?.length ? (
            <p className="text-center text-xs text-slate-400 py-8">No has registrado ventas este mes.</p>
          ) : (
            <div className="space-y-3">
              {summary.recent_sales.map((s) => (
                <div key={s.id} className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800">Doc: {s.client_document}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      s.sale_type === 'referido' ? 'bg-amber-100 text-amber-800' : 'bg-brand-100 text-brand-800'
                    }`}>
                      {s.sale_type.replace('_', ' ')}
                    </span>
                  </div>
                  
                  {s.client_name && <p className="text-slate-500 font-medium text-[11px]">{s.client_name}</p>}

                  <div className="flex justify-between items-center pt-1 border-t border-slate-200/60 font-medium">
                    <span className="text-slate-600">Venta: ${s.amount.toLocaleString('es-CO')}</span>
                    <span className="font-bold text-emerald-700">+${s.commission_amount.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Modal para Registrar / Adjudicar Venta */}
      <RegisterCommercialSaleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
        currentAccumulatedDirect={directAccum}
      />

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-[60] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border ${
          toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}
    </div>
  );
};
