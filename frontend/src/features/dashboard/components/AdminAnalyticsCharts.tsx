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
    return `$${val.toLocaleString('es-CO')} COP`;
  };

  return (
    <div className="space-y-6">
      
      {/* Top Grid: Crecimiento de Captación + Distribución por Paquetes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Gráfica 1: Crecimiento Mensual de Captación (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="font-bold text-slate-800 text-base">Crecimiento de Captación ($ COP)</h3>
                <p className="text-xs text-slate-400">Tendencia mensual de ingresos por inversiones</p>
              </div>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.monthly_growth} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCapital" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(val) => `$${(val / 1000000).toFixed(0)}M`} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                <Area type="monotone" dataKey="capital_captado" name="Capital Captado" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorCapital)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfica 2: Distribución por Paquetes de Inversión (1 col) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-brand-600" />
              <div>
                <h3 className="font-bold text-slate-800 text-base">Paquetes de Inversión</h3>
                <p className="text-xs text-slate-400">Distribución de contratos contratados</p>
              </div>
            </div>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.package_distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {data.package_distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any, name: any, item: any) => [
                  `${value} contratos (${formatCurrency(item.payload.total_monto)})`,
                  item.payload.name
                ]} />
                <Legend iconType="circle" layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Bottom Grid: Balance de Liquidez + Proporción por Tipo de Venta */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Gráfica 3: Balance de Liquidez (Ecosistema) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="font-bold text-slate-800 text-base">Balance de Liquidez ($ COP)</h3>
                <p className="text-xs text-slate-400">Comparativa de Fondos en el Ecosistema</p>
              </div>
            </div>
          </div>

          <div className="h-60 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.liquidity_balance} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(val) => `$${(val / 1000000).toFixed(0)}M`} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(val: any) => formatCurrency(Number(val))} />
                <Bar dataKey="amount" name="Monto COP" radius={[8, 8, 0, 0]}>
                  {data.liquidity_balance.map((entry, index) => (
                    <Cell key={`cell-liq-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfica 4: Venta Comercial por Tipos (Contratos Nuevos vs Reinversiones vs Referidos) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-600" />
              <div>
                <h3 className="font-bold text-slate-800 text-base">Composición por Tipo de Venta</h3>
                <p className="text-xs text-slate-400">Contratos Nuevos, Reinversiones y Referidos</p>
              </div>
            </div>
          </div>

          <div className="h-60 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.sales_by_type}
                  cx="50%"
                  cy="50%"
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
