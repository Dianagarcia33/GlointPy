import { useEffect, useRef } from 'react';

const KEEPALIVE_MS = 25000; // un ping periódico evita que el proxy corte la conexión por inactividad (típico a los 60 s)

interface LiveRefreshOptions {
  /** Solo se recarga con avisos de estos ámbitos (por ejemplo ['questions']); sin esto, con cualquier aviso. */
  scopes?: string[];
  /** Espera aleatoria (0–jitterMs) antes de recargar: 200 asistentes no piden al servidor en el mismo instante. */
  jitterMs?: number;
}

/**
 * Llama a `refresh` cuando el WebSocket avisa un cambio que le importa. Los avisos seguidos se juntan en una sola
 * recarga, reconecta solo si se cae (con una espera aleatoria, para que no se reconecten todos a la vez) y, como red
 * de seguridad, refresca cada `fallbackMs` por si el aviso en vivo no llega.
 */
export function useLiveRefresh(wsUrl: string | null, refresh: () => void, fallbackMs = 20000, options: LiveRefreshOptions = {}) {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  const scopesKey = (options.scopes ?? []).join(',');
  const jitterMs = options.jitterMs ?? 0;

  useEffect(() => {
    if (!wsUrl) return;
    const scopes = scopesKey ? scopesKey.split(',') : [];
    let ws: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let keepalive: ReturnType<typeof setInterval> | null = null;
    let waiting: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    // Si ya hay una recarga en espera, el aviso nuevo se junta con ella (no se encolan 20 recargas)
    const scheduleRefresh = () => {
      if (waiting) return;
      waiting = setTimeout(() => { waiting = null; refreshRef.current(); }, jitterMs > 0 ? Math.random() * jitterMs : 0);
    };

    const connect = () => {
      try {
        ws = new WebSocket(wsUrl);
      } catch {
        retry = setTimeout(connect, 5000 + Math.random() * 3000);
        return;
      }
      ws.onopen = () => {
        keepalive = setInterval(() => { try { ws?.send('ping'); } catch { /* se reconecta en onclose */ } }, KEEPALIVE_MS);
      };
      ws.onmessage = (ev) => {
        if (scopes.length) {
          try {
            const data = JSON.parse(ev.data);
            if (data?.scope && !scopes.includes(data.scope)) return; // aviso de otro tema: no recarga
          } catch {
            // mensaje sin formato conocido: se recarga por precaución
          }
        }
        scheduleRefresh();
      };
      ws.onclose = () => {
        if (keepalive) { clearInterval(keepalive); keepalive = null; }
        if (!closed) retry = setTimeout(connect, 3000 + Math.random() * 3000);
      };
    };
    connect();

    // Red de seguridad: refresco periódico, con arranque escalonado para que los clientes no coincidan
    let poll: ReturnType<typeof setInterval> | null = null;
    const pollStart = setTimeout(() => { poll = setInterval(() => refreshRef.current(), fallbackMs); }, Math.random() * Math.min(fallbackMs, 10000));

    return () => {
      closed = true;
      if (retry) clearTimeout(retry);
      if (keepalive) clearInterval(keepalive);
      if (waiting) clearTimeout(waiting);
      clearTimeout(pollStart);
      if (poll) clearInterval(poll);
      ws?.close();
    };
  }, [wsUrl, fallbackMs, scopesKey, jitterMs]);
}
