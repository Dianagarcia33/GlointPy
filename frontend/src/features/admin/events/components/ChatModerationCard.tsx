import { useCallback, useEffect, useRef, useState } from 'react';
import { MessagesSquare, Trash2, VolumeX, Volume2 } from 'lucide-react';
import {
  AdminChat,
  AdminChatMessage,
  deleteChatMessage,
  getAdminChat,
  getEventsWebSocketUrl,
  muteChatAttendee,
} from '../../../../services/events';

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
  const [messages, setMessages] = useState<AdminChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const stick = useRef(true);

  const load = useCallback(async () => {
    try {
      const d: AdminChat = await getAdminChat();
      setChatOpen(d.chat_open);
      setMessages(d.messages);
    } catch {
      // el siguiente reintento lo vuelve a pedir
    }
  }, []);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    const connect = () => {
      try {
        ws = new WebSocket(getEventsWebSocketUrl('/admin/chat/ws'));
      } catch {
        retry = setTimeout(connect, 5000);
        return;
      }
      ws.onopen = () => { load(); };
      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          if (data.type === 'message') {
            setMessages((prev) => {
              if (prev.some((m) => m.id === data.message.id)) return prev;
              const muted = prev.some((m) => m.attendee_id === data.message.attendee_id && m.muted);
              return [...prev, { ...data.message, muted }].slice(-MAX_KEPT);
            });
          } else if (data.type === 'deleted') {
            setMessages((prev) => prev.filter((m) => m.id !== data.id));
          }
        } catch {
          // mensaje que no es JSON: se ignora
        }
      };
      ws.onclose = () => { if (!closed) retry = setTimeout(connect, 3000); };
    };

    load();
    connect();
    const poll = setInterval(load, 30000); // red de seguridad por si el aviso en vivo no llega
    return () => {
      closed = true;
      if (retry) clearTimeout(retry);
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
    try {
      await deleteChatMessage(m.id);
      setMessages((prev) => prev.filter((x) => x.id !== m.id));
    } catch (e: any) {
      setError(e?.message || 'No se pudo borrar el mensaje.');
    } finally {
      setBusyId(null);
    }
  };

  const toggleMute = async (m: AdminChatMessage) => {
    const next = !m.muted;
    if (next && !window.confirm(`¿Silenciar a ${m.author}? No podrá escribir en el chat hasta que le devuelvas la palabra.`)) return;
    setBusyId(m.id);
    setError(null);
    try {
      await muteChatAttendee(m.attendee_id, next);
      setMessages((prev) => prev.map((x) => (x.attendee_id === m.attendee_id ? { ...x, muted: next } : x)));
    } catch (e: any) {
      setError(e?.message || 'No se pudo cambiar el silencio.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="bg-white border border-slate-200 rounded-2xl shadow-xs p-5 sm:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <MessagesSquare className={`w-5 h-5 ${chatOpen ? 'text-orange-500' : 'text-slate-400'}`} />
        <div>
          <h2 className="text-sm font-bold text-slate-900">Chat en vivo</h2>
          <p className="text-xs text-slate-500">
            Los virtuales conversan mientras la sala está abierta. Los mensajes salen al instante; aquí puedes borrarlos o silenciar a una persona.
            {!chatOpen && ' La sala está cerrada: el chat no recibe mensajes nuevos.'}
          </p>
        </div>
      </div>

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
