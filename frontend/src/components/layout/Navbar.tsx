import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ChevronDown, Activity, ChevronRight, Wallet, LogOut, User as UserIcon } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { walletService } from '../../features/dashboard/api/walletService';

const logo = "/logo.png";

export const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [serviciosMenuOpen, setServiciosMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [balance, setBalance] = useState<number | null>(0); // Forzado a 0 desde el inicio
  const location = useLocation();
  const serviciosMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const { isAuthenticated, user, logout } = useAuthStore();

  useEffect(() => {
    // COMENTAMOS LA LLAMADA A LA API TEMPORALMENTE
    // if (isAuthenticated) {
    //   walletService.getMyBalance()
    //     .then((res) => setBalance(res.balance))
    //     .catch((e) => {
    //       console.error(e);
    //       setBalance(0); 
    //     });
    // }
  }, [isAuthenticated]);

  // Es sólido si el usuario hizo scroll, o si la página NO tiene un encabezado oscuro
  const isDarkTopPage = ['/', '/login', '/register'].includes(location.pathname);
  const isSolid = scrolled || !isDarkTopPage;

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
    <nav className={`fixed top-0 left-0 right-0 w-full z-50 transition-all duration-300 ${
      isSolid ? 'py-3 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm' : 'py-5 bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 font-inter">
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

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center justify-center space-x-8 z-20 absolute left-1/2 transform -translate-x-1/2">
            <Link to="/" className={`text-sm font-semibold transition-colors duration-200 ${isSolid ? 'text-slate-600 hover:text-slate-900' : 'text-white/80 hover:text-white'}`}>
              INICIO
            </Link>
            <Link to="/about" className={`text-sm font-semibold transition-colors duration-200 ${isSolid ? 'text-slate-600 hover:text-slate-900' : 'text-white/80 hover:text-white'}`}>
              NOSOTROS
            </Link>

            {/* Dropdown */}
            <div className="relative" ref={serviciosMenuRef}>
              <button
                onClick={() => setServiciosMenuOpen(!serviciosMenuOpen)}
                className={`flex items-center gap-1.5 text-sm font-semibold transition-colors duration-200 ${isSolid ? 'text-slate-600 hover:text-slate-900' : 'text-white/80 hover:text-white'}`}
              >
                SERVICIOS
                <ChevronDown className={`w-4 h-4 transition-transform ${serviciosMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {serviciosMenuOpen && (
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-4 w-64 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50">
                  <div className="p-2">
                    <Link
                      to="/servicios/cashback-logistico"
                      className="block px-4 py-3 rounded-lg hover:bg-slate-50 transition-colors"
                      onClick={() => setServiciosMenuOpen(false)}
                    >
                      <div className="font-bold text-slate-900 text-sm">Cashback Logístico</div>
                      <div className="text-xs text-slate-500 mt-0.5">Liquidez rápida para envíos</div>
                    </Link>
                    <Link
                      to="/servicios/factoring-logistico"
                      className="block px-4 py-3 rounded-lg hover:bg-slate-50 transition-colors"
                      onClick={() => setServiciosMenuOpen(false)}
                    >
                      <div className="font-bold text-slate-900 text-sm">Factoring Logístico</div>
                      <div className="text-xs text-slate-500 mt-0.5">Adelanto de facturas</div>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <Link to="/contact" className={`text-sm font-semibold transition-colors duration-200 ${isSolid ? 'text-slate-600 hover:text-slate-900' : 'text-white/80 hover:text-white'}`}>
              CONTACTO
            </Link>
          </div>

          {/* Actions */}
          <div className="hidden md:flex items-center space-x-4 z-20">
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                {/* Balance */}
                {balance !== null && (
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors duration-200 ${
                    isSolid 
                      ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100' 
                      : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                  }`}>
                    <Wallet className="w-4 h-4" />
                    <span className="font-bold text-sm">
                      {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(balance)}
                    </span>
                  </div>
                )}
                
                {/* User Dropdown */}
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors duration-200 ${
                      isSolid ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-white/10 text-white'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      isSolid ? 'bg-brand-500 text-white' : 'bg-white text-brand-600'
                    }`}>
                      {user?.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-semibold text-sm max-w-[120px] truncate">{user?.name}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50">
                      <div className="p-2">
                        <Link
                          to="/dashboard"
                          className="flex items-center gap-2 px-4 py-2.5 rounded-lg hover:bg-slate-50 text-slate-700 font-medium text-sm transition-colors"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Activity className="w-4 h-4" />
                          Dashboard
                        </Link>
                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            logout();
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg hover:bg-red-50 text-red-600 font-medium text-sm transition-colors text-left"
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
                  className={`text-sm font-semibold transition-colors duration-200 ${isSolid ? 'text-slate-600 hover:text-slate-900' : 'text-white/80 hover:text-white'}`}
                >
                  Iniciar sesión
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-bold text-white bg-brand-500 hover:bg-brand-600 px-6 py-2.5 rounded-lg shadow-sm hover:shadow transition-all duration-200 active:scale-[0.98]"
                >
                  Crear Cuenta
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center z-20">
            <button
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
            <Link to="/" className="block text-slate-900 font-bold text-lg border-b border-slate-100 pb-3">Inicio</Link>
            <Link to="/about" className="block text-slate-900 font-bold text-lg border-b border-slate-100 pb-3">Nosotros</Link>
            
            <div className="border-b border-slate-100 pb-3">
              <span className="block text-slate-400 font-semibold text-sm mb-3">Servicios</span>
              <div className="pl-4 space-y-3">
                <Link to="/servicios/cashback-logistico" className="block text-slate-900 font-medium">Cashback Logístico</Link>
                <Link to="/servicios/factoring-logistico" className="block text-slate-900 font-medium">Factoring Logístico</Link>
              </div>
            </div>

            <Link to="/contact" className="block text-slate-900 font-bold text-lg border-b border-slate-100 pb-3">Contacto</Link>
            
            <div className="pt-4 flex flex-col gap-3">
              <Link to="/login" className="w-full py-3 text-center text-slate-900 font-bold bg-slate-50 rounded-lg border border-slate-200">
                Iniciar sesión
              </Link>
              <Link to="/register" className="w-full py-3 text-center text-white font-bold bg-brand-500 rounded-lg shadow-md">
                Crear Cuenta
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};
