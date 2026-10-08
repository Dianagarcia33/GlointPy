import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Menu, X, ChevronDown, Activity, ChevronRight, Wallet, LogOut, User as UserIcon, ShieldAlert, ArrowLeft, Users, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { walletService } from '../../features/dashboard/api/walletService';
import { usersService } from '../../services/users';
import { NotificationBell } from './NotificationBell';
import { ChatQuickAccess } from './ChatQuickAccess';
import { NavbarModuleSearch } from './NavbarModuleSearch';
import { Can } from '../security/Can';

const logo = "/logo.png";

interface NavbarProps {
  onToggleMobileSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileSidebar }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [serviciosMenuOpen, setServiciosMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const serviciosMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const { isAuthenticated, user, accessToken, logout, login, parentBackup, setParentBackup } = useAuthStore();

  const { data: balanceData } = useQuery({
    queryKey: ['my_balance', user?.id],
    queryFn: () => walletService.getMyBalance(),
    enabled: isAuthenticated && !!user?.id,
    staleTime: 30000,
  });
  const balance = balanceData?.balance ?? null;

  const { data: myChildren = [] } = useQuery<any[]>({
    queryKey: ['my_children', user?.id],
    queryFn: async () => {
      const res = await usersService.getMyChildren();
      return Array.isArray(res) ? res : [];
    },
    enabled: isAuthenticated && !!user?.id,
    staleTime: 60000,
  });

  const handleSwitchToChild = async (childId: number) => {
    setIsSwitching(true);
    try {
      if (user && accessToken) {
        setParentBackup({ user, token: accessToken });
      }
      const res = await usersService.switchToChild(childId);
      login(res.user as any, res.access_token);
      queryClient.clear();
      setUserMenuOpen(false);
      navigate('/dashboard');
    } catch (err: any) {
      alert(err.message || 'Error al cambiar a la cuenta del menor');
    } finally {
      setIsSwitching(false);
    }
  };

  const handleReturnToParent = async () => {
    setIsSwitching(true);
    try {
      const res = await usersService.switchBackToParent();
      login(res.user as any, res.access_token);
      setParentBackup(null);
      queryClient.clear();
      setUserMenuOpen(false);
      navigate('/dashboard');
    } catch (err: any) {
      if (parentBackup && parentBackup.token) {
        login(parentBackup.user, parentBackup.token);
        setParentBackup(null);
        queryClient.clear();
        setUserMenuOpen(false);
        navigate('/dashboard');
        return;
      }
      alert(err.message || 'Error al retornar a la cuenta del tutor');
    } finally {
      setIsSwitching(false);
    }
  };

  // Es sólido si el usuario hizo scroll, o si la página NO tiene un encabezado oscuro
  const isDarkTopPage = ['/', '/login', '/register'].includes(location.pathname);
  const isDashboard = location.pathname.startsWith('/dashboard');
  const isSolid = scrolled || !isDarkTopPage || isDashboard;

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (serviciosMenuRef.current && !serviciosMenuRef.current.contains(event.target as Node)) {
        setServiciosMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setIsOpen(false);
    setServiciosMenuOpen(false);
    setUserMenuOpen(false);
    window.scrollTo(0, 0);
  }, [location]);

  return (
    <nav className={`fixed top-0 left-0 right-0 w-full z-30 transition-all duration-300 ${
      isDashboard
        ? 'py-2.5 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/90 shadow-sm'
        : isSolid 
            ? 'py-2.5 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-sm' 
            : 'py-5 bg-transparent'
    }`}>
      {isDashboard && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          {/* Sutil halo ambiental de marca */}
          <div className="absolute top-0 left-1/4 w-1/2 h-full bg-gradient-to-r from-transparent via-brand-500/[0.04] to-transparent"></div>
          {/* Micro-línea de luz superior */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 font-inter relative z-10">
        <div className="relative flex items-center justify-between h-12">
          
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center z-20">
            <Link to="/" className="flex items-center gap-2 group">
              <img
                className="h-9 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
                src={logo}
                alt="Gloint Logo"
              />
            </Link>
          </div>

          {/* Desktop Nav - Oculto si está en el Dashboard */}
          {!isDashboard ? (
            <div className="hidden md:flex items-center justify-center space-x-8 z-20 absolute left-1/2 transform -translate-x-1/2">
              <Link to="/" className={`text-sm font-semibold transition-colors duration-200 ${!isDashboard && isSolid ? 'text-slate-600 hover:text-slate-900' : 'text-white/80 hover:text-white'}`}>
                INICIO
              </Link>
              <Link to="/about" className={`text-sm font-semibold transition-colors duration-200 ${!isDashboard && isSolid ? 'text-slate-600 hover:text-slate-900' : 'text-white/80 hover:text-white'}`}>
                NOSOTROS
              </Link>

              {/* Dropdown */}
              <div className="relative" ref={serviciosMenuRef}>
                <button
                  onClick={() => setServiciosMenuOpen(!serviciosMenuOpen)}
                  className={`flex items-center gap-1.5 text-sm font-semibold transition-colors duration-200 ${!isDashboard && isSolid ? 'text-slate-600 hover:text-slate-900' : 'text-white/80 hover:text-white'}`}
                >
                  SERVICIOS
                  <ChevronDown className={`w-4 h-4 transition-transform ${serviciosMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {serviciosMenuOpen && (
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-4 w-64 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50">
                    <Can permission="chat:view">
                      <div className="py-2 px-3">
                        <ChatQuickAccess isDark={false} />
                      </div>
                    </Can>
                    <div className="p-2">
                      <Link
                        to="/investment"
                        className="block px-4 py-3 rounded-lg hover:bg-slate-50 transition-colors"
                        onClick={() => setServiciosMenuOpen(false)}
                      >
                        <div className="font-bold text-slate-900 text-sm">GLOINT Investment</div>
                        <div className="text-xs text-slate-500 mt-0.5">Oportunidades de inversión</div>
                      </Link>
                      <Link
                        to="/place"
                        className="block px-4 py-3 rounded-lg hover:bg-slate-50 transition-colors"
                        onClick={() => setServiciosMenuOpen(false)}
                      >
                        <div className="font-bold text-slate-900 text-sm">GLOINT Place</div>
                        <div className="text-xs text-slate-500 mt-0.5">Comercio y logística</div>
                      </Link>
                      <Link
                        to="/tech"
                        className="block px-4 py-3 rounded-lg hover:bg-slate-50 transition-colors"
                        onClick={() => setServiciosMenuOpen(false)}
                      >
                        <div className="font-bold text-slate-900 text-sm">GLOINT Tech</div>
                        <div className="text-xs text-slate-500 mt-0.5">Soluciones a la medida</div>
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              <Link to="/contact" className={`text-sm font-semibold transition-colors duration-200 ${!isDashboard && isSolid ? 'text-slate-600 hover:text-slate-900' : 'text-white/80 hover:text-white'}`}>
                CONTACTO
              </Link>
            </div>
          ) : isAuthenticated ? (
            <div className="hidden md:flex items-center justify-center z-20 absolute left-1/2 transform -translate-x-1/2 w-full max-w-md lg:max-w-lg px-4">
              <NavbarModuleSearch isDark={isDashboard || !isSolid} />
            </div>
          ) : null}

          {/* Actions */}
          <div className="hidden md:flex items-center space-x-3 z-20">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                {/* Balance Widget: Estilo Fintech de Alta Gama */}
                {balance !== null && (
                  <Link
                    to="/dashboard/wallet"
                    className={`group flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                      !isDashboard && isSolid
                        ? 'bg-slate-900 border-slate-700 text-white shadow-xs hover:border-brand-500/50'
                        : 'bg-slate-900/90 border-slate-700/80 hover:border-brand-500/50 text-white shadow-inner shadow-black/20 hover:bg-slate-800/90'
                    }`}
                    title="Ver mi Billetera Digital"
                  >
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500/20 to-amber-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400 group-hover:scale-105 transition-transform">
                      <Wallet className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-[8.5px] uppercase tracking-wider font-extrabold text-slate-400 font-montserrat leading-tight">
                        Saldo Disponible
                      </span>
                      <span className="font-extrabold text-[13px] tracking-tight font-montserrat text-white group-hover:text-brand-300 transition-colors">
                        {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(balance)}
                      </span>
                    </div>
                  </Link>
                )}

                {/* Campana de Notificaciones Push */}
                <NotificationBell isDark={isDashboard || !isSolid} />

                {/* Acceso Rápido al Chat */}
                <Can permission="chat:view">
                  <ChatQuickAccess isDark={isDashboard || !isSolid} />
                </Can>
                
                {/* Separador sutil */}
                <div className="h-5 w-px bg-slate-800 hidden sm:block" />

                {/* User Dropdown Capsule */}
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className={`flex items-center gap-2.5 pl-1.5 pr-2.5 py-1 rounded-xl border transition-all duration-200 cursor-pointer ${
                      !isDashboard && isSolid 
                        ? 'hover:bg-slate-100 text-slate-800 border-slate-200' 
                        : 'bg-slate-900/80 hover:bg-slate-800/90 border-slate-700/80 text-white hover:border-slate-600'
                    }`}
                  >
                    <div className="relative">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-amber-600 text-white flex items-center justify-center font-extrabold text-xs shadow-xs font-montserrat">
                        {user?.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-slate-900 absolute -bottom-0.5 -right-0.5" />
                    </div>
                    <div className="flex flex-col text-left max-w-[110px] sm:max-w-[140px]">
                      <span className="font-bold text-xs truncate leading-tight">{user?.name}</span>
                      <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider truncate">
                        {user?.is_superuser ? 'Super Admin' : (user?.roles?.[0]?.name || 'Inversionista')}
                      </span>
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${userMenuOpen ? 'rotate-180 text-brand-400' : ''}`} />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute top-full right-0 mt-2.5 w-76 bg-white border border-slate-200/90 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                      <div className="p-3.5 border-b border-slate-100 bg-slate-50/80 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-amber-600 text-white flex items-center justify-center font-extrabold text-sm shadow-xs font-montserrat shrink-0">
                          {user?.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-extrabold text-slate-900 truncate font-montserrat">{user?.name}</p>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">{user?.email}</p>
                        </div>
                      </div>

                      {/* Modo Supervisión Parental Activo */}
                      {(parentBackup || user?.parent_user_id) && (
                        <div className="p-2.5 bg-amber-50 border-b border-amber-200/70">
                          <div className="text-[10px] font-bold text-amber-900 uppercase tracking-wider mb-1 flex items-center gap-1.5 font-montserrat">
                            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                            <span>Supervisión Parental Activa</span>
                          </div>
                          <button
                            type="button"
                            onClick={handleReturnToParent}
                            disabled={isSwitching}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>Volver a mi cuenta de tutor</span>
                          </button>
                        </div>
                      )}

                      {/* Cuentas de Menores Vinculadas */}
                      {myChildren.length > 0 && (
                        <div className="p-2.5 border-b border-slate-100 bg-slate-50/40">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5 font-montserrat">
                            <Users className="w-3.5 h-3.5 text-brand-600" />
                            <span>Cuentas de Hijos ({myChildren.length})</span>
                          </div>
                          <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                            {myChildren.map((child) => (
                              <button
                                key={child.id}
                                type="button"
                                onClick={() => handleSwitchToChild(child.id)}
                                disabled={isSwitching}
                                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-brand-50 border border-slate-200 bg-white text-left transition-all cursor-pointer group"
                              >
                                <div className="min-w-0 pr-2">
                                  <div className="font-bold text-xs text-slate-800 truncate group-hover:text-brand-700">
                                    {child.name}
                                  </div>
                                  <div className="text-[10px] text-slate-400 truncate">
                                    {child.document_id ? `Doc: ${child.document_id}` : child.email}
                                  </div>
                                </div>
                                <span className="text-[10px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md shrink-0 border border-brand-200 group-hover:bg-brand-600 group-hover:text-white transition-colors">
                                  Supervisar
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="p-2 space-y-1">
                        {!isDashboard && (
                          <Link
                            to="/dashboard"
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <Activity className="w-4 h-4 text-brand-500" />
                            Ir al Dashboard
                          </Link>
                        )}
                        <Link
                          to="/dashboard/profile"
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <UserIcon className="w-4 h-4 text-brand-500" />
                          Mi Perfil
                        </Link>
                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            logout();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-50 text-rose-600 font-semibold text-xs transition-colors text-left cursor-pointer"
                        >
                          <LogOut className="w-4 h-4" />
                          Cerrar sesión
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className={`text-sm font-semibold transition-colors duration-200 ${!isDashboard && isSolid ? 'text-slate-600 hover:text-slate-900' : 'text-white/80 hover:text-white'}`}
                >
                  Iniciar sesión
                </Link>
                <Link
                  to="/onboarding"
                  className="text-sm font-bold text-white bg-brand-500 hover:bg-brand-600 px-6 py-2.5 rounded-lg shadow-sm hover:shadow transition-all duration-200 active:scale-[0.98]"
                >
                  Crear Cuenta
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2 z-20">
            {isAuthenticated && (
              <NavbarModuleSearch isDark={isDashboard || !isSolid} />
            )}

            {isDashboard && onToggleMobileSidebar && (
              <button
                type="button"
                onClick={onToggleMobileSidebar}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-brand-500 to-amber-600 text-white font-bold text-xs shadow-md active:scale-95 transition-all cursor-pointer"
              >
                <Activity className="w-4 h-4" />
                <span>Menú Principal</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className={`p-2 rounded-lg transition-colors ${isSolid ? 'text-slate-900 hover:bg-slate-100' : 'text-white hover:bg-white/10'}`}
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-white border-b border-slate-200 shadow-xl overflow-hidden animate-slideInDown">
          <div className="px-4 py-6 space-y-4">
            {!isDashboard ? (
              <>
                <Link to="/" className="block text-slate-900 font-bold text-lg border-b border-slate-100 pb-3" onClick={() => setIsOpen(false)}>Inicio</Link>
                <Link to="/about" className="block text-slate-900 font-bold text-lg border-b border-slate-100 pb-3" onClick={() => setIsOpen(false)}>Nosotros</Link>
                
                <div className="border-b border-slate-100 pb-3">
                  <span className="block text-slate-400 font-semibold text-sm mb-3">Servicios</span>
                  <div className="pl-4 space-y-3">
                    <Link to="/investment" className="block text-slate-900 font-medium" onClick={() => setIsOpen(false)}>GLOINT Investment</Link>
                    <Link to="/place" className="block text-slate-900 font-medium" onClick={() => setIsOpen(false)}>GLOINT Place</Link>
                    <Link to="/tech" className="block text-slate-900 font-medium" onClick={() => setIsOpen(false)}>GLOINT Tech</Link>
                  </div>
                </div>

                <Link to="/contact" className="block text-slate-900 font-bold text-lg border-b border-slate-100 pb-3" onClick={() => setIsOpen(false)}>Contacto</Link>
                
                <div className="pt-4 flex flex-col gap-3">
                  <Link to="/login" className="w-full py-3 text-center text-slate-900 font-bold bg-slate-50 rounded-lg border border-slate-200" onClick={() => setIsOpen(false)}>
                    Iniciar sesión
                  </Link>
                  <Link to="/onboarding" className="w-full py-3 text-center text-white font-bold bg-brand-500 rounded-lg shadow-md" onClick={() => setIsOpen(false)}>
                    Crear Cuenta
                  </Link>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500 font-semibold">Usuario Conectado</p>
                  <p className="text-base font-bold text-slate-900">{user?.name}</p>
                  <p className="text-xs text-slate-400">{user?.email}</p>
                </div>

                {onToggleMobileSidebar && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onToggleMobileSidebar();
                    }}
                    className="w-full py-3 px-4 bg-brand-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer"
                  >
                    <Activity className="w-5 h-5" />
                    <span>Ver Opciones de Gestión (Sidebar)</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    logout();
                  }}
                  className="w-full py-3 text-center text-red-600 font-bold bg-red-50 hover:bg-red-100 rounded-xl border border-red-200 transition-colors flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Cerrar sesión</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
