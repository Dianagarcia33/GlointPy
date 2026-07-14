import React, { useEffect, useState } from 'react';
import { Terminal } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { Can } from '../../../components/security/Can';
import { investmentsService, Investment } from '../../../services/investments';
import { HeroCard } from '../components/HeroCard';
import { DashboardKPIs } from '../components/DashboardKPIs';
import { QuickActions } from '../components/QuickActions';
import { InvestmentCard } from '../components/InvestmentCard';

import { AutoTransferModal } from '../components/AutoTransferModal';

export const DashboardPage = () => {
    const { user } = useAuthStore();
    const [investments, setInvestments] = useState<Investment[]>([]);
    const [loading, setLoading] = useState(false);
    const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'approved' | 'finished' | 'pending'>('approved');

    useEffect(() => {
        if (user?.permissions?.includes('dashboard:view_investments') || user?.permissions?.includes('ver_mis_inversiones')) {
            setLoading(true);
            investmentsService.getMyInvestments()
                .then(setInvestments)
                .catch(err => console.error("Error al cargar inversiones:", err))
                .finally(() => setLoading(false));
        }
    }, [user]);

    // LOG DE DEPURACIÓN (Se imprime automáticamente en consola)
    useEffect(() => {
        if (user) {
            console.log("========= DATOS DEL USUARIO LOGUEADO =========");
            console.log("Nombre:", user.name);
            console.log("Email:", user.email);
            console.log("Roles Asignados:", user.roles_list);
            console.log("Permisos Cargados:", user.permissions);
            console.log("==============================================");
        }
    }, [user]);

    const parseNumber = (val: any) => {
        const parsed = Number(val);
        return isNaN(parsed) ? 0 : parsed;
    };

    const activeInvestments = investments.filter(inv => inv.status === 'approved');
    const filteredInvestments = investments.filter(inv => {
        if (activeTab === 'pending') return inv.status === 'pending' || inv.status === 'rejected';
        return inv.status === activeTab;
    });

    const totalInvertido = activeInvestments.reduce((acc, inv) => acc + parseNumber(inv.monto ?? 0), 0);
    const totalAcciones = activeInvestments.reduce((acc, inv) => acc + parseNumber(inv.paquete?.acciones_otorgadas ?? 0), 0);
    const totalRendimiento = activeInvestments.reduce((acc, inv) => acc + parseNumber(inv.rendimiento_total_contrato ?? 0), 0);
    const totalPortafolio = totalInvertido + totalRendimiento; // Valor total esperado
    
    // Calcular rentabilidad porcentual global
    const rentabilidadGlobal = totalInvertido > 0 ? (totalRendimiento / totalInvertido) * 100 : 0;

    // Calcular ganancia diaria consolidada (ejemplo usando la suma de liquidaciones diarias)
    const gananciaDiaria = activeInvestments.reduce((acc, inv) => acc + parseNumber(inv.liquidacion_diaria_rendimiento ?? 0), 0);

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 relative pb-20">
            {/* PANEL EXCLUSIVO SUPERADMIN */}
            <Can permission="superadmin_tools">
                <div className="mb-8 p-6 bg-slate-900 rounded-3xl text-white shadow-xl">
                    <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                        <Terminal className="w-5 h-5 text-brand-400" /> Panel de Administración
                    </h2>
                    <p className="text-slate-400 text-sm mb-6">Herramientas exclusivas para superadmin@gloint.com</p>
                    <div className="flex gap-4">
                        <button 
                            onClick={() => setIsAdminModalOpen(true)}
                            className="flex items-center gap-2 px-5 py-3 bg-brand-500 hover:bg-brand-600 rounded-xl font-bold transition-all shadow-md active:scale-95"
                        >
                            <Terminal className="w-4 h-4" />
                            Auditoría y Transferencias
                        </button>
                    </div>
                </div>
                <AutoTransferModal 
                    isOpen={isAdminModalOpen}
                    onClose={() => setIsAdminModalOpen(false)}
                />
            </Can>

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
        </div>
    );
};
