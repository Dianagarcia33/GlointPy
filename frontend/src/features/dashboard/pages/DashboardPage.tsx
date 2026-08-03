import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { Can } from '../../../components/security/Can';
import { investmentsService, Investment } from '../../../services/investments';
import { analyticsService, AdminAnalyticsDashboardData } from '../../../services/analytics';
import { HeroCard } from '../components/HeroCard';
import { DashboardKPIs } from '../components/DashboardKPIs';
import { QuickActions } from '../components/QuickActions';
import { InvestmentCard } from '../components/InvestmentCard';
import { AdminAnalyticsCharts } from '../components/AdminAnalyticsCharts';
import { DirectorDashboardView } from '../components/DirectorDashboardView';

/* SKELETON LOADERS */
const AdminDashboardSkeleton = () => (
    <div className="space-y-6 w-full min-w-0 animate-pulse">
        {/* Header Skeleton */}
        <div className="bg-slate-900/90 rounded-3xl p-6 sm:p-8 md:p-10 h-40 shadow-xl relative overflow-hidden flex flex-col justify-center space-y-3">
            <div className="h-5 w-48 bg-slate-800 rounded-full"></div>
            <div className="h-8 w-64 bg-slate-800 rounded-xl"></div>
        </div>

        {/* Executive Summary Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 w-full">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
                    <div className="h-3 w-32 bg-slate-200 rounded"></div>
                    <div className="h-7 w-40 bg-slate-300 rounded-lg"></div>
                    <div className="h-3 w-24 bg-slate-100 rounded"></div>
                </div>
            ))}
        </div>

        {/* Main Charts Skeleton */}
        <div className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 w-full">
                <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 h-80 space-y-4">
                    <div className="h-5 w-48 bg-slate-200 rounded"></div>
                    <div className="h-56 bg-slate-100/70 rounded-xl"></div>
                </div>
                <div className="xl:col-span-1 bg-white rounded-2xl border border-slate-200 p-6 h-80 space-y-4">
                    <div className="h-5 w-40 bg-slate-200 rounded"></div>
                    <div className="h-56 bg-slate-100/70 rounded-xl"></div>
                </div>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full">
                <div className="bg-white rounded-2xl border border-slate-200 p-6 h-72 space-y-4">
                    <div className="h-5 w-48 bg-slate-200 rounded"></div>
                    <div className="h-48 bg-slate-100/70 rounded-xl"></div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-6 h-72 space-y-4">
                    <div className="h-5 w-48 bg-slate-200 rounded"></div>
                    <div className="h-48 bg-slate-100/70 rounded-xl"></div>
                </div>
            </div>
        </div>
    </div>
);

