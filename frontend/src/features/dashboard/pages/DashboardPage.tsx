import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, Loader2, Trophy, Sparkles, ChevronRight, Clock, ShieldAlert, Mail, CheckCircle2, AlertTriangle } from 'lucide-react';
import { fetchApi } from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';
import { useSarlaftStatus } from '../../../hooks/useSarlaftStatus';
import { Can } from '../../../components/security/Can';
import { investmentsService, Investment } from '../../../services/investments';
import { analyticsService, AdminAnalyticsDashboardData } from '../../../services/analytics';
import { rankingsService, UserRankDetails } from '../../../services/rankings';
import { HeroCard } from '../components/HeroCard';
import { DashboardKPIs } from '../components/DashboardKPIs';
import { QuickActions } from '../components/QuickActions';
import { InvestmentCard } from '../components/InvestmentCard';
import { AdminAnalyticsCharts } from '../components/AdminAnalyticsCharts';
import { DirectorDashboardView } from '../components/DirectorDashboardView';
import { AccountingDashboardView } from '../components/AccountingDashboardView';
import { RankingsClubModal } from '../../investments/components/RankingsClubModal';
import { DashboardEventWidget } from '../../events/components/DashboardEventWidget';

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
    const [activeTab, setActiveTab] = useState<'approved' | 'finished' | 'pending'>('approved');
    const [isClubModalOpen, setIsClubModalOpen] = useState(false);

    // Estado para pruebas de correos corporativos (temporal)
    const [emailTestingType, setEmailTestingType] = useState<string | null>(null);
    const [emailFeedback, setEmailFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const handleSendTestEmail = async (type: 'welcome' | 'sarlaft_approved' | 'sarlaft_findings') => {
        try {
            setEmailTestingType(type);
            setEmailFeedback(null);
            const res = await fetchApi<{ success: boolean; message: string }>('/auth/test-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email_type: type })
            });
            if (res.success) {
                setEmailFeedback({ type: 'success', message: res.message });
            } else {
                setEmailFeedback({ type: 'error', message: res.message });
            }
        } catch (err: any) {
            setEmailFeedback({
                type: 'error',
                message: err.message || 'Error de conexión al enviar el correo de prueba.'
            });
        } finally {
            setEmailTestingType(null);
        }
    };

    const [adminViewMode, setAdminViewMode] = useState<'admin' | 'director' | 'accounting'>('admin');
    const isSuperAdmin = user?.is_superuser === true || user?.permissions?.includes('admin.audits.manage') === true;

    const hasAccountingRole = user?.roles?.some((r: any) => {
        const name = typeof r === 'string' ? r : (r?.name || '');
        return ['contab', 'contador', 'auditor', 'tesoreria'].some(kw => name.toLowerCase().includes(kw));
    });

    const isAccountingOnly = !isSuperAdmin && (
        hasAccountingRole ||
        user?.permissions?.includes('accounting.dashboard.view') === true
    );
        
    const hasDirectorRole = !isAccountingOnly && user?.roles?.some((r: any) => {
        const name = typeof r === 'string' ? r : (r?.name || '');
        return ['directiv', 'comercial', 'asesor', 'lider', 'director', 'gerente'].some(kw => name.toLowerCase().includes(kw));
    });

    const isDirectorOnly = !isSuperAdmin && !isAccountingOnly && (
        hasDirectorRole ||
        user?.permissions?.includes('director.dashboard.view') === true || 
        user?.permissions?.includes('commercial:view') === true
    );

    const isInvestorView = !isSuperAdmin && !isDirectorOnly && !isAccountingOnly;
    const { isPending: isSarlaftPending, isRejected: isSarlaftRejected } = useSarlaftStatus();

    // Analytics Query for Admin
    const { data: adminAnalytics, isLoading: isLoadingAnalytics } = useQuery<AdminAnalyticsDashboardData>({
        queryKey: ['admin_analytics_dashboard'],
        queryFn: () => analyticsService.getAdminAnalyticsDashboard(),
        enabled: isSuperAdmin && adminViewMode === 'admin'
    });

    // Investments Query for Investor (uses cache & starts in loading state to prevent zero-value flicker)
    const { data: investments = [], isLoading: isLoadingInvestments } = useQuery<Investment[]>({
        queryKey: ['my_investments', user?.id],
        queryFn: async () => {
            const invData = await investmentsService.getMyInvestments();
            return Array.isArray(invData) ? invData : [];
        },
        enabled: isInvestorView && !!user?.id,
        staleTime: 30000,
    });

    // Rank Details Query for Investor
    const { data: rankDetails = null } = useQuery<UserRankDetails | null>({
        queryKey: ['my_rank_details', user?.id],
        queryFn: async () => {
            try {
                return await rankingsService.getMyRankDetails();
            } catch {
                return null;
            }
        },
        enabled: isInvestorView && !!user?.id,
        staleTime: 60000,
    });

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
            const parts = inv.fecha_finalizacion.split('T')[0].split('-');
            if (parts.length === 3) {
                endDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            } else {
                endDate = new Date(inv.fecha_finalizacion);
            }
        } else if (inv.fecha_ingreso && inv.dias_contrato) {
            const parts = inv.fecha_ingreso.split('T')[0].split('-');
            let startDate: Date;
            if (parts.length === 3) {
                startDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            } else {
                startDate = new Date(inv.fecha_ingreso);
            }
            endDate = new Date(startDate.getTime() + inv.dias_contrato * 24 * 60 * 60 * 1000);
        }

        if (endDate) {
            endDate.setHours(0, 0, 0, 0);
            // Si fecha fin <= hoy -> el contrato venció (Capital Finalizado, return false)
            if (endDate <= today) {
                return false;
            }
        }

        // Si fecha fin > hoy -> el contrato sigue vigente (Capital Activo, return true)
        return true;
    };

    const activeInvestments = investments.filter(isInvestmentActive);
    const finishedInvestments = investments.filter(inv => 
        inv.status === 'finished' || (inv.status === 'approved' && !isInvestmentActive(inv))
    );
    const filteredInvestments = investments.filter(inv => {
        if (activeTab === 'pending') return inv.status === 'pending' || inv.status === 'rejected';
        if (activeTab === 'approved') return isInvestmentActive(inv);
        if (activeTab === 'finished') return inv.status === 'finished' || (inv.status === 'approved' && !isInvestmentActive(inv));
        return inv.status === activeTab;
    });

    const totalInvertido = activeInvestments.reduce((acc, inv) => acc + parseNumber(inv.capital_activo ?? inv.monto ?? 0), 0);
    const totalCapitalRetirado = activeInvestments.reduce((acc, inv) => acc + parseNumber(inv.capital_retirado ?? 0), 0);
    const totalInvertidoFinalizado = finishedInvestments.reduce((acc, inv) => acc + parseNumber(inv.monto ?? 0), 0);
    const totalAcciones = activeInvestments.reduce((acc, inv) => acc + parseNumber(inv.paquete?.acciones_otorgadas ?? 0), 0);
    const totalRendimiento = activeInvestments.reduce((acc, inv) => acc + parseNumber(inv.rendimiento_total_contrato ?? 0), 0);
    const totalPortafolio = totalInvertido + totalRendimiento;
    const rentabilidadGlobal = totalInvertido > 0 ? (totalRendimiento / totalInvertido) * 100 : 0;
    const gananciaDiaria = activeInvestments.reduce((acc, inv) => acc + parseNumber(inv.liquidacion_diaria_rendimiento ?? 0), 0);

    return (
        <div className="w-full max-w-7xl mx-auto min-w-0 pb-20 space-y-6 animate-in fade-in duration-300">
            
            {/* Widget Oficial de Evento Gloint Power Tech (Exclusivo para Inversionistas) */}
            {!isSuperAdmin && !isDirectorOnly && !isAccountingOnly && <DashboardEventWidget />}

            {/* VISTA CONTABILIDAD O DIRECTIVO O ADMIN */}
            {isAccountingOnly ? (
                <AccountingDashboardView />
            ) : isDirectorOnly ? (
                <DirectorDashboardView />
            ) : isSuperAdmin ? (
                <div className="space-y-6 w-full min-w-0">
                    {/* Admin Mode Switcher Tabs */}
                    <div className="flex items-center gap-2 p-1.5 bg-slate-100/80 rounded-2xl w-fit border border-slate-200/80 flex-wrap">
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
                        <button
                            onClick={() => setAdminViewMode('accounting')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer font-montserrat ${
                                adminViewMode === 'accounting' 
                                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20' 
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            Contabilidad & Tesorería
                        </button>
                    </div>

                    {adminViewMode === 'accounting' ? (
                        <AccountingDashboardView />
                    ) : adminViewMode === 'director' ? (
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4 w-full min-w-0">
                                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all space-y-2 min-w-0 overflow-hidden flex flex-col justify-between">
                                    <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block font-montserrat truncate">Capital Activo</span>
                                    <span className="text-lg sm:text-xl 2xl:text-2xl font-extrabold text-emerald-700 block tracking-tight truncate font-mono" title={formatCardCurrency(adminAnalytics.summary_cards.total_invertido)}>
                                        {formatCardCurrency(adminAnalytics.summary_cards.total_invertido)}
                                    </span>
                                    <span className="text-[11px] text-slate-500 font-semibold truncate block">Contratos en vigencia</span>
                                </div>

                                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all space-y-2 min-w-0 overflow-hidden flex flex-col justify-between">
                                    <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block font-montserrat truncate">Capital Finalizado</span>
                                    <span className="text-lg sm:text-xl 2xl:text-2xl font-extrabold text-slate-600 block tracking-tight truncate font-mono" title={formatCardCurrency(adminAnalytics.summary_cards.total_capital_finalizado || 0)}>
                                        {formatCardCurrency(adminAnalytics.summary_cards.total_capital_finalizado || 0)}
                                    </span>
                                    <span className="text-[11px] text-slate-500 font-semibold truncate block">Contratos vencidos</span>
                                </div>

                                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all space-y-2 min-w-0 overflow-hidden flex flex-col justify-between">
                                    <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block font-montserrat truncate">Inversionistas Activos</span>
                                    <span className="text-lg sm:text-xl 2xl:text-2xl font-extrabold text-emerald-600 block tracking-tight font-mono truncate">
                                        {adminAnalytics.summary_cards.total_inversionistas}
                                    </span>
                                    <span className="text-[11px] text-slate-500 font-semibold truncate block">Contratos en curso</span>
                                </div>

                                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all space-y-2 min-w-0 overflow-hidden flex flex-col justify-between">
                                    <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block font-montserrat truncate">Inversionistas Inactivos</span>
                                    <span className="text-lg sm:text-xl 2xl:text-2xl font-extrabold text-slate-500 block tracking-tight font-mono truncate">
                                        {adminAnalytics.summary_cards.total_inversionistas_inactivos || 0}
                                    </span>
                                    <span className="text-[11px] text-slate-500 font-semibold truncate block">Contratos finalizados</span>
                                </div>

                                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all space-y-2 min-w-0 overflow-hidden flex flex-col justify-between">
                                    <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block font-montserrat truncate">Saldo en Billeteras</span>
                                    <span className="text-lg sm:text-xl 2xl:text-2xl font-extrabold text-indigo-700 block tracking-tight truncate font-mono" title={formatCardCurrency(adminAnalytics.summary_cards.total_wallets)}>
                                        {formatCardCurrency(adminAnalytics.summary_cards.total_wallets)}
                                    </span>
                                    <span className="text-[11px] text-slate-500 font-semibold truncate block">Fondos depositados</span>
                                </div>

                                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all space-y-2 min-w-0 overflow-hidden flex flex-col justify-between">
                                    <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block font-montserrat truncate">Retiros Procesados</span>
                                    <span className="text-lg sm:text-xl 2xl:text-2xl font-extrabold text-amber-800 block tracking-tight truncate font-mono" title={formatCardCurrency(adminAnalytics.summary_cards.total_withdrawals)}>
                                        {formatCardCurrency(adminAnalytics.summary_cards.total_withdrawals)}
                                    </span>
                                    <span className="text-[11px] text-amber-700 font-medium truncate block">Pagos liquidados</span>
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
                isLoadingInvestments ? (
                    <InvestorDashboardSkeleton />
                ) : (
                    <>
                        {/* Banner de Validación SARLAFT Pendiente */}
                        {isSarlaftPending && (
                            <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300/80 rounded-3xl p-5 sm:p-6 mb-6 backdrop-blur-sm shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-300">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-600 mt-0.5 shadow-xs">
                                        <Clock className="w-6 h-6 animate-pulse" />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-900 text-[10px] font-extrabold uppercase rounded-full border border-amber-500/30">
                                                En Verificación
                                            </span>
                                            <h4 className="font-bold text-slate-900 text-sm sm:text-base font-montserrat">
                                                Validación de Identidad y SARLAFT en Proceso
                                            </h4>
                                        </div>
                                        <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
                                            Estamos validando automáticamente tus antecedentes normativos con Tusdatos.co. Las opciones de inversión se habilitarán automáticamente tan pronto finalice el análisis.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                                    <span className="text-xs font-semibold text-amber-800 bg-amber-100/80 px-3 py-1.5 rounded-xl border border-amber-200 flex items-center gap-1.5">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-700" /> Consultando antecedentes...
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Banner de Validación SARLAFT Rechazada / Con Alertas */}
                        {isSarlaftRejected && (
                            <div className="bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent border border-rose-300/80 rounded-3xl p-5 sm:p-6 mb-6 backdrop-blur-sm shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-300">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0 text-rose-600 mt-0.5 shadow-xs">
                                        <ShieldAlert className="w-6 h-6" />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="px-2.5 py-0.5 bg-rose-500/20 text-rose-900 text-[10px] font-extrabold uppercase rounded-full border border-rose-500/30">
                                                Requiere Revisión
                                            </span>
                                            <h4 className="font-bold text-slate-900 text-sm sm:text-base font-montserrat">
                                                Cuenta No Habilitada para Inversiones
                                            </h4>
                                        </div>
                                        <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
                                            Tu validación SARLAFT presentó alertas en listas restrictivas o inconsistencias normativas. Por seguridad legal, tu cuenta requiere revisión manual por parte de un oficial de cumplimiento.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                                    <button 
                                        onClick={() => window.location.href = '/dashboard/tickets'} 
                                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                                    >
                                        Contactar Soporte
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* BOTÓN / PANEL TEMPORAL: Pruebas de Correos Corporativos */}
                        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-3xl p-5 sm:p-6 mb-6 shadow-xl relative overflow-hidden">
                            <div className="absolute right-0 top-0 w-72 h-72 bg-brand-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16"></div>
                            
                            <div className="relative z-10 space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/60">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-9 h-9 rounded-xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400 shrink-0">
                                            <Mail className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] font-extrabold uppercase rounded-full border border-amber-500/30 tracking-wider">
                                                    Pruebas (Temporal)
                                                </span>
                                                <h4 className="font-extrabold text-white text-sm sm:text-base font-montserrat">
                                                    Probar Correos Corporativos
                                                </h4>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                Se enviará la plantilla de prueba directamente a: <strong className="text-brand-300 font-mono">{user?.email}</strong>
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-[11px] font-semibold text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/80 self-start sm:self-auto shrink-0 flex items-center gap-1.5">
                                        <Sparkles className="w-3.5 h-3.5 text-brand-400" /> Plantillas Corporativas
                                    </span>
                                </div>

                                {/* Botones de prueba */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <button
                                        type="button"
                                        disabled={emailTestingType !== null}
                                        onClick={() => handleSendTestEmail('welcome')}
                                        className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800/90 hover:bg-slate-700/90 active:scale-[0.98] border border-slate-600/80 hover:border-brand-500/50 text-white rounded-2xl text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group text-left sm:text-center"
                                    >
                                        {emailTestingType === 'welcome' ? (
                                            <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
                                        ) : (
                                            <Mail className="w-4 h-4 text-brand-400 group-hover:scale-110 transition-transform" />
                                        )}
                                        <span>1. Bienvenida & Revisión</span>
                                    </button>

                                    <button
                                        type="button"
                                        disabled={emailTestingType !== null}
                                        onClick={() => handleSendTestEmail('sarlaft_approved')}
                                        className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-950/40 hover:bg-emerald-900/60 active:scale-[0.98] border border-emerald-700/60 hover:border-emerald-500 text-emerald-200 rounded-2xl text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group text-left sm:text-center"
                                    >
                                        {emailTestingType === 'sarlaft_approved' ? (
                                            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                                        ) : (
                                            <CheckCircle2 className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                                        )}
                                        <span>2. SARLAFT Aprobada</span>
                                    </button>

                                    <button
                                        type="button"
                                        disabled={emailTestingType !== null}
                                        onClick={() => handleSendTestEmail('sarlaft_findings')}
                                        className="flex items-center justify-center gap-2 px-4 py-3 bg-amber-950/40 hover:bg-amber-900/60 active:scale-[0.98] border border-amber-700/60 hover:border-amber-500 text-amber-200 rounded-2xl text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group text-left sm:text-center"
                                    >
                                        {emailTestingType === 'sarlaft_findings' ? (
                                            <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                                        ) : (
                                            <AlertTriangle className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                                        )}
                                        <span>3. SARLAFT con Alertas</span>
                                    </button>
                                </div>

                                {/* Feedback Notification */}
                                {emailFeedback && (
                                    <div
                                        className={`flex items-start justify-between gap-3 p-3.5 rounded-2xl border text-xs animate-in fade-in slide-in-from-top-2 duration-200 ${
                                            emailFeedback.type === 'success'
                                                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                                                : 'bg-rose-500/15 border-rose-500/40 text-rose-200'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            {emailFeedback.type === 'success' ? (
                                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                            ) : (
                                                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                                            )}
                                            <span className="font-medium leading-relaxed">{emailFeedback.message}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setEmailFeedback(null)}
                                            className="text-slate-400 hover:text-white text-xs font-bold px-2 py-0.5 rounded-lg hover:bg-white/10 transition-colors"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* HERO Y KPIS */}
                        <Can permission="dashboard:view_kpis">
                            <HeroCard 
                                userName={user?.name?.split(' ')[0] || ''}
                                totalPortfolio={totalPortafolio}
                                investedCapital={totalInvertido}
                                finishedCapital={totalInvertidoFinalizado}
                                accumulatedProfit={totalRendimiento}
                                profitabilityPercent={rentabilidadGlobal}
                                dailyProfit={gananciaDiaria}
                            />

                            {/* CLUB DE BENEFICIOS & RANKING BANNER (Oculto para Inversionistas) */}

                            <DashboardKPIs 
                                investedCapital={totalInvertido}
                                finishedCapital={totalInvertidoFinalizado}
                                currentValue={totalPortafolio}
                                accumulatedProfit={totalRendimiento}
                                acquiredShares={totalAcciones}
                                profitabilityPercent={rentabilidadGlobal}
                                investments={investments}
                                activeInvestments={activeInvestments}
                                finishedInvestments={finishedInvestments}
                                dailyProfit={gananciaDiaria}
                                onCardClick={(type) => {
                                    if (type === 'finished') {
                                        setActiveTab('finished');
                                    } else if (type === 'invested' || type === 'current' || type === 'profit' || type === 'shares') {
                                        setActiveTab('approved');
                                    }
                                }}
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

            {/* Modal de Club de Beneficios & Rangos */}
            <RankingsClubModal
                isOpen={isClubModalOpen}
                onClose={() => setIsClubModalOpen(false)}
            />
        </div>
    );
};
