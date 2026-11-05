import { useCallback, useEffect, useState } from 'react';
import { MessageCircleQuestion, ThumbsUp } from 'lucide-react';
import {
  AdminQuestions,
  QuestionStatus,
  getAdminQuestions,
  getEventsWebSocketUrl,
  moderateQuestion,
  setQuestionsOpen,
} from '../../../../services/events';
import { useLiveRefresh } from '../../../events/hooks/useLiveRefresh';

const TABS: { key: QuestionStatus; label: string }[] = [
  { key: 'pending', label: 'Pendientes' },
  { key: 'approved', label: 'Aprobadas' },
  { key: 'answered', label: 'Respondidas' },
  { key: 'rejected', label: 'Rechazadas' },
];

// Acciones disponibles según el estado actual de la pregunta
const ACTIONS: Record<QuestionStatus, { to: QuestionStatus; label: string; primary?: boolean }[]> = {
  pending: [{ to: 'approved', label: 'Aprobar', primary: true }, { to: 'rejected', label: 'Rechazar' }],
  approved: [{ to: 'answered', label: 'Marcar respondida', primary: true }, { to: 'rejected', label: 'Rechazar' }],
  answered: [{ to: 'approved', label: 'Volver a aprobadas' }],
  rejected: [{ to: 'pending', label: 'Volver a pendientes' }],
};

function origin(q: { attendee_type?: string | null; attendance_mode?: string | null }): string {
  const who = q.attendee_type === 'investor' ? 'Inversionista' : 'Externo';
  const how = q.attendance_mode === 'in_person' ? 'presencial' : 'virtual';
  return `${who} · ${how}`;
}

/** Moderación en vivo de las preguntas de los asistentes: aprobar, rechazar, marcar respondida. */
export function QuestionsModerationCard() {
  const [data, setData] = useState<AdminQuestions | null>(null);
  const [tab, setTab] = useState<QuestionStatus>('pending');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await getAdminQuestions());
    } catch {
      // el siguiente aviso en vivo o refresco lo reintenta
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useLiveRefresh(getEventsWebSocketUrl('/admin/questions/ws'), load, 15000, { scopes: ['questions'] });

  const run = async (action: () => Promise<AdminQuestions>) => {
    setBusy(true);
    setError(null);
    try {
      setData(await action());
    } catch (e: any) {
      setError(e?.message || 'No se pudo completar la acción.');
    } finally {
      setBusy(false);
    }
  };

  const toggleOpen = () => {
    if (!data) return;
    if (data.questions_open && !window.confirm('¿Cerrar las preguntas? Nadie podrá enviar más, pero se conservan las que ya llegaron.')) return;
    run(() => setQuestionsOpen(!data.questions_open));
  };

  const visible = (data?.questions ?? [])
    .filter((q) => q.status === tab)
    .sort((a, b) => (tab === 'approved' ? b.votes - a.votes || a.id - b.id : a.id - b.id));

  return (
    <section className="bg-white border border-slate-200 rounded-2xl shadow-xs p-5 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <MessageCircleQuestion className={`w-5 h-5 ${data?.questions_open ? 'text-orange-500' : 'text-slate-400'}`} />
          <div>
            <h2 className="text-sm font-bold text-slate-900">Preguntas de los asistentes</h2>
            <p className="text-xs text-slate-500">Moderadas: nadie las ve hasta que las apruebes. Presenciales y virtuales envían al mismo lugar.</p>
          </div>
        </div>
        <button onClick={toggleOpen} disabled={busy || !data}
          className={`rounded-xl px-4 py-2 text-xs font-bold text-white disabled:opacity-50 ${data?.questions_open ? 'bg-slate-800 hover:bg-slate-900' : 'bg-orange-500 hover:bg-orange-600'}`}>
          {data?.questions_open ? 'Cerrar preguntas' : 'Abrir preguntas'}
        </button>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist">
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
            className={`rounded-full px-3 py-1 text-xs font-bold border ${tab === t.key ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
            {t.label} ({data?.counts?.[t.key] ?? 0})
          </button>
        ))}
      </div>

      {error && <p role="alert" className="text-xs rounded-lg p-2.5 border bg-red-50 border-red-200 text-red-700">{error}</p>}

      <ul className="space-y-3">
        {visible.map((q) => (
          <li key={q.id} className="rounded-xl border border-slate-200 p-3">
            <p className="text-sm text-slate-900 break-words">{q.text}</p>
            <p className="mt-1 text-xs text-slate-500">
              {q.author} · {origin(q)}
              {q.status === 'approved' && <span className="ml-2 inline-flex items-center gap-1 font-bold text-orange-600"><ThumbsUp className="w-3 h-3" />{q.votes}</span>}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {ACTIONS[q.status].map((a) => (
                <button key={a.to} disabled={busy} onClick={() => run(() => moderateQuestion(q.id, a.to))}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-50 ${a.primary ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'border border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
                  {a.label}
                </button>
              ))}
            </div>
          </li>
        ))}
        {data && visible.length === 0 && <li className="text-sm text-slate-500">No hay preguntas en esta lista.</li>}
      </ul>
    </section>
  );
}
