import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';
import { AdminAnalyticsDashboardData } from '../../../services/analytics';
import { TrendingUp, PieChart as PieIcon, BarChart3, Layers } from 'lucide-react';

interface AdminAnalyticsChartsProps {
  data: AdminAnalyticsDashboardData;
}

const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899', '#6366F1'];

export const AdminAnalyticsCharts: React.FC<AdminAnalyticsChartsProps> = ({ data }) => {
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
      
      {/* Top Grid: Crecimiento de Captación + Distribución por Paquetes */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 w-full min-w-0">
        
        {/* Gráfica 1: Crecimiento Mensual de Captación (2 cols en xl) */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4 min-w-0 overflow-hidden">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <h3 className="font-bold text-slate-800 text-sm sm:text-base">Crecimiento de Captación ($)</h3>
                <p className="text-xs text-slate-400">Tendencia mensual de ingresos por inversiones</p>
              </div>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full pt-2 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.monthly_growth} margin={{ top: 10, right: 15, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCapital" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis width={65} tickFormatter={formatShortAxis} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                <Area type="monotone" dataKey="capital_captado" name="Capital Captado" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorCapital)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfica 2: Distribución por Paquetes de Inversión (1 col en xl, 100% responsive) */}
        <div className="xl:col-span-1 bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs flex flex-col justify-between min-w-0 overflow-hidden">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-2">
            <div className="flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-brand-600 shrink-0" />
              <div>
                <h3 className="font-bold text-slate-800 text-sm sm:text-base">Paquetes de Inversión</h3>
                <p className="text-xs text-slate-400">Distribución de contratos activos</p>
              </div>
            </div>
          </div>

          {(() => {
            const activePackages = (data.package_distribution || []).filter(p => p.value > 0);
            if (activePackages.length === 0) {
              return (
                <div className="h-60 flex items-center justify-center text-slate-400 text-xs font-medium text-center">
                  No hay paquetes activos registrados
                </div>
              );
            }
            const totalContracts = activePackages.reduce((acc, curr) => acc + curr.value, 0);

            return (
              <div className="flex flex-col justify-between h-full space-y-3">
                {/* Dona Visual */}
                <div className="h-44 sm:h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={activePackages}
                        cx="50%"
                        cy="50%"
                        innerRadius={42}
                        outerRadius={65}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {activePackages.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any, name: any, item: any) => [
                        `${value} contratos (${formatCurrency(item.payload.total_monto)})`,
                        item.payload.name.replace(/^Paquete\s*/i, '')
                      ]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Leyenda Compacta Limpia sin la palabra "Paquete" */}
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {activePackages.map((pkg, idx) => {
                    const cleanName = pkg.name.replace(/^Paquete\s*/i, '');
                    const pct = totalContracts > 0 ? ((pkg.value / totalContracts) * 100).toFixed(1) : '0';
                    return (
                      <div key={pkg.package_id || idx} className="flex items-center justify-between text-xs bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 shadow-2xs">
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                          <span className="font-extrabold text-slate-800 truncate">{cleanName}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-slate-500 font-medium text-[11px]">{pkg.value} contratos</span>
                          <span className="font-black text-brand-700 bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[10px]">{pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>

      </div>

      {/* Bottom Grid: Balance de Liquidez + Proporción por Tipo de Venta */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full min-w-0">
        
        {/* Gráfica 3: Balance de Liquidez (Ecosistema) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4 min-w-0 overflow-hidden">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600 shrink-0" />
              <div>
                <h3 className="font-bold text-slate-800 text-sm sm:text-base">Balance de Liquidez ($)</h3>
                <p className="text-xs text-slate-400">Comparativa de Fondos en el Ecosistema</p>
              </div>
            </div>
          </div>

          <div className="h-60 sm:h-64 w-full pt-2 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.liquidity_balance} margin={{ top: 10, right: 15, left: 10, bottom: 0 }}>
                <XAxis dataKey="category" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis width={65} tickFormatter={formatShortAxis} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(val: any) => formatCurrency(Number(val))} />
                <Bar dataKey="amount" name="Monto ($)" radius={[8, 8, 0, 0]}>
                  {data.liquidity_balance.map((entry, index) => (
                    <Cell key={`cell-liq-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfica 4: Venta Comercial por Tipos (Contratos Nuevos vs Reinversiones vs Referidos) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4 min-w-0 overflow-hidden">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-600 shrink-0" />
              <div>
                <h3 className="font-bold text-slate-800 text-sm sm:text-base">Composición por Tipo de Venta</h3>
                <p className="text-xs text-slate-400">Contratos Nuevos, Reinversiones y Referidos</p>
              </div>
            </div>
          </div>

          <div className="h-60 sm:h-64 w-full flex items-center justify-center min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.sales_by_type}
                  cx="50%"
                  cy="45%"
                  outerRadius={75}
                  dataKey="value"
                >
                  <Cell fill="#10B981" /> {/* Nuevos */}
                  <Cell fill="#3B82F6" /> {/* Reinversiones */}
                  <Cell fill="#F59E0B" /> {/* Referidos */}
                </Pie>
                <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                <Legend iconType="circle" layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
};
