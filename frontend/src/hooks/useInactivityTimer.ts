import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutos

export const useInactivityTimer = () => {
    const logout = useAuthStore((state) => state.logout);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const navigate = useNavigate();
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const resetTimer = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        
        if (isAuthenticated) {
            timeoutRef.current = setTimeout(() => {
                // TODO: Mostrar un modal de advertencia en el minuto 4
                // Por ahora cerramos sesión directamente a los 5 minutos
                logout();
                navigate('/login');
            }, INACTIVITY_TIMEOUT);
        }
    };

    useEffect(() => {
        if (!isAuthenticated) return;

        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        
        // Iniciar el temporizador
        resetTimer();

        // Escuchar eventos
        events.forEach((event) => {
            document.addEventListener(event, resetTimer);
        });

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            events.forEach((event) => {
                document.removeEventListener(event, resetTimer);
            });
        };
    }, [isAuthenticated, logout, navigate]);
};
