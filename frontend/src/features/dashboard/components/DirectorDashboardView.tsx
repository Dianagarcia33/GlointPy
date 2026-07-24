import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Award, Trophy, Crown, Clock, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { analyticsService, DirectorAnalyticsDashboardData } from '../../../services/analytics';
import { DirectorAnalyticsCharts } from './DirectorAnalyticsCharts';

interface DirectorDashboardViewProps {
  isLoading?: boolean;
}

export const DirectorDashboardView: React.FC<DirectorDashboardViewProps> = () => {
  const { user } = useAuthStore();

  const { data: directorData, isLoading } = useQuery<DirectorAnalyticsDashboardData>({
    queryKey: ['director_analytics_dashboard'],
    queryFn: () => analyticsService.getDirectorAnalyticsDashboard()
  });

  const formatCardCurrency = (val: number) => {
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
      </div>
    );
  }

  const cards = directorData?.summary_cards;
  const leaderboard = directorData?.leaderboard || [];
  const expiringContracts = directorData?.expiring_contracts || [];

  return (
    <div className="space-y-6 w-full min-w-0">
      
      {/* Header Ejecutivo de Dirección Comercial */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute right-0 top-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-white/10 rounded-full text-xs font-bold text-brand-300 backdrop-blur-sm font-montserrat">
            <Award className="w-4 h-4 text-brand-400" /> Dirección Comercial & Ventas
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight font-montserrat">
            Hola, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            Monitoreo de ventas del equipo, comisiones, ranking comercial y vencimientos de contratos adjudicados.
          </p>
        </div>
      </div>

      {/* KPI Cards Comerciales Ejecutivas */}
      {cards && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 w-full min-w-0">
          
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-1 min-w-0 overflow-hidden">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block font-montserrat">
              Captación Equipo (Mes)
            </span>
            <span className="text-lg sm:text-xl xl:text-2xl font-extrabold text-emerald-700 block tracking-tight truncate font-mono" title={formatCardCurrency(cards.captacion_mes)}>
              {formatCardCurrency(cards.captacion_mes)}
            </span>
            <span className="text-[11px] text-slate-500 font-semibold">
              Ventas comerciales del mes
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-1 min-w-0 overflow-hidden">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block font-montserrat">
              Comisiones a Liquidar
            </span>
            <span className="text-lg sm:text-xl xl:text-2xl font-extrabold text-indigo-700 block tracking-tight truncate font-mono" title={formatCardCurrency(cards.comisiones_mes)}>
              {formatCardCurrency(cards.comisiones_mes)}
            </span>
            <span className="text-[11px] text-slate-500 font-semibold">
              Total comisiones del equipo
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-1 min-w-0 overflow-hidden">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block font-montserrat">
              Cierres del Mes
            </span>
            <span className="text-lg sm:text-xl xl:text-2xl font-extrabold text-slate-900 block tracking-tight truncate font-mono">
              {cards.cierres_mes || 0}
            </span>
            <span className="text-[11px] text-slate-500 font-semibold">
              Contratos adjudicados
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-1 min-w-0 overflow-hidden">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block font-montserrat">
              Asesor Líder del Mes
            </span>
            <span className="text-sm sm:text-base font-extrabold text-amber-600 block tracking-tight truncate font-montserrat" title={cards.leader_name}>
              {cards.leader_name}
            </span>
            <span className="text-[11px] text-slate-500 font-semibold">
              Mayor volumen de captación
            </span>
          </div>

        </div>
      )}

      {/* Gráficas Comerciales */}
      {directorData && <DirectorAnalyticsCharts data={directorData} />}

      {/* Leaderboard / Ranking del Equipo Comercial */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base font-montserrat">Ranking del Equipo Comercial</h3>
              <p className="text-xs text-slate-400">Rendimiento por volumen de ventas en el mes en curso</p>
            </div>
          </div>
        </div>

        {leaderboard.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Posición</th>
                  <th className="py-3 px-4">Asesor / Comercial</th>
                  <th className="py-3 px-4 text-center">Cierres</th>
                  <th className="py-3 px-4 text-right">Volumen Captado ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {leaderboard.map((row) => (
                  <tr key={row.commercial_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {row.rank === 1 && <Crown className="w-4 h-4 text-amber-500 fill-amber-500" />}
                        <span className={`font-mono font-bold ${row.rank === 1 ? 'text-amber-600 text-sm' : 'text-slate-700'}`}>
                          #{row.rank}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800 font-montserrat">
                      {row.commercial_name}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-semibold">
                      {row.total_closures}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                      {formatCardCurrency(row.total_volume)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-xs text-slate-400">
            No hay registros de ventas comerciales en el mes actual.
          </div>
        )}
      </div>

      {/* Tabla de Contratos Próximos a Vencer */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-rose-500 shrink-0" />
            <div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base font-montserrat">
                Contratos Próximos a Vencer
              </h3>
              <p className="text-xs text-slate-400">Seguimiento a vencimientos de contratos adjudicados a asesores comerciales</p>
            </div>
          </div>
          <span className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full font-mono">
            {expiringContracts.length} contratos
          </span>
        </div>

        {expiringContracts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Código Contrato</th>
                  <th className="py-3 px-4">Cliente / Inversionista</th>
                  <th className="py-3 px-4">Asesor Adjudicado</th>
                  <th className="py-3 px-4 text-right">Valor Contrato ($)</th>
                  <th className="py-3 px-4 text-center">Fecha Vencimiento</th>
                  <th className="py-3 px-4 text-center">Estado / Días</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {expiringContracts.map((contract) => {
                  const isUrgent = contract.dias_restantes <= 15;
                  const isExpired = contract.dias_restantes < 0;
                  return (
                    <tr key={contract.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {contract.codigo_contrato}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">{contract.cliente_nombre}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{contract.cliente_documento}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-[11px] border border-indigo-100 font-montserrat">
                          {contract.asesor_adjudicado}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatCardCurrency(contract.monto)}
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        {contract.fecha_vencimiento}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isExpired ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                            Vencido ({Math.abs(contract.dias_restantes)}d)
                          </span>
                        ) : isUrgent ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                            Vence en {contract.dias_restantes} días
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Vence en {contract.dias_restantes} días
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-xs text-slate-400">
            No hay contratos adjudicados próximos a vencer en los próximos 90 días.
          </div>
        )}
      </div>

    </div>
  );
};
