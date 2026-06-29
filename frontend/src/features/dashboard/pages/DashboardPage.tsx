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
                <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-2 font-montserrat tracking-tight">Bienvenido de nuevo, {user?.name?.split(' ')[0]} 👋</h1>
                <p className="text-slate-500 font-medium font-inter">
                    Este es tu panel de control principal.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 relative z-10">
                {/* ESTE BLOQUE ESTÁ PROTEGIDO POR PBAC */}
                <Can permission="ver_mis_inversiones">
                    <div className="p-6 md:p-8 bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col col-span-1 md:col-span-2 lg:col-span-3">
                        <div className="flex items-center gap-3 mb-8 text-brand-500">
                            <div className="p-2.5 bg-brand-50 rounded-xl">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-2xl text-slate-900 tracking-tight">Panel de Inversiones</h3>
                        </div>

                        {!loading && investments.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
                                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Capital Total Invertido</p>
                                    <p className="text-3xl font-extrabold text-slate-900 font-montserrat">{formatCurrency(totalInvertido)}</p>
                                </div>
                                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Total Acciones</p>
                                    <p className="text-3xl font-extrabold text-slate-900 font-montserrat">{totalAcciones} <span className="text-lg font-medium text-slate-400">unds</span></p>
                                </div>
                                <div className="bg-brand-50 p-6 rounded-2xl border border-brand-100 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                                    <p className="text-xs font-semibold text-brand-700 uppercase tracking-widest mb-2 relative z-10">Rendimiento Esperado</p>
                                    <p className="text-3xl font-extrabold text-brand-600 font-montserrat relative z-10">+{formatCurrency(totalRendimiento)}</p>
                                </div>
                            </div>
                        )}

                        {loading ? (
                            <p className="text-indigo-600 animate-pulse">Cargando portafolio...</p>
                        ) : investments.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {investments.map(inv => (
                                    <div key={inv.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col hover:-translate-y-1 hover:border-brand-300 hover:shadow-lg hover:shadow-brand-500/5 transition-all duration-300 group cursor-default">
                                        <div className="flex justify-between items-start mb-6">
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 group-hover:text-brand-500 transition-colors duration-300">Paquete Adquirido</p>
                                                <h4 className="text-xl font-bold text-slate-900">{formatCurrency(parseInt(inv.paquete.paquete_accion_adquirido))}</h4>
                                            </div>
                                            <span className={`text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full font-bold ${
                                                inv.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 
                                                inv.status === 'pending' ? 'bg-brand-50 text-brand-600 border border-brand-200' : 
                                                'bg-red-50 text-red-600 border border-red-200'
                                            }`}>
                                                {inv.status === 'approved' ? 'Aprobado' : inv.status === 'pending' ? 'En Revisión' : 'Rechazado'}
                                            </span>
                                        </div>
                                        <div className="space-y-4 mt-auto pt-5 border-t border-slate-100">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-slate-500 flex items-center font-medium"><DollarSign className="w-4 h-4 mr-1.5 text-slate-400" /> Capital Invertido</span>
                                                <span className="font-semibold text-slate-900">{formatCurrency(inv.monto)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-slate-500 flex items-center font-medium"><TrendingUp className="w-4 h-4 mr-1.5 text-brand-500" /> Rendimiento Total</span>
                                                <span className="font-bold text-brand-600">+{formatCurrency(inv.rendimiento_total_contrato || 0)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-slate-500 flex items-center font-medium"><Activity className="w-4 h-4 mr-1.5 text-slate-400" /> Acciones Otorgadas</span>
                                                <span className="font-semibold text-slate-900">{inv.paquete?.acciones_otorgadas || 0} unds</span>
                                            </div>
                                            {inv.dias_contrato !== undefined && (
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-slate-400 pl-5.5 text-xs uppercase tracking-wider font-semibold">Días de Contrato</span>
                                                    <span className="font-medium text-slate-700">{inv.dias_contrato} días</span>
                                                </div>
                                            )}
                                            {inv.liquidacion_diaria_rendimiento !== undefined && (
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-slate-400 pl-5.5 text-xs uppercase tracking-wider font-semibold">Rendimiento Diario</span>
                                                    <span className="font-semibold text-brand-600">+{formatCurrency(inv.liquidacion_diaria_rendimiento)}</span>
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
