import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

export const DashboardLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // TODO: Pasaremos el state a la Navbar para el botón hamburguesa en móviles
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Top Navigation */}
            <Navbar />
            
            {/* Contenedor principal debajo de la Navbar (Navbar mide h-16 = 4rem = 64px) */}
            <div className="flex-1 flex pt-16">
                
                {/* Menú Lateral para pantallas medianas o grandes */}
                <div className="hidden md:block">
                    <Sidebar />
                </div>

                {/* Si quisiéramos Sidebar móvil iría aquí con absolute y z-50 */}

                {/* Área de contenido dinámico */}
                <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
                    <div className="max-w-7xl mx-auto w-full">
                        <Outlet />
                    </div>
                </main>
                
            </div>
        </div>
    );
};
