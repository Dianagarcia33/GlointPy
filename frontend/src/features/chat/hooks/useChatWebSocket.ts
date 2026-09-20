import { useState, useEffect, useRef, useCallback } from 'react';
import { chatService, ChatMessage } from '../../../services/chatService';

export function useChatWebSocket(roomId: number | null, currentUser?: { id: number; name: string } | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const typingTimeoutsRef = useRef<{ [userName: string]: ReturnType<typeof setTimeout> }>({});

  // Cargar historial inicial vía REST al cambiar de sala
  useEffect(() => {
    if (!roomId) {
      setMessages([]);
      setTypingUsers([]);
      setLoading(false);
      return;
    }

    // Limpiar timeouts anteriores
    Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
    typingTimeoutsRef.current = {};
    setTypingUsers([]);
    setLoading(true);

    let isMounted = true;
    chatService.getRoomMessages(roomId)
      .then((history) => {
        if (isMounted) {
          setMessages(history);
          setError(null);
          setLoading(false);
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          setError(err.message || 'Error al cargar mensajes');
          setLoading(false);
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
        // Notificar al servidor que el usuario tiene la sala abierta para marcar como leído
        try {
          ws.send(JSON.stringify({ type: 'read', room_id: roomId }));
        } catch {
          // Ignorar si el socket no está listo
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'new_message') {
            if (data.sender_name) {
              setTypingUsers((prev) => prev.filter((name) => name !== data.sender_name));
            }

            // Si el mensaje entrante es de la otra persona y estamos en la sala, acusar recibo leído inmediatamente
            if (currentUser && Number(data.sender_id) !== Number(currentUser.id)) {
              try {
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({ type: 'read', room_id: roomId }));
                }
                chatService.markAsRead(roomId).catch(() => {});
              } catch {
                // Ignore
              }
            }

            setMessages((prev) => {
              if (prev.some((m) => m.id === data.id)) return prev;

              // Reemplazar mensaje optimista correspondiente si existe
              if (currentUser && Number(data.sender_id) === Number(currentUser.id)) {
                const optIndex = prev.findIndex(
                  (m) => m.id < 0 && m.content === data.content
                );
                if (optIndex > -1) {
                  const updated = [...prev];
                  const wasRead = Boolean(prev[optIndex].is_read);
                  updated[optIndex] = {
                    ...data,
                    is_read: Boolean(data.is_read || wasRead),
                    sending: false
                  };
                  return updated;
                }
              }

              return [...prev, data];
            });
          } else if (data.type === 'messages_read') {
            // Confirmación en tiempo real: los mensajes enviados ahora han sido leídos por el receptor
            setMessages((prev) =>
              prev.map((msg) =>
                msg.is_read ? msg : { ...msg, is_read: true, sending: false }
              )
            );
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
                Number(msg.id) === Number(message_id) ? { ...msg, reactions } : msg
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

    // Escuchar evento gloint:messages_read despachado por el socket global de notificaciones
    const handleGlobalRead = (event: any) => {
      const detail = event.detail;
      if (detail && Number(detail.room_id) === Number(roomId)) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.is_read ? msg : { ...msg, is_read: true, sending: false }
          )
        );
      }
    };
    window.addEventListener('gloint:messages_read', handleGlobalRead);

    return () => {
      clearTimeout(reconnectTimer);
      window.removeEventListener('gloint:messages_read', handleGlobalRead);
      Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
      typingTimeoutsRef.current = {};
      if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
        socketRef.current.close(1000);
      }
    };
  }, [roomId, currentUser?.id]);

  // Sincronización inteligente en segundo plano: mientras existan mensajes propios sin leer, verificar periódicamente
  useEffect(() => {
    if (!roomId) return;

    const myId = currentUser?.id;
    const hasUnreadSent = messages.some(
      (m) => Number(m.sender_id) === Number(myId) && !m.is_read && !m.sending
    );

    if (!hasUnreadSent) return;

    const checkReadStatus = () => {
      chatService.getRoomMessages(roomId)
        .then((fresh) => {
          setMessages((prev) => {
            const freshMap = new Map(fresh.map((m) => [m.id, Boolean(m.is_read)]));
            let changed = false;
            const next = prev.map((m) => {
              const serverIsRead = freshMap.get(m.id);
              if (serverIsRead !== undefined && serverIsRead !== Boolean(m.is_read)) {
                changed = true;
                return { ...m, is_read: serverIsRead, sending: false };
              }
              return m;
            });
            return changed ? next : prev;
          });
        })
        .catch(() => {});
    };

    const syncInterval = setInterval(checkReadStatus, 3000);
    window.addEventListener('focus', checkReadStatus);

    return () => {
      clearInterval(syncInterval);
      window.removeEventListener('focus', checkReadStatus);
    };
  }, [roomId, messages, currentUser?.id]);

  // Función para actualizar manualmente o de forma optimista las reacciones de un mensaje
  const updateMessageReactions = useCallback((messageId: number, reactions: any[]) => {
    setMessages((prev) =>
      prev.map((msg) =>
        Number(msg.id) === Number(messageId) ? { ...msg, reactions } : msg
      )
    );
  }, []);

  // Función para notificar estado de "escribiendo..."
  const sendTypingStatus = useCallback((isTyping: boolean) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'typing',
        is_typing: isTyping
      }));
    }
  }, []);

  // Función para enviar mensaje por WebSocket (con soporte de citas/respuestas y actualización optimista inmediata)
  const sendMessage = useCallback((content: string, replyToId?: number | null, replyToObj?: any) => {
    const trimmed = content.trim();
    if (!trimmed || !roomId) return;

    // Actualización optimista inmediata en la UI (0ms latencia percibida)
    const tempId = -Date.now();
    const optimisticMsg: ChatMessage = {
      id: tempId,
      room_id: roomId,
      sender_id: currentUser?.id || 0,
      sender_name: currentUser?.name || 'Yo',
      content: trimmed,
      file_url: null,
      file_name: null,
      file_type: null,
      reply_to: replyToObj || null,
      reactions: [],
      is_read: false,
      created_at: new Date().toISOString(),
      sending: true
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'message',
        content: trimmed,
        reply_to_id: replyToId || null
      }));
    } else {
      setError('Conexión perdida. Intentando reconectar...');
    }
  }, [roomId, currentUser]);

  return {
    messages,
    typingUsers,
    isConnected,
    loading,
    error,
    sendMessage,
    sendTypingStatus,
    updateMessageReactions
  };
}
