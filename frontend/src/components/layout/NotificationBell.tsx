import React, { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck, Loader2, TrendingUp, Landmark, Wallet, AlertCircle, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { notificationService, UserNotificationItem } from '../../services/notificationService';
import { useAuthStore } from '../../store/authStore';

interface NotificationBellProps {
  isDark?: boolean;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ isDark = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<UserNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const fetchUserNotifications = async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const res = await notificationService.getMyNotifications(20);
      setNotifications(res.notifications || []);
      setUnreadCount(res.unread_count || 0);
    } catch (err) {
      console.error('Error al cargar notificaciones:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchUserNotifications();
      // Polling sutil cada 60 segundos
      const interval = setInterval(fetchUserNotifications, 60000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (!isOpen) {
      fetchUserNotifications();
    }
    setIsOpen(!isOpen);
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error al marcar todas como leídas:', err);
    }
  };

  const handleItemClick = async (item: UserNotificationItem) => {
    if (!item.is_read) {
      try {
        await notificationService.markRead(item.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Error al marcar notificación como leída:', err);
      }
    }
    setIsOpen(false);
    if (item.link) {
      navigate(item.link);
    }
  };

  const renderIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'rendimiento':
        return <TrendingUp className="w-4 h-4 text-emerald-500" />;
      case 'retiro':
        return <Landmark className="w-4 h-4 text-amber-500" />;
      case 'deposito':
        return <Wallet className="w-4 h-4 text-blue-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-brand-500" />;
    }
  };

  const getRelativeTime = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSeconds < 60) return 'Hace un momento';
    if (diffSeconds < 3600) return `Hace ${Math.floor(diffSeconds / 60)} min`;
    if (diffSeconds < 86400) return `Hace ${Math.floor(diffSeconds / 3600)} h`;
    return date.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={handleToggle}
        title="Buzón de Notificaciones"
        className={`relative p-2 rounded-full transition-all duration-300 flex items-center justify-center cursor-pointer ${
          isDark
            ? 'text-white/80 hover:text-white hover:bg-white/10'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        }`}
      >
        <Bell className="w-5 h-5" />

        {/* Contador de Notificaciones No Leídas */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center border-2 border-white shadow-xs animate-bounce">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover / Buzón de Notificaciones Recibidas */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-3 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-brand-400" />
              <span className="font-bold text-sm font-montserrat">Notificaciones</span>
              {unreadCount > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                  {unreadCount} nuevas
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs font-semibold text-slate-300 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                title="Marcar todas como leídas"
              >
                <CheckCheck className="w-3.5 h-3.5 text-brand-400" />
                <span>Marcar leídas</span>
              </button>
            )}
          </div>

          {/* Listado de Notificaciones */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {loading && notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
                <span className="text-xs font-medium">Cargando notificaciones...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-bold text-slate-800">Buzón al día</p>
                <p className="text-xs text-slate-400 mt-1">No tienes notificaciones recibidas por ahora.</p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`p-3.5 transition-colors cursor-pointer flex items-start gap-3 group ${
                    !item.is_read ? 'bg-brand-50/50 hover:bg-brand-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs ${
                    !item.is_read ? 'bg-white border border-slate-200' : 'bg-slate-100'
                  }`}>
                    {renderIcon(item.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline gap-2">
                      <p className={`text-xs truncate ${!item.is_read ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                        {item.title}
                      </p>
                      <span className="text-[10px] text-slate-400 flex-shrink-0">
                        {getRelativeTime(item.created_at)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed mt-0.5 line-clamp-2">
                      {item.message}
                    </p>

                    {item.link && (
                      <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-brand-600 mt-1 group-hover:underline">
                        <span>Ver detalles</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </span>
                    )}
                  </div>

                  {!item.is_read && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0 mt-2" title="No leída" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
            <span className="text-[11px] text-slate-400 font-medium">
              Notificaciones de Rendimientos, Retiros y Plataforma GLOINT
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
