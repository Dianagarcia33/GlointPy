import { useCallback, useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { ChatMessage, getChatHistory, getEventsWebSocketUrl, sendChatMessage } from '../../../services/events';

const MAX_LENGTH = 500;
const MAX_KEPT = 300; // mensajes que se conservan en pantalla

function hour(value?: string | null): string {
  if (!value) return '';
  try {
    return new Date(value).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

/**
 * Chat en vivo de la sala (solo virtuales). Los mensajes llegan por WebSocket al instante, con nombre y apellido.
 * Al reconectar se vuelve a pedir el historial, así no se pierde nada si la red se cae.
 */
export function ChatPanel({ token, embedded = false, onChatOpenChange }: {
  token: string;
  embedded?: boolean;                          // dentro del panel con pestañas: sin marco ni título propios
  onChatOpenChange?: (open: boolean) => void;  // avisa si el equipo enciende o apaga el chat
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatOpen, setChatOpen] = useState(true);
  const [muted, setMuted] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const stickToBottom = useRef(true);
  const openRef = useRef(onChatOpenChange);
  openRef.current = onChatOpenChange;

  const loadHistory = useCallback(async () => {
    try {
      const h = await getChatHistory(token);
      setMessages(h.messages);
      setChatOpen(h.chat_open);
      openRef.current?.(h.chat_open);
      setMuted(h.muted);
    } catch (e: any) {
      setError(e?.message || 'No se pudo cargar el chat.');
    }
  }, [token]);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    const connect = () => {
      try {
        ws = new WebSocket(getEventsWebSocketUrl(`/chat/${encodeURIComponent(token)}/ws`));
      } catch {
        retry = setTimeout(connect, 5000);
        return;
      }
      ws.onopen = () => { loadHistory(); };
      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          if (data.type === 'message') {
            setMessages((prev) => (prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message].slice(-MAX_KEPT)));
          } else if (data.type === 'deleted') {
            setMessages((prev) => prev.filter((m) => m.id !== data.id));
          } else if (data.type === 'chat_state') {
            setChatOpen(!!data.chat_open);
            openRef.current?.(!!data.chat_open);
          }
        } catch {
          // mensaje que no es JSON: se ignora
        }
      };
      ws.onclose = () => { if (!closed) retry = setTimeout(connect, 3000); };
    };

    loadHistory();
    connect();
    return () => {
      closed = true;
      if (retry) clearTimeout(retry);
      ws?.close();
    };
  }, [token, loadHistory]);

  // Mantiene la vista al final mientras la persona no haya subido a leer mensajes anteriores
  useEffect(() => {
    const el = listRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const onScroll = () => {
    const el = listRef.current;
    if (el) stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    setBusy(true);
    setError(null);
    try {
      await sendChatMessage(token, value);
      setText('');
      stickToBottom.current = true;
    } catch (err: any) {
      const msg = err?.message || 'No se pudo enviar el mensaje.';
      setError(msg);
      if (msg.includes('silenci')) setMuted(true);
    } finally {
      setBusy(false);
    }
  };

  const disabled = busy || muted || !chatOpen;

  return (
    <section className={embedded ? '' : 'mt-6 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6'}>
      {!embedded && <h2 className="text-lg font-bold text-slate-900">Chat en vivo</h2>}

      <ul ref={listRef} onScroll={onScroll} aria-live="polite" aria-label="Mensajes del chat"
        className="mt-3 h-72 overflow-y-auto space-y-2 rounded-xl bg-slate-50 border border-slate-200 p-3">
        {messages.map((m) => (
          <li key={m.id} className={`text-sm break-words ${m.mine ? 'text-right' : ''}`}>
            <span className={`inline-block max-w-[85%] rounded-xl px-3 py-2 text-left ${m.mine ? 'bg-orange-100 text-slate-900' : 'bg-white border border-slate-200 text-slate-800'}`}>
              <span className="block text-[11px] font-bold text-slate-500">{m.mine ? 'Tú' : m.author} <span className="font-normal">{hour(m.created_at)}</span></span>
              {m.text}
            </span>
          </li>
        ))}
        {messages.length === 0 && <li className="text-sm text-slate-500">Aún no hay mensajes. ¡Saluda a los demás asistentes!</li>}
      </ul>

      {muted && <p className="mt-3 text-xs rounded-lg p-2.5 border bg-amber-50 border-amber-200 text-amber-800">El equipo te silenció en el chat. Puedes seguir viendo los mensajes.</p>}
      {!chatOpen && !muted && <p className="mt-3 text-xs text-slate-500">El chat no está activado en este momento.</p>}
      {error && !muted && <p role="alert" className="mt-3 text-xs rounded-lg p-2.5 border bg-red-50 border-red-200 text-red-700">{error}</p>}

      <form onSubmit={send} className="mt-3 flex gap-2">
        <label htmlFor="chat-text" className="sr-only">Escribe un mensaje</label>
        <input id="chat-text" value={text} onChange={(e) => setText(e.target.value)} maxLength={MAX_LENGTH} autoComplete="off"
          disabled={muted || !chatOpen} placeholder={muted ? 'Estás silenciado' : 'Escribe un mensaje'}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100" />
        <button type="submit" disabled={disabled || !text.trim()} aria-label="Enviar mensaje"
          className="inline-flex items-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2">
          <Send className="w-4 h-4" />Enviar
        </button>
      </form>
    </section>
  );
}
