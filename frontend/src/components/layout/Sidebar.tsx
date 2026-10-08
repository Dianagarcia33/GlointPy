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
    Layers,
    Sparkles,
    DoorClosed,
    ShieldAlert,
    Package
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
        group relative px-2.5 py-1.5 rounded-xl no-underline flex items-center gap-2.5 transition-all duration-200 select-none
        ${isActive 
            ? 'bg-gradient-to-r from-brand-500 to-amber-500 text-white font-bold shadow-xs shadow-brand-500/25 border border-white/10' 
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
        }
    `;

    return (
        <aside 
            onClick={(e) => {
                if ((e.target as HTMLElement).closest('a')) {
                    if (onItemClick) onItemClick();
                }
            }}
            className="w-64 flex flex-col h-full bg-white select-none transition-all duration-300"
        >
            {/* Contenido scrolleable de navegación */}
            <div className="flex-1 overflow-y-auto py-4 px-3 space-y-3 scrollbar-thin scrollbar-thumb-slate-200 hover:scrollbar-thumb-slate-300">
                
                {/* 📌 SECCIÓN PRINCIPAL */}
                <div className="flex flex-col gap-1">
                    <button 
                        type="button"
                        onClick={() => toggleSection('principal')}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[10.5px] font-extrabold text-slate-400 hover:text-slate-700 hover:bg-slate-50 uppercase tracking-wider font-montserrat transition-all cursor-pointer select-none group"
                    >
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-md bg-brand-500/10 flex items-center justify-center text-brand-500 group-hover:bg-brand-500/20 transition-colors">
                                <LayoutDashboard className="w-3 h-3" />
                            </div>
                            <span>PRINCIPAL</span>
                        </div>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${openSections.principal ? 'rotate-180 text-brand-500' : 'rotate-0 text-slate-400 group-hover:text-slate-600'}`} />
                    </button>
                    
                    <AnimatePresence initial={false}>
                        {openSections.principal && (
                            <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2, ease: 'easeInOut' }}
                                className="flex flex-col gap-0.5 overflow-hidden pl-1"
                            >
                                <NavLink to="/dashboard" end className={navLinkClass}>
                                    {({ isActive }) => (
                                        <>
                                            <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                                                isActive ? 'bg-white/15 text-white' : 'text-slate-400 group-hover:text-brand-500 group-hover:bg-brand-50/80'
                                            }`}>
                                                <Home className="w-4 h-4" />
                                            </span>
                                            <span className="flex-1 text-[13px] font-outfit truncate">Dashboard</span>
                                            {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs shrink-0" />}
                                        </>
                                    )}
                                </NavLink>

                                <Can permission="chat:view">
                                    <NavLink to="/dashboard/chat" className={navLinkClass}>
                                        {({ isActive }) => (
                                            <>
                                                <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                                                    isActive ? 'bg-white/15 text-white' : 'text-slate-400 group-hover:text-brand-500 group-hover:bg-brand-50/80'
                                                }`}>
                                                    <MessageSquare className="w-4 h-4" />
                                                </span>
                                                <span className="flex-1 text-[13px] font-outfit truncate">Chat</span>
                                                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs shrink-0" />}
                                            </>
                                        )}
                                    </NavLink>
                                </Can>

                                <Can permissions={['rooms:view', 'rooms:reserve', 'admin.rooms.manage']}>
                                    <NavLink to="/dashboard/rooms" className={navLinkClass}>
                                        {({ isActive }) => (
                                            <>
                                                <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                                                    isActive ? 'bg-white/15 text-white' : 'text-slate-400 group-hover:text-brand-500 group-hover:bg-brand-50/80'
                                                }`}>
                                                    <DoorClosed className="w-4 h-4" />
                                                </span>
                                                <span className="flex-1 text-[13px] font-outfit truncate">Salas de Reuniones</span>
                                                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs shrink-0" />}
                                            </>
                                        )}
                                    </NavLink>
                                </Can>

                                <NavLink to="/dashboard/tickets" className={navLinkClass}>
                                    {({ isActive }) => (
                                        <>
                                            <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                                                isActive ? 'bg-white/15 text-white' : 'text-slate-400 group-hover:text-brand-500 group-hover:bg-brand-50/80'
                                            }`}>
                                                <LifeBuoy className="w-4 h-4" />
                                            </span>
                                            <span className="flex-1 text-[13px] font-outfit truncate">Soporte y Tickets</span>
                                            {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs shrink-0" />}
                                        </>
                                    )}
                                </NavLink>

                                <NavLink to="/dashboard/profile" className={navLinkClass}>
                                    {({ isActive }) => (
                                        <>
                                            <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                                                isActive ? 'bg-white/15 text-white' : 'text-slate-400 group-hover:text-brand-500 group-hover:bg-brand-50/80'
                                            }`}>
                                                <User className="w-4 h-4" />
                                            </span>
                                            <span className="flex-1 text-[13px] font-outfit truncate">Mi Perfil</span>
                                            {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs shrink-0" />}
                                        </>
                                    )}
                                </NavLink>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="h-px bg-gradient-to-r from-transparent via-slate-200/70 to-transparent my-1 mx-2" />

                {/* 💼 SECCIÓN FINANZAS Y CUENTA */}
                <div className="flex flex-col gap-1">
                    <button 
                        type="button"
                        onClick={() => toggleSection('finanzas')}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[10.5px] font-extrabold text-slate-400 hover:text-slate-700 hover:bg-slate-50 uppercase tracking-wider font-montserrat transition-all cursor-pointer select-none group"
                    >
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-md bg-brand-500/10 flex items-center justify-center text-brand-500 group-hover:bg-brand-500/20 transition-colors">
                                <CreditCard className="w-3 h-3" />
                            </div>
                            <span>FINANZAS Y CUENTA</span>
                        </div>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${openSections.finanzas ? 'rotate-180 text-brand-500' : 'rotate-0 text-slate-400 group-hover:text-slate-600'}`} />
                    </button>

                    <AnimatePresence initial={false}>
                        {openSections.finanzas && (
                            <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2, ease: 'easeInOut' }}
                                className="flex flex-col gap-0.5 overflow-hidden pl-1"
                            >
                                <Can permission="wallets:view">
                                    <NavLink to="/dashboard/wallet" className={navLinkClass}>
                                        {({ isActive }) => (
                                            <>
                                                <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                                                    isActive ? 'bg-white/15 text-white' : 'text-slate-400 group-hover:text-brand-500 group-hover:bg-brand-50/80'
                                                }`}>
                                                    <Wallet className="w-4 h-4" />
                                                </span>
                                                <span className="flex-1 text-[13px] font-outfit truncate">Mi Billetera</span>
                                                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs shrink-0" />}
                                            </>
                                        )}
                                    </NavLink>
                                </Can>

                                <Can permissions={["admin.shares.manage", "admin.roles.manage", "wallets:view", "dashboard:view_investments"]}>
                                    <NavLink to="/dashboard/shares-market" className={navLinkClass}>
                                        {({ isActive }) => (
                                            <>
                                                <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                                                    isActive ? 'bg-white/15 text-white' : 'text-slate-400 group-hover:text-brand-500 group-hover:bg-brand-50/80'
                                                }`}>
                                                    <Layers className="w-4 h-4" />
                                                </span>
                                                <span className="flex-1 text-[13px] font-outfit truncate">Mercado de Acciones</span>
                                                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs shrink-0" />}
                                            </>
                                        )}
                                    </NavLink>
                                </Can>

                                <Can permission="bank_accounts:manage">
                                    <NavLink to="/dashboard/bank-accounts" className={navLinkClass}>
                                        {({ isActive }) => (
                                            <>
                                                <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                                                    isActive ? 'bg-white/15 text-white' : 'text-slate-400 group-hover:text-brand-500 group-hover:bg-brand-50/80'
                                                }`}>
                                                    <Landmark className="w-4 h-4" />
                                                </span>
                                                <span className="flex-1 text-[13px] font-outfit truncate">Bóveda Bancaria</span>
                                                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs shrink-0" />}
                                            </>
                                        )}
                                    </NavLink>
                                </Can>

                                {!isAdmin && (
                                    <>
                                        <Can permission="beneficiaries:view">
                                            <NavLink to="/dashboard/beneficiaries" className={navLinkClass}>
                                                {({ isActive }) => (
                                                    <>
                                                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                                                            isActive ? 'bg-white/15 text-white' : 'text-slate-400 group-hover:text-brand-500 group-hover:bg-brand-50/80'
                                                        }`}>
                                                            <HeartHandshake className="w-4 h-4" />
                                                        </span>
                                                        <span className="flex-1 text-[13px] font-outfit truncate">Beneficiarios</span>
                                                        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs shrink-0" />}
                                                    </>
                                                )}
                                            </NavLink>
                                        </Can>

                                        <Can permission="referrals:view">
                                            <NavLink to="/dashboard/referrals" className={navLinkClass}>
                                                {({ isActive }) => (
                                                    <>
                                                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                                                            isActive ? 'bg-white/15 text-white' : 'text-slate-400 group-hover:text-brand-500 group-hover:bg-brand-50/80'
                                                        }`}>
                                                            <UserPlus className="w-4 h-4" />
                                                        </span>
                                                        <span className="flex-1 text-[13px] font-outfit truncate">Mis Referidos</span>
                                                        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs shrink-0" />}
                                                    </>
                                                )}
                                            </NavLink>
                                        </Can>
                                    </>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="h-px bg-gradient-to-r from-transparent via-slate-200/70 to-transparent my-1 mx-2" />

                {/* 📈 SECCIÓN GESTIÓN COMERCIAL & CRM */}
                <Can permissions={['commercial:view', 'crm:view', 'crm:inbox:view', 'crm:calendar:view']}>
                    <div className="flex flex-col gap-1">
                        <button 
                            type="button"
                            onClick={() => toggleSection('comercial')}
                            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[10.5px] font-extrabold text-slate-400 hover:text-slate-700 hover:bg-slate-50 uppercase tracking-wider font-montserrat transition-all cursor-pointer select-none group"
                        >
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-md bg-brand-500/10 flex items-center justify-center text-brand-500 group-hover:bg-brand-500/20 transition-colors">
                                    <TrendingUp className="w-3 h-3" />
                                </div>
                                <span>COMERCIAL & CRM</span>
                            </div>
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${openSections.comercial ? 'rotate-180 text-brand-500' : 'rotate-0 text-slate-400 group-hover:text-slate-600'}`} />
                        </button>

                        <AnimatePresence initial={false}>
                            {openSections.comercial && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                                    className="flex flex-col gap-0.5 overflow-hidden pl-1"
                                >
                                    <Can permission="commercial:view">
                                        <NavLink to="/dashboard/commercial" className={navLinkClass}>
                                            {({ isActive }) => (
                                                <>
                                                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                                                        isActive ? 'bg-white/15 text-white' : 'text-slate-400 group-hover:text-brand-500 group-hover:bg-brand-50/80'
                                                    }`}>
                                                        <Trophy className="w-4 h-4" />
                                                    </span>
                                                    <span className="flex-1 text-[13px] font-outfit truncate">Panel Comercial</span>
                                                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs shrink-0" />}
                                                </>
                                            )}
                                        </NavLink>
                                    </Can>

                                    <Can permission="crm:view">
                                        <NavLink to="/dashboard/crm" end className={navLinkClass}>
                                            {({ isActive }) => (
                                                <>
                                                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                                                        isActive ? 'bg-white/15 text-white' : 'text-slate-400 group-hover:text-brand-500 group-hover:bg-brand-50/80'
                                                    }`}>
                                                        <FolderKanban className="w-4 h-4" />
                                                    </span>
                                                    <span className="flex-1 text-[13px] font-outfit truncate">CRM / Proyectos</span>
                                                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs shrink-0" />}
                                                </>
                                            )}
                                        </NavLink>
                                    </Can>

                                    <Can permissions={['crm:inbox:view', 'crm:view']}>
                                        <NavLink to="/dashboard/crm/inbox" className={navLinkClass}>
                                            {({ isActive }) => (
                                                <>
                                                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                                                        isActive ? 'bg-white/15 text-white' : 'text-slate-400 group-hover:text-brand-500 group-hover:bg-brand-50/80'
                                                    }`}>
                                                        <Mail className="w-4 h-4" />
                                                    </span>
                                                    <span className="flex-1 text-[13px] font-outfit truncate">Bandeja de Correos</span>
                                                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs shrink-0" />}
                                                </>
                                            )}
                                        </NavLink>
                                    </Can>

                                    <Can permissions={['crm:calendar:view', 'crm:view']}>
                                        <NavLink to="/dashboard/crm/calendar" className={navLinkClass}>
                                            {({ isActive }) => (
                                                <>
                                                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                                                        isActive ? 'bg-white/15 text-white' : 'text-slate-400 group-hover:text-brand-500 group-hover:bg-brand-50/80'
                                                    }`}>
                                                        <CalendarDays className="w-4 h-4" />
                                                    </span>
                                                    <span className="flex-1 text-[13px] font-outfit truncate">Calendario / Agenda</span>
                                                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs shrink-0" />}
                                                </>
                                            )}
                                        </NavLink>
                                    </Can>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="h-px bg-gradient-to-r from-transparent via-slate-200/70 to-transparent my-1 mx-2" />
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
                    "manage_system_events",
                    "inventory:view",
                    "inventory.view"
                ]}>
                    <div className="flex flex-col gap-1">
                        <button 
                            type="button"
                            onClick={() => toggleSection('admin')}
                            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[10.5px] font-extrabold text-slate-400 hover:text-slate-700 hover:bg-slate-50 uppercase tracking-wider font-montserrat transition-all cursor-pointer select-none group"
                        >
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-md bg-brand-500/10 flex items-center justify-center text-brand-500 group-hover:bg-brand-500/20 transition-colors">
                                    <ShieldCheck className="w-3 h-3" />
                                </div>
                                <span>ADMINISTRACIÓN</span>
                            </div>
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${openSections.admin ? 'rotate-180 text-brand-500' : 'rotate-0 text-slate-400 group-hover:text-slate-600'}`} />
                        </button>

                        <AnimatePresence initial={false}>
                            {openSections.admin && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                                    className="flex flex-col gap-0.5 overflow-hidden pl-1"
                                >
                                    <Can permission="admin.investors.manage">
                                        <NavLink to="/dashboard/investors" className={navLinkClass}>
                                            {({ isActive }) => (
                                                <>
                                                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                                                        isActive ? 'bg-white/15 text-white' : 'text-slate-400 group-hover:text-brand-500 group-hover:bg-brand-50/80'
                                                    }`}>
                                                        <Users className="w-4 h-4" />
                                                    </span>
                                                    <span className="flex-1 text-[13px] font-outfit truncate">Inversionistas</span>
                                                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs shrink-0" />}
                                                </>
                                            )}
                                        </NavLink>
                                    </Can>

                                    <Can permissions={["admin.rankings.manage", "admin.roles.manage"]}>
                                        <NavLink to="/dashboard/rankings" className={navLinkClass}>
                                            {({ isActive }) => (
                                                <>
                                                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                                                        isActive ? 'bg-white/15 text-white' : 'text-slate-400 group-hover:text-brand-500 group-hover:bg-brand-50/80'
                                                    }`}>
                                                        <Trophy className="w-4 h-4" />
                                                    </span>
                                                    <span className="flex-1 text-[13px] font-outfit truncate">Rankings & Niveles</span>
                                                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs shrink-0" />}
                                                </>
                                            )}
                                        </NavLink>
                                    </Can>

                                    <Can permission="admin.payments.manage">
                                        <NavLink to="/dashboard/payments" className={navLinkClass}>
                                            {({ isActive }) => (
                                                <>
                                                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                                                        isActive ? 'bg-white/15 text-white' : 'text-slate-400 group-hover:text-brand-500 group-hover:bg-brand-50/80'
                                                    }`}>
                                                        <ArrowDownToLine className="w-4 h-4" />
                                                    </span>
                                                    <span className="flex-1 text-[13px] font-outfit truncate">Gestión de Pagos</span>
                                                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs shrink-0" />}
                                                </>
                                            )}
                                        </NavLink>
                                    </Can>

                                    <Can permissions={["admin.external_apps.manage", "admin.roles.manage"]}>
                                        <NavLink to="/dashboard/external-apps" className={navLinkClass}>
                                            {({ isActive }) => (
                                                <>
                                                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                                                        isActive ? 'bg-white/15 text-white' : 'text-slate-400 group-hover:text-brand-500 group-hover:bg-brand-50/80'
                                                    }`}>
                                                        <Globe className="w-4 h-4" />
                                                    </span>
                                                    <span className="flex-1 text-[13px] font-outfit truncate">Apps Externas (Gloint Pay)</span>
                                                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs shrink-0" />}
                                                </>
                                            )}
                                        </NavLink>
                                    </Can>

                                    <Can permissions={["admin.shares.manage", "admin.roles.manage"]}>
                                        <NavLink to="/dashboard/admin-shares" className={navLinkClass}>
                                            {({ isActive }) => (
                                                <>
                                                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                                                        isActive ? 'bg-white/15 text-white' : 'text-slate-400 group-hover:text-brand-500 group-hover:bg-brand-50/80'
                                                    }`}>
                                                        <Layers className="w-4 h-4" />
                                                    </span>
                                                    <span className="flex-1 text-[13px] font-outfit truncate">Mercado de Acciones (Admin)</span>
                                                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs shrink-0" />}
                                                </>
                                            )}
                                        </NavLink>
                                    </Can>

                                    <Can permission="admin.packages.manage">
                                        <NavLink to="/dashboard/packages" className={navLinkClass}>
                                            {({ isActive }) => (
                                                <>
                                                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                                                        isActive ? 'bg-white/15 text-white' : 'text-slate-400 group-hover:text-brand-500 group-hover:bg-brand-50/80'
                                                    }`}>
                                                        <Briefcase className="w-4 h-4" />
                                                    </span>
                                                    <span className="flex-1 text-[13px] font-outfit truncate">Paquetes</span>
                                                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs shrink-0" />}
                                                </>
                                            )}
                                        </NavLink>
                                    </Can>

                                    <Can permission="admin.periods.manage">
                                        <NavLink to="/dashboard/periods" className={navLinkClass}>
                                            {({ isActive }) => (
                                                <>
                                                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                                                        isActive ? 'bg-white/15 text-white' : 'text-slate-400 group-hover:text-brand-500 group-hover:bg-brand-50/80'
                                                    }`}>
                                                        <CalendarDays className="w-4 h-4" />
                                                    </span>
                                                    <span className="flex-1 text-[13px] font-outfit truncate">Periodos</span>
                                                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs shrink-0" />}
                                                </>
                                            )}
                                        </NavLink>
                                    </Can>

                                    <Can permissions={["admin.referrals.manage", "admin.roles.manage"]}>
                                        <NavLink to="/dashboard/admin-referrals" className={navLinkClass}>
                                            {({ isActive }) => (
                                                <>
                                                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                                                        isActive ? 'bg-white/15 text-white' : 'text-slate-400 group-hover:text-brand-500 group-hover:bg-brand-50/80'
                                                    }`}>
                                                        <UserPlus className="w-4 h-4" />
                                                    </span>
                                                    <span className="flex-1 text-[13px] font-outfit truncate">Gestión de Referidos</span>
                                                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs shrink-0" />}
                                                </>
                                            )}
                                        </NavLink>
                                    </Can>

                                    <Can permission="admin.audits.manage">
                                        <NavLink to="/dashboard/audit" className={navLinkClass}>
                                            {({ isActive }) => (
                                                <>
                                                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                                                        isActive ? 'bg-white/15 text-white' : 'text-slate-400 group-hover:text-brand-500 group-hover:bg-brand-50/80'
                                                    }`}>
                                                        <History className="w-4 h-4" />
                                                    </span>
                                                    <span className="flex-1 text-[13px] font-outfit truncate">Auditoría (Cruce)</span>
                                                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs shrink-0" />}
                                                </>
                                            )}
                                        </NavLink>
                                    </Can>

                                    <Can permissions={["admin.audits.manage", "admin.roles.manage"]}>
                                        <NavLink to="/dashboard/security-logs" className={navLinkClass}>
                                            {({ isActive }) => (
                                                <>
                                                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                                                        isActive ? 'bg-white/15 text-white' : 'text-slate-400 group-hover:text-brand-500 group-hover:bg-brand-50/80'
                                                    }`}>
                                                        <ShieldAlert className="w-4 h-4" />
                                                    </span>
                                                    <span className="flex-1 text-[13px] font-outfit truncate">Logs de Seguridad</span>
                                                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs shrink-0" />}
                                                </>
                                            )}
                                        </NavLink>
                                    </Can>

                                    <Can permission="admin.users.manage">
                                        <NavLink to="/dashboard/users" className={navLinkClass}>
                                            {({ isActive }) => (
                                                <>
                                                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                                                        isActive ? 'bg-white/15 text-white' : 'text-slate-400 group-hover:text-brand-500 group-hover:bg-brand-50/80'
                                                    }`}>
                                                        <User className="w-4 h-4" />
                                                    </span>
                                                    <span className="flex-1 text-[13px] font-outfit truncate">Usuarios</span>
                                                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs shrink-0" />}
                                                </>
                                            )}
                                        </NavLink>
                                    </Can>

                                    <Can permission="admin.roles.manage">
                                        <NavLink to="/dashboard/roles" className={navLinkClass}>
                                            {({ isActive }) => (
                                                <>
                                                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                                                        isActive ? 'bg-white/15 text-white' : 'text-slate-400 group-hover:text-brand-500 group-hover:bg-brand-50/80'
                                                    }`}>
                                                        <Shield className="w-4 h-4" />
                                                    </span>
                                                    <span className="flex-1 text-[13px] font-outfit truncate">Roles y Permisos</span>
                                                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs shrink-0" />}
                                                </>
                                            )}
                                        </NavLink>
                                    </Can>

                                    <Can permission="manage_system_events">
                                        <NavLink to="/dashboard/system-events" className={navLinkClass}>
                                            {({ isActive }) => (
                                                <>
                                                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                                                        isActive ? 'bg-white/15 text-white' : 'text-slate-400 group-hover:text-brand-500 group-hover:bg-brand-50/80'
                                                    }`}>
                                                        <Settings className="w-4 h-4" />
                                                    </span>
                                                    <span className="flex-1 text-[13px] font-outfit truncate">Fechas del Sistema</span>
                                                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs shrink-0" />}
                                                </>
                                            )}
                                        </NavLink>
                                    </Can>

                                    <Can permission="admin.roles.manage">
                                        <NavLink to="/dashboard/templates" className={navLinkClass}>
                                            {({ isActive }) => (
                                                <>
                                                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                                                        isActive ? 'bg-white/15 text-white' : 'text-slate-400 group-hover:text-brand-500 group-hover:bg-brand-50/80'
                                                    }`}>
                                                        <FileText className="w-4 h-4" />
                                                    </span>
                                                    <span className="flex-1 text-[13px] font-outfit truncate">Plantillas</span>
                                                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs shrink-0" />}
                                                </>
                                            )}
                                        </NavLink>
                                    </Can>

                                    <Can permissions={["admin.notifications.manage", "admin.roles.manage"]}>
                                        <NavLink to="/dashboard/admin-notifications" className={navLinkClass}>
                                            {({ isActive }) => (
                                                <>
                                                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                                                        isActive ? 'bg-white/15 text-white' : 'text-slate-400 group-hover:text-brand-500 group-hover:bg-brand-50/80'
                                                    }`}>
                                                        <Send className="w-4 h-4" />
                                                    </span>
                                                    <span className="flex-1 text-[13px] font-outfit truncate">Notificaciones Admin</span>
                                                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs shrink-0" />}
                                                </>
                                            )}
                                        </NavLink>
                                    </Can>

                                    <Can permissions={["admin.events.manage", "admin.roles.manage"]}>
                                        <NavLink to="/dashboard/events" className={navLinkClass}>
                                            {({ isActive }) => (
                                                <>
                                                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                                                        isActive ? 'bg-white/15 text-white' : 'text-slate-400 group-hover:text-amber-500 group-hover:bg-amber-50/80'
                                                    }`}>
                                                        <Sparkles className="w-4 h-4 text-amber-500" />
                                                    </span>
                                                    <span className="flex-1 text-[13px] font-outfit truncate">Gloint Power Tech</span>
                                                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs shrink-0" />}
                                                </>
                                            )}
                                        </NavLink>
                                    </Can>

                                    <Can permissions={["inventory:view", "inventory.view"]}>
                                        <NavLink to="/dashboard/inventory" className={navLinkClass}>
                                            {({ isActive }) => (
                                                <>
                                                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                                                        isActive ? 'bg-white/15 text-white' : 'text-slate-400 group-hover:text-brand-500 group-hover:bg-brand-50/80'
                                                    }`}>
                                                        <Package className="w-4 h-4 text-brand-500" />
                                                    </span>
                                                    <span className="flex-1 text-[13px] font-outfit truncate">Inventario e Insumos</span>
                                                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs shrink-0" />}
                                                </>
                                            )}
                                        </NavLink>
                                    </Can>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </Can>
            </div>

            {/* 🛡️ Footer del Sidebar: Status & Versión */}
            <div className="p-3 border-t border-slate-100 bg-slate-50/70 shrink-0">
                <div className="flex items-center justify-between px-2.5 py-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-extrabold text-slate-800 tracking-tight font-montserrat leading-none">
                                GLOINT SYSTEM
                            </span>
                            <span className="text-[8.5px] font-semibold text-emerald-600 mt-0.5 leading-none">
                                Operativo • Seguro
                            </span>
                        </div>
                    </div>
                    <span className="text-[9px] font-bold text-slate-500 font-montserrat px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-200/60">
                        v2.0
                    </span>
                </div>
            </div>
        </aside>
    );
};
