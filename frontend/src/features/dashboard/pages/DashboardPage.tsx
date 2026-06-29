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
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-1.5 font-montserrat tracking-tight">Bienvenido de nuevo, {user?.name?.split(' ')[0]} 👋</h1>
                <p className="text-slate-500 font-medium font-inter">
                    Este es tu panel de control principal.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 relative z-10">
                {/* ESTE BLOQUE ESTÁ PROTEGIDO POR PBAC */}
                <Can permission="ver_mis_inversiones">
                    <div className="flex flex-col col-span-1 md:col-span-2 lg:col-span-3">
                        <div className="flex items-center gap-3 mb-8 text-brand-500">
                            <div className="p-2.5 bg-white shadow-sm border border-slate-200 rounded-xl">
                                <TrendingUp className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-2xl text-slate-900 tracking-tight">Panel de Inversiones</h3>
                        </div>

                        {!loading && investments.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md shadow-slate-200/40 hover:shadow-lg transition-shadow">
                                    <div className="flex justify-between items-start mb-4">
                                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Capital Invertido</p>
                                        <div className="p-2 bg-slate-100 rounded-lg"><DollarSign className="w-4 h-4 text-slate-500" /></div>
                                    </div>
                                    <p className="text-2xl font-bold text-slate-900 font-montserrat">{formatCurrency(totalInvertido)}</p>
                                </div>
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md shadow-slate-200/40 hover:shadow-lg transition-shadow">
                                    <div className="flex justify-between items-start mb-4">
                                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Total Acciones</p>
                                        <div className="p-2 bg-slate-100 rounded-lg"><Activity className="w-4 h-4 text-slate-500" /></div>
                                    </div>
                                    <p className="text-2xl font-bold text-slate-900 font-montserrat">{totalAcciones} <span className="text-sm font-semibold text-slate-500">unds</span></p>
                                </div>
                                <div className="bg-gradient-to-br from-brand-100/60 to-white p-6 rounded-2xl border border-brand-200/60 shadow-md shadow-brand-500/10 relative overflow-hidden hover:shadow-lg hover:shadow-brand-500/20 transition-all">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                                    <div className="flex justify-between items-start mb-4 relative z-10">
                                        <p className="text-[10px] font-bold text-brand-700 uppercase tracking-widest">Rendimiento Esperado</p>
                                        <div className="p-2 bg-brand-100/50 rounded-lg"><TrendingUp className="w-4 h-4 text-brand-600" /></div>
                                    </div>
                                    <p className="text-2xl font-bold text-brand-600 font-montserrat relative z-10">+{formatCurrency(totalRendimiento)}</p>
                                </div>
                            </div>
                        )}

                        {loading ? (
                            <p className="text-indigo-600 animate-pulse">Cargando portafolio...</p>
                        ) : investments.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {investments.map(inv => (
                                    <div key={inv.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md shadow-slate-200/40 flex flex-col hover:-translate-y-1 hover:border-brand-300 hover:shadow-xl hover:shadow-brand-500/10 transition-all duration-300 group cursor-default">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-lg group-hover:border-brand-300 transition-colors">
                                                    <DollarSign className="w-5 h-5 text-slate-500 group-hover:text-brand-600 transition-colors" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Paquete Adquirido</p>
                                                    <h4 className="text-lg font-bold text-slate-900">{formatCurrency(parseInt(inv.paquete.paquete_accion_adquirido))}</h4>
                                                </div>
                                            </div>
                                            <span className={`text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-md font-bold ${
                                                inv.status === 'approved' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 
                                                inv.status === 'pending' ? 'bg-brand-100 text-brand-700 border border-brand-200' : 
                                                'bg-red-100 text-red-700 border border-red-200'
                                            }`}>
                                                {inv.status === 'approved' ? 'Aprobado' : inv.status === 'pending' ? 'En Revisión' : 'Rechazado'}
                                            </span>
                                        </div>
                                        <div className="space-y-3.5 mt-auto pt-5 border-t border-slate-200/80">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-slate-600 font-medium">Capital Invertido</span>
                                                <span className="font-semibold text-slate-900">{formatCurrency(inv.monto)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-slate-600 font-medium">Rendimiento Total</span>
                                                <span className="font-bold text-brand-700">+{formatCurrency(inv.rendimiento_total_contrato || 0)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-slate-600 font-medium">Acciones Otorgadas</span>
                                                <span className="font-semibold text-slate-900">{inv.paquete?.acciones_otorgadas || 0} unds</span>
                                            </div>
                                            {inv.dias_contrato !== undefined && (
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-slate-500 text-xs font-semibold">Días de Contrato</span>
                                                    <span className="font-semibold text-slate-800">{inv.dias_contrato} días</span>
                                                </div>
                                            )}
                                            {inv.liquidacion_diaria_rendimiento !== undefined && (
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-slate-500 text-xs font-semibold">Rendimiento Diario</span>
                                                    <span className="font-bold text-brand-700">+{formatCurrency(inv.liquidacion_diaria_rendimiento)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 border-dashed">
                                <p className="text-slate-500 font-medium">Aún no tienes inversiones activas.</p>
                                <button className="mt-6 px-8 py-3 bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-colors font-bold shadow-sm active:scale-95">
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
