import { useState, useEffect, useRef, useCallback } from 'react';
import { chatService, ChatMessage } from '../../../services/chatService';

export function useChatWebSocket(roomId: number | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  // Cargar historial inicial vía REST al cambiar de sala
  useEffect(() => {
    if (!roomId) {
      setMessages([]);
      return;
    }

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
          setMessages((prev) => [...prev, data]);
        } else if (data.error) {
          setError(data.error);
        }
      } catch (err) {
        console.error('Error al decodificar mensaje WebSocket:', err);
      }
    };

    ws.onerror = (err) => {
      setError('Error en la conexión en tiempo real');
      setIsConnected(false);
    };

    ws.onclose = (event) => {
      setIsConnected(false);
      if (event.code === 1008) {
        setError('Acceso denegado: permiso chat:view requerido');
      }
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, [roomId]);

  // Función para enviar mensaje por WebSocket
  const sendMessage = useCallback((content: string) => {
    if (!content.trim()) return;
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(content.trim());
    } else {
      setError('Conexión perdida. Intentando reconectar...');
    }
  }, []);

  return {
    messages,
    isConnected,
    error,
    sendMessage
  };
}
