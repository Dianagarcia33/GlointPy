import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { DashboardFooter } from './DashboardFooter';
import { X, LayoutDashboard } from 'lucide-react';

export const DashboardLayout = () => {
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const location = useLocation();
    const isChatPage = location.pathname.includes('/dashboard/chat');

    return (
        <div className="h-screen bg-slate-100 flex flex-col relative font-inter text-slate-900 overflow-hidden">
            {/* Top Navigation */}
            <div className="relative z-30">
                <Navbar onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)} />
            </div>
            
            {/* Contenedor principal debajo de la Navbar */}
            <div className="flex-1 flex pt-16 relative z-0 overflow-hidden">
                
                {/* Menú Lateral para pantallas medianas o grandes */}
                <div className="hidden md:block border-r border-slate-200 bg-white">
                    <Sidebar />
                </div>

                {/* Drawer Móvil Deslizable para el Sidebar */}
                {mobileSidebarOpen && (
                    <div className="md:hidden fixed inset-0 z-[100] flex">
                        {/* Backdrop oscuro */}
                        <div 
                            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
                            onClick={() => setMobileSidebarOpen(false)}
                        />
                        {/* Panel lateral deslizable */}
                        <div className="relative flex-1 max-w-xs w-full bg-white h-full shadow-2xl z-10 flex flex-col animate-in slide-in-from-left duration-300">
                            <div className="p-4 bg-slate-900 text-white flex justify-between items-center border-b border-slate-800">
                                <span className="font-bold text-sm flex items-center gap-2 font-montserrat">
                                    <LayoutDashboard className="w-4 h-4 text-brand-500" />
                                    Menú Principal
                                </span>
                                <button 
                                    type="button"
                                    onClick={() => setMobileSidebarOpen(false)}
                                    className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto bg-white">
                                <Sidebar onItemClick={() => setMobileSidebarOpen(false)} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Área de contenido dinámico */}
                {isChatPage ? (
                    <main className="flex-1 flex flex-col overflow-hidden relative">
                        <div className="p-3 lg:p-4 flex-1 flex flex-col overflow-hidden">
                            <div className="w-full flex-1 flex flex-col overflow-hidden">
                                <Outlet />
                            </div>
                        </div>
                        <DashboardFooter />
                    </main>
                ) : (
                    <main className="flex-1 flex flex-col overflow-y-auto relative">
                        <div className="p-4 sm:p-6 lg:p-8 flex-1">
                            <div className="max-w-7xl mx-auto w-full pb-8">
                                <Outlet />
                            </div>
                        </div>
                        <DashboardFooter />
                    </main>
                )}
            </div>

            {/* Botón flotante para abrir el menú en móviles en caso de scroll largo */}
            {!mobileSidebarOpen && (
                <button
                    type="button"
                    onClick={() => setMobileSidebarOpen(true)}
                    className="md:hidden fixed bottom-5 right-5 z-40 p-3.5 bg-gradient-to-r from-brand-500 to-amber-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white/20"
                    title="Abrir Menú de Gestión"
                >
                    <LayoutDashboard className="w-6 h-6" />
                </button>
            )}
        </div>
    );
};
