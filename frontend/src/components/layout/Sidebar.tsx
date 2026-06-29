import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Briefcase, Wallet, ArrowRightLeft, History, ArrowDownToLine, FileText, User, Settings, HelpCircle } from 'lucide-react';

export const Sidebar = () => {
    return (
        <aside className="w-64 flex flex-col h-full overflow-y-auto z-10 transition-all duration-300 scrollbar-thin scrollbar-thumb-slate-200 hover:scrollbar-thumb-brand-300">
            <div className="flex flex-col py-6 px-4 gap-1.5">
                <div className="px-3 mt-2 mb-2">
                    <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-[0.2em]">
                        INICIO
                    </p>
                </div>
                
                <NavLink
                    to="/dashboard"
                    end
                    className={({ isActive }) => `
                        group px-3 py-2.5 rounded-xl no-underline flex items-center gap-3 transition-all duration-200
                        ${isActive 
                            ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30 pointer-events-none' 
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                        }
                    `}
                >
                    <span className={`flex-shrink-0 transition-colors duration-200 group-hover:scale-110`}>
                        <Home className="w-[18px] h-[18px]" />
                    </span>
                    <span className="flex-1 text-[13px] font-medium">Dashboard</span>
                </NavLink>

                <div className="px-3 mt-6 mb-2">
                    <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-[0.2em]">
                        PORTAFOLIO
                    </p>
                </div>

                <NavLink
                    to="/dashboard/mis-inversiones"
                    className={({ isActive }) => `
                        group px-3 py-2.5 rounded-xl no-underline flex items-center gap-3 transition-all duration-200
                        ${isActive 
                            ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30 pointer-events-none' 
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                        }
                    `}
                >
                    <span className={`flex-shrink-0 transition-colors duration-200 group-hover:scale-110`}>
                        <Briefcase className="w-[18px] h-[18px]" />
                    </span>
                    <span className="flex-1 text-[13px] font-medium">Mis Inversiones</span>
                </NavLink>

                <NavLink
                    to="/dashboard/wallet"
                    className={({ isActive }) => `
                        group px-3 py-2.5 rounded-xl no-underline flex items-center gap-3 transition-all duration-200
                        ${isActive 
                            ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30 pointer-events-none' 
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                        }
                    `}
                >
                    <span className={`flex-shrink-0 transition-colors duration-200 group-hover:scale-110`}>
                        <Wallet className="w-[18px] h-[18px]" />
                    </span>
                    <span className="flex-1 text-[13px] font-medium">Wallet</span>
                </NavLink>

                <div className="px-3 mt-6 mb-2">
                    <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-[0.2em]">
                        FINANZAS
                    </p>
                </div>

                <NavLink
                    to="/dashboard/movimientos"
                    className={({ isActive }) => `
                        group px-3 py-2.5 rounded-xl no-underline flex items-center gap-3 transition-all duration-200
                        ${isActive 
                            ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30 pointer-events-none' 
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                        }
                    `}
                >
                    <span className={`flex-shrink-0 transition-colors duration-200 group-hover:scale-110`}>
                        <ArrowRightLeft className="w-[18px] h-[18px]" />
                    </span>
                    <span className="flex-1 text-[13px] font-medium">Movimientos</span>
                </NavLink>

                <NavLink
                    to="/dashboard/historial"
                    className={({ isActive }) => `
                        group px-3 py-2.5 rounded-xl no-underline flex items-center gap-3 transition-all duration-200
                        ${isActive 
                            ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30 pointer-events-none' 
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                        }
                    `}
                >
                    <span className={`flex-shrink-0 transition-colors duration-200 group-hover:scale-110`}>
                        <History className="w-[18px] h-[18px]" />
                    </span>
                    <span className="flex-1 text-[13px] font-medium">Historial</span>
                </NavLink>

                <NavLink
                    to="/dashboard/retiros"
                    className={({ isActive }) => `
                        group px-3 py-2.5 rounded-xl no-underline flex items-center gap-3 transition-all duration-200
                        ${isActive 
                            ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30 pointer-events-none' 
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                        }
                    `}
                >
                    <span className={`flex-shrink-0 transition-colors duration-200 group-hover:scale-110`}>
                        <ArrowDownToLine className="w-[18px] h-[18px]" />
                    </span>
                    <span className="flex-1 text-[13px] font-medium">Retiros</span>
                </NavLink>

                <NavLink
                    to="/dashboard/documentos"
                    className={({ isActive }) => `
                        group px-3 py-2.5 rounded-xl no-underline flex items-center gap-3 transition-all duration-200
                        ${isActive 
                            ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30 pointer-events-none' 
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                        }
                    `}
                >
                    <span className={`flex-shrink-0 transition-colors duration-200 group-hover:scale-110`}>
                        <FileText className="w-[18px] h-[18px]" />
                    </span>
                    <span className="flex-1 text-[13px] font-medium">Documentos</span>
                </NavLink>

                <div className="px-3 mt-6 mb-2">
                    <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-[0.2em]">
                        AJUSTES
                    </p>
                </div>

                <NavLink
                    to="/dashboard/perfil"
                    className={({ isActive }) => `
                        group px-3 py-2.5 rounded-xl no-underline flex items-center gap-3 transition-all duration-200
                        ${isActive 
                            ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30 pointer-events-none' 
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                        }
                    `}
                >
                    <span className={`flex-shrink-0 transition-colors duration-200 group-hover:scale-110`}>
                        <User className="w-[18px] h-[18px]" />
                    </span>
                    <span className="flex-1 text-[13px] font-medium">Perfil</span>
                </NavLink>

                <NavLink
                    to="/dashboard/configuracion"
                    className={({ isActive }) => `
                        group px-3 py-2.5 rounded-xl no-underline flex items-center gap-3 transition-all duration-200
                        ${isActive 
                            ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30 pointer-events-none' 
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                        }
                    `}
                >
                    <span className={`flex-shrink-0 transition-colors duration-200 group-hover:scale-110`}>
                        <Settings className="w-[18px] h-[18px]" />
                    </span>
                    <span className="flex-1 text-[13px] font-medium">Configuración</span>
                </NavLink>

                <NavLink
                    to="/dashboard/soporte"
                    className={({ isActive }) => `
                        group px-3 py-2.5 rounded-xl no-underline flex items-center gap-3 transition-all duration-200
                        ${isActive 
                            ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30 pointer-events-none' 
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                        }
                    `}
                >
                    <span className={`flex-shrink-0 transition-colors duration-200 group-hover:scale-110`}>
                        <HelpCircle className="w-[18px] h-[18px]" />
                    </span>
                    <span className="flex-1 text-[13px] font-medium">Soporte</span>
                </NavLink>
            </div>
        </aside>
    );
};
