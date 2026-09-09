import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  Home,
  MessageSquare,
  LifeBuoy,
  Wallet,
  Layers,
  Briefcase,
  Landmark,
  HeartHandshake,
  UserPlus,
  Trophy,
  FolderKanban,
  Mail,
  ArrowDownToLine,
  Users,
  Globe,
  CalendarDays,
  History,
  User as UserIcon,
  Shield,
  Settings,
  FileText,
  Send,
  ArrowRight,
  CornerDownLeft,
  Command
} from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';

export interface ModuleItem {
  id: string;
  title: string;
  description: string;
  path: string;
  category: 'Principal' | 'Finanzas y Cuenta' | 'Comercial & CRM' | 'Administración';
  icon: React.ElementType;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  isAdminOnly?: boolean;
  isNonAdminOnly?: boolean;
  keywords: string[];
}

const MODULES_CATALOG: ModuleItem[] = [
  // 📌 PRINCIPAL
  {
    id: 'dashboard',
    title: 'Dashboard General',
    description: 'Resumen financiero, métricas de rendimiento y estado global de tu cuenta',
    path: '/dashboard',
    category: 'Principal',
    icon: Home,
    keywords: ['inicio', 'resumen', 'metricas', 'graficos', 'principal', 'estadisticas', 'home', 'panel']
  },
  {
    id: 'chat',
    title: 'Chat de Asesoría & Soporte',
    description: 'Comunicación directa y en tiempo real con asesores de Gloint',
    path: '/dashboard/chat',
    category: 'Principal',
    icon: MessageSquare,
    permission: 'chat:view',
    keywords: ['mensajes', 'soporte', 'asesor', 'chat', 'conversacion', 'comunicacion', 'ayuda']
  },
  {
    id: 'tickets',
    title: 'Soporte & Tickets (PQR)',
    description: 'Reporte de incidencias, solicitudes y seguimiento de requerimientos',
    path: '/dashboard/tickets',
    category: 'Principal',
    icon: LifeBuoy,
    keywords: ['tickets', 'soporte', 'ayuda', 'reclamos', 'pqr', 'incidencias', 'problemas', 'atencion']
  },

  // 💼 FINANZAS Y CUENTA
  {
    id: 'wallet',
    title: 'Mi Billetera (Wallet)',
    description: 'Saldo disponible, recargas de billetera, retiros y transferencias',
    path: '/dashboard/wallet',
    category: 'Finanzas y Cuenta',
    icon: Wallet,
    permission: 'wallets:view',
    keywords: [
      'saldo', 'recargar', 'recarga', 'recargas', 'retirar', 'retiros', 
      'transferencias', 'fondos', 'dinero', 'extracto', 'comprobantes', 'wallet', 'pagos'
    ]
  },
  {
    id: 'shares-market',
    title: 'Mercado de Acciones',
    description: 'Compra y venta de acciones del fondo, historial de valorización y portafolio',
    path: '/dashboard/shares-market',
    category: 'Finanzas y Cuenta',
    icon: Layers,
    keywords: ['acciones', 'comprar acciones', 'vender acciones', 'mercado', 'portafolio', 'titulos', 'valor de accion', 'rendimiento']
  },
  {
    id: 'investments',
    title: 'Mis Inversiones',
    description: 'Seguimiento a paquetes contratados, rendimientos generados y fechas de pago',
    path: '/dashboard/investments',
    category: 'Finanzas y Cuenta',
    icon: Briefcase,
    keywords: ['inversiones', 'paquetes', 'contratos', 'rendimientos', 'capital', 'fondos invertidos', 'ganancias']
  },
  {
    id: 'bank-accounts',
    title: 'Bóveda Bancaria',
    description: 'Registro seguro de cuentas bancarias personales para transferencias y retiros',
    path: '/dashboard/bank-accounts',
    category: 'Finanzas y Cuenta',
    icon: Landmark,
    permission: 'bank_accounts:manage',
    keywords: ['bancos', 'cuentas bancarias', 'certificacion', 'boveda', 'nequi', 'bancolombia', 'daviplata', 'ahorros']
  },
  {
    id: 'beneficiaries',
    title: 'Beneficiarios',
    description: 'Asignación legal de beneficiarios y contactos de emergencia para tu cuenta',
    path: '/dashboard/beneficiaries',
    category: 'Finanzas y Cuenta',
    icon: HeartHandshake,
    permission: 'beneficiaries:view',
    isNonAdminOnly: true,
    keywords: ['beneficiarios', 'herederos', 'asignacion', 'emergencia', 'familiares', 'contacto']
  },
  {
    id: 'referrals',
    title: 'Mis Referidos',
    description: 'Enlace de patrocinio, comisiones obtenidas y seguimiento de red de invitados',
    path: '/dashboard/referrals',
    category: 'Finanzas y Cuenta',
    icon: UserPlus,
    permission: 'referrals:view',
    isNonAdminOnly: true,
    keywords: ['referidos', 'enlace', 'afiliados', 'comisiones de red', 'invitar', 'equipo', 'patrocinio']
  },

  // 📈 COMERCIAL & CRM
  {
    id: 'commercial',
    title: 'Panel Comercial',
    description: 'Métricas de ventas, prospección de clientes, liquidación de comisiones y bonos',
    path: '/dashboard/commercial',
    category: 'Comercial & CRM',
    icon: Trophy,
    permission: 'commercial:view',
    keywords: ['comercial', 'ventas', 'bonos', 'ranking comercial', 'metas', 'asesores', 'comisiones']
  },
  {
    id: 'crm',
    title: 'CRM / Gestión de Clientes',
    description: 'Pipeline de prospectos, etapas de negociación, seguimiento y embudo de conversión',
    path: '/dashboard/crm',
    category: 'Comercial & CRM',
    icon: FolderKanban,
    permission: 'crm:view',
    keywords: ['crm', 'proyectos', 'leads', 'prospectos', 'embudo', 'pipeline', 'negocios', 'clientes']
  },
  {
    id: 'crm-inbox',
    title: 'Bandeja de Correos (CRM)',
    description: 'Comunicaciones y correos electrónicos entrantes y salientes con prospectos',
    path: '/dashboard/crm/inbox',
    category: 'Comercial & CRM',
    icon: Mail,
    permission: 'crm:view',
    keywords: ['correos', 'inbox', 'bandeja', 'emails', 'mensajes de prospectos', 'mensajes']
  },

  // 🛡️ ADMINISTRACIÓN
  {
    id: 'payments-admin',
    title: 'Gestión de Pagos & Tesorería',
    description: 'Supervisión de solicitudes de retiro, recargas de billetera y dispersión bancaria',
    path: '/dashboard/payments',
    category: 'Administración',
    icon: ArrowDownToLine,
    permission: 'admin.payments.manage',
    keywords: ['pagos', 'retiros admin', 'recargas admin', 'tesoreria', 'dispersion bancaria', 'aprobar retiros', 'aprobar recargas', 'auditar comprobantes']
  },
  {
    id: 'investors-admin',
    title: 'Gestión de Inversionistas',
    description: 'Expedientes de clientes, auditoría Sarlaft, revisión de KYC y solicitudes de inversión',
    path: '/dashboard/investors',
    category: 'Administración',
    icon: Users,
    permission: 'admin.investors.manage',
    keywords: ['inversionistas admin', 'lista inversionistas', 'sarlaft', 'kyc', 'contratos', 'aprobacion inversion', 'clientes']
  },
  {
    id: 'rankings-admin',
    title: 'Rankings & Niveles',
    description: 'Configuración de niveles de usuario, requisitos de ascenso y escalas de comisiones',
    path: '/dashboard/rankings',
    category: 'Administración',
    icon: Trophy,
    permissions: ['admin.rankings.manage', 'admin.investors.manage', 'admin.users.manage', 'admin.roles.manage'],
    keywords: ['rankings', 'niveles', 'puntos', 'comisiones de red', 'ascensos', 'escalafones']
  },
  {
    id: 'admin-shares',
    title: 'Mercado de Acciones (Admin)',
    description: 'Emisión de acciones oficiales, valorización, bitácora de precios y curvas de crecimiento',
    path: '/dashboard/admin-shares',
    category: 'Administración',
    icon: Layers,
    permissions: ['admin.shares.manage', 'admin.roles.manage', 'admin.users.manage'],
    keywords: ['emision de acciones', 'precio de accion', 'curvas de crecimiento', 'acciones admin', 'valorizacion', 'trazabilidad', 'graficas']
  },
  {
    id: 'external-apps',
    title: 'Apps Externas (Gloint Pay)',
    description: 'Pasarela de pagos API, gestión de credenciales, clientes autorizados y webhooks',
    path: '/dashboard/external-apps',
    category: 'Administración',
    icon: Globe,
    permissions: ['admin.external_apps.manage', 'admin.roles.manage', 'admin.users.manage'],
    keywords: ['gloint pay', 'pasarela de pagos', 'api keys', 'webhooks', 'apps externas', 'checkout', 'integraciones']
  },
  {
    id: 'packages-admin',
    title: 'Paquetes de Inversión',
    description: 'Creación, edición y parametrización de rentabilidades y condiciones de paquetes',
    path: '/dashboard/packages',
    category: 'Administración',
    icon: Briefcase,
    permission: 'admin.packages.manage',
    keywords: ['paquetes admin', 'crear paquetes', 'planes de inversion', 'rentabilidad', 'retornos', 'paquete']
  },
  {
    id: 'periods-admin',
    title: 'Periodos de Inversión',
    description: 'Configuración de plazos temporales, calendarios y cronogramas de inversión',
    path: '/dashboard/periods',
    category: 'Administración',
    icon: CalendarDays,
    permission: 'admin.periods.manage',
    keywords: ['periodos admin', 'plazos', 'meses', 'cronograma de inversion', 'duracion']
  },
  {
    id: 'admin-referrals',
    title: 'Gestión de Referidos (Admin)',
    description: 'Supervisión de redes de afiliación, trazabilidad de patrocinadores y liquidación de red',
    path: '/dashboard/admin-referrals',
    category: 'Administración',
    icon: UserPlus,
    permissions: ['admin.referrals.manage', 'referrals:view', 'admin.users.manage', 'admin.roles.manage'],
    keywords: ['arbol de referidos', 'referidos admin', 'red de afiliados', 'patrocinadores', 'multinivel']
  },
  {
    id: 'audit-admin',
    title: 'Auditoría & Cruce Contable',
    description: 'Auditoría financiera automatizada, conciliación de movimientos y balance contable',
    path: '/dashboard/audit',
    category: 'Administración',
    icon: History,
    permission: 'admin.audits.manage',
    keywords: ['auditoria', 'cruce contable', 'balance', 'discrepancias', 'historial contable', 'conciliacion']
  },
  {
    id: 'users-admin',
    title: 'Usuarios del Sistema',
    description: 'Administración de cuentas de usuario, asignación de roles, bloqueos y auditoría de accesos',
    path: '/dashboard/users',
    category: 'Administración',
    icon: UserIcon,
    permission: 'admin.users.manage',
    keywords: ['usuarios admin', 'crear usuario', 'administradores', 'cambiar clave', 'roles usuario', 'seguridad']
  },
  {
    id: 'roles-admin',
    title: 'Roles y Permisos',
    description: 'Matriz granular de control de accesos, creación de perfiles y seguridad RBAC',
    path: '/dashboard/roles',
    category: 'Administración',
    icon: Shield,
    permission: 'admin.roles.manage',
    keywords: ['roles', 'permisos', 'seguridad', 'matriz de permisos', 'privilegios', 'rbac', 'accesos']
  },
  {
    id: 'system-events',
    title: 'Fechas del Sistema & Eventos',
    description: 'Definición de calendarios operativos, días inhábiles y eventos de liquidación',
    path: '/dashboard/system-events',
    category: 'Administración',
    icon: Settings,
    permission: 'manage_system_events',
    keywords: ['fechas del sistema', 'dias habiles', 'calendario de cortes', 'eventos', 'feriados']
  },
  {
    id: 'templates-admin',
    title: 'Plantillas de Documentos',
    description: 'Gestión de formatos oficiales, contratos PDF, certificados y membretes digitales',
    path: '/dashboard/templates',
    category: 'Administración',
    icon: FileText,
    permission: 'admin.roles.manage',
    keywords: ['plantillas', 'contratos pdf', 'certificados', 'documentos legales', 'firmas', 'membretes']
  },
  {
    id: 'admin-notifications',
    title: 'Notificaciones Masivas (Push)',
    description: 'Emisión de comunicados oficiales e informativos a todos los usuarios o por roles',
    path: '/dashboard/admin-notifications',
    category: 'Administración',
    icon: Send,
    permissions: ['admin.notifications.manage', 'admin.users.manage', 'admin.roles.manage'],
    keywords: ['notificaciones push admin', 'comunicados', 'avisos masivos', 'broadcast', 'mensajes globales']
  }
];

