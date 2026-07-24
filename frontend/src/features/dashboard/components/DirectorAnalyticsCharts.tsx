import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';
import { DirectorAnalyticsDashboardData } from '../../../services/analytics';
import { TrendingUp, PieChart as PieIcon, Layers, Calendar, DollarSign } from 'lucide-react';

interface DirectorAnalyticsChartsProps {
  data: DirectorAnalyticsDashboardData;
}

const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899', '#6366F1'];

export const DirectorAnalyticsCharts: React.FC<DirectorAnalyticsChartsProps> = ({ data }) => {
  const formatCurrency = (val: number) => {
    return `$${val.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
  };

  const formatShortAxis = (val: number) => {
    if (val >= 1000000000) return `$${(val / 1000000000).toFixed(1)}B`;
    if (val >= 1000000) return `$${(val / 1000000).toFixed(0)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`;
    return `$${val}`;
  };

  return (
    <div className="space-y-6 w-full min-w-0">
      
      {/* Grid Superior: Proyección Futura de Pagos + Distribución de Portafolio */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 w-full min-w-0">
        
        {/* Gráfica 1: Proyección de Vencimientos y Rentabilidades (2 cols) */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4 min-w-0 overflow-hidden">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-brand-600 shrink-0" />
              <div>
                <h3 className="font-bold text-slate-800 text-sm sm:text-base font-montserrat">
                  Proyección de Pagos de Rendimientos
                </h3>
                <p className="text-xs text-slate-400">Estimación mensual de rentabilidades acumuladas a liquidar</p>
              </div>
            </div>
            <span className="hidden sm:inline-flex text-[11px] font-extrabold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-full border border-brand-200 font-montserrat">
              Próximos 6 Meses
            </span>
          </div>

          <div className="h-64 sm:h-72 w-full pt-2 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.payout_projections} margin={{ top: 10, right: 15, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRentabilidad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="mes" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickFormatter={formatShortAxis} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(Number(val) || 0), "Rentabilidad Est."]}
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', color: '#FFF', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="rentabilidad_proyectada" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorRentabilidad)" name="Rentabilidad Estimada" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfica 2: Distribución por Paquetes de Inversión (1 col) */}
        <div className="xl:col-span-1 bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4 flex flex-col justify-between min-w-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-indigo-600 shrink-0" />
              <div>
                <h3 className="font-bold text-slate-800 text-sm sm:text-base font-montserrat">Portafolio por Paquetes</h3>
                <p className="text-xs text-slate-400">Distribución del AUM activo</p>
              </div>
            </div>
          </div>

          <div className="h-48 sm:h-56 w-full flex items-center justify-center min-w-0">
            {data.package_distribution && data.package_distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.package_distribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="total_monto"
                    nameKey="nombre"
                  >
                    {data.package_distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [formatCurrency(Number(val) || 0), "Capital Activo"]}
                    contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', color: '#FFF', fontSize: '12px' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-xs text-slate-400 py-10">Sin datos de paquetes de inversión</div>
            )}
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span className="font-semibold">Paquetes Distintos Activos:</span>
            <span className="font-bold text-slate-900 font-mono">{data.package_distribution.length}</span>
          </div>
        </div>

      </div>

      {/* Fila Inferior: Métricas de Pipeline y Flujo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full min-w-0">
        
        {/* Solicitudes de Inversión en Cola */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block font-montserrat">
              Solicitudes por Aprobar
            </span>
            <span className="text-xl sm:text-2xl font-extrabold text-amber-600 block tracking-tight font-mono">
              {formatCurrency(data.summary_cards.solicitudes_pendientes_monto)}
            </span>
            <span className="text-xs text-slate-400">
              {data.summary_cards.solicitudes_pendientes_count} solicitudes pendientes de revisión
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6 text-amber-600" />
          </div>
        </div>

        {/* Proyección Anual Acumulada */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block font-montserrat">
              Retorno Proyectado a 12 Meses
            </span>
            <span className="text-xl sm:text-2xl font-extrabold text-emerald-600 block tracking-tight font-mono">
              {formatCurrency(data.summary_cards.proyectado_12m)}
            </span>
            <span className="text-xs text-slate-400">
              Compromiso estimado de rendimientos anuales
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6 text-emerald-600" />
          </div>
        </div>

      </div>

    </div>
  );
};
