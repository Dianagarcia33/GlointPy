import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { LogOut, TrendingUp, DollarSign, Activity } from 'lucide-react';
import { Can } from '../../../components/security/Can';
import { investmentsService, Investment } from '../../../services/investments';

export const DashboardPage = () => {
    const { user, logout } = useAuthStore();
    const [investments, setInvestments] = useState<Investment[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Solo cargar inversiones si tiene el permiso (aunque el API también lo protegería)
        if (user?.permissions?.includes('ver_mis_inversiones')) {
            setLoading(true);
            investmentsService.getMyInvestments()
                .then(setInvestments)
                .catch(err => console.error("Error al cargar inversiones:", err))
                .finally(() => setLoading(false));
        }
    }, [user]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const parseNumber = (val: any) => {
        const parsed = Number(val);
        return isNaN(parsed) ? 0 : parsed;
    };

    const totalInvertido = investments.reduce((acc, inv) => acc + parseNumber(inv.monto ?? 0), 0);
    const totalAcciones = investments.reduce((acc, inv) => acc + parseNumber(inv.paquete?.acciones_otorgadas ?? 0), 0);
    const totalRendimiento = investments.reduce((acc, inv) => acc + parseNumber(inv.rendimiento_total_contrato ?? 0), 0);
    
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
            <div className="mb-10 pt-4 px-2">
                <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2 font-montserrat tracking-tight">Bienvenido de nuevo, {user?.name?.split(' ')[0]} 👋</h1>
                <p className="text-slate-300 font-medium font-inter">
                    Este es tu panel de control principal.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 relative z-10">
                {/* ESTE BLOQUE ESTÁ PROTEGIDO POR PBAC */}
                <Can permission="ver_mis_inversiones">
                    <div className="p-6 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-2xl flex flex-col col-span-1 md:col-span-2 lg:col-span-3">
                        <div className="flex items-center gap-3 mb-6 text-brand-400">
                            <div className="p-2 bg-brand-500/20 rounded-lg">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-xl text-white">Panel de Inversiones</h3>
                        </div>

                        {!loading && investments.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                <div className="bg-white/10 backdrop-blur-md p-5 rounded-xl border border-white/20 shadow-sm">
                                    <p className="text-sm font-medium text-slate-300 mb-1">Capital Total Invertido</p>
                                    <p className="text-2xl font-bold text-white">{formatCurrency(totalInvertido)}</p>
                                </div>
                                <div className="bg-white/10 backdrop-blur-md p-5 rounded-xl border border-white/20 shadow-sm">
                                    <p className="text-sm font-medium text-slate-300 mb-1">Total Acciones</p>
                                    <p className="text-2xl font-bold text-white">{totalAcciones} <span className="text-base font-normal text-slate-400">unds</span></p>
                                </div>
                                <div className="bg-white/10 backdrop-blur-md p-5 rounded-xl border border-white/20 shadow-sm">
                                    <p className="text-sm font-medium text-slate-300 mb-1">Rendimiento Esperado</p>
                                    <p className="text-2xl font-bold text-brand-400">+{formatCurrency(totalRendimiento)}</p>
                                </div>
                            </div>
                        )}

                        {loading ? (
                            <p className="text-indigo-600 animate-pulse">Cargando portafolio...</p>
                        ) : investments.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {investments.map(inv => (
                                    <div key={inv.id} className="bg-white/10 backdrop-blur-md p-5 rounded-xl border border-white/20 shadow-sm flex flex-col hover:bg-white/20 transition-all">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <p className="text-xs font-semibold text-brand-400 uppercase tracking-wider mb-1">Paquete Adquirido</p>
                                                <h4 className="text-lg font-bold text-white">{formatCurrency(parseInt(inv.paquete.paquete_accion_adquirido))}</h4>
                                            </div>
                                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                                                inv.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 
                                                inv.status === 'pending' ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30' : 
                                                'bg-red-500/20 text-red-400 border border-red-500/30'
                                            }`}>
                                                {inv.status === 'approved' ? 'Aprobado' : inv.status === 'pending' ? 'En Revisión' : 'Rechazado'}
                                            </span>
                                        </div>
                                        <div className="space-y-3 mt-auto pt-4 border-t border-white/10">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-slate-300 flex items-center"><DollarSign className="w-4 h-4 mr-1 text-slate-400" /> Capital Invertido</span>
                                                <span className="font-medium text-white">{formatCurrency(inv.monto)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-slate-300 flex items-center"><TrendingUp className="w-4 h-4 mr-1 text-brand-400" /> Rendimiento Total</span>
                                                <span className="font-bold text-brand-400">+{formatCurrency(inv.rendimiento_total_contrato || 0)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-slate-300 flex items-center"><Activity className="w-4 h-4 mr-1 text-slate-400" /> Acciones Otorgadas</span>
                                                <span className="font-medium text-white">{inv.paquete?.acciones_otorgadas || 0} unds</span>
                                            </div>
                                            {inv.dias_contrato !== undefined && (
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-slate-400 pl-5">Días de Contrato</span>
                                                    <span className="font-medium text-white">{inv.dias_contrato} días</span>
                                                </div>
                                            )}
                                            {inv.liquidacion_diaria_rendimiento !== undefined && (
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-slate-400 pl-5">Rendimiento Diario</span>
                                                    <span className="font-medium text-brand-400">+{formatCurrency(inv.liquidacion_diaria_rendimiento)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 bg-white/5 backdrop-blur-md rounded-xl border border-white/20 border-dashed">
                                <p className="text-slate-300 font-medium">Aún no tienes inversiones activas.</p>
                                <button className="mt-4 px-6 py-2 bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-colors font-medium shadow-sm">
                                    Explorar Paquetes
                                </button>
                            </div>
                        )}
                    </div>
                </Can>
            </div>

        </div>
    );
};
