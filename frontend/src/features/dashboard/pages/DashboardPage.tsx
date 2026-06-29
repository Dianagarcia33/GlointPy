import React, { useEffect } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { LogOut, TrendingUp } from 'lucide-react';
import { Can } from '../../../components/security/Can';

export const DashboardPage = () => {
    const { user, logout } = useAuthStore();
    
    // Log para depuración en la consola del navegador
    useEffect(() => {
        console.log("=== DATOS DE LA SESIÓN ACTUAL ===");
        console.log("Usuario:", user);
        console.log("Roles:", user?.roles_list);
        console.log("Permisos:", user?.permissions);
        console.log("=================================");
    }, [user]);
    
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 mb-1">Bienvenido de nuevo, {user?.name?.split(' ')[0]} 👋</h1>
                    <p className="text-gray-500">
                        Este es tu panel de control principal.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* ESTE BLOQUE ESTÁ PROTEGIDO POR PBAC */}
                <Can permission="dashboard.investments.read">
                    <div className="p-6 bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl shadow-sm flex flex-col hover:shadow-md transition-all duration-300">
                        <div className="flex items-center gap-3 mb-4 text-indigo-700">
                            <div className="p-2 bg-indigo-100 rounded-lg">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-lg">Mis Inversiones</h3>
                        </div>
                        <p className="text-indigo-900/80 mb-4 flex-1">
                            Aquí podrás ver el rendimiento de tu portafolio, gráficas de crecimiento y retornos estimados.
                        </p>
                        <button className="w-full py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium">
                            Ver Portafolio
                        </button>
                    </div>
                </Can>

                <div className="p-6 bg-gray-50 text-gray-600 rounded-2xl border border-gray-100 flex flex-col justify-center items-center text-center">
                    <h3 className="font-bold text-lg mb-2 text-gray-800">Módulos Dinámicos</h3>
                    <p className="text-sm">Si tuvieras otros permisos asignados, verías más tarjetas como la de inversiones aquí arriba.</p>
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
