import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

export const DashboardLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    return (
        <div className="h-screen bg-slate-100 flex flex-col relative font-inter text-slate-900 overflow-hidden">
            {/* Top Navigation */}
            <div className="relative z-50">
                <Navbar />
            </div>
            
            {/* Contenedor principal debajo de la Navbar */}
            <div className="flex-1 flex pt-16 mt-2 relative z-10 overflow-hidden">
                
                {/* Menú Lateral para pantallas medianas o grandes */}
                <div className="hidden md:block border-r border-slate-200 bg-white">
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

            {/* Floating Footer Version */}
            <div className="fixed bottom-4 right-6 z-50 bg-slate-900/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-slate-700/50 shadow-lg pointer-events-none">
                <p className="text-[10px] font-bold font-montserrat tracking-widest text-slate-300 uppercase">
                    GLOINT <span className="text-brand-400 ml-1">2.0.0.1</span>
                </p>
            </div>
        </div>
    );
};
