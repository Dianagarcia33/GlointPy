import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Award, DollarSign, Users, UserPlus, TrendingUp, FileText } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { analyticsService, DirectorAnalyticsDashboardData } from '../../../services/analytics';
import { DirectorAnalyticsCharts } from './DirectorAnalyticsCharts';
import { Link } from 'react-router-dom';

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

  return (
    <div className="space-y-6 w-full min-w-0">
      
      {/* Header Ejecutivo del Directivo de Inversiones */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute right-0 top-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-white/10 rounded-full text-xs font-bold text-brand-300 backdrop-blur-sm font-montserrat">
            <Award className="w-4 h-4 text-brand-400" /> Panel Directivo Comercial & Inversiones
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight font-montserrat">
            Hola, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            Estadísticas y rendimiento de tu gestión comercial, captación de capital y comisiones acumuladas.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3 shrink-0">
          <Link
            to="/dashboard/referrals"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-xl shadow-md shadow-brand-500/20 transition-all font-montserrat"
          >
            <UserPlus className="w-4 h-4" /> Mis Referidos
          </Link>
        </div>
      </div>

      {/* KPI Cards Personales del Directivo */}
      {cards && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 w-full min-w-0">
          
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-1 min-w-0 overflow-hidden">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block font-montserrat">
              Mi Captación Total ($)
            </span>
            <span className="text-lg sm:text-xl xl:text-2xl font-extrabold text-emerald-700 block tracking-tight truncate font-mono" title={formatCardCurrency(cards.total_captado)}>
              {formatCardCurrency(cards.total_captado)}
            </span>
            <span className="text-[11px] text-slate-500 font-semibold">
              {cards.total_ventas_count || 0} ventas registradas
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-1 min-w-0 overflow-hidden">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block font-montserrat">
              Mis Comisiones Ganadas
            </span>
            <span className="text-lg sm:text-xl xl:text-2xl font-extrabold text-indigo-700 block tracking-tight truncate font-mono" title={formatCardCurrency(cards.total_comisiones)}>
              {formatCardCurrency(cards.total_comisiones)}
            </span>
            <span className="text-[11px] text-slate-500 font-semibold">
              Comisiones acumuladas
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-1 min-w-0 overflow-hidden">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block font-montserrat">
              Mis Clientes Activos
            </span>
            <span className="text-lg sm:text-xl xl:text-2xl font-extrabold text-slate-900 block tracking-tight truncate font-mono">
              {cards.total_clientes || 0}
            </span>
            <span className="text-[11px] text-slate-500 font-semibold">
              Inversionistas directos
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-1 min-w-0 overflow-hidden">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block font-montserrat">
              Mi Red de Referidos
            </span>
            <span className="text-lg sm:text-xl xl:text-2xl font-extrabold text-amber-600 block tracking-tight truncate font-mono">
              {cards.total_referidos || 0}
            </span>
            <span className="text-[11px] text-slate-500 font-semibold">
              Potenciales registrados
            </span>
          </div>

        </div>
      )}

      {/* Gráficas Ejecutivas Personales */}
      {directorData && <DirectorAnalyticsCharts data={directorData} />}

    </div>
  );
};
