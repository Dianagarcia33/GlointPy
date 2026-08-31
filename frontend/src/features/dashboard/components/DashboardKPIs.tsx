import React, { useState } from 'react';
import { Briefcase, TrendingUp, DollarSign, Activity, ArrowUpRight, Minus, ChevronRight, Eye } from 'lucide-react';
import { formatCurrency } from '../../../utils/format';
import { Investment } from '../../../services/investments';
import { KPIDetailModal, KPIType } from './KPIDetailModal';

interface KPIProps {
    title: string;
    value: string | number;
    subValue?: string;
    variationStr: string;
    isPositive: boolean;
    isNeutral?: boolean;
    icon: React.ReactNode;
    onClick?: () => void;
}

const KPICard: React.FC<KPIProps> = ({ title, value, subValue, variationStr, isPositive, isNeutral, icon, onClick }) => (
    <div 
        onClick={onClick}
        className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs hover:shadow-xl hover:border-brand-300 hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden cursor-pointer flex flex-col justify-between"
    >
        {/* Subtle hover gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-50/40 via-transparent to-slate-50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        
        <div>
            <div className="relative z-10 flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl group-hover:bg-white group-hover:border-brand-200 group-hover:shadow-sm transition-all">
                        <div className="text-slate-500 group-hover:text-brand-500 transition-colors">
                            {icon}
                        </div>
                    </div>
                </div>
                <div className={`flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg ${
                    isNeutral
                        ? 'text-slate-600 bg-slate-100 border border-slate-200'
                        : isPositive 
                            ? 'text-emerald-700 bg-emerald-50 border border-emerald-100' 
                            : 'text-red-700 bg-red-50 border border-red-100'
                }`}>
                    {isNeutral ? <Minus className="w-3 h-3 text-slate-400" /> : isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {variationStr}
                </div>
            </div>
            
            <div className="relative z-10">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">{title}</p>
                <div className="flex items-baseline gap-1.5">
                    <h3 className="text-2xl font-bold font-montserrat text-slate-900 tracking-tight">
                        {value}
                    </h3>
                    {subValue && <span className="text-sm font-semibold text-slate-500">{subValue}</span>}
                </div>
            </div>
        </div>

        <div className="relative z-10 mt-3 pt-2.5 border-t border-slate-100/80 flex items-center justify-between text-[11px] font-bold text-slate-400 group-hover:text-brand-600 transition-colors">
            <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" /> Ver detalle
            </span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </div>
    </div>
);

export const DashboardKPIs = ({
    investedCapital = 0,
    finishedCapital = 0,
    currentValue = 0,
    accumulatedProfit = 0,
    acquiredShares = 0,
    profitabilityPercent = 0,
    investments = [],
    activeInvestments = [],
    finishedInvestments = [],
    dailyProfit = 0,
    variations,
    onCardClick
}: {
    investedCapital?: number;
    finishedCapital?: number;
    currentValue?: number;
    accumulatedProfit?: number;
    acquiredShares?: number;
    profitabilityPercent?: number;
    investments?: Investment[];
    activeInvestments?: Investment[];
    finishedInvestments?: Investment[];
    dailyProfit?: number;
    variations?: any;
    onCardClick?: (type: KPIType) => void;
}) => {
    const [selectedKPI, setSelectedKPI] = useState<KPIType>(null);
    const hasInvested = investedCapital > 0;
    const calcProfitPercent = profitabilityPercent || (hasInvested ? (accumulatedProfit / investedCapital) * 100 : 0);

    const handleSelect = (type: KPIType) => {
        setSelectedKPI(type);
        if (onCardClick) onCardClick(type);
    };

    return (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 mb-8">
                <KPICard 
                    title="Capital Activo" 
                    value={formatCurrency(investedCapital)} 
                    variationStr={variations?.invested || (hasInvested ? "+100%" : "0.0%")} 
                    isPositive={hasInvested} 
                    isNeutral={!hasInvested}
                    icon={<Briefcase className="w-5 h-5 text-emerald-600" />} 
                    onClick={() => handleSelect('invested')}
                />
                <KPICard 
                    title="Capital Finalizado" 
                    value={formatCurrency(finishedCapital)} 
                    variationStr={variations?.finished || (finishedCapital > 0 ? "Completado" : "0.0%")} 
                    isPositive={finishedCapital > 0} 
                    isNeutral={finishedCapital === 0}
                    icon={<Briefcase className="w-5 h-5 text-slate-500" />} 
                    onClick={() => handleSelect('finished')}
                />
                <KPICard 
                    title="Valor Proyectado" 
                    value={formatCurrency(currentValue)} 
                    variationStr={variations?.current || (hasInvested && calcProfitPercent > 0 ? `+${calcProfitPercent.toFixed(1)}%` : "0.0%")} 
                    isPositive={hasInvested && calcProfitPercent > 0} 
                    isNeutral={!hasInvested || calcProfitPercent === 0}
                    icon={<DollarSign className="w-5 h-5" />} 
                    onClick={() => handleSelect('current')}
                />
                <KPICard 
                    title="Rendimiento Proyectado" 
                    value={"+" + formatCurrency(accumulatedProfit)} 
                    variationStr={variations?.profit || (hasInvested && accumulatedProfit > 0 ? `+${calcProfitPercent.toFixed(1)}%` : "0.0%")} 
                    isPositive={hasInvested && accumulatedProfit > 0} 
                    isNeutral={!hasInvested || accumulatedProfit === 0}
                    icon={<TrendingUp className="w-5 h-5" />} 
                    onClick={() => handleSelect('profit')}
                />
                <KPICard 
                    title="Acciones Adquiridas" 
                    value={acquiredShares} 
                    subValue="unds"
                    variationStr={variations?.shares || (acquiredShares > 0 ? `${acquiredShares} unds` : "0 unds")} 
                    isPositive={acquiredShares > 0} 
                    isNeutral={acquiredShares === 0}
                    icon={<Activity className="w-5 h-5" />} 
                    onClick={() => handleSelect('shares')}
                />
            </div>

            <KPIDetailModal
                type={selectedKPI}
                onClose={() => setSelectedKPI(null)}
                activeInvestments={activeInvestments}
                finishedInvestments={finishedInvestments}
                totalInvertido={investedCapital}
                totalInvertidoFinalizado={finishedCapital}
                totalPortafolio={currentValue}
                totalRendimiento={accumulatedProfit}
                totalAcciones={acquiredShares}
                rentabilidadGlobal={calcProfitPercent}
                gananciaDiaria={dailyProfit}
            />
        </>
    );
};

// ArrowDownRight component placeholder for the negative variation case
const ArrowDownRight = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
    </svg>
);
