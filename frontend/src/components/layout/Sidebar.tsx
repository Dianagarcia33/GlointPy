import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Briefcase, Wallet, ArrowRightLeft, History, ArrowDownToLine, FileText, User, Settings, HelpCircle, Shield, CalendarDays, Users, Landmark, Trophy, HeartHandshake, UserPlus } from 'lucide-react';
import { Can } from '../../components/security/Can';
import { useAuthStore } from '../../store/authStore';

export const Sidebar = () => {
    const user = useAuthStore((state) => state.user);
    const isAdmin = user?.permissions?.includes('admin.users.manage') || user?.permissions?.includes('admin.roles.manage');

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

                {!isAdmin && (
                    <>
                        <NavLink
                            to="/dashboard/beneficiaries"
                            className={({ isActive }) => `
                                group px-3 py-2.5 rounded-xl no-underline flex items-center gap-3 transition-all duration-200
                                ${isActive 
                                    ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30 pointer-events-none' 
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                }
                            `}
                        >
                            <span className={`flex-shrink-0 transition-colors duration-200 group-hover:scale-110`}>
                                <HeartHandshake className="w-[18px] h-[18px]" />
                            </span>
                            <span className="flex-1 text-[13px] font-medium">Beneficiarios</span>
                        </NavLink>

                        <NavLink
                            to="/dashboard/referrals"
                            className={({ isActive }) => `
                                group px-3 py-2.5 rounded-xl no-underline flex items-center gap-3 transition-all duration-200
                                ${isActive 
                                    ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30 pointer-events-none' 
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                }
                            `}
                        >
                            <span className={`flex-shrink-0 transition-colors duration-200 group-hover:scale-110`}>
                                <UserPlus className="w-[18px] h-[18px]" />
                            </span>
                            <span className="flex-1 text-[13px] font-medium">Referidos</span>
                        </NavLink>
                    </>
                )}

                <Can permission="wallets:view">
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
                        <span className="flex-1 text-[13px] font-medium">Billetera</span>
                    </NavLink>
                </Can>

                <NavLink
                    to="/dashboard/bank-accounts"
                    className={({ isActive }) => `
                        group px-3 py-2.5 rounded-xl no-underline flex items-center gap-3 transition-all duration-200
                        ${isActive 
                            ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30 pointer-events-none' 
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                        }
                    `}
                >
                    <span className={`flex-shrink-0 transition-colors duration-200 group-hover:scale-110`}>
                        <Landmark className="w-[18px] h-[18px]" />
                    </span>
                    <span className="flex-1 text-[13px] font-medium">Bóveda Bancaria</span>
                </NavLink>

                <Can permission="commercial:view">
                    <NavLink
                        to="/dashboard/commercial"
                        className={({ isActive }) => `
                            group px-3 py-2.5 rounded-xl no-underline flex items-center gap-3 transition-all duration-200
                            ${isActive 
                                ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30 pointer-events-none' 
                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                            }
                        `}
                    >
                        <span className={`flex-shrink-0 transition-colors duration-200 group-hover:scale-110`}>
                            <Trophy className="w-[18px] h-[18px]" />
                        </span>
                        <span className="flex-1 text-[13px] font-medium">Panel Comercial</span>
                    </NavLink>
                </Can>



                <Can permission="manage_system_events">
                    <NavLink
                        to="/dashboard/system-events"
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
                        <span className="flex-1 text-[13px] font-medium">Fechas del Sistema</span>
                    </NavLink>
                </Can>
                
                <Can permission="admin.roles.manage">
                    <NavLink
                        to="/dashboard/roles"
                        className={({ isActive }) => `
                            group px-3 py-2.5 rounded-xl no-underline flex items-center gap-3 transition-all duration-200
                            ${isActive 
                                ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30 pointer-events-none' 
                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                            }
                        `}
                    >
                        <span className={`flex-shrink-0 transition-colors duration-200 group-hover:scale-110`}>
                            <Shield className="w-[18px] h-[18px]" />
                        </span>
                        <span className="flex-1 text-[13px] font-medium">Roles y Permisos</span>
                    </NavLink>
                </Can>
                
                <Can permission="admin.users.manage">
                    <NavLink
                        to="/dashboard/users"
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
                        <span className="flex-1 text-[13px] font-medium">Usuarios</span>
                    </NavLink>
                </Can>

                <Can permission="admin.periods.manage">
                    <NavLink
                        to="/dashboard/periods"
                        className={({ isActive }) => `
                            group px-3 py-2.5 rounded-xl no-underline flex items-center gap-3 transition-all duration-200
                            ${isActive 
                                ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30 pointer-events-none' 
                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                            }
                        `}
                    >
                        <span className={`flex-shrink-0 transition-colors duration-200 group-hover:scale-110`}>
                            <CalendarDays className="w-[18px] h-[18px]" />
                        </span>
                        <span className="flex-1 text-[13px] font-medium">Periodos</span>
                    </NavLink>
                </Can>

                <Can permission="admin.roles.manage">
                    <NavLink
                        to="/dashboard/templates"
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
                        <span className="flex-1 text-[13px] font-medium">Plantillas</span>
                    </NavLink>
                </Can>

                <Can permission="admin.packages.manage">
                    <NavLink
                        to="/dashboard/packages"
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
                        <span className="flex-1 text-[13px] font-medium">Paquetes</span>
                    </NavLink>
                </Can>

                <Can permission="admin.investors.manage">
                    <NavLink
                        to="/dashboard/investors"
                        className={({ isActive }) => `
                            group px-3 py-2.5 rounded-xl no-underline flex items-center gap-3 transition-all duration-200
                            ${isActive 
                                ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30 pointer-events-none' 
                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                            }
                        `}
                    >
                        <span className={`flex-shrink-0 transition-colors duration-200 group-hover:scale-110`}>
                            <Users className="w-[18px] h-[18px]" />
                        </span>
                        <span className="flex-1 text-[13px] font-medium">Inversionistas</span>
                    </NavLink>
                </Can>

                <Can permission="admin.payments.manage">
                    <NavLink
                        to="/dashboard/payments"
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
                        <span className="flex-1 text-[13px] font-medium">Gestión de Pagos</span>
                    </NavLink>
                </Can>

                <Can permission="admin.audits.manage">
                    <NavLink
                        to="/dashboard/audit"
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
                        <span className="flex-1 text-[13px] font-medium">Auditoría (Cruce)</span>
                    </NavLink>
                </Can>
            </div>
        </aside>
    );
};
