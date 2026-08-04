import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Award, Trophy, Crown, Clock, AlertTriangle, UserCheck } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { analyticsService, DirectorAnalyticsDashboardData } from '../../../services/analytics';
import { commercialService, CommercialSummary } from '../../../services/commercial';
import { DirectorAnalyticsCharts } from './DirectorAnalyticsCharts';
import { CommercialBonusGoalsWidget } from '../../commercial/components/CommercialBonusGoalsWidget';
import { Can } from '../../../components/security/Can';

interface DirectorDashboardViewProps {
  isLoading?: boolean;
}

export const DirectorDashboardView: React.FC<DirectorDashboardViewProps> = () => {
  const { user } = useAuthStore();

  const { data: directorData, isLoading } = useQuery<DirectorAnalyticsDashboardData>({
    queryKey: ['director_analytics_dashboard'],
    queryFn: () => analyticsService.getDirectorAnalyticsDashboard()
  });

  const { data: summary } = useQuery<CommercialSummary>({
    queryKey: ['commercial_my_summary'],
    queryFn: () => commercialService.getMySummary()
  });

  const { data: assignedInvestmentsData, isLoading: loadingAssignedInvestments } = useQuery({
    queryKey: ['my_assigned_investments_director'],
    queryFn: () => commercialService.getMyAssignedInvestments()
  });

  const formatCardCurrency = (val: number) => {
    return `$${(val || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
  };

  const [assignedPage, setAssignedPage] = React.useState(1);

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

      {/* Widget de Metas y Bonos en Curso del Directivo */}
      <CommercialBonusGoalsWidget
        summary={summary}
        dailyClosuresCount={summary?.recent_sales?.filter(s => s.sale_date === new Date().toISOString().split('T')[0]).length || 0}
      />

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

      {/* Solicitudes de Inversión de Mis Inversionistas Asignados */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <UserCheck className="w-5 h-5 text-brand-600 shrink-0" />
            <div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base font-montserrat">
                Solicitudes de Inversión de Mis Inversionistas Asignados
              </h3>
              <p className="text-xs text-slate-400">
                Inversionistas que se registraron en Gloint y te seleccionaron como su Directivo de Inversiones
              </p>
            </div>
          </div>
          {assignedInvestmentsData?.total !== undefined && (
            <span className="px-3 py-1 bg-brand-50 text-brand-700 font-bold text-xs rounded-full border border-brand-200">
              {assignedInvestmentsData.total} Inversionista(s)
            </span>
          )}
        </div>

        {loadingAssignedInvestments ? (
          <div className="text-center py-8 text-xs text-slate-400">Cargando solicitudes asignadas...</div>
        ) : !assignedInvestmentsData?.assigned_investments || assignedInvestmentsData.assigned_investments.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            No tienes solicitudes de inversión de inversionistas asignados aún.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Inversionista</th>
                    <th className="py-3 px-4">Contacto / Documento</th>
                    <th className="py-3 px-4">Paquete de Inversión</th>
                    <th className="py-3 px-4 text-right">Monto ($)</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4">Fecha Solicitud</th>
                    <th className="py-3 px-4 text-center">Comprobante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assignedInvestmentsData.assigned_investments
                    .slice((assignedPage - 1) * 5, assignedPage * 5)
                    .map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {item.investor_name}
                      </td>
                      <td className="py-3.5 px-4 space-y-0.5">
                        <p className="font-semibold text-slate-800">{item.investor_email}</p>
                        <p className="text-[10px] text-slate-400">Doc: {item.investor_document} | Tel: {item.investor_phone}</p>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        {item.paquete_nombre}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-700 font-mono">
                        ${(item.monto || 0).toLocaleString('es-CO')}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                          item.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : item.status === 'rejected'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                        }`}>
                          {item.status === 'approved'
                            ? 'APROBADO'
                            : item.status === 'rejected'
                            ? 'RECHAZADO'
                            : 'PENDIENTE'}
                        </span>
                        {item.status === 'rejected' && item.rejection_reason && (
                          <p className="text-[10px] text-rose-500 font-normal truncate max-w-[120px] mx-auto mt-0.5" title={item.rejection_reason}>
                            {item.rejection_reason}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString('es-CO') : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {item.comprobante_path ? (
                          <a
                            href={item.comprobante_path.startsWith('/') ? item.comprobante_path : `/api/v1/${item.comprobante_path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:text-brand-800 underline"
                          >
                            <span>Ver</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 text-[10px]">Sin archivo</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Controles de Paginación */}
            {assignedInvestmentsData.assigned_investments.length > 5 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 text-xs">
                <div className="text-slate-500 font-medium">
                  Mostrando <strong className="text-slate-800">{((assignedPage - 1) * 5) + 1}</strong> - <strong className="text-slate-800">{Math.min(assignedPage * 5, assignedInvestmentsData.assigned_investments.length)}</strong> de <strong className="text-slate-800">{assignedInvestmentsData.assigned_investments.length}</strong> solicitudes
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAssignedPage(p => Math.max(1, p - 1))}
                    disabled={assignedPage === 1}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    Anterior
                  </button>
                  <span className="font-semibold text-slate-700 px-2 font-mono">
                    Página {assignedPage} de {Math.ceil(assignedInvestmentsData.assigned_investments.length / 5)}
                  </span>
                  <button
                    onClick={() => setAssignedPage(p => Math.min(Math.ceil(assignedInvestmentsData.assigned_investments.length / 5), p + 1))}
                    disabled={assignedPage >= Math.ceil(assignedInvestmentsData.assigned_investments.length / 5)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
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
