import { useCallback, useEffect, useState } from 'react';
import { ThumbsUp } from 'lucide-react';
import {
  AttendeeQuestion,
  AttendeeQuestions,
  getEventsWebSocketUrl,
  getMyQuestions,
  submitQuestion,
  voteQuestion,
} from '../../../services/events';
import { useLiveRefresh } from '../hooks/useLiveRefresh';

const MAX_LENGTH = 500;

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  pending: { text: 'En revisión', cls: 'bg-amber-100 text-amber-800' },
  rejected: { text: 'No aprobada', cls: 'bg-slate-200 text-slate-700' },
  answered: { text: 'Respondida', cls: 'bg-green-100 text-green-700' },
};

/**
 * Preguntas moderadas para presenciales y virtuales. Las preguntas nuevas solo las ve su autor hasta que
 * el equipo las aprueba; las aprobadas se pueden votar. Se actualiza en vivo por WebSocket.
 */
export function QuestionsPanel({ token, embedded = false, fill = false }: { token: string; embedded?: boolean; fill?: boolean }) {
  const [data, setData] = useState<AttendeeQuestions | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await getMyQuestions(token));
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'No se pudieron cargar las preguntas.' });
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);
  // Solo avisos de preguntas, con espera aleatoria: con 200 asistentes no se piden todos al servidor a la vez
  useLiveRefresh(getEventsWebSocketUrl(`/questions/${encodeURIComponent(token)}/ws`), load, 30000, { scopes: ['questions'], jitterMs: 3000 });

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await submitQuestion(token, text);
      setText('');
      setMessage({ type: 'success', text: 'Pregunta enviada. El equipo la revisará antes de mostrarla.' });
      await load();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'No se pudo enviar la pregunta.' });
    } finally {
      setBusy(false);
    }
  };

  const vote = async (q: AttendeeQuestion) => {
    try {
      await voteQuestion(token, q.id);
      await load();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'No se pudo registrar tu voto.' });
    }
  };

  return (
    <section className={embedded ? (fill ? 'flex flex-col flex-1 min-h-0' : '') : 'mt-6 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6'}>
      {!embedded && <h2 className="text-lg font-bold text-slate-900">Preguntas</h2>}

      {data && !data.questions_open && (
        <p className="mt-2 text-sm text-slate-600">Las preguntas no están abiertas en este momento. Cuando se habiliten aparecerán aquí.</p>
      )}

      {data?.questions_open && (
        <form onSubmit={send} className="mt-3 shrink-0">
          <label htmlFor="question-text" className="sr-only">Tu pregunta</label>
          <textarea id="question-text" value={text} onChange={(e) => setText(e.target.value)} maxLength={MAX_LENGTH} rows={3}
            placeholder="Escribe tu pregunta para los presentadores"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-400">{text.length}/{MAX_LENGTH}</span>
            <button type="submit" disabled={busy || text.trim().length < 5}
              className="rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2">
              Enviar pregunta
            </button>
          </div>
        </form>
      )}

      {message && (
        <p role="status" className={`mt-3 shrink-0 text-xs rounded-lg p-2.5 border ${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {message.text}
        </p>
      )}

      <ul className={`mt-4 space-y-3 ${fill ? 'flex-1 min-h-0 overflow-y-auto' : ''}`}>
        {data?.questions.map((q) => {
          const badge = STATUS_LABEL[q.status];
          return (
            <li key={q.id} className="rounded-xl border border-slate-200 p-3 flex gap-3">
              {q.status === 'approved' ? (
                <button onClick={() => vote(q)} aria-pressed={q.voted} aria-label={q.voted ? 'Quitar voto' : 'Votar esta pregunta'}
                  className={`shrink-0 flex flex-col items-center justify-center w-12 rounded-lg border text-xs font-bold ${q.voted ? 'bg-orange-500 border-orange-500 text-white' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
                  <ThumbsUp className="w-4 h-4" />{q.votes}
                </button>
              ) : (
                <div className="shrink-0 flex flex-col items-center justify-center w-12 rounded-lg bg-slate-50 text-xs font-bold text-slate-500">
                  <ThumbsUp className="w-4 h-4" />{q.votes}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm text-slate-900 break-words">{q.text}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {q.mine ? 'Tú' : q.author}
                  {badge && <span className={`ml-2 rounded-full px-2 py-0.5 font-semibold ${badge.cls}`}>{badge.text}</span>}
                </p>
              </div>
            </li>
          );
        })}
        {data && data.questions.length === 0 && data.questions_open && (
          <li className="text-sm text-slate-500">Aún no hay preguntas. ¡Sé la primera persona en preguntar!</li>
        )}
      </ul>
    </section>
  );
}
