import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

export const DashboardLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    return (
        <div className="min-h-screen bg-slate-950 flex flex-col relative font-inter text-white">
            {/* Clean Solid Background Canvas */}
            <div className="absolute inset-0 bg-slate-950 z-0 fixed" />

            {/* Top Navigation */}
            <div className="relative z-50">
                <Navbar />
            </div>
            
            {/* Contenedor principal debajo de la Navbar */}
            <div className="flex-1 flex pt-24 relative z-10">
                
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
