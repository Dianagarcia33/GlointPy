import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { Can } from '../../../components/security/Can';
import { investmentsService, Investment } from '../../../services/investments';
import { HeroCard } from '../components/HeroCard';
import { DashboardKPIs } from '../components/DashboardKPIs';
import { QuickActions } from '../components/QuickActions';
import { InvestmentCard } from '../components/InvestmentCard';

export const DashboardPage = () => {
    const { user } = useAuthStore();
    const [investments, setInvestments] = useState<Investment[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user?.permissions?.includes('ver_mis_inversiones')) {
            setLoading(true);
            investmentsService.getMyInvestments()
                .then(setInvestments)
                .catch(err => console.error("Error al cargar inversiones:", err))
                .finally(() => setLoading(false));
        }
    }, [user]);

    const parseNumber = (val: any) => {
        const parsed = Number(val);
        return isNaN(parsed) ? 0 : parsed;
    };

    const totalInvertido = investments.reduce((acc, inv) => acc + parseNumber(inv.monto ?? 0), 0);
    const totalAcciones = investments.reduce((acc, inv) => acc + parseNumber(inv.paquete?.acciones_otorgadas ?? 0), 0);
    const totalRendimiento = investments.reduce((acc, inv) => acc + parseNumber(inv.rendimiento_total_contrato ?? 0), 0);
    const totalPortafolio = totalInvertido + totalRendimiento; // Valor total esperado
    
    // Calcular rentabilidad porcentual global
    const rentabilidadGlobal = totalInvertido > 0 ? (totalRendimiento / totalInvertido) * 100 : 0;

    // Calcular ganancia diaria consolidada (ejemplo usando la suma de liquidaciones diarias)
    const gananciaDiaria = investments.reduce((acc, inv) => acc + parseNumber(inv.liquidacion_diaria_rendimiento ?? 0), 0);

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 relative pb-20">
            {/* HEROCARD */}
            <HeroCard 
                userName={user?.name?.split(' ')[0] || ''}
                totalPortfolio={totalPortafolio}
                investedCapital={totalInvertido}
                accumulatedProfit={totalRendimiento}
                profitabilityPercent={rentabilidadGlobal}
                dailyProfit={gananciaDiaria}
            />

            {/* KPIS Y ACCIONES */}
            <DashboardKPIs 
                investedCapital={totalInvertido}
                currentValue={totalPortafolio}
                accumulatedProfit={totalRendimiento}
                acquiredShares={totalAcciones}
            />

            <QuickActions />

            {/* GRÁFICO (Protegido por PBAC) */}
            <Can permission="ver_mis_inversiones">


                <div className="mb-10">
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight font-montserrat mb-1">Tus Inversiones Activas</h3>
                    <p className="text-sm font-medium text-slate-500 mb-6">Gestiona y haz seguimiento detallado a tus contratos</p>
                    
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                            {[1,2,3].map(i => <div key={i} className="h-80 bg-slate-200/50 rounded-3xl"></div>)}
                        </div>
                    ) : investments.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {investments.map(inv => (
                                <InvestmentCard key={inv.id} investment={inv} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 border-dashed">
                            <p className="text-slate-500 font-medium">Aún no tienes inversiones activas.</p>
                            <button className="mt-6 px-8 py-3 bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-colors font-bold shadow-sm active:scale-95">
                                Explorar Paquetes
                            </button>
                        </div>
                    )}
                </div>


            </Can>
        </div>
    );
};
