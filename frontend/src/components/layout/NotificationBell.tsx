import React, { useState, useRef, useEffect } from 'react';
import { Bell, BellOff, BellRing, Check, Loader2, Send } from 'lucide-react';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { notificationService } from '../../services/notificationService';
import { useAuthStore } from '../../store/authStore';

interface NotificationBellProps {
  isDark?: boolean;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ isDark = false }) => {
  const { permission, loading, requestPermissionAndRegister } = usePushNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleOrRequest = async () => {
    if (permission !== 'granted') {
      await requestPermissionAndRegister();
    } else {
      setIsOpen(!isOpen);
    }
  };

  const handleSendTestPush = async () => {
    if (!user) return;
    try {
      setTestSending(true);
      setTestMessage(null);
      await notificationService.sendTestPush(
        user.id,
        "¡Notificación de Prueba GLOINT!",
        "Tus notificaciones Push Web están configuradas e integradas correctamente."
      );
      setTestMessage("¡Push de prueba enviado!");
      
      // Lanzar también notificación nativa local por confirmación si está permitido
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification("¡Notificación de Prueba GLOINT!", {
          body: "Tus notificaciones Push Web están configuradas e integradas correctamente.",
          icon: "/favicon.ico"
        });
      }
    } catch (err: any) {
      setTestMessage("Error al enviar la prueba");
    } finally {
      setTestSending(false);
    }
  };

  const isGranted = permission === 'granted';
  const isDenied = permission === 'denied';

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={handleToggleOrRequest}
        disabled={loading}
        title={
          isGranted
            ? "Notificaciones Push Activas"
            : isDenied
            ? "Notificaciones bloqueadas por el navegador"
            : "Activar Notificaciones Push"
        }
        className={`relative p-2 rounded-full transition-all duration-300 flex items-center justify-center cursor-pointer ${
          isDark
            ? 'text-white/80 hover:text-white hover:bg-white/10'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        }`}
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
        ) : isGranted ? (
          <BellRing className="w-5 h-5 text-emerald-400 animate-pulse" />
        ) : isDenied ? (
          <BellOff className="w-5 h-5 text-slate-400" />
        ) : (
          <Bell className="w-5 h-5" />
        )}

        {/* Indicador visual de estado */}
        <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
          {isGranted ? (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </>
          ) : isDenied ? (
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
          ) : (
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400"></span>
          )}
        </span>
      </button>

      {/* Popover / Panel de Configuración de Notificaciones */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-3 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
            <div className="flex items-center gap-2">
              <BellRing className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-sm font-montserrat">Notificaciones Push</span>
            </div>
            <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md ${
              isGranted ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300'
            }`}>
              {isGranted ? 'Activas' : 'Inactivas'}
            </span>
          </div>

          <div className="p-4 space-y-4 text-xs text-slate-600">
            {isGranted ? (
              <div className="space-y-3">
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-2.5 text-emerald-800">
                  <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    Tu navegador está vinculado con <strong>Firebase FCM</strong>. Recibirás avisos de rendimientos y retiros.
                  </p>
                </div>

                {testMessage && (
                  <div className="p-2.5 bg-blue-50 text-blue-700 rounded-lg text-center font-medium border border-blue-100 animate-in fade-in">
                    {testMessage}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSendTestPush}
                  disabled={testSending}
                  className="w-full py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  {testSending ? (
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  ) : (
                    <Send className="w-4 h-4 text-emerald-400" />
                  )}
                  <span>{testSending ? 'Enviando Alerta...' : 'Probar Notificación Push'}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="leading-relaxed">
                  Activa las notificaciones en tu navegador para recibir alertas inmediatas sobre rendimientos pagados y estados de retiro.
                </p>
                <button
                  type="button"
                  onClick={requestPermissionAndRegister}
                  disabled={loading}
                  className="w-full py-2.5 px-3 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-brand-500/20"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
                  <span>Permitir Notificaciones</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
