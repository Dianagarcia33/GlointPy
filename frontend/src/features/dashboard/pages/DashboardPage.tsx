import React from 'react';
import { useAuthStore } from '../../../store/authStore';
import { LogOut } from 'lucide-react';

export const DashboardPage = () => {
    const { user, logout } = useAuthStore();
    
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center max-w-md w-full">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Dashboard</h1>
                <p className="text-gray-500 mb-8">
                    Bienvenido, <span className="font-semibold text-gray-800">{user?.name}</span>
                </p>
                
                <div className="p-6 bg-blue-50 text-blue-800 rounded-xl mb-8">
                    <p>Esta es una página en blanco temporal.</p>
                    <p className="text-sm mt-2 opacity-80">Próximamente implementaremos el sistema de Permisos (PBAC) aquí.</p>
                </div>

                <button 
                    onClick={logout}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 font-medium rounded-xl hover:bg-red-100 transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                    Cerrar Sesión Segura
                </button>
            </div>
        </div>
    );
};
