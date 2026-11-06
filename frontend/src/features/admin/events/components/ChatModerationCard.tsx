import { useCallback, useEffect, useRef, useState } from 'react';
import { MessagesSquare, Trash2, VolumeX, Volume2, MessageCircleQuestion } from 'lucide-react';
import {
  AdminChat,
  AdminChatMessage,
  deleteChatMessage,
  getAdminChat,
  getEventsWebSocketUrl,
  muteChatAttendee,
  promoteChatMessage,
  setChatOpen as setChatOpenApi,
} from '../../../../services/events';
import { useLatestOnly } from '../hooks/useLatestOnly';

const MAX_KEPT = 300;

function hour(value?: string | null): string {
  if (!value) return '';
  try {
    return new Date(value).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

/** Moderación en vivo del chat de la sala: ver los mensajes al instante, borrarlos y silenciar personas. */
export function ChatModerationCard() {
  const [chatOpen, setChatOpen] = useState(false);
  const [liveOpen, setLiveOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [messages, setMessages] = useState<AdminChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const stick = useRef(true);

  // Una consulta que sale antes de un mensaje nuevo (por WebSocket) o de una acción y llega después traería la lista de
  // antes y haría desaparecer ese mensaje o reaparecer uno borrado: se descarta.
  const { startRead, invalidate } = useLatestOnly();

  const load = useCallback(async () => {
    const isFresh = startRead();
    try {
      const d: AdminChat = await getAdminChat();
      if (!isFresh()) return;
      setChatOpen(d.chat_open);
      setLiveOpen(d.live_open);
      setMessages(d.messages);
    } catch {
      // el siguiente reintento lo vuelve a pedir
    }
  }, [startRead]);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let closed = false;
    let keepalive: ReturnType<typeof setInterval> | null = null;

    const connect = () => {
      try {
        ws = new WebSocket(getEventsWebSocketUrl('/admin/chat/ws'));
      } catch {
        retry = setTimeout(connect, 5000);
        return;
      }
      ws.onopen = () => {
        load();
        // Ping periódico: evita que el proxy corte la conexión por inactividad (típico a los 60 s)
        keepalive = setInterval(() => { try { ws?.send('ping'); } catch { /* se reconecta en onclose */ } }, 25000);
      };
      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          if (data.type === 'message') {
            invalidate();
            setMessages((prev) => {
              if (prev.some((m) => m.id === data.message.id)) return prev;
              const muted = prev.some((m) => m.attendee_id === data.message.attendee_id && m.muted);
              return [...prev, { ...data.message, muted }].slice(-MAX_KEPT);
            });
          } else if (data.type === 'deleted') {
            invalidate();
            setMessages((prev) => prev.filter((m) => m.id !== data.id));
          }
        } catch {
          // mensaje que no es JSON: se ignora
        }
      };
      ws.onclose = () => {
        if (keepalive) { clearInterval(keepalive); keepalive = null; }
        if (!closed) retry = setTimeout(connect, 3000 + Math.random() * 3000);
      };
    };

    load();
    connect();
    const poll = setInterval(load, 30000); // red de seguridad por si el aviso en vivo no llega
    return () => {
      closed = true;
      if (retry) clearTimeout(retry);
      if (keepalive) clearInterval(keepalive);
      clearInterval(poll);
      ws?.close();
    };
  }, [load]);

  useEffect(() => {
    const el = listRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const onScroll = () => {
    const el = listRef.current;
    if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  };

  const remove = async (m: AdminChatMessage) => {
    setBusyId(m.id);
    setError(null);
    invalidate();
    try {
      await deleteChatMessage(m.id);
      setMessages((prev) => prev.filter((x) => x.id !== m.id));
    } catch (e: any) {
      setError(e?.message || 'No se pudo borrar el mensaje.');
    } finally {
      invalidate();
      setBusyId(null);
    }
  };

  const toggleMute = async (m: AdminChatMessage) => {
    const next = !m.muted;
    if (next && !window.confirm(`¿Silenciar a ${m.author}? No podrá escribir en el chat hasta que le devuelvas la palabra.`)) return;
    setBusyId(m.id);
    setError(null);
    invalidate();
    try {
      await muteChatAttendee(m.attendee_id, next);
      setMessages((prev) => prev.map((x) => (x.attendee_id === m.attendee_id ? { ...x, muted: next } : x)));
    } catch (e: any) {
      setError(e?.message || 'No se pudo cambiar el silencio.');
    } finally {
      invalidate();
      setBusyId(null);
    }
  };

  const toggleChat = async () => {
    if (chatOpen && !window.confirm('¿Apagar el chat? Los virtuales dejarán de verlo y no podrán escribir hasta que lo vuelvas a encender.')) return;
    setSwitching(true);
    setError(null);
    invalidate();
    try {
      const d = await setChatOpenApi(!chatOpen);
      setChatOpen(d.chat_open);
      setLiveOpen(d.live_open);
    } catch (e: any) {
      setError(e?.message || 'No se pudo cambiar el estado del chat.');
    } finally {
      invalidate();
      setSwitching(false);
    }
  };

  const promote = async (m: AdminChatMessage) => {
    setBusyId(m.id);
    setError(null);
    invalidate();
    try {
      await promoteChatMessage(m.id);
      setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, is_question: true } : x)));
    } catch (e: any) {
      setError(e?.message || 'No se pudo pasar el mensaje a pregunta.');
    } finally {
      invalidate();
      setBusyId(null);
    }
  };

  return (
    <section className="bg-white border border-slate-200 rounded-2xl shadow-xs p-5 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <MessagesSquare className={`w-5 h-5 ${chatOpen && liveOpen ? 'text-orange-500' : 'text-slate-400'}`} />
          <div>
            <h2 className="text-sm font-bold text-slate-900">Chat en vivo</h2>
            <p className="text-xs text-slate-500">
              Los virtuales conversan al instante. Borra mensajes, silencia personas o pasa un mensaje a pregunta oficial.
            </p>
          </div>
        </div>
        <button onClick={toggleChat} disabled={switching}
          className={`rounded-xl px-4 py-2 text-xs font-bold text-white disabled:opacity-50 ${chatOpen ? 'bg-slate-800 hover:bg-slate-900' : 'bg-orange-500 hover:bg-orange-600'}`}>
          {chatOpen ? 'Apagar chat' : 'Encender chat'}
        </button>
      </div>
      {chatOpen && !liveOpen && (
        <p className="text-xs rounded-lg p-2.5 border bg-amber-50 border-amber-200 text-amber-800">El chat está encendido, pero la sala está cerrada: funcionará cuando abras la transmisión.</p>
      )}
      {!chatOpen && (
        <p className="text-xs rounded-lg p-2.5 border bg-slate-50 border-slate-200 text-slate-700">El chat está apagado: los virtuales solo ven las preguntas. Enciéndelo cuando haya quien lo vigile.</p>
      )}

      {error && <p role="alert" className="text-xs rounded-lg p-2.5 border bg-red-50 border-red-200 text-red-700">{error}</p>}

      <ul ref={listRef} onScroll={onScroll} aria-live="polite" aria-label="Mensajes del chat"
        className="h-96 overflow-y-auto space-y-2 rounded-xl bg-slate-50 border border-slate-200 p-3">
        {messages.map((m) => (
          <li key={m.id} className="flex items-start gap-3 rounded-lg bg-white border border-slate-200 p-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-slate-500">
                {m.author} <span className="font-normal">{hour(m.created_at)}</span>
                {m.muted && <span className="ml-2 rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 font-semibold">Silenciado</span>}
              </p>
              <p className="text-sm text-slate-900 break-words">{m.text}</p>
            </div>
            <div className="flex shrink-0 gap-1">
              <button onClick={() => promote(m)} disabled={busyId === m.id || m.is_question}
                title={m.is_question ? 'Ya es una pregunta' : 'Pasar a pregunta oficial para los presentadores'}
                aria-label={m.is_question ? 'Este mensaje ya es una pregunta' : 'Pasar a pregunta'}
                className={`p-2 rounded-lg border disabled:opacity-60 ${m.is_question ? 'border-green-300 bg-green-50 text-green-700' : 'border-slate-300 text-orange-600 hover:bg-orange-50'}`}>
                <MessageCircleQuestion className="w-4 h-4" />
              </button>
              <button onClick={() => toggleMute(m)} disabled={busyId === m.id} title={m.muted ? 'Devolver la palabra' : 'Silenciar a esta persona'}
                aria-label={m.muted ? `Devolver la palabra a ${m.author}` : `Silenciar a ${m.author}`}
                className="p-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                {m.muted ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              <button onClick={() => remove(m)} disabled={busyId === m.id} title="Borrar mensaje" aria-label="Borrar mensaje"
                className="p-2 rounded-lg border border-slate-300 text-red-600 hover:bg-red-50 disabled:opacity-50">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </li>
        ))}
        {messages.length === 0 && <li className="text-sm text-slate-500">Aún no hay mensajes.</li>}
      </ul>
    </section>
  );
}