// Helper para normalizar texto eliminando tildes y diacríticos
const normalize = (text: string): string => {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

interface NavbarModuleSearchProps {
  isDark?: boolean;
}

export const NavbarModuleSearch: React.FC<NavbarModuleSearchProps> = ({ isDark = true }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  const searchCardRef = useRef<HTMLDivElement>(null);

  const { hasPermission, hasAnyPermission, hasAllPermissions, isAdmin } = usePermissions();

  // 1. Filtrar módulos según los permisos estrictos del usuario
  const allowedModules = useMemo(() => {
    return MODULES_CATALOG.filter(mod => {
      if (mod.isAdminOnly && !isAdmin()) return false;
      if (mod.isNonAdminOnly && isAdmin()) return false;

      if (mod.permission) {
        return hasPermission(mod.permission);
      }

      if (mod.permissions && mod.permissions.length > 0) {
        return mod.requireAll 
          ? hasAllPermissions(mod.permissions) 
          : hasAnyPermission(mod.permissions);
      }

      return true;
    });
  }, [hasPermission, hasAnyPermission, hasAllPermissions, isAdmin]);

  // 2. Filtrar módulos por término de búsqueda y categoría
  const filteredModules = useMemo(() => {
    const cleanQuery = normalize(query);
    
    return allowedModules.filter(mod => {
      if (selectedCategory !== 'all' && mod.category !== selectedCategory) {
        return false;
      }

      if (!cleanQuery) return true;

      const matchTitle = normalize(mod.title).includes(cleanQuery);
      const matchDesc = normalize(mod.description).includes(cleanQuery);
      const matchCategory = normalize(mod.category).includes(cleanQuery);
      const matchKeywords = mod.keywords.some(k => normalize(k).includes(cleanQuery));

      return matchTitle || matchDesc || matchCategory || matchKeywords;
    });
  }, [allowedModules, query, selectedCategory]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, selectedCategory]);

  // Atajo de teclado global: Cmd+K o Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Autofocus al abrir modal
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setQuery('');
      setSelectedCategory('all');
    }
  }, [isOpen]);

  // Navegación hacia un módulo
  const handleSelectModule = (mod: ModuleItem) => {
    setIsOpen(false);
    navigate(mod.path);
  };

  // Manejo de teclas dentro del buscador (Flechas Arriba / Abajo / Enter)
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (filteredModules.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredModules.length);
      scrollSelectedIntoView((selectedIndex + 1) % filteredModules.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredModules.length) % filteredModules.length);
      scrollSelectedIntoView((selectedIndex - 1 + filteredModules.length) % filteredModules.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = filteredModules[selectedIndex];
      if (target) {
        handleSelectModule(target);
      }
    }
  };

  const scrollSelectedIntoView = (index: number) => {
    if (!resultsContainerRef.current) return;
    const items = resultsContainerRef.current.querySelectorAll('[data-search-item]');
    const targetItem = items[index] as HTMLElement;
    if (targetItem) {
      targetItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  };

  const availableCategories = useMemo(() => {
    const cats = new Set(allowedModules.map(m => m.category));
    return ['all', ...Array.from(cats)];
  }, [allowedModules]);

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'Finanzas y Cuenta':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Comercial & CRM':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Administración':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  return (
    <>
      {/* 1. Botón Buscador en la Navbar (Estilo Inputs Premium Gloint) */}
      <div className="w-full flex items-center justify-center">
        {/* Desktop Search Trigger */}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`hidden sm:flex items-center justify-between w-full max-w-sm lg:max-w-md px-3.5 py-1.5 rounded-2xl transition-all duration-200 cursor-pointer text-xs font-medium border ${
            isDark
              ? 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700/80 hover:border-slate-600 shadow-inner'
              : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600 border-slate-200 shadow-xs'
          }`}
          title="Buscar módulos del sistema (Ctrl + K)"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Search className="w-4 h-4 text-brand-400 shrink-0" />
            <span className="truncate text-slate-400">
              Buscar módulos o funciones...
            </span>
          </div>
          <span className={`ml-2 flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[10px] font-bold font-mono tracking-tighter border shrink-0 ${
            isDark
              ? 'bg-slate-900 text-slate-400 border-slate-700'
              : 'bg-white text-slate-500 border-slate-300 shadow-2xs'
          }`}>
            <Command className="w-2.5 h-2.5" /> K
          </span>
        </button>

        {/* Mobile Search Trigger Icon */}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`sm:hidden p-2 rounded-xl transition-colors cursor-pointer ${
            isDark
              ? 'text-white hover:bg-white/10'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
          title="Buscar módulos"
          aria-label="Abrir buscador de módulos"
        >
          <Search className="w-5 h-5 text-brand-400" />
        </button>
      </div>

      {/* 2. Modal / Command Palette Flotante montado en document.body mediante createPortal */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        >
          <div
            ref={searchCardRef}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 flex flex-col max-h-[82vh] font-inter"
          >
            {/* Header / Input Principal */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center gap-3 bg-slate-50/70">
              <div className="p-2 rounded-xl bg-brand-50 text-brand-600 border border-brand-100 shrink-0">
                <Search className="w-5 h-5" />
              </div>
              <input
                ref={inputRef}
                type="text"
                placeholder="Escribe el nombre de un módulo, función o palabra clave..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleInputKeyDown}
                className="w-full bg-transparent text-slate-900 placeholder-slate-400 text-sm sm:text-base font-semibold outline-none font-montserrat"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
                  title="Limpiar búsqueda"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="hidden sm:inline-flex px-2.5 py-1 rounded-xl text-xs font-bold text-slate-500 bg-slate-200/60 hover:bg-slate-200 border border-slate-300/60 transition-colors cursor-pointer"
              >
                ESC
              </button>
            </div>

            {/* Pestañas de Filtrado por Categoría */}
            <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto text-xs font-semibold bg-slate-50/30 scrollbar-none">
              {availableCategories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer capitalize text-xs ${
                    selectedCategory === cat
                      ? 'bg-slate-900 text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:bg-slate-200/60 font-medium'
                  }`}
                >
                  {cat === 'all' ? 'Todos los módulos' : cat}
                </button>
              ))}
            </div>

            {/* Lista de Resultados */}
            <div
              ref={resultsContainerRef}
              className="p-3 overflow-y-auto flex-1 space-y-1 divide-y divide-slate-100"
            >
              {filteredModules.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                    <Search className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 font-montserrat">
                      No se encontraron módulos disponibles
                    </p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                      No tienes acceso a un módulo con ese nombre o no coincide con los términos de búsqueda.
                    </p>
                  </div>
                </div>
              ) : (
                filteredModules.map((mod, idx) => {
                  const isSelected = idx === selectedIndex;
                  const IconComponent = mod.icon;

                  return (
                    <div
                      key={mod.id}
                      data-search-item
                      onClick={() => handleSelectModule(mod)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`group flex items-center justify-between p-3.5 rounded-2xl transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-brand-50/80 border border-brand-200 shadow-xs'
                          : 'hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                            isSelected
                              ? 'bg-gradient-to-br from-brand-500 to-amber-600 text-white shadow-md shadow-brand-500/25'
                              : 'bg-slate-100 text-slate-600 border border-slate-200/60'
                          }`}
                        >
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900 font-montserrat truncate">
                              {mod.title}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getCategoryBadgeClass(
                                mod.category
                              )}`}
                            >
                              {mod.category}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            {mod.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pl-3 shrink-0">
                        {isSelected ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-600 animate-in fade-in">
                            <span className="hidden sm:inline">Ir al módulo</span>
                            <CornerDownLeft className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer con Atajos */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono shadow-2xs">
                    ↑
                  </kbd>
                  <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono shadow-2xs">
                    ↓
                  </kbd>{' '}
                  Navegar
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono shadow-2xs">
                    ↵
                  </kbd>{' '}
                  Seleccionar
                </span>
              </div>
              <span className="font-bold text-slate-600 font-mono text-[11px]">
                {filteredModules.length} {filteredModules.length === 1 ? 'módulo' : 'módulos'}
              </span>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
