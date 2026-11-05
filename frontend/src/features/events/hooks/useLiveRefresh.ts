import { useEffect, useRef } from 'react';

/**
 * Llama a `refresh` cada vez que el WebSocket avisa un cambio. Reconecta solo si se cae y,
 * como red de seguridad, refresca cada `fallbackMs` por si el aviso en vivo no llega.
 */
export function useLiveRefresh(wsUrl: string | null, refresh: () => void, fallbackMs = 20000) {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    if (!wsUrl) return;
    let ws: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    const connect = () => {
      try {
        ws = new WebSocket(wsUrl);
      } catch {
        retry = setTimeout(connect, 5000);
        return;
      }
      ws.onmessage = () => refreshRef.current();
      ws.onclose = () => { if (!closed) retry = setTimeout(connect, 3000); };
    };
    connect();
    const poll = setInterval(() => refreshRef.current(), fallbackMs);

    return () => {
      closed = true;
      if (retry) clearTimeout(retry);
      clearInterval(poll);
      ws?.close();
    };
  }, [wsUrl, fallbackMs]);
}
