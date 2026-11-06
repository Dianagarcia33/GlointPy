import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { DashboardFooter } from './DashboardFooter';
import { ParentalBanner } from './ParentalBanner';
import { MandatoryProfileUpdateModal } from '../../features/profile/components/MandatoryProfileUpdateModal';
import { useAuthStore } from '../../store/authStore';
import { X, LayoutDashboard } from 'lucide-react';

export const DashboardLayout = () => {
    const user = useAuthStore((state) => state.user);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const location = useLocation();
    const isChatPage = location.pathname.includes('/dashboard/chat');
    const isFullHeightPage = isChatPage || location.pathname.includes('/dashboard/crm/inbox') || location.pathname.includes('/dashboard/crm/calendar');

    return (
        <div className="h-screen bg-slate-100 flex flex-col relative font-inter text-slate-900 overflow-hidden">
            {/* Top Navigation */}
            <div className="relative z-30">
                <Navbar onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)} />
            </div>
            
            {/* Contenedor principal debajo de la Navbar */}
            <div className="flex-1 flex flex-col pt-16 relative overflow-hidden">
                <ParentalBanner />
                {user?.must_update_profile && <MandatoryProfileUpdateModal />}
                <div className="flex-1 flex relative overflow-hidden">
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
                            <div className="px-4 py-3.5 bg-slate-950 text-white flex justify-between items-center border-b border-slate-800 relative">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-amber-600 flex items-center justify-center text-white shadow-xs">
                                        <LayoutDashboard className="w-4 h-4" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-extrabold text-xs tracking-tight font-montserrat text-white">
                                            GLOINT MENÚ
                                        </span>
                                        <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider font-montserrat">
                                            Navegación Móvil
                                        </span>
                                    </div>
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => setMobileSidebarOpen(false)}
                                    className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
                                    aria-label="Cerrar Menú"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto bg-white">
                                <Sidebar onItemClick={() => setMobileSidebarOpen(false)} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Área de contenido dinámico */}
                {isFullHeightPage ? (
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
            </div>
        </div>
    );
};
