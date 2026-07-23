import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Terminal, ShieldCheck, TrendingUp, Users, Wallet, Building2, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { Can } from '../../../components/security/Can';
import { investmentsService, Investment } from '../../../services/investments';
import { analyticsService, AdminAnalyticsDashboardData } from '../../../services/analytics';
import { HeroCard } from '../components/HeroCard';
import { DashboardKPIs } from '../components/DashboardKPIs';
import { QuickActions } from '../components/QuickActions';
import { InvestmentCard } from '../components/InvestmentCard';
import { AdminAnalyticsCharts } from '../components/AdminAnalyticsCharts';

export const DashboardPage = () => {
    const { user } = useAuthStore();
    const [investments, setInvestments] = useState<Investment[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'approved' | 'finished' | 'pending'>('approved');

    const isSuperAdmin = user?.is_superuser === true || user?.permissions?.includes('admin.audits.manage') === true;

    // Analytics Query for Admin
    const { data: adminAnalytics, isLoading: isLoadingAnalytics } = useQuery<AdminAnalyticsDashboardData>({
        queryKey: ['admin_analytics_dashboard'],
        queryFn: () => analyticsService.getAdminAnalyticsDashboard(),
        enabled: isSuperAdmin
    });

    useEffect(() => {
        if (!isSuperAdmin && (user?.permissions?.includes('dashboard:view_investments') || user?.permissions?.includes('ver_mis_inversiones'))) {
            setLoading(true);
            investmentsService.getMyInvestments()
                .then(setInvestments)
                .catch(err => console.error("Error al cargar inversiones:", err))
                .finally(() => setLoading(false));
        }
    }, [user, isSuperAdmin]);

    const parseNumber = (val: any) => {
        const parsed = Number(val);
        return isNaN(parsed) ? 0 : parsed;
    };

    const formatShortCOP = (val: number) => {
        return `$${val.toLocaleString('es-CO', { maximumFractionDigits: 0 })} COP`;
    };

    const activeInvestments = investments.filter(inv => inv.status === 'approved');
    const filteredInvestments = investments.filter(inv => {
        if (activeTab === 'pending') return inv.status === 'pending' || inv.status === 'rejected';
        return inv.status === activeTab;
    });

    const totalInvertido = activeInvestments.reduce((acc, inv) => acc + parseNumber(inv.monto ?? 0), 0);
    const totalAcciones = activeInvestments.reduce((acc, inv) => acc + parseNumber(inv.paquete?.acciones_otorgadas ?? 0), 0);
    const totalRendimiento = activeInvestments.reduce((acc, inv) => acc + parseNumber(inv.rendimiento_total_contrato ?? 0), 0);
    const totalPortafolio = totalInvertido + totalRendimiento;
    const rentabilidadGlobal = totalInvertido > 0 ? (totalRendimiento / totalInvertido) * 100 : 0;
    const gananciaDiaria = activeInvestments.reduce((acc, inv) => acc + parseNumber(inv.liquidacion_diaria_rendimiento ?? 0), 0);

    return (
        <div className="w-full max-w-7xl mx-auto min-w-0 pb-20 space-y-6 animate-in fade-in duration-300">
            
            {/* SECCIÓN EXCLUSIVA PARA ADMINISTRADORES / SUPERADMIN */}
            {isSuperAdmin ? (
                <div className="space-y-6 w-full min-w-0">
                    {/* Header Admin */}
                    <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-xl relative overflow-hidden">
                        <div className="absolute right-0 top-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                        <div className="relative z-10 space-y-2">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-bold text-brand-300 backdrop-blur-sm">
                                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Panel de Control Ejecutivo 360°
                            </div>
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight font-montserrat">
                                Hola, {user?.name?.split(' ')[0]} 👋
                            </h1>
                        </div>
                    </div>

                    {/* Quick Executive KPI Summary Cards */}
                    {adminAnalytics?.summary_cards && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 w-full min-w-0">
                            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-1 min-w-0 overflow-hidden">
                                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Capital Activo Invertido</span>
                                <span className="text-lg sm:text-xl xl:text-2xl font-extrabold text-emerald-700 block tracking-tight truncate" title={formatShortCOP(adminAnalytics.summary_cards.total_invertido)}>
                                    {formatShortCOP(adminAnalytics.summary_cards.total_invertido)}
                                </span>
                                <span className="text-[11px] text-slate-500">Contratos vigentes</span>
                            </div>

                            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-1 min-w-0 overflow-hidden">
                                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Inversionistas Activos</span>
                                <span className="text-lg sm:text-xl xl:text-2xl font-extrabold text-slate-900 block tracking-tight">
                                    {adminAnalytics.summary_cards.total_inversionistas}
                                </span>
                                <span className="text-[11px] text-slate-500">Contratos registrados</span>
                            </div>

                            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-1 min-w-0 overflow-hidden">
                                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Saldo en Billeteras</span>
                                <span className="text-lg sm:text-xl xl:text-2xl font-extrabold text-indigo-700 block tracking-tight truncate" title={formatShortCOP(adminAnalytics.summary_cards.total_wallets)}>
                                    {formatShortCOP(adminAnalytics.summary_cards.total_wallets)}
                                </span>
                                <span className="text-[11px] text-slate-500">Fondos depositados</span>
                            </div>

                            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-1 min-w-0 overflow-hidden">
                                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Retiros Liquidados</span>
                                <span className="text-lg sm:text-xl xl:text-2xl font-extrabold text-amber-800 block tracking-tight truncate" title={formatShortCOP(adminAnalytics.summary_cards.total_withdrawals)}>
                                    {formatShortCOP(adminAnalytics.summary_cards.total_withdrawals)}
                                </span>
                                <span className="text-[11px] text-amber-700 font-medium">Pagos procesados</span>
                            </div>
                        </div>
                    )}

                    {/* Gráficas Interactivas Recharts */}
                    {isLoadingAnalytics ? (
                        <div className="flex justify-center items-center py-20 bg-white rounded-3xl border border-slate-200">
                            <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
                        </div>
                    ) : adminAnalytics ? (
                        <AdminAnalyticsCharts data={adminAnalytics} />
                    ) : null}
                </div>
            ) : (

                /* SECCIÓN EXCLUSIVA PARA INVERSIONISTAS */
                <>
                    {/* HERO Y KPIS */}
                    <Can permission="dashboard:view_kpis">
                        {!loading ? (
                            <>
                                <HeroCard 
                                    userName={user?.name?.split(' ')[0] || ''}
                                    totalPortfolio={totalPortafolio}
                                    investedCapital={totalInvertido}
                                    accumulatedProfit={totalRendimiento}
                                    profitabilityPercent={rentabilidadGlobal}
                                    dailyProfit={gananciaDiaria}
                                />

                                <DashboardKPIs 
                                    investedCapital={totalInvertido}
                                    currentValue={totalPortafolio}
                                    accumulatedProfit={totalRendimiento}
                                    acquiredShares={totalAcciones}
                                />
                            </>
                        ) : (
                            <div className="space-y-8 animate-pulse mb-8">
                                <div className="bg-slate-900 rounded-3xl p-8 md:p-10 h-64 shadow-xl"></div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-slate-200/50 rounded-3xl"></div>)}
                                </div>
                            </div>
                        )}
                    </Can>

                    {/* ACCIONES RÁPIDAS */}
                    <Can permission="dashboard:view_quick_actions">
                        {!loading ? (
                            <QuickActions />
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 animate-pulse">
                                {[1, 2, 3, 4].map(i => <div key={i} className="h-40 bg-slate-200/50 rounded-3xl"></div>)}
                            </div>
                        )}
                    </Can>
                    
                    {/* MIS INVERSIONES */}
                    <Can permission="dashboard:view_investments">
                        {!loading ? (
                            <div className="mb-10">
                                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900 tracking-tight font-montserrat mb-1">Mis Inversiones</h3>
                                        <p className="text-sm font-medium text-slate-500">Gestiona y haz seguimiento detallado a tus contratos</p>
                                    </div>
                                    <div className="flex bg-slate-100 p-1 rounded-xl">
                                        <button 
                                            onClick={() => setActiveTab('approved')}
                                            className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'approved' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            Activas
                                        </button>
                                        <Can permission="dashboard:view_requests">
                                            <button 
                                                onClick={() => setActiveTab('pending')}
                                                className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'pending' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                Solicitudes
                                            </button>
                                        </Can>
                                        <button 
                                            onClick={() => setActiveTab('finished')}
                                            className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'finished' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            Finalizadas
                                        </button>
                                    </div>
                                </div>
                                
                                {filteredInvestments.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {filteredInvestments.map(inv => (
                                            <InvestmentCard key={inv.id} investment={inv} />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 border-dashed">
                                        <p className="text-slate-500 font-medium">No hay inversiones en esta categoría.</p>
                                        {activeTab === 'approved' && (
                                            <button className="mt-6 px-8 py-3 bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-colors font-bold shadow-sm active:scale-95">
                                                Explorar Paquetes
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="animate-pulse">
                                <div className="h-6 w-48 bg-slate-200/50 rounded mb-2"></div>
                                <div className="h-4 w-64 bg-slate-200/50 rounded mb-6"></div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {[1, 2, 3].map(i => <div key={i} className="h-80 bg-slate-200/50 rounded-3xl"></div>)}
                                </div>
                            </div>
                        )}
                    </Can>
                </>
            )}
        </div>
    );
};
