import React from 'react';
import { Briefcase, TrendingUp, DollarSign, Activity, ArrowUpRight } from 'lucide-react';
import { formatCurrency } from '../../../utils/format';

interface KPIProps {
    title: string;
    value: string | number;
    subValue?: string;
    variationStr: string;
    isPositive: boolean;
    icon: React.ReactNode;
}

const KPICard: React.FC<KPIProps> = ({ title, value, subValue, variationStr, isPositive, icon }) => (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
        {/* Subtle hover gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        
        <div className="relative z-10 flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
                <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl group-hover:bg-white group-hover:border-slate-300 transition-colors">
                    <div className="text-slate-500 group-hover:text-brand-500 transition-colors">
                        {icon}
                    </div>
                </div>
            </div>
            <div className={`flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg ${isPositive ? 'text-emerald-700 bg-emerald-50 border border-emerald-100' : 'text-red-700 bg-red-50 border border-red-100'}`}>
                {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
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
);

export const DashboardKPIs = ({
    investedCapital,
    finishedCapital = 0,
    currentValue,
    accumulatedProfit,
    acquiredShares,
    variations
}: any) => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 mb-8">
            <KPICard 
                title="Capital Activo" 
                value={formatCurrency(investedCapital)} 
                variationStr={variations?.invested || "+0.0%"} 
                isPositive={true} 
                icon={<Briefcase className="w-5 h-5 text-emerald-600" />} 
            />
            <KPICard 
                title="Capital Finalizado" 
                value={formatCurrency(finishedCapital)} 
                variationStr={variations?.finished || "Completo"} 
                isPositive={true} 
                icon={<Briefcase className="w-5 h-5 text-slate-500" />} 
            />
            <KPICard 
                title="Valor Proyectado" 
                value={formatCurrency(currentValue)} 
                variationStr={variations?.current || "+12.4%"} 
                isPositive={true} 
                icon={<DollarSign className="w-5 h-5" />} 
            />
            <KPICard 
                title="Rendimiento Proyectado" 
                value={"+" + formatCurrency(accumulatedProfit)} 
                variationStr={variations?.profit || "+5.2%"} 
                isPositive={true} 
                icon={<TrendingUp className="w-5 h-5" />} 
            />
            <KPICard 
                title="Acciones Adquiridas" 
                value={acquiredShares} 
                subValue="unds"
                variationStr={variations?.shares || "+2.0%"} 
                isPositive={true} 
                icon={<Activity className="w-5 h-5" />} 
            />
        </div>
    );
};

// ArrowDownRight component placeholder for the negative variation case
const ArrowDownRight = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
    </svg>
);
