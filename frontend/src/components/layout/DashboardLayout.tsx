import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

export const DashboardLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // TODO: Pasaremos el state a la Navbar para el botón hamburguesa en móviles
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col relative font-inter">
            {/* Top Header - Dark Video Background (Matches Home Page/Auth) */}
            <div className="absolute top-0 left-0 w-full h-[40vh] bg-slate-950 overflow-hidden z-0">
                <video
                  src="/banner.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute top-0 left-0 w-full h-full object-cover block opacity-30 mix-blend-luminosity"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 to-slate-950/100" />
            </div>

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
