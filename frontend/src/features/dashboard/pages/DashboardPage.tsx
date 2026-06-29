import React from 'react';
import { useAuthStore } from '../../../store/authStore';
import { LogOut } from 'lucide-react';

export const DashboardPage = () => {
    const { user, logout } = useAuthStore();
    
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-blue-50 text-blue-800 rounded-xl">
                    <h3 className="font-bold text-lg mb-2">Próximamente</h3>
                    <p>Aquí construiremos los accesos a los distintos módulos de la plataforma dependiendo de tus permisos (PBAC).</p>
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