const InvestorDashboardSkeleton = () => (
    <div className="space-y-8 w-full min-w-0 animate-pulse">
        {/* Hero Card Skeleton */}
        <div className="bg-slate-900 rounded-3xl p-8 md:p-10 h-72 shadow-2xl flex flex-col justify-between">
            <div className="space-y-3">
                <div className="h-5 w-64 bg-slate-800 rounded-full"></div>
                <div className="h-3 w-40 bg-slate-800 rounded"></div>
                <div className="h-12 w-80 bg-slate-800 rounded-2xl"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-800">
                <div className="h-10 bg-slate-800/80 rounded-xl"></div>
                <div className="h-10 bg-slate-800/80 rounded-xl"></div>
                <div className="h-10 bg-slate-800/80 rounded-xl"></div>
            </div>
        </div>

        {/* KPIs Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                    <div className="flex justify-between">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl"></div>
                        <div className="w-12 h-5 bg-slate-100 rounded-lg"></div>
                    </div>
                    <div className="h-3 w-28 bg-slate-200 rounded"></div>
                    <div className="h-7 w-36 bg-slate-300 rounded-lg"></div>
                </div>
            ))}
        </div>

        {/* Quick Actions Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200 h-36 flex flex-col justify-center items-center space-y-3">
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl"></div>
                    <div className="h-4 w-24 bg-slate-200 rounded"></div>
                </div>
            ))}
        </div>

        {/* Investments Cards Skeleton */}
        <div className="space-y-4">
            <div className="h-6 w-48 bg-slate-200 rounded-lg"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white rounded-3xl border border-slate-200 p-6 h-80 space-y-4">
                        <div className="flex justify-between">
                            <div className="w-10 h-10 bg-slate-100 rounded-xl"></div>
                            <div className="w-16 h-6 bg-slate-100 rounded-lg"></div>
                        </div>
                        <div className="h-4 w-32 bg-slate-200 rounded"></div>
                        <div className="h-3 w-full bg-slate-100 rounded-full"></div>
                        <div className="space-y-2 pt-4">
                            <div className="h-4 w-full bg-slate-100 rounded"></div>
                            <div className="h-4 w-full bg-slate-100 rounded"></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

export const DashboardPage = () => {
    const { user } = useAuthStore();
    const [investments, setInvestments] = useState<Investment[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'approved' | 'finished' | 'pending'>('approved');

    const [adminViewMode, setAdminViewMode] = useState<'admin' | 'director'>('admin');
    const isSuperAdmin = user?.is_superuser === true || user?.permissions?.includes('admin.audits.manage') === true;
        
    const hasDirectorRole = user?.roles?.some((r: any) => {
        const name = typeof r === 'string' ? r : (r?.name || '');
        return ['directiv', 'comercial', 'asesor', 'lider', 'director', 'gerente'].some(kw => name.toLowerCase().includes(kw));
    });

    const isDirectorOnly = !isSuperAdmin && (
        hasDirectorRole ||
        user?.permissions?.includes('director.dashboard.view') === true || 
        user?.permissions?.includes('commercial:view') === true ||
        user?.permissions?.includes('admin.referrals.manage') === true ||
        user?.permissions?.includes('admin.investments.manage') === true ||
        user?.permissions?.includes('admin.users.manage') === true ||
        user?.permissions?.includes('admin.roles.manage') === true
    );

    // Analytics Query for Admin
    const { data: adminAnalytics, isLoading: isLoadingAnalytics } = useQuery<AdminAnalyticsDashboardData>({
        queryKey: ['admin_analytics_dashboard'],
        queryFn: () => analyticsService.getAdminAnalyticsDashboard(),
        enabled: isSuperAdmin && adminViewMode === 'admin'
    });

    useEffect(() => {
        if (!isSuperAdmin && !isDirectorOnly && (user?.permissions?.includes('dashboard:view_investments') || user?.permissions?.includes('ver_mis_inversiones'))) {
            setLoading(true);
            investmentsService.getMyInvestments()
                .then(setInvestments)
                .catch(err => console.error("Error al cargar inversiones:", err))
                .finally(() => setLoading(false));
        }
    }, [user, isSuperAdmin, isDirectorOnly]);

    const parseNumber = (val: any) => {
        const parsed = Number(val);
        return isNaN(parsed) ? 0 : parsed;
    };

    const formatCardCurrency = (val: number) => {
        return `$${val.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
    };

    const isInvestmentActive = (inv: Investment) => {
        if (inv.status !== 'approved') return false;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let endDate: Date | null = null;

        if (inv.fecha_finalizacion) {
            endDate = new Date(inv.fecha_finalizacion);
        } else if (inv.fecha_ingreso && inv.dias_contrato) {
            const startDate = new Date(inv.fecha_ingreso);
            let durationDays = inv.dias_contrato;
            if (inv.aceleracion_dias) {
                durationDays = Math.max(0, durationDays - inv.aceleracion_dias);
            }
            endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
        }

        if (endDate) {
            endDate.setHours(23, 59, 59, 999);
            if (endDate <= today) {
                return false;
            }
        }

        return true;
    };

    const activeInvestments = investments.filter(isInvestmentActive);
    const filteredInvestments = investments.filter(inv => {
        if (activeTab === 'pending') return inv.status === 'pending' || inv.status === 'rejected';
        if (activeTab === 'approved') return isInvestmentActive(inv);
        if (activeTab === 'finished') return inv.status === 'finished' || (inv.status === 'approved' && !isInvestmentActive(inv));
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
            
            {/* VISTA DIRECTIVO DE INVERSIONES SOLO */}
            {isDirectorOnly ? (
                <DirectorDashboardView />
            ) : isSuperAdmin ? (
                <div className="space-y-6 w-full min-w-0">
                    {/* Admin Mode Switcher Tabs */}
                    <div className="flex items-center gap-2 p-1.5 bg-slate-100/80 rounded-2xl w-fit border border-slate-200/80">
                        <button
                            onClick={() => setAdminViewMode('admin')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer font-montserrat ${
                                adminViewMode === 'admin' 
                                    ? 'bg-slate-900 text-white shadow-sm' 
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            Panel Control 360°
                        </button>
                        <button
                            onClick={() => setAdminViewMode('director')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer font-montserrat ${
                                adminViewMode === 'director' 
                                    ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/20' 
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            Directivo de Inversiones
                        </button>
                    </div>

                    {adminViewMode === 'director' ? (
                        <DirectorDashboardView />
                    ) : isLoadingAnalytics ? (
                        <AdminDashboardSkeleton />
                    ) : (
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 w-full min-w-0">
                                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-1 min-w-0 overflow-hidden">
                                    <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block font-montserrat">Capital Activo</span>
                                    <span className="text-lg sm:text-xl xl:text-2xl font-extrabold text-emerald-700 block tracking-tight truncate font-mono" title={formatCardCurrency(adminAnalytics.summary_cards.total_invertido)}>
                                        {formatCardCurrency(adminAnalytics.summary_cards.total_invertido)}
                                    </span>
                                    <span className="text-[11px] text-slate-500 font-semibold">Contratos en vigencia</span>
                                </div>

                                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-1 min-w-0 overflow-hidden">
                                    <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block font-montserrat">Capital Finalizado</span>
                                    <span className="text-lg sm:text-xl xl:text-2xl font-extrabold text-slate-600 block tracking-tight truncate font-mono" title={formatCardCurrency(adminAnalytics.summary_cards.total_capital_finalizado || 0)}>
                                        {formatCardCurrency(adminAnalytics.summary_cards.total_capital_finalizado || 0)}
                                    </span>
                                    <span className="text-[11px] text-slate-500 font-semibold">Contratos vencidos</span>
                                </div>

                                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-1 min-w-0 overflow-hidden">
                                    <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block font-montserrat">Inversionistas Activos</span>
                                    <span className="text-lg sm:text-xl xl:text-2xl font-extrabold text-slate-900 block tracking-tight font-mono">
                                        {adminAnalytics.summary_cards.total_inversionistas}
                                    </span>
                                    <span className="text-[11px] text-slate-500 font-semibold">Contratos registrados</span>
                                </div>

                                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-1 min-w-0 overflow-hidden">
                                    <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block font-montserrat">Saldo en Billeteras</span>
                                    <span className="text-lg sm:text-xl xl:text-2xl font-extrabold text-indigo-700 block tracking-tight truncate font-mono" title={formatCardCurrency(adminAnalytics.summary_cards.total_wallets)}>
                                        {formatCardCurrency(adminAnalytics.summary_cards.total_wallets)}
                                    </span>
                                    <span className="text-[11px] text-slate-500 font-semibold">Fondos depositados</span>
                                </div>

                                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-1 min-w-0 overflow-hidden">
                                    <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block font-montserrat">Retiros Procesados</span>
                                    <span className="text-lg sm:text-xl xl:text-2xl font-extrabold text-amber-800 block tracking-tight truncate font-mono" title={formatCardCurrency(adminAnalytics.summary_cards.total_withdrawals)}>
                                        {formatCardCurrency(adminAnalytics.summary_cards.total_withdrawals)}
                                    </span>
                                    <span className="text-[11px] text-amber-700 font-medium">Pagos liquidados</span>
                                </div>
                            </div>
                        )}

                            {/* Gráficas Interactivas Recharts */}
                            {adminAnalytics && <AdminAnalyticsCharts data={adminAnalytics} />}
                        </div>
                    )}
                </div>
            ) : (

                /* SECCIÓN EXCLUSIVA PARA INVERSIONISTAS */
                loading ? (
                    <InvestorDashboardSkeleton />
                ) : (
                    <>
                        {/* HERO Y KPIS */}
                        <Can permission="dashboard:view_kpis">
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
                        </Can>

                        {/* ACCIONES RÁPIDAS */}
                        <Can permission="dashboard:view_quick_actions">
                            <QuickActions />
                        </Can>
                        
                        {/* MIS INVERSIONES */}
                        <Can permission="dashboard:view_investments">
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
                        </Can>
                    </>
                )
            )}
        </div>
    );
};
