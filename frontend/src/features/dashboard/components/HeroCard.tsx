import React from 'react';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';
import { formatCurrency } from '../../../utils/format';

interface HeroCardProps {
    userName: string;
    totalPortfolio: number;
    investedCapital: number;
    accumulatedProfit: number;
    profitabilityPercent: number;
    dailyProfit: number;
}

export const HeroCard: React.FC<HeroCardProps> = ({
    userName,
    totalPortfolio,
    investedCapital,
    accumulatedProfit,
    profitabilityPercent,
    dailyProfit
}) => {
    return (
        <div className="bg-slate-900 rounded-3xl p-8 md:p-10 text-white relative overflow-hidden shadow-2xl shadow-brand-900/20 mb-8">
            {/* Background Texture & Gradient */}
            <div className="absolute top-0 right-0 w-full h-full pointer-events-none overflow-hidden">
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-brand-500/20 rounded-full blur-[100px]"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-slate-800/40 rounded-full blur-[120px] opacity-50"></div>
            </div>

            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
                {/* Main Value */}
                <div className="flex-1">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-xl md:text-2xl font-montserrat tracking-tight text-slate-300">
                            Resumen de Portafolio <span className="text-white font-bold ml-1">{userName}</span> 👋
                        </h1>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 uppercase tracking-widest font-bold bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-700">
                            <Clock className="w-3 h-3" />
                            Actualizado hace 2m
                        </div>
                    </div>
                    
                    <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-2">Valor Actual del Portafolio</p>
                    <div className="flex items-baseline gap-4 mb-8">
                        <h2 className="text-5xl md:text-6xl font-black font-montserrat tracking-tighter text-white drop-shadow-md">
                            {formatCurrency(totalPortfolio)}
                        </h2>
                        <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-full text-sm font-bold shadow-sm">
                            <ArrowUpRight className="w-4 h-4" />
                            +{profitabilityPercent.toFixed(2)}%
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-700/50">
                        <div>
                            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Capital Invertido</p>
                            <p className="text-xl font-bold font-montserrat text-slate-200">{formatCurrency(investedCapital)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Rendimiento Acumulado</p>
                            <p className="text-xl font-bold font-montserrat text-emerald-400">+{formatCurrency(accumulatedProfit)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Rendimiento del Día</p>
                            <p className="text-xl font-bold font-montserrat text-brand-400">+{formatCurrency(dailyProfit)}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
