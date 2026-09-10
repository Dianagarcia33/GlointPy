import React, { useState, useMemo } from 'react';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid
} from 'recharts';
import { TrendingUp, Layers, ArrowUpRight, ArrowDownRight, Calendar, Sparkles } from 'lucide-react';
import { SharePriceHistory, ShareIssuance } from '../../../../services/shareMarket';

interface ShareGrowthChartProps {
    priceHistory: SharePriceHistory[];
    issuances: ShareIssuance[];
    currentPrice: number;
    currentAvailableShares: number;
}

export const ShareGrowthChart: React.FC<ShareGrowthChartProps> = ({
    priceHistory,
    issuances,
    currentPrice,
    currentAvailableShares
}) => {
    const [viewMode, setViewMode] = useState<'price' | 'shares'>('price');

    // Construir la serie cronológica de crecimiento (antiguo -> nuevo)
    const chartData = useMemo(() => {
        const points: Array<{
            label: string;
            date: string;
            fullDate: string;
            price: number;
            shares: number;
            changePct: number;
            notes?: string;
        }> = [];

        // 1. Si tenemos emisiones registradas (las emisiones creadas por el admin)
        if (issuances && issuances.length > 0) {
            // Ordenar de la más antigua a la más reciente
            const sortedIss = [...issuances].sort((a, b) => {
                const timeDiff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                return timeDiff !== 0 ? timeDiff : a.id - b.id;
            });

            // Verificar si hay fechas en el mismo día para dar un formato de fecha claro
            const sameDayFormat = sortedIss.length > 1 && sortedIss.every(
                i => new Date(i.created_at).toDateString() === new Date(sortedIss[0].created_at).toDateString()
            );

            let accumulatedShares = 0;
            sortedIss.forEach((iss, idx) => {
                const d = new Date(iss.created_at);
                accumulatedShares += (iss.total_shares_issued || iss.available_shares || 0);
                const prevPrice = idx > 0 ? sortedIss[idx - 1].price_per_share : iss.price_per_share;
                const changePct = idx > 0 && prevPrice > 0 
                    ? ((iss.price_per_share - prevPrice) / prevPrice) * 100 
                    : 0;

                const dayStr = d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
                const timeStr = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });

                points.push({
                    label: `Emisión #${iss.id}${iss.title ? `: ${iss.title}` : ''}`,
                    date: sameDayFormat ? `E#${iss.id} (${timeStr})` : dayStr,
                    fullDate: `${dayStr}, ${timeStr}`,
                    price: iss.price_per_share,
                    shares: accumulatedShares,
                    changePct: Math.round(changePct * 10) / 10,
                    notes: iss.description || iss.title
                });
            });

            // Si solo hay 1 emisión registrada
            if (points.length === 1) {
                // Verificar si en priceHistory hay un precio anterior registrado válido
                const validOlderHistory = priceHistory?.find(
                    h => h.previous_price && Number(h.previous_price) > 0 && Number(h.previous_price) !== points[0].price
                );

                if (validOlderHistory) {
                    const prevPrice = Number(validOlderHistory.previous_price);
                    const diffPct = ((points[0].price - prevPrice) / prevPrice) * 100;
                    points.unshift({
                        label: 'Valor Previo Registrado',
                        date: 'Inicio',
                        fullDate: 'Precio anterior de partida',
                        price: prevPrice,
                        shares: Number(validOlderHistory.previous_available_shares || 0),
                        changePct: 0,
                        notes: 'Punto de partida anterior'
                    });
                    points[1].changePct = Math.round(diffPct * 10) / 10;
                } else {
                    // Si no hay precio anterior, mantenemos el valor real registrado sin inventar reducciones artificiales
                    points.unshift({
                        label: `${points[0].label} (Inicio)`,
                        date: 'Inicio',
                        fullDate: 'Inicio de la emisión',
                        price: points[0].price,
                        shares: points[0].shares,
                        changePct: 0,
                        notes: 'Valor inicial de la emisión'
                    });
                }
            }
        }
        // 2. Si no hay emisiones pero hay registros en la bitácora de auditoría
        else if (priceHistory && priceHistory.length > 0) {
            const sortedHist = [...priceHistory].sort((a, b) => {
                const timeDiff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                return timeDiff !== 0 ? timeDiff : a.id - b.id;
            });

            const sameDayFormat = sortedHist.length > 1 && sortedHist.every(
                h => new Date(h.created_at).toDateString() === new Date(sortedHist[0].created_at).toDateString()
            );

            // Si solo hay un registro pero tenía previous_price distinto
            if (sortedHist.length === 1 && sortedHist[0].previous_price && Number(sortedHist[0].previous_price) > 0 && Number(sortedHist[0].previous_price) !== Number(sortedHist[0].new_price)) {
                points.push({
                    label: 'Valor Previo',
                    date: 'Inicio',
                    fullDate: 'Valor base inicial',
                    price: Number(sortedHist[0].previous_price),
                    shares: Number(sortedHist[0].previous_available_shares || 0),
                    changePct: 0,
                    notes: 'Punto de partida previo'
                });
            }

            sortedHist.forEach((item) => {
                const d = new Date(item.created_at);
                const dayStr = d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
                const timeStr = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });

                points.push({
                    label: `Reg #${item.id}`,
                    date: sameDayFormat ? `Reg #${item.id} (${timeStr})` : dayStr,
                    fullDate: `${dayStr}, ${timeStr}`,
                    price: Number(item.new_price),
                    shares: Number(item.new_available_shares ?? 0),
                    changePct: Number(item.change_percentage),
                    notes: item.justification_notes
                });
            });

            if (points.length === 1) {
                points.unshift({
                    label: `${points[0].label} (Inicio)`,
                    date: 'Inicio',
                    fullDate: 'Registro inicial',
                    price: points[0].price,
                    shares: points[0].shares,
                    changePct: 0,
                    notes: 'Punto de partida'
                });
            }
        }

        return points;
    }, [priceHistory, issuances]);

    // Cálculo del crecimiento global (% total entre primer y último registro)
    const growthSummary = useMemo(() => {
        if (chartData.length < 2) {
            return { totalPct: 0, firstPrice: currentPrice, diff: 0, isPositive: true };
        }
        const first = chartData[0].price;
        const last = chartData[chartData.length - 1].price;
        const diff = last - first;
        const totalPct = first > 0 ? (diff / first) * 100 : 0;
        return {
            totalPct: Math.round(totalPct * 10) / 10,
            firstPrice: first,
            diff,
            isPositive: totalPct >= 0
        };
    }, [chartData, currentPrice]);

    const formatCurrency = (val: number) => `$${val.toLocaleString('es-CO')} COP`;

    const formatShortAxis = (val: number) => {
        if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
        if (val >= 100000) return `$${(val / 1000).toFixed(0)}K`;
        return `$${val.toLocaleString('es-CO')}`;
    };

    const CustomTooltip = ({ active, payload }: any) => {
        if (!active || !payload || !payload.length) return null;
        const p = payload[0].payload;

        return (
            <div className="bg-slate-900/95 text-white p-4 rounded-2xl shadow-xl border border-slate-700/60 backdrop-blur-md space-y-2 text-xs font-montserrat min-w-[220px] animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                        {p.label}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        {p.fullDate}
                    </span>
                </div>

                <div className="space-y-1">
                    <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium">Valor por Acción:</span>
                        <span className="text-sm font-black font-mono text-emerald-400">
                            ${p.price.toLocaleString('es-CO')} COP
                        </span>
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium">Stock Acumulado:</span>
                        <span className="font-bold font-mono text-indigo-300">
                            {p.shares.toLocaleString('es-CO')} Unds
                        </span>
                    </div>

                    {p.changePct !== 0 && (
                        <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                            <span className="text-slate-400 font-medium">Variación:</span>
                            <span className={`font-mono font-bold text-xs ${p.changePct > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {p.changePct > 0 ? `+${p.changePct}%` : `${p.changePct}%`}
                            </span>
                        </div>
                    )}
                </div>

                {p.notes && (
                    <div className="pt-1.5 border-t border-slate-800/80 text-[11px] text-slate-300 italic line-clamp-2">
                        "{p.notes}"
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 w-full min-w-0">
            
            {/* Header con métricas y selector de curva */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <TrendingUp className="w-4 h-4" />
                        </div>
                        <h3 className="text-lg font-black text-slate-900 font-montserrat tracking-tight">
                            Curva de Crecimiento de las Acciones
                        </h3>
                        {growthSummary.totalPct !== 0 && (
                            <span className={`inline-flex items-center gap-0.5 text-xs font-black px-2.5 py-0.5 rounded-full font-mono ${
                                growthSummary.isPositive 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                                {growthSummary.isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                                {growthSummary.isPositive ? `+${growthSummary.totalPct}%` : `${growthSummary.totalPct}%`}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                        Visualiza la evolución del valor por acción y el volumen según los registros del administrador
                    </p>
                </div>

                {/* Controles y Selector de Modo */}
                <div className="flex items-center gap-2 bg-slate-100/90 p-1 rounded-2xl border border-slate-200/80 self-start md:self-auto">
                    <button
                        onClick={() => setViewMode('price')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer font-montserrat flex items-center gap-1.5 ${
                            viewMode === 'price'
                                ? 'bg-slate-900 text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>Curva de Precio ($)</span>
                    </button>
                    <button
                        onClick={() => setViewMode('shares')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer font-montserrat flex items-center gap-1.5 ${
                            viewMode === 'shares'
                                ? 'bg-slate-900 text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Curva de Stock (Unds)</span>
                    </button>
                </div>
            </div>

            {/* Área de la Gráfica de Curvas */}
            {chartData.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 rounded-2xl space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-700">Sin datos de curvas aún</h4>
                    <p className="text-xs text-slate-400 max-w-sm font-medium">
                        Crea la primera emisión de acciones para comenzar a trazar la gráfica de crecimiento.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="h-72 sm:h-80 w-full min-w-0 pt-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 15, right: 20, left: 10, bottom: 0 }}>
                                <defs>
                                    {/* Gradiente Verde Esmeralda para Precio */}
                                    <linearGradient id="curvePriceGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.45} />
                                        <stop offset="60%" stopColor="#10B981" stopOpacity={0.12} />
                                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                                    </linearGradient>

                                    {/* Gradiente Azul/Indigo para Stock */}
                                    <linearGradient id="curveSharesGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366F1" stopOpacity={0.45} />
                                        <stop offset="60%" stopColor="#6366F1" stopOpacity={0.12} />
                                        <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
                                    </linearGradient>
                                </defs>

                                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />

                                <XAxis 
                                    dataKey="date" 
                                    tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }}
                                    axisLine={{ stroke: '#E2E8F0' }}
                                    tickLine={false}
                                />

                                <YAxis 
                                    width={80}
                                    tickFormatter={viewMode === 'price' ? formatShortAxis : (val) => val.toLocaleString('es-CO')}
                                    tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }}
                                    axisLine={false}
                                    tickLine={false}
                                    domain={['auto', 'auto']}
                                />

                                <Tooltip content={<CustomTooltip />} />

                                {viewMode === 'price' ? (
                                    <Area 
                                        type="monotone" 
                                        dataKey="price" 
                                        name="Valor por Acción"
                                        stroke="#10B981" 
                                        strokeWidth={3.5} 
                                        fillOpacity={1} 
                                        fill="url(#curvePriceGradient)" 
                                        dot={{ r: 4, strokeWidth: 2, fill: '#10B981', stroke: '#FFFFFF' }}
                                        activeDot={{ r: 7, strokeWidth: 3, fill: '#059669', stroke: '#FFFFFF' }}
                                    />
                                ) : (
                                    <Area 
                                        type="monotone" 
                                        dataKey="shares" 
                                        name="Stock de Acciones"
                                        stroke="#6366F1" 
                                        strokeWidth={3.5} 
                                        fillOpacity={1} 
                                        fill="url(#curveSharesGradient)" 
                                        dot={{ r: 4, strokeWidth: 2, fill: '#6366F1', stroke: '#FFFFFF' }}
                                        activeDot={{ r: 7, strokeWidth: 3, fill: '#4F46E5', stroke: '#FFFFFF' }}
                                    />
                                )}
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Footer informativo de la gráfica */}
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-100 font-montserrat">
                        <div className="flex items-center gap-4">
                            <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Punto Inicial</span>
                                <span className="font-bold text-slate-800 font-mono">
                                    {chartData[0] ? formatCurrency(chartData[0].price) : '$0'}
                                </span>
                            </div>
                            <div className="w-px h-6 bg-slate-200" />
                            <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Valor Actual Registrado</span>
                                <span className="font-black text-emerald-600 font-mono text-sm">
                                    {formatCurrency(currentPrice)}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 text-slate-500 font-medium text-[11px]">
                            <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                            <span>La curva se actualiza automáticamente con cada emisión o cambio registrado por el admin</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
