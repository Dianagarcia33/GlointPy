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
import { TrendingUp, PieChart as PieIcon, DollarSign, Wallet } from 'lucide-react';

interface DirectorAnalyticsChartsProps {
  data: DirectorAnalyticsDashboardData;
}

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1'];

export const DirectorAnalyticsCharts: React.FC<DirectorAnalyticsChartsProps> = ({ data }) => {
  const formatCurrency = (val: number) => {
    return `$${(val || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
  };

  const formatShortAxis = (val: number) => {
    if (val >= 1000000000) return `$${(val / 1000000000).toFixed(1)}B`;
    if (val >= 1000000) return `$${(val / 1000000).toFixed(0)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`;
    return `$${val}`;
  };

  return (
    <div className="space-y-6 w-full min-w-0">
      
      {/* Grid Superior: Crecimiento de Captación del Equipo + Desglose por Tipo de Venta */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 w-full min-w-0">
        
        {/* Gráfica 1: Histórico de Captación y Comisiones del Equipo (2 cols) */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4 min-w-0 overflow-hidden">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-brand-600 shrink-0" />
              <div>
                <h3 className="font-bold text-slate-800 text-sm sm:text-base font-montserrat">
                  Captación del Equipo Comercial ($)
                </h3>
                <p className="text-xs text-slate-400">Evolución mensual de ventas y comisiones generadas</p>
              </div>
            </div>
            <span className="hidden sm:inline-flex text-[11px] font-extrabold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-full border border-brand-200 font-montserrat">
              Últimos 6 Meses
            </span>
          </div>

          <div className="h-64 sm:h-72 w-full pt-2 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.payout_projections} margin={{ top: 10, right: 15, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCaptado" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorComision" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="mes" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickFormatter={formatShortAxis} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(val: any, name: any) => [formatCurrency(Number(val) || 0), name === "captado" ? "Capital Captado" : "Comisión Generada"]}
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', color: '#FFF', fontSize: '12px' }}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }} />
                <Area type="monotone" dataKey="captado" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorCaptado)" name="Capital Captado" />
                <Area type="monotone" dataKey="comision" stroke="#6366F1" strokeWidth={2} fillOpacity={1} fill="url(#colorComision)" name="Comisión Generada" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfica 2: Distribución por Tipo de Venta (1 col) */}
        <div className="xl:col-span-1 bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4 flex flex-col justify-between min-w-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-indigo-600 shrink-0" />
              <div>
                <h3 className="font-bold text-slate-800 text-sm sm:text-base font-montserrat">Desglose por Tipo de Venta</h3>
                <p className="text-xs text-slate-400">Contratos nuevos, reinversiones y referidos</p>
              </div>
            </div>
          </div>

          <div className="h-48 sm:h-56 w-full flex items-center justify-center min-w-0">
            {data.package_distribution && data.package_distribution.some(d => d.total_monto > 0) ? (
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
                    formatter={(val: any) => [formatCurrency(Number(val) || 0), "Monto Captado"]}
                    contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', color: '#FFF', fontSize: '12px' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-xs text-slate-400 py-10">Sin ventas comerciales registradas aún</div>
            )}
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span className="font-semibold">Captación Histórica Acumulada:</span>
            <span className="font-bold text-slate-900 font-mono">{formatCurrency(data.summary_cards.captacion_historica)}</span>
          </div>
        </div>

      </div>

    </div>
  );
};
