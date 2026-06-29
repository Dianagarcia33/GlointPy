import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';

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
                <main className="flex-1 flex flex-col overflow-y-auto relative">
                    <div className="p-6 lg:p-8 flex-1">
                        <div className="max-w-7xl mx-auto w-full pb-8">
                            <Outlet />
                        </div>
                    </div>
                    
                    <Footer />
                </main>
            </div>
        </div>
    );
};
