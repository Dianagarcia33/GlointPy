import { useEffect, useRef } from 'react';
import { chatService } from '../services/chatService';
import { useAuthStore } from '../store/authStore';
import { useLocation } from 'react-router-dom';

// Usamos un bip generado sintéticamente con AudioContext para que suene
// bonito sin necesidad de cargar dependencias o archivos mp3 externos.
const playBeep = () => {
    try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        oscillator.frequency.exponentialRampToValueAtTime(880.00, audioCtx.currentTime + 0.1); // A5
        
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
        console.warn('AudioContext no soportado o bloqueado');
    }
};

export const useGlobalNotifications = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const location = useLocation();
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Pedir permisos de notificaciones de escritorio al cargar
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    let reconnectTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      const wsUrl = chatService.getGlobalWebSocketUrl();
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        console.log('✅ Global Notifications WebSocket Connected');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'chat_notification' || data.type === 'new_room') {
            // Notificar a toda la aplicación (en especial a ChatPage) que la lista de chats cambió
            window.dispatchEvent(new CustomEvent('gloint:chat_updated', { detail: data }));

            if (data.type === 'chat_notification') {
              const roomId = data.room_id;
              const message = data.message;
              
              // Verificar si el usuario ya está en esa sala de chat
              const isCurrentlyInRoom = location.pathname.includes('/dashboard/chat') && 
                                        location.search.includes(`room=${roomId}`);

              if (!isCurrentlyInRoom) {
                // 1. Reproducir sonido
                playBeep();

                // 2. Mostrar notificación de escritorio
                if ('Notification' in window && Notification.permission === 'granted') {
                  const title = `💬 Nuevo mensaje de ${message.sender_name}`;
                  const body = message.content || '📎 Archivo adjunto';
                  
                  const notification = new Notification(title, {
                    body,
                    icon: '/logo192.png',
                    tag: `chat-room-${roomId}`
                  });

                  notification.onclick = () => {
                    window.focus();
                    window.location.href = `/dashboard/chat?room=${roomId}`;
                  };
                }
              }
            } else if (data.type === 'new_room') {
              playBeep();
            }
          }
        } catch (err) {
          console.error('Error procesando notificación global:', err);
        }
      };

      ws.onclose = (event) => {
        if (event.code !== 1000 && event.code !== 1008) {
          reconnectTimer = setTimeout(connect, 5000);
        }
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
        socketRef.current.close(1000);
      }
    };
  }, [isAuthenticated, location.pathname, location.search]);

  return null;
};
