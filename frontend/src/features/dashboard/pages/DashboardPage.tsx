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
    
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 mb-1">Bienvenido de nuevo, {user?.name?.split(' ')[0]} 👋</h1>
                    <p className="text-gray-500">
                        Este es tu panel de control principal.
                    </p>
                    {/* DEBUG BLOCK TO SHOW PERMISSIONS */}
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="font-bold text-red-700 text-sm mb-1">🔍 MODO DEBUG ACTIVADO</p>
                        <p className="text-xs text-red-600 font-mono">Roles: {JSON.stringify(user?.roles_list)}</p>
                        <p className="text-xs text-red-600 font-mono">Permisos: {JSON.stringify(user?.permissions)}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {/* ESTE BLOQUE ESTÁ PROTEGIDO POR PBAC */}
                <Can permission="ver_mis_inversiones">
                    <div className="p-6 bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl shadow-sm flex flex-col col-span-1 md:col-span-2 lg:col-span-3">
                        <div className="flex items-center gap-3 mb-6 text-indigo-700">
                            <div className="p-2 bg-indigo-100 rounded-lg">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-xl">Mis Inversiones Activas</h3>
                        </div>

                        {loading ? (
                            <p className="text-indigo-600 animate-pulse">Cargando portafolio...</p>
                        ) : investments.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {investments.map(inv => (
                                    <div key={inv.id} className="bg-white p-5 rounded-xl border border-indigo-50 shadow-sm flex flex-col">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-1">Paquete Adquirido</p>
                                                <h4 className="text-lg font-bold text-gray-800">{formatCurrency(parseInt(inv.paquete.paquete_accion_adquirido))}</h4>
                                            </div>
                                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                                                inv.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 
                                                inv.status === 'pending' ? 'bg-amber-100 text-amber-700' : 
                                                'bg-red-100 text-red-700'
                                            }`}>
                                                {inv.status === 'approved' ? 'Aprobado' : inv.status === 'pending' ? 'En Revisión' : 'Rechazado'}
                                            </span>
                                        </div>
                                        <div className="space-y-2 mt-auto">
                                            <div className="flex items-center text-sm text-gray-600">
                                                <DollarSign className="w-4 h-4 mr-2 text-indigo-400" />
                                                <span>Inversión: <span className="font-medium text-gray-800">{formatCurrency(inv.monto)}</span></span>
                                            </div>
                                            <div className="flex items-center text-sm text-gray-600">
                                                <Activity className="w-4 h-4 mr-2 text-indigo-400" />
                                                <span>Acciones: <span className="font-medium text-gray-800">{inv.paquete.acciones_otorgadas} unds</span></span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 bg-white/50 rounded-xl border border-indigo-100/50 border-dashed">
                                <p className="text-indigo-900/60 font-medium">Aún no tienes inversiones activas.</p>
                                <button className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium shadow-sm">
                                    Explorar Paquetes
                                </button>
                            </div>
                        )}
                    </div>
                </Can>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="p-6 bg-gray-50 text-gray-600 rounded-2xl border border-gray-100 flex flex-col justify-center items-center text-center">
                    <h3 className="font-bold text-lg mb-2 text-gray-800">Módulos Dinámicos</h3>
                    <p className="text-sm">Si tuvieras otros permisos asignados, verías más tarjetas aquí.</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center items-center">
                    <p className="text-gray-500 mb-4 text-center">¿Terminaste por hoy?</p>
                    <button 
                        onClick={logout}
                        className="w-full max-w-xs flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 font-medium rounded-xl hover:bg-red-100 transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        Cerrar Sesión
                    </button>
                </div>
            </div>
        </div>
    );
};
