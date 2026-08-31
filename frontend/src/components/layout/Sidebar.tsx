import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
    MessageSquare,
    FolderKanban,
    Mail,
    ChevronDown,
    LayoutDashboard,
    CreditCard,
    TrendingUp,
    ShieldCheck,
    Send,
    LifeBuoy,
    Globe,
    Layers
} from 'lucide-react';
import { Can } from '../../components/security/Can';
import { useAuthStore } from '../../store/authStore';

interface SidebarProps {
    onItemClick?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onItemClick }) => {
    const user = useAuthStore((state) => state.user);
    const isAdmin = user?.permissions?.includes('admin.users.manage') || user?.permissions?.includes('admin.roles.manage');

    // Estado para controlar qué secciones están desplegadas/colapsadas
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        principal: true,
        finanzas: true,
        comercial: true,
        admin: true
    });

    const toggleSection = (section: string) => {
        setOpenSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const navLinkClass = ({ isActive }: { isActive: boolean }) => `
        group relative px-3 py-2.5 rounded-xl no-underline flex items-center gap-3 transition-all duration-200
        ${isActive 
            ? 'bg-gradient-to-r from-brand-500 to-amber-600 text-white shadow-md shadow-brand-500/20 font-bold scale-[1.01]' 
            : 'text-slate-600 hover:bg-brand-50/80 hover:text-brand-600 font-medium'
        }
    `;

    return (
        <aside 
            onClick={(e) => {
                if ((e.target as HTMLElement).closest('a')) {
                    if (onItemClick) onItemClick();
                }
            }}
            className="w-64 flex flex-col h-full overflow-y-auto z-10 transition-all duration-300 scrollbar-thin scrollbar-thumb-slate-200 hover:scrollbar-thumb-brand-300 bg-white/80 backdrop-blur-xs"
        >
            <div className="flex flex-col py-5 px-3.5 gap-2">
                
                {/* 📌 SECCIÓN PRINCIPAL */}
                <div className="flex flex-col gap-1">
                    <button 
                        type="button"
                        onClick={() => toggleSection('principal')}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-bold text-slate-400 hover:text-slate-800 hover:bg-slate-100/70 uppercase tracking-wider transition-all cursor-pointer select-none group"
                    >
                        <div className="flex items-center gap-2">
                            <LayoutDashboard className="w-3.5 h-3.5 text-brand-500 opacity-80 group-hover:opacity-100" />
                            <span>PRINCIPAL</span>
                        </div>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${openSections.principal ? 'rotate-180 text-brand-500' : 'rotate-0 text-slate-400'}`} />
                    </button>
                    
                    <AnimatePresence initial={false}>
                        {openSections.principal && (
                            <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2, ease: 'easeInOut' }}
                                className="flex flex-col gap-1 overflow-hidden pl-1"
                            >
                                <NavLink to="/dashboard" end className={navLinkClass}>
                                    <span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
                                        <Home className="w-[18px] h-[18px]" />
                                    </span>
                                    <span className="flex-1 text-[13px] font-outfit">Dashboard</span>
                                </NavLink>

                                <Can permission="chat:view">
                                    <NavLink to="/dashboard/chat" className={navLinkClass}>
                                        <span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
                                            <MessageSquare className="w-[18px] h-[18px]" />
                                        </span>
                                        <span className="flex-1 text-[13px] font-outfit">Chat</span>
                                    </NavLink>
                                </Can>

                                <NavLink to="/dashboard/tickets" className={navLinkClass}>
                                    <span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
                                        <LifeBuoy className="w-[18px] h-[18px]" />
                                    </span>
                                    <span className="flex-1 text-[13px] font-outfit">Soporte y Tickets</span>
                                </NavLink>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="h-px bg-slate-100 my-1 mx-2" />

                {/* 💼 SECCIÓN FINANZAS Y CUENTA */}
                <div className="flex flex-col gap-1">
                    <button 
                        type="button"
                        onClick={() => toggleSection('finanzas')}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-bold text-slate-400 hover:text-slate-800 hover:bg-slate-100/70 uppercase tracking-wider transition-all cursor-pointer select-none group"
                    >
                        <div className="flex items-center gap-2">
                            <CreditCard className="w-3.5 h-3.5 text-brand-500 opacity-80 group-hover:opacity-100" />
                            <span>FINANZAS Y CUENTA</span>
                        </div>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${openSections.finanzas ? 'rotate-180 text-brand-500' : 'rotate-0 text-slate-400'}`} />
                    </button>

                    <AnimatePresence initial={false}>
                        {openSections.finanzas && (
                            <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2, ease: 'easeInOut' }}
                                className="flex flex-col gap-1 overflow-hidden pl-1"
                            >
                                <Can permission="wallets:view">
                                    <NavLink to="/dashboard/wallet" className={navLinkClass}>
                                        <span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
                                            <Wallet className="w-[18px] h-[18px]" />
                                        </span>
                                        <span className="flex-1 text-[13px] font-outfit">Mi Billetera</span>
                                    </NavLink>
                                </Can>

                                <Can permission="bank_accounts:manage">
                                    <NavLink to="/dashboard/bank-accounts" className={navLinkClass}>
                                        <span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
                                            <Landmark className="w-[18px] h-[18px]" />
                                        </span>
                                        <span className="flex-1 text-[13px] font-outfit">Bóveda Bancaria</span>
                                    </NavLink>
                                </Can>

                                {!isAdmin && (
                                    <>
                                        <Can permission="beneficiaries:view">
                                            <NavLink to="/dashboard/beneficiaries" className={navLinkClass}>
                                                <span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
                                                    <HeartHandshake className="w-[18px] h-[18px]" />
                                                </span>
                                                <span className="flex-1 text-[13px] font-outfit">Beneficiarios</span>
                                            </NavLink>
                                        </Can>

                                        <Can permission="referrals:view">
                                            <NavLink to="/dashboard/referrals" className={navLinkClass}>
                                                <span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
                                                    <UserPlus className="w-[18px] h-[18px]" />
                                                </span>
                                                <span className="flex-1 text-[13px] font-outfit">Mis Referidos</span>
                                            </NavLink>
                                        </Can>
                                    </>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="h-px bg-slate-100 my-1 mx-2" />

                {/* 📈 SECCIÓN GESTIÓN COMERCIAL & CRM */}
                <Can permission="commercial:view">
                    <div className="flex flex-col gap-1">
                        <button 
                            type="button"
                            onClick={() => toggleSection('comercial')}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-bold text-slate-400 hover:text-slate-800 hover:bg-slate-100/70 uppercase tracking-wider transition-all cursor-pointer select-none group"
                        >
                            <div className="flex items-center gap-2">
                                <TrendingUp className="w-3.5 h-3.5 text-brand-500 opacity-80 group-hover:opacity-100" />
                                <span>COMERCIAL & CRM</span>
                            </div>
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${openSections.comercial ? 'rotate-180 text-brand-500' : 'rotate-0 text-slate-400'}`} />
                        </button>

                        <AnimatePresence initial={false}>
                            {openSections.comercial && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                                    className="flex flex-col gap-1 overflow-hidden pl-1"
                                >
                                    <NavLink to="/dashboard/commercial" className={navLinkClass}>
                                        <span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
                                            <Trophy className="w-[18px] h-[18px]" />
                                        </span>
                                        <span className="flex-1 text-[13px] font-outfit">Panel Comercial</span>
                                    </NavLink>

                                    <Can permission="crm:view">
                                        <NavLink to="/dashboard/crm" end className={navLinkClass}>
                                            <span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
                                                <FolderKanban className="w-[18px] h-[18px]" />
                                            </span>
                                            <span className="flex-1 text-[13px] font-outfit">CRM / Proyectos</span>
                                        </NavLink>
                                    </Can>

                                    <Can permission="crm:view">
                                        <NavLink to="/dashboard/crm/inbox" className={navLinkClass}>
                                            <span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
                                                <Mail className="w-[18px] h-[18px]" />
                                            </span>
                                            <span className="flex-1 text-[13px] font-outfit">Bandeja de Correos</span>
                                        </NavLink>
                                    </Can>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="h-px bg-slate-100 my-1 mx-2" />
                </Can>

                {/* 🛡️ SECCIÓN ADMINISTRACIÓN DEL SISTEMA */}
                <Can permissions={[
                    "admin.users.manage",
                    "admin.roles.manage",
                    "admin.investors.manage",
                    "admin.rankings.manage",
                    "admin.payments.manage",
                    "admin.packages.manage",
                    "admin.periods.manage",
                    "admin.audits.manage",
                    "manage_system_events"
                ]}>
                    <div className="flex flex-col gap-1">
                        <button 
                            type="button"
                            onClick={() => toggleSection('admin')}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-bold text-slate-400 hover:text-slate-800 hover:bg-slate-100/70 uppercase tracking-wider transition-all cursor-pointer select-none group"
                        >
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="w-3.5 h-3.5 text-brand-500 opacity-80 group-hover:opacity-100" />
                                <span>ADMINISTRACIÓN</span>
                            </div>
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${openSections.admin ? 'rotate-180 text-brand-500' : 'rotate-0 text-slate-400'}`} />
                        </button>

                        <AnimatePresence initial={false}>
                            {openSections.admin && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                                    className="flex flex-col gap-1 overflow-hidden pl-1"
                                >
                                    <Can permission="admin.investors.manage">
                                        <NavLink to="/dashboard/investors" className={navLinkClass}>
                                            <span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
                                                <Users className="w-[18px] h-[18px]" />
                                            </span>
                                            <span className="flex-1 text-[13px] font-outfit">Inversionistas</span>
                                        </NavLink>
                                    </Can>

                                    <Can permissions={["admin.rankings.manage", "admin.investors.manage", "admin.users.manage", "admin.roles.manage"]}>
                                        <NavLink to="/dashboard/rankings" className={navLinkClass}>
                                            <span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
                                                <Trophy className="w-[18px] h-[18px]" />
                                            </span>
                                            <span className="flex-1 text-[13px] font-outfit">Rankings & Niveles</span>
                                        </NavLink>
                                    </Can>

                                    <Can permission="admin.payments.manage">
                                        <NavLink to="/dashboard/payments" className={navLinkClass}>
                                            <span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
                                                <ArrowDownToLine className="w-[18px] h-[18px]" />
                                            </span>
                                            <span className="flex-1 text-[13px] font-outfit">Gestión de Pagos</span>
                                        </NavLink>
                                    </Can>

                                    <Can permissions={["admin.external_apps.manage", "admin.roles.manage", "admin.users.manage"]}>
                                        <NavLink to="/dashboard/external-apps" className={navLinkClass}>
                                            <span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
                                                <Globe className="w-[18px] h-[18px]" />
                                            </span>
                                            <span className="flex-1 text-[13px] font-outfit">Apps Externas (Gloint Pay)</span>
                                        </NavLink>
                                    </Can>

                                    <Can permission="admin.packages.manage">
                                        <NavLink to="/dashboard/packages" className={navLinkClass}>
                                            <span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
                                                <Briefcase className="w-[18px] h-[18px]" />
                                            </span>
                                            <span className="flex-1 text-[13px] font-outfit">Paquetes</span>
                                        </NavLink>
                                    </Can>

                                    <Can permission="admin.periods.manage">
                                        <NavLink to="/dashboard/periods" className={navLinkClass}>
                                            <span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
                                                <CalendarDays className="w-[18px] h-[18px]" />
                                            </span>
                                            <span className="flex-1 text-[13px] font-outfit">Periodos</span>
                                        </NavLink>
                                    </Can>

                                    <Can permissions={["admin.referrals.manage", "referrals:view", "admin.users.manage", "admin.roles.manage"]}>
                                        <NavLink to="/dashboard/admin-referrals" className={navLinkClass}>
                                            <span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
                                                <UserPlus className="w-[18px] h-[18px]" />
                                            </span>
                                            <span className="flex-1 text-[13px] font-outfit">Gestión de Referidos</span>
                                        </NavLink>
                                    </Can>

                                    <Can permission="admin.audits.manage">
                                        <NavLink to="/dashboard/audit" className={navLinkClass}>
                                            <span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
                                                <History className="w-[18px] h-[18px]" />
                                            </span>
                                            <span className="flex-1 text-[13px] font-outfit">Auditoría (Cruce)</span>
                                        </NavLink>
                                    </Can>

                                    <Can permission="admin.users.manage">
                                        <NavLink to="/dashboard/users" className={navLinkClass}>
                                            <span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
                                                <User className="w-[18px] h-[18px]" />
                                            </span>
                                            <span className="flex-1 text-[13px] font-outfit">Usuarios</span>
                                        </NavLink>
                                    </Can>

                                    <Can permission="admin.roles.manage">
                                        <NavLink to="/dashboard/roles" className={navLinkClass}>
                                            <span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
                                                <Shield className="w-[18px] h-[18px]" />
                                            </span>
                                            <span className="flex-1 text-[13px] font-outfit">Roles y Permisos</span>
                                        </NavLink>
                                    </Can>

                                    <Can permission="manage_system_events">
                                        <NavLink to="/dashboard/system-events" className={navLinkClass}>
                                            <span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
                                                <Settings className="w-[18px] h-[18px]" />
                                            </span>
                                            <span className="flex-1 text-[13px] font-outfit">Fechas del Sistema</span>
                                        </NavLink>
                                    </Can>

                                    <Can permission="admin.roles.manage">
                                        <NavLink to="/dashboard/templates" className={navLinkClass}>
                                            <span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
                                                <FileText className="w-[18px] h-[18px]" />
                                            </span>
                                            <span className="flex-1 text-[13px] font-outfit">Plantillas</span>
                                        </NavLink>
                                    </Can>

                                    <Can permissions={["admin.notifications.manage", "admin.users.manage", "admin.roles.manage"]}>
                                        <NavLink to="/dashboard/admin-notifications" className={navLinkClass}>
                                            <span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
                                                <Send className="w-[18px] h-[18px]" />
                                            </span>
                                            <span className="flex-1 text-[13px] font-outfit">Notificaciones Admin</span>
                                        </NavLink>
                                    </Can>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </Can>
            </div>
        </aside>
    );
};
