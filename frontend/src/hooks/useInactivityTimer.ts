import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutos de inactividad
const STORAGE_KEY = 'gloint_last_activity_time';

export const useInactivityTimer = () => {
    const logout = useAuthStore((state) => state.logout);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const performLogout = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        localStorage.removeItem(STORAGE_KEY);
        logout();
        window.location.href = '/login';
    }, [logout]);

    const checkInactivity = useCallback((): boolean => {
        if (!isAuthenticated) return false;
        
        const lastActiveStr = localStorage.getItem(STORAGE_KEY);
        if (!lastActiveStr) {
            localStorage.setItem(STORAGE_KEY, Date.now().toString());
            return false;
        }

        const lastActive = parseInt(lastActiveStr, 10);
        const elapsed = Date.now() - lastActive;

        if (elapsed >= INACTIVITY_TIMEOUT) {
            performLogout();
            return true;
        }
        return false;
    }, [isAuthenticated, performLogout]);

    const scheduleTimer = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        if (!isAuthenticated) return;

        const lastActiveStr = localStorage.getItem(STORAGE_KEY);
        const lastActive = lastActiveStr ? parseInt(lastActiveStr, 10) : Date.now();
        const remaining = Math.max(0, INACTIVITY_TIMEOUT - (Date.now() - lastActive));

        timeoutRef.current = setTimeout(() => {
            if (checkInactivity()) return;
            performLogout();
        }, remaining || INACTIVITY_TIMEOUT);
    }, [isAuthenticated, checkInactivity, performLogout]);

    const handleUserActivity = useCallback(() => {
        // 1. Validar primero si ya expiró el tiempo real durante la ausencia
        if (checkInactivity()) return;

        // 2. Si sigue dentro del rango válido, refrescar la hora de actividad
        localStorage.setItem(STORAGE_KEY, Date.now().toString());
        scheduleTimer();
    }, [checkInactivity, scheduleTimer]);

    useEffect(() => {
        if (!isAuthenticated) {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            localStorage.removeItem(STORAGE_KEY);
            return;
        }

        // Validación inmediata al montar
        if (checkInactivity()) return;

        // Inicializar timestamp si es primera vez
        if (!localStorage.getItem(STORAGE_KEY)) {
            localStorage.setItem(STORAGE_KEY, Date.now().toString());
        }

        scheduleTimer();

        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        
        // Throttling para no saturar escrituras en localStorage
        let lastLogged = Date.now();
        const throttledActivity = () => {
            const now = Date.now();
            if (now - lastLogged > 2000) { // Actualizar máximo una vez cada 2 segundos
                lastLogged = now;
                handleUserActivity();
            }
        };

        events.forEach((event) => {
            document.addEventListener(event, throttledActivity, { passive: true });
        });

        // Eventos críticos para móviles: al desbloquear el teléfono o volver a la pestaña
        const handleVisibilityOrFocus = () => {
            if (document.visibilityState === 'visible') {
                checkInactivity();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityOrFocus);
        window.addEventListener('focus', handleVisibilityOrFocus);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            events.forEach((event) => {
                document.removeEventListener(event, throttledActivity);
            });
            document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
            window.removeEventListener('focus', handleVisibilityOrFocus);
        };
    }, [isAuthenticated, checkInactivity, scheduleTimer, handleUserActivity]);
};
