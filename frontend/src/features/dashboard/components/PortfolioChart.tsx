import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../../../utils/format';

const data = [
  { name: 'Ene', value: 4000 },
  { name: 'Feb', value: 3000 },
  { name: 'Mar', value: 5000 },
  { name: 'Abr', value: 4500 },
  { name: 'May', value: 6000 },
  { name: 'Jun', value: 7500 },
  { name: 'Jul', value: 8500 },
];

const filters = ['7D', '30D', '3M', '6M', '1A', 'TODO'];

export const PortfolioChart = () => {
    const [activeFilter, setActiveFilter] = useState('6M');

    return (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight font-montserrat">Evolución del Portafolio</h3>
                    <p className="text-sm font-medium text-slate-500 mt-1">Crecimiento histórico de tu capital</p>
                </div>
                
                {/* Filters */}
                <div className="flex items-center gap-1 bg-slate-100/50 p-1 rounded-xl border border-slate-200/50">
                    {filters.map(f => (
                        <button 
                            key={f}
                            onClick={() => setActiveFilter(f)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                activeFilter === f 
                                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60' 
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Chart Area */}
                <div className="lg:col-span-3 h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} 
                                dy={10}
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                                tickFormatter={(val) => `$${val/1000}k`}
                            />
                            <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                formatter={(value: any) => [formatCurrency(value), 'Valor']}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="value" 
                                stroke="#f97316" 
                                strokeWidth={3}
                                fillOpacity={1} 
                                fill="url(#colorValue)" 
                                activeDot={{ r: 6, strokeWidth: 0, fill: '#f97316' }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Side Stats */}
                <div className="flex flex-col justify-center gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Rendimiento Diario Promedio</p>
                        <p className="text-xl font-bold text-slate-900 font-montserrat">+{formatCurrency(3500)}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Rendimiento Mensual</p>
                        <p className="text-xl font-bold text-brand-600 font-montserrat">+{formatCurrency(105000)}</p>
                    </div>
                    <div className="h-px w-full bg-slate-200/80"></div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Próximo Pago</p>
                        <p className="text-xl font-bold text-slate-900 font-montserrat">15 Nov 2026</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Total Retirado</p>
                        <p className="text-xl font-bold text-slate-700 font-montserrat">{formatCurrency(450000)}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
