import { useState, useEffect } from 'react';
import { notificationService } from '../services/notificationService';
import { useAuthStore } from '../store/authStore';

export const usePushNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const requestPermissionAndRegister = async () => {
    if (!('Notification' in window)) {
      console.warn('Este navegador no soporta notificaciones de escritorio.');
      return null;
    }

    try {
      setLoading(true);
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm === 'granted') {
        // Generar un token único local / FCM simulado para entorno de desarrollo/web
        let currentToken = localStorage.getItem('gloint_fcm_token');
        if (!currentToken) {
          currentToken = `web_fcm_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;
          localStorage.setItem('gloint_fcm_token', currentToken);
        }
        
        setToken(currentToken);

        if (isAuthenticated) {
          await notificationService.registerToken(currentToken, 'web');
          console.log('Token FCM Web registrado exitosamente en el backend.');
        }
        return currentToken;
      }
    } catch (error) {
      console.error('Error al solicitar permiso de notificaciones:', error);
    } finally {
      setLoading(false);
    }
    return null;
  };

  useEffect(() => {
    if (isAuthenticated && permission === 'granted') {
      const existingToken = localStorage.getItem('gloint_fcm_token');
      if (existingToken) {
        notificationService.registerToken(existingToken, 'web').catch((err) => {
          console.error('Error al sincronizar token FCM:', err);
        });
      }
    }
  }, [isAuthenticated, permission]);

  return {
    permission,
    loading,
    token,
    requestPermissionAndRegister
  };
};
