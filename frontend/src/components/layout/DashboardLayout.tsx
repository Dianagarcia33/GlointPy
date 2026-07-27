import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { DashboardFooter } from './DashboardFooter';

export const DashboardLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();
    const isChatPage = location.pathname.includes('/dashboard/chat');

    return (
        <div className="h-screen bg-slate-100 flex flex-col relative font-inter text-slate-900 overflow-hidden">
            {/* Top Navigation */}
            <div className="relative z-30">
                <Navbar />
            </div>
            
            {/* Contenedor principal debajo de la Navbar */}
            <div className="flex-1 flex pt-16 relative z-0 overflow-hidden">
                
                {/* Menú Lateral para pantallas medianas o grandes */}
                <div className="hidden md:block border-r border-slate-200 bg-white">
                    <Sidebar />
                </div>

                {/* Área de contenido dinámico */}
                <main className="flex-1 flex flex-col overflow-hidden relative">
                    <div className={`flex-1 flex flex-col overflow-hidden ${isChatPage ? 'p-3 lg:p-4' : 'p-6 lg:p-8 overflow-y-auto'}`}>
                        <div className={`w-full flex-1 flex flex-col overflow-hidden ${isChatPage ? 'max-w-none' : 'max-w-7xl mx-auto pb-8'}`}>
                            <Outlet />
                        </div>
                    </div>
                    
                    <DashboardFooter />
                </main>
            </div>
        </div>
    );
};
