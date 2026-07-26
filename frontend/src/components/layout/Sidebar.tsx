import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
    Home, 
    Briefcase, 
    Wallet, 
    History, 
    ArrowDownToLine, 
    FileText, 
    User, 
    Settings, 
    Shield, 
    CalendarDays, 
    Users, 
    Landmark, 
    Trophy, 
    HeartHandshake, 
    UserPlus, 
    MessageSquare 
} from 'lucide-react';
import { Can } from '../../components/security/Can';
import { useAuthStore } from '../../store/authStore';

export const Sidebar = () => {
    const user = useAuthStore((state) => state.user);
    const isAdmin = user?.permissions?.includes('admin.users.manage') || user?.permissions?.includes('admin.roles.manage');

    const navLinkClass = ({ isActive }: { isActive: boolean }) => `
        group px-3 py-2.5 rounded-xl no-underline flex items-center gap-3 transition-all duration-200
        ${isActive 
            ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30 pointer-events-none font-semibold' 
            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-medium'
        }
    `;

    return (
        <aside className="w-64 flex flex-col h-full overflow-y-auto z-10 transition-all duration-300 scrollbar-thin scrollbar-thumb-slate-200 hover:scrollbar-thumb-brand-300">
            <div className="flex flex-col py-6 px-4 gap-1">
                
                {/* 📌 SECCIÓN PRINCIPAL */}
                <div className="px-3 mt-1 mb-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                        PRINCIPAL
                    </p>
                </div>
                
                <NavLink to="/dashboard" end className={navLinkClass}>
                    <span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
                        <Home className="w-[18px] h-[18px]" />
                    </span>
                    <span className="flex-1 text-[13px]">Dashboard</span>
                </NavLink>

                <Can permission="chat:view">
                    <NavLink to="/dashboard/chat" className={navLinkClass}>
                        <span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
                            <MessageSquare className="w-[18px] h-[18px]" />
                        </span>
                        <span className="flex-1 text-[13px]">Chat</span>
                    </NavLink>
                </Can>

                {/* 💼 SECCIÓN FINANZAS Y MI CUENTA */}
                <div className="px-3 mt-5 mb-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                        FINANZAS Y CUENTA
                    </p>
                </div>

                <Can permission="wallets:view">
                    <NavLink to="/dashboard/wallet" className={navLinkClass}>
                        <span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
                            <Wallet className="w-[18px] h-[18px]" />
                        </span>
                        <span className="flex-1 text-[13px]">Billetera</span>
                    </NavLink>
                </Can>

                <NavLink to="/dashboard/bank-accounts" className={navLinkClass}>
                    <span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
                        <Landmark className="w-[18px] h-[18px]" />
                    </span>
                    <span className="flex-1 text-[13px]">Bóveda Bancaria</span>
                </NavLink>

                {!isAdmin && (
                    <>
                        <NavLink to="/dashboard/beneficiaries" className={navLinkClass}>
                            <span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
                                <HeartHandshake className="w-[18px] h-[18px]" />
                            </span>
                            <span className="flex-1 text-[13px]">Beneficiarios</span>
                        </NavLink>

                        <Can permission="referrals:view">
                            <NavLink to="/dashboard/referrals" className={navLinkClass}>
                                <span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
                                    <UserPlus className="w-[18px] h-[18px]" />
                                </span>
                                <span className="flex-1 text-[13px]">Referidos</span>
                            </NavLink>
                        </Can>
                    </>
                )}

                {/* 📈 SECCIÓN COMERCIAL */}
                <Can permission="commercial:view">
                    <div className="px-3 mt-5 mb-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                            EQUIPO COMERCIAL
                        </p>
                    </div>
                    <NavLink to="/dashboard/commercial" className={navLinkClass}>
                        <span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
                            <Trophy className="w-[18px] h-[18px]" />
                        </span>
                        <span className="flex-1 text-[13px]">Panel Comercial</span>
                    </NavLink>
                </Can>

                {/* 🛡️ SECCIÓN ADMINISTRACIÓN */}
                <Can permissions={[
                    "admin.users.manage",
                    "admin.roles.manage",
                    "admin.investors.manage",
                    "admin.payments.manage",
                    "admin.packages.manage",
                    "admin.periods.manage",
                    "admin.audits.manage",
                    "manage_system_events"
                ]}>
                    <div className="px-3 mt-5 mb-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                            ADMINISTRACIÓN
                        </p>
                    </div>

                    <Can permission="admin.investors.manage">
                        <NavLink to="/dashboard/investors" className={navLinkClass}>
                            <span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
                                <Users className="w-[18px] h-[18px]" />
                            </span>
                            <span className="flex-1 text-[13px]">Inversionistas</span>
                        </NavLink>
                    </Can>

                    <Can permission="admin.payments.manage">
                        <NavLink to="/dashboard/payments" className={navLinkClass}>
                            <span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
                                <ArrowDownToLine className="w-[18px] h-[18px]" />
                            </span>
                            <span className="flex-1 text-[13px]">Gestión de Pagos</span>
                        </NavLink>
                    </Can>

                    <Can permission="admin.packages.manage">
                        <NavLink to="/dashboard/packages" className={navLinkClass}>
                            <span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
                                <Briefcase className="w-[18px] h-[18px]" />
                            </span>
                            <span className="flex-1 text-[13px]">Paquetes</span>
                        </NavLink>
                    </Can>

                    <Can permission="admin.periods.manage">
                        <NavLink to="/dashboard/periods" className={navLinkClass}>
                            <span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
                                <CalendarDays className="w-[18px] h-[18px]" />
                            </span>
                            <span className="flex-1 text-[13px]">Periodos</span>
                        </NavLink>
                    </Can>

                    <Can permissions={["admin.referrals.manage", "admin.users.manage", "admin.roles.manage"]}>
                        <NavLink to="/dashboard/admin-referrals" className={navLinkClass}>
                            <span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
                                <UserPlus className="w-[18px] h-[18px]" />
                            </span>
                            <span className="flex-1 text-[13px]">Gestión de Referidos</span>
                        </NavLink>
                    </Can>

                    <Can permission="admin.audits.manage">
                        <NavLink to="/dashboard/audit" className={navLinkClass}>
                            <span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
                                <History className="w-[18px] h-[18px]" />
                            </span>
                            <span className="flex-1 text-[13px]">Auditoría (Cruce)</span>
                        </NavLink>
                    </Can>

                    <Can permission="admin.users.manage">
                        <NavLink to="/dashboard/users" className={navLinkClass}>
                            <span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
                                <User className="w-[18px] h-[18px]" />
                            </span>
                            <span className="flex-1 text-[13px]">Usuarios</span>
                        </NavLink>
                    </Can>

                    <Can permission="admin.roles.manage">
                        <NavLink to="/dashboard/roles" className={navLinkClass}>
                            <span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
                                <Shield className="w-[18px] h-[18px]" />
                            </span>
                            <span className="flex-1 text-[13px]">Roles y Permisos</span>
                        </NavLink>
                    </Can>

                    <Can permission="manage_system_events">
                        <NavLink to="/dashboard/system-events" className={navLinkClass}>
                            <span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
                                <Settings className="w-[18px] h-[18px]" />
                            </span>
                            <span className="flex-1 text-[13px]">Fechas del Sistema</span>
                        </NavLink>
                    </Can>

                    <Can permission="admin.roles.manage">
                        <NavLink to="/dashboard/templates" className={navLinkClass}>
                            <span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
                                <FileText className="w-[18px] h-[18px]" />
                            </span>
                            <span className="flex-1 text-[13px]">Plantillas</span>
                        </NavLink>
                    </Can>
                </Can>
            </div>
        </aside>
    );
};
