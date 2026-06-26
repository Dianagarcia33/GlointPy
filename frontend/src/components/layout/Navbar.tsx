import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ChevronDown, LayoutDashboard, LogOut, Menu, X } from "lucide-react";

// TODO: Asegúrate de tener un logo en la carpeta public
const logo = '/logo.png'; 

export const Navbar: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [serviciosMenuOpen, setServiciosMenuOpen] = useState(false);
  const [serviciosMobileOpen, setServiciosMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const userMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const serviciosMenuRef = useRef<HTMLDivElement>(null);

  const isLoginPage = location.pathname === '/login';
  const isRegisterPage = location.pathname === '/register';

  // Cerrar menús cuando se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
      if (serviciosMenuRef.current && !serviciosMenuRef.current.contains(event.target as Node)) {
        setServiciosMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      setUserMenuOpen(false);
      navigate('/');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 w-full z-50 py-3 bg-slate-900/95 backdrop-blur-2xl border-b border-orange-500/10 shadow-xl transition-all duration-300">
      {/* Efectos de luz corporativos */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-24 bg-gradient-to-br from-brand-500/10 to-transparent rounded-full blur-[80px] opacity-40" />
        <div className="absolute top-0 right-1/4 w-96 h-24 bg-gradient-to-br from-brand-400/5 to-transparent rounded-full blur-[80px] opacity-30" />
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-brand-500/10 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-between h-14">

          {/* Logo */}
          <Link to="/" className="flex items-center group relative z-10">
            <img
              src={logo}
              alt="Gloint Logo"
              className="h-8 w-auto object-contain group-hover:brightness-110 transition-all duration-300"
            />
          </Link>

          {/* Nav Desktop - Centrado */}
          <div className="hidden md:flex items-center space-x-1 absolute left-1/2 transform -translate-x-1/2">
            <NavItem to="/" label="INICIO" active={location.pathname === '/'} />
            <NavItem to="/about" label="NOSOTROS" active={location.pathname === '/about'} />

            {/* Servicios dropdown */}
            <div className="relative" ref={serviciosMenuRef}>
              <button
                onClick={() => setServiciosMenuOpen(!serviciosMenuOpen)}
                onMouseEnter={() => setServiciosMenuOpen(true)}
                className={`relative px-5 text-sm font-bold tracking-wide transition-all duration-300 rounded-xl h-10 inline-flex items-center gap-1.5 ${
                  location.pathname.startsWith('/servicios')
                    ? 'text-brand-400 bg-white/5'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                SERVICIOS
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${serviciosMenuOpen ? 'rotate-180' : ''}`} />
                {location.pathname.startsWith('/servicios') && (
                  <span className="absolute bottom-1 left-5 right-5 h-0.5 bg-brand-500 rounded-full" />
                )}
              </button>

              {serviciosMenuOpen && (
                <div
                  onMouseLeave={() => setServiciosMenuOpen(false)}
                  className="absolute top-full left-0 mt-2 w-64 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 via-transparent to-blue-500/5 pointer-events-none" />
                  <div className="relative p-2">
                    <Link
                      to="/servicios/cashback-logistico"
                      className="block px-4 py-3 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200"
                      onClick={() => setServiciosMenuOpen(false)}
                    >
                      <div className="font-semibold text-sm">Cashback Logístico</div>
                      <div className="text-xs text-slate-500 mt-0.5">Recupera dinero en tus envíos</div>
                    </Link>
                    <Link
                      to="/servicios/factoring-logistico"
                      className="block px-4 py-3 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200"
                      onClick={() => setServiciosMenuOpen(false)}
                    >
                      <div className="font-semibold text-sm">Factoring Logístico</div>
                      <div className="text-xs text-slate-500 mt-0.5">Adelanto de facturas logísticas</div>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <NavItem to="/contact" label="CONTACTO" active={location.pathname === '/contact'} />
          </div>

          {/* Acciones derecha - Desktop */}
          <div className="hidden md:flex items-center gap-3 relative z-10">
            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2.5 pl-1.5 pr-2.5 py-1.5 rounded-xl bg-slate-800/40 hover:bg-slate-800/80 border border-white/5 hover:border-brand-500/30 transition-all duration-300 group"
                >
                  <div className="relative">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white font-bold text-xs shadow-lg group-hover:scale-105 transition-transform">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-slate-900 rounded-full" />
                  </div>
                  <div className="hidden lg:flex flex-col items-start mr-1">
                    <span className="text-[11px] font-bold text-slate-200 leading-none mb-1 group-hover:text-white transition-colors">
                      {user.name}
                    </span>
                    <span className="text-[9px] font-medium text-slate-500 uppercase tracking-wider leading-none">
                      Inversionista
                    </span>
                  </div>
                  <ChevronDown className={`w-3 h-3 text-slate-500 group-hover:text-slate-300 transition-all duration-300 ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown usuario */}
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-3 w-64 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 via-transparent to-blue-500/5 pointer-events-none" />
                    <div className="relative p-4">
                      {/* Info usuario */}
                      <div className="flex items-center space-x-3 pb-4 border-b border-white/5">
                        <div className="w-12 h-12 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-inner">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white font-bold truncate">{user.name}</p>
                          <p className="text-slate-500 text-[11px] truncate">{user.email}</p>
                        </div>
                      </div>

                      <div className="py-2 space-y-1">
                        <Link
                          to="/dashboard"
                          onClick={() => setUserMenuOpen(false)}
                          className="w-full flex items-center px-3 py-2 text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-all duration-200 text-left text-sm"
                        >
                          <LayoutDashboard className="w-4 h-4 mr-3 text-slate-400" />
                          Dashboard
                        </Link>

                        <div className="pt-2">
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center px-3 py-2 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200 text-left text-sm font-semibold"
                          >
                            <LogOut className="w-4 h-4 mr-3" />
                            Cerrar Sesión
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                  <Link
                    to="/login"
                    className="px-4 py-2 text-sm font-bold text-slate-300 hover:text-white hover:bg-white/5 rounded-xl border border-white/5 hover:border-brand-500/30 transition-all duration-300"
                  >
                    INICIAR SESIÓN
                  </Link>
                  <Link
                    to="/register"
                    className="px-4 py-2 text-sm font-bold bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-xl shadow-sm hover:shadow-md hover:shadow-brand-500/20 transition-all duration-300 active:scale-[0.98]"
                  >
                    REGISTRARSE
                  </Link>
              </div>
            )}
          </div>

          {/* Botón hamburguesa - Mobile */}
          <div className="md:hidden flex items-center relative z-10">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-xl bg-slate-800/40 border border-white/5 hover:border-brand-500/30 hover:bg-slate-800/80 transition-all duration-300 focus:outline-none text-white"
              aria-label="Menú"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Menu mobile */}
      {menuOpen && (
        <div ref={mobileMenuRef} className="md:hidden absolute top-full left-2 right-2 mt-2 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 via-transparent to-blue-500/5 pointer-events-none" />
          <div className="relative p-4 space-y-1">
            <MobileNavItem to="/" label="INICIO" active={location.pathname === '/'} onClick={() => setMenuOpen(false)} />
            <MobileNavItem to="/about" label="NOSOTROS" active={location.pathname === '/about'} onClick={() => setMenuOpen(false)} />

            {/* Servicios mobile */}
            <div>
              <button
                onClick={() => setServiciosMobileOpen(!serviciosMobileOpen)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold tracking-wide transition-all duration-300 hover:bg-white/5 ${
                  location.pathname.startsWith('/servicios') ? 'text-brand-400 bg-white/5' : 'text-slate-300 hover:text-white'
                }`}
              >
                <span>SERVICIOS</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${serviciosMobileOpen ? 'rotate-180' : ''}`} />
              </button>
              {serviciosMobileOpen && (
                <div className="ml-4 mt-1 space-y-1">
                  <Link to="/servicios/cashback-logistico" className="block px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all" onClick={() => setMenuOpen(false)}>
                    <div className="font-semibold text-sm">Cashback Logístico</div>
                    <div className="text-xs text-slate-600 mt-0.5">Recupera dinero en tus envíos</div>
                  </Link>
                  <Link to="/servicios/factoring-logistico" className="block px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all" onClick={() => setMenuOpen(false)}>
                    <div className="font-semibold text-sm">Factoring Logístico</div>
                    <div className="text-xs text-slate-600 mt-0.5">Adelanto de facturas logísticas</div>
                  </Link>
                </div>
              )}
            </div>

            <MobileNavItem to="/contact" label="CONTACTO" active={location.pathname === '/contact'} onClick={() => setMenuOpen(false)} />

            {/* Auth section mobile */}
            <div className="pt-3 border-t border-white/5">
              {user ? (
                <>
                  <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl mb-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-600 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-bold text-sm truncate">{user.name}</p>
                      <p className="text-slate-500 text-xs truncate">{user.email}</p>
                    </div>
                  </div>
                  <Link
                    to="/dashboard"
                    className="flex items-center justify-center px-4 py-3 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-xl font-bold text-sm transition-all duration-300 shadow-sm hover:shadow-md mb-2"
                    onClick={() => setMenuOpen(false)}
                  >
                    DASHBOARD
                  </Link>
                  <button
                    onClick={async () => { await handleLogout(); setMenuOpen(false); }}
                    className="w-full flex items-center justify-center px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl font-bold text-sm transition-all border border-red-500/20"
                  >
                    CERRAR SESIÓN
                  </button>
                </>
              ) : (
                <div className="space-y-2">
                  <Link to="/login" className="flex items-center justify-center px-4 py-3 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-xl font-bold text-sm shadow-sm" onClick={() => setMenuOpen(false)}>
                    INICIAR SESIÓN
                  </Link>
                  <Link to="/register" className="flex items-center justify-center px-4 py-3 border border-brand-500/50 text-brand-400 hover:bg-brand-500/10 rounded-xl font-bold text-sm transition-all" onClick={() => setMenuOpen(false)}>
                    REGISTRARSE
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

// Nav Item Desktop
interface NavItemProps {
  to: string;
  label: string;
  active: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ to, label, active }) => (
  <Link
    to={to}
    className={`relative px-5 text-sm font-bold tracking-wide transition-all duration-300 rounded-xl h-10 inline-flex items-center justify-center ${
      active
        ? 'text-brand-400 bg-white/5'
        : 'text-slate-300 hover:text-white hover:bg-white/5'
    }`}
  >
    {label}
    {active && <span className="absolute bottom-1.5 left-5 right-5 h-0.5 bg-brand-500 rounded-full" />}
  </Link>
);

// Nav Item Mobile
interface MobileNavItemProps {
  to: string;
  label: string;
  active: boolean;
  onClick: () => void;
}

const MobileNavItem: React.FC<MobileNavItemProps> = ({ to, label, active, onClick }) => (
  <Link
    to={to}
    className={`flex items-center px-4 py-3 rounded-xl text-sm font-bold tracking-wide transition-all duration-300 ${
      active ? 'bg-white/5 text-brand-400' : 'text-slate-300 hover:text-white hover:bg-white/5'
    }`}
    onClick={onClick}
  >
    {label}
  </Link>
);
