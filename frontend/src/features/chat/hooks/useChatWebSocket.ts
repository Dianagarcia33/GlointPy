import { useState, useEffect, useRef, useCallback } from 'react';
import { chatService, ChatMessage } from '../../../services/chatService';

export function useChatWebSocket(roomId: number | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const typingTimeoutsRef = useRef<{ [userName: string]: ReturnType<typeof setTimeout> }>({});

  // Cargar historial inicial vía REST al cambiar de sala
  useEffect(() => {
    if (!roomId) {
      setMessages([]);
      setTypingUsers([]);
      return;
    }

    // Limpiar timeouts anteriores
    Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
    typingTimeoutsRef.current = {};
    setTypingUsers([]);

    let isMounted = true;
    chatService.getRoomMessages(roomId)
      .then((history) => {
        if (isMounted) {
          setMessages(history);
          setError(null);
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          setError(err.message || 'Error al cargar mensajes');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [roomId]);

  // Conectar WebSocket para mensajes en tiempo real
  useEffect(() => {
    if (!roomId) return;

    let reconnectTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      const wsUrl = chatService.getWebSocketUrl(roomId);
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'new_message') {
            if (data.sender_name) {
              setTypingUsers((prev) => prev.filter((name) => name !== data.sender_name));
            }
            setMessages((prev) => {
              if (prev.some((m) => m.id === data.id)) return prev;
              return [...prev, data];
            });
          } else if (data.type === 'user_typing') {
            const { user_name, is_typing } = data;
            if (user_name) {
              if (is_typing) {
                setTypingUsers((prev) => Array.from(new Set([...prev, user_name])));
                if (typingTimeoutsRef.current[user_name]) {
                  clearTimeout(typingTimeoutsRef.current[user_name]);
                }
                typingTimeoutsRef.current[user_name] = setTimeout(() => {
                  setTypingUsers((prev) => prev.filter((n) => n !== user_name));
                  delete typingTimeoutsRef.current[user_name];
                }, 3500);
              } else {
                if (typingTimeoutsRef.current[user_name]) {
                  clearTimeout(typingTimeoutsRef.current[user_name]);
                  delete typingTimeoutsRef.current[user_name];
                }
                setTypingUsers((prev) => prev.filter((n) => n !== user_name));
              }
            }
          } else if (data.type === 'message_reaction') {
            const { message_id, reactions } = data;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === message_id ? { ...msg, reactions } : msg
              )
            );
          } else if (data.error) {
            setError(data.error);
          }
        } catch (err) {
          console.error('Error al decodificar mensaje WebSocket:', err);
        }
      };

      ws.onerror = () => {
        setIsConnected(false);
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        if (event.code === 1008) {
          setError('Acceso denegado: permiso chat:view requerido');
        } else if (event.code !== 1000) {
          reconnectTimer = setTimeout(connect, 3000);
        }
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
      typingTimeoutsRef.current = {};
      if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
        socketRef.current.close(1000);
      }
    };
  }, [roomId]);

  // Función para notificar estado de "escribiendo..."
  const sendTypingStatus = useCallback((isTyping: boolean) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'typing',
        is_typing: isTyping
      }));
    }
  }, []);

  // Función para enviar mensaje por WebSocket (con soporte de citas/respuestas)
  const sendMessage = useCallback((content: string, replyToId?: number | null) => {
    if (!content.trim()) return;
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'message',
        content: content.trim(),
        reply_to_id: replyToId || null
      }));
    } else {
      setError('Conexión perdida. Intentando reconectar...');
    }
  }, []);

  return {
    messages,
    typingUsers,
    isConnected,
    error,
    sendMessage,
    sendTypingStatus
  };
}
