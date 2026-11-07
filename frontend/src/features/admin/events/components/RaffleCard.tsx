import { useCallback, useEffect, useState } from 'react';
import { Gift } from 'lucide-react';
import {
  RaffleAdminData,
  RaffleAdminItem,
  RaffleQuestion,
  addRaffleQuestion,
  closeRaffleQuestion,
  createRaffle,
  deleteRaffle,
  deleteRaffleQuestion,
  drawRaffle,
  getAdminRaffle,
  getEventsWebSocketUrl,
  openRaffleQuestion,
  resetRaffle,
  startRaffle,
} from '../../../../services/events';
import { DECK_QUESTIONS } from './raffleDeckQuestions';
import { useLatestOnly } from '../hooks/useLatestOnly';
import { useLiveRefresh } from '../../../events/hooks/useLiveRefresh';

const LETTERS = ['A', 'B', 'C', 'D'];
const DURATIONS = [15, 20, 30, 45, 60, 90, 120];
const STATUS_LABEL: Record<RaffleAdminItem['status'], string> = { draft: 'Preparando', running: 'En curso', finished: 'Terminada' };
const STATUS_STYLE: Record<RaffleAdminItem['status'], string> = {
  draft: 'bg-slate-100 text-slate-700', running: 'bg-green-100 text-green-800', finished: 'bg-orange-100 text-orange-800',
};
const Q_LABEL: Record<RaffleQuestion['status'], string> = { draft: 'Lista', open: 'Abierta', closed: 'Cerrada' };
const Q_STYLE: Record<RaffleQuestion['status'], string> = {
  draft: 'bg-slate-100 text-slate-700', open: 'bg-green-100 text-green-800', closed: 'bg-slate-200 text-slate-600',
};

/** Formulario para agregar una pregunta (opción múltiple, una correcta y su tiempo) a una rifa. */
function QuestionForm({ disabled, onAdd }: { disabled: boolean; onAdd: (q: string, options: string[], correct: number, seconds: number) => Promise<void> }) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [correct, setCorrect] = useState(0);
  const [seconds, setSeconds] = useState(30);

  const valid = question.trim() && options.every((o) => o.trim());
  const submit = async () => {
    await onAdd(question, options, correct, seconds);
    setQuestion('');
    setOptions(['', '']);
    setCorrect(0);
  };
  const removeOption = (i: number) => {
    setOptions((o) => (o.length > 2 ? o.filter((_, j) => j !== i) : o));
    setCorrect((c) => (c === i ? 0 : c > i ? c - 1 : c));
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
      <p className="text-xs font-bold text-slate-700">Nueva pregunta</p>
      <input value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={300} placeholder="Pregunta que hará el presentador"
        aria-label="Pregunta de la rifa" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      {options.map((opt, i) => (
        <div key={i} className="flex items-center gap-2">
          <input type="radio" name="raffle-correct" checked={correct === i} onChange={() => setCorrect(i)}
            aria-label={`Marcar la opción ${LETTERS[i]} como correcta`} className="shrink-0" />
          <span className="w-5 text-xs font-bold text-slate-500">{LETTERS[i]}</span>
          <input value={opt} onChange={(e) => setOptions((o) => o.map((x, j) => (j === i ? e.target.value : x)))} maxLength={120}
            placeholder={`Opción ${LETTERS[i]}`} aria-label={`Opción ${LETTERS[i]}`} className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
          {options.length > 2 && (
            <button type="button" onClick={() => removeOption(i)} className="text-xs text-slate-400 hover:text-red-600" aria-label={`Quitar la opción ${LETTERS[i]}`}>✕</button>
          )}
        </div>
      ))}
      <p className="text-[11px] text-slate-500">El círculo marca la respuesta correcta. Quien falle o no responda en el tiempo queda eliminado.</p>
      <div className="flex flex-wrap items-center gap-2">
        {options.length < 4 && (
          <button type="button" onClick={() => setOptions((o) => [...o, ''])}
            className="rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold px-3 py-1.5">Agregar opción</button>
        )}
        <label className="text-xs text-slate-600 flex items-center gap-1.5">
          Tiempo
          <select value={seconds} onChange={(e) => setSeconds(Number(e.target.value))} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs">
            {DURATIONS.map((d) => <option key={d} value={d}>{d} s</option>)}
          </select>
        </label>
        <button onClick={submit} disabled={disabled || !valid}
          className="rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-4 py-1.5 disabled:opacity-50">Agregar pregunta</button>
      </div>
    </div>
  );
}

/**
 * Rifa por eliminación: la bolsa son los presenciales que ya entraron al evento. El equipo crea las preguntas, las lanza
 * una a una y, al cerrar cada una (se acaba el tiempo o la cierra el equipo), queda eliminado quien falló o no respondió.
 * Al final gana el último en pie o se sortea entre quienes siguen.
 */
export function RaffleCard() {
  const [data, setData] = useState<RaffleAdminData | null>(null);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { startRead, invalidate } = useLatestOnly();

  const load = useCallback(async () => {
    const isFresh = startRead();
    try {
      const d = await getAdminRaffle();
      if (isFresh()) setData(d);
    } catch {
      // el siguiente aviso en vivo o refresco lo reintenta
    }
  }, [startRead]);

  useEffect(() => { load(); }, [load]);
  useLiveRefresh(getEventsWebSocketUrl('/raffle/ws'), load, 5000);

  const run = async (action: () => Promise<RaffleAdminData | void>, ok?: string) => {
    setBusy(true);
    setMessage(null);
    invalidate();
    try {
      const d = await action();
      if (d) setData(d);
      if (ok) setMessage({ type: 'success', text: ok });
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'No se pudo completar la acción.' });
    } finally {
      invalidate();
      setBusy(false);
    }
  };

  const screenUrl = `${window.location.origin}/rifa/pantalla`;

  return (
    <section className="bg-white border border-slate-200 rounded-2xl shadow-xs p-5 sm:p-6 space-y-5 xl:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Gift className="w-5 h-5 text-orange-500" />
          <div>
            <h2 className="text-sm font-bold text-slate-900">Rifa por eliminación</h2>
            <p className="text-xs text-slate-500">
              Participan los presenciales que ya entraron al evento{data ? ` (ahora hay ${data.eligible_now})` : ''}. Cada ronda es una pregunta que responden
              desde su enlace personal: quien falla o no responde sale, hasta quedar el ganador. En pantalla aparecen como «Nombre I.».
            </p>
          </div>
        </div>
        <a href={screenUrl} target="_blank" rel="noopener noreferrer"
          className="rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-3 py-2">Abrir pantalla del presentador</a>
      </div>

      {message && (
        <p role="status" className={`text-xs rounded-lg p-2.5 border ${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {message.text}
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} placeholder="Nombre de la rifa o premio (ej. Tablet)"
          aria-label="Nombre de la rifa" className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <button onClick={() => run(async () => { const d = await createRaffle(title); setTitle(''); return d; }, 'Rifa creada. Agrega sus preguntas y pulsa «Iniciar rifa» cuando estén listos.')}
          disabled={busy || !title.trim()}
          className="rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-4 py-2 disabled:opacity-50">Crear rifa</button>
      </div>

      <div className="space-y-5">
        {data?.raffles.map((r) => {
          const openQ = r.questions.find((q) => q.status === 'open');
          return (
            <div key={r.id} className="rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <span className={`inline-block text-[10px] font-bold rounded-full px-2 py-0.5 ${STATUS_STYLE[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                  <h3 className="mt-1 text-sm font-bold text-slate-900">{r.title}</h3>
                  {r.status !== 'draft' && <p className="text-xs text-slate-500">En juego: <strong className="text-slate-800">{r.remaining}</strong> de {r.total}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {r.status === 'draft' && (
                    <button onClick={() => run(() => startRaffle(r.id), 'Rifa iniciada: ya puedes lanzar la primera pregunta.')} disabled={busy || (data?.eligible_now ?? 0) < 2}
                      title={(data?.eligible_now ?? 0) < 2 ? 'Hacen falta al menos 2 presenciales que ya hayan entrado' : undefined}
                      className="rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-1.5 disabled:opacity-50">
                      Iniciar rifa ({data?.eligible_now ?? 0} participantes)
                    </button>
                  )}
                  {r.status === 'running' && (
                    <button onClick={() => { if (window.confirm(`¿Sortear al ganador al azar entre los ${r.remaining} que siguen en juego?`)) run(() => drawRaffle(r.id), 'Ganador sorteado.'); }}
                      disabled={busy || !!openQ || r.remaining < 1}
                      title={openQ ? 'Cierra la pregunta abierta antes de sortear' : undefined}
                      className="rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-1.5 disabled:opacity-50">
                      Sortear entre los que siguen
                    </button>
                  )}
                  {r.status !== 'draft' && (
                    <button onClick={() => { if (window.confirm('¿Reiniciar la rifa? Se borran sus participantes, respuestas y ganador; las preguntas quedan listas para lanzarlas de nuevo.')) run(() => resetRaffle(r.id), 'Rifa reiniciada.'); }}
                      disabled={busy} className="rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold px-3 py-1.5 disabled:opacity-50">Reiniciar</button>
                  )}
                  {r.status !== 'running' && (
                    <button onClick={() => { if (window.confirm('¿Eliminar esta rifa y sus preguntas?')) run(() => deleteRaffle(r.id)); }}
                      disabled={busy} className="rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-xs font-bold px-3 py-1.5 disabled:opacity-50">Eliminar</button>
                  )}
                </div>
              </div>

              {r.winner && (
                <div className="rounded-lg bg-orange-50 border border-orange-200 p-3 text-xs text-orange-900">
                  <p className="font-bold">🏆 Ganador: {r.winner.full_name} <span className="font-normal text-orange-700">(en pantalla: {r.winner.display_name})</span></p>
                  <p className="mt-1">Correo: {r.winner.email}{r.winner.phone ? ` · Teléfono: ${r.winner.phone}` : ''}{r.winner.document_id ? ` · Documento: ${r.winner.document_id}` : ''}</p>
                </div>
              )}

              <ul className="space-y-2">
                {r.questions.map((q, idx) => (
                  <li key={q.id} className="rounded-lg border border-slate-200 p-3 space-y-1.5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className={`inline-block text-[10px] font-bold rounded-full px-2 py-0.5 ${Q_STYLE[q.status]}`}>{Q_LABEL[q.status]}</span>
                        <p className="mt-1 text-sm font-semibold text-slate-900 break-words">{idx + 1}. {q.question}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 shrink-0">
                        {q.status === 'draft' && r.status === 'running' && (
                          <button onClick={() => run(() => openRaffleQuestion(q.id))} disabled={busy || !!openQ}
                            title={openQ ? 'Hay una pregunta abierta' : undefined}
                            className="rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-1.5 disabled:opacity-50">Lanzar ({q.duration_seconds} s)</button>
                        )}
                        {q.status === 'open' && (
                          <button onClick={() => run(() => closeRaffleQuestion(q.id), 'Pregunta cerrada: ya se eliminó a quien falló o no respondió.')} disabled={busy}
                            className="rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-3 py-1.5 disabled:opacity-50">Cerrar ahora</button>
                        )}
                        {q.status === 'draft' && (
                          <button onClick={() => run(() => deleteRaffleQuestion(q.id))} disabled={busy}
                            className="rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-xs font-bold px-3 py-1.5 disabled:opacity-50">Quitar</button>
                        )}
                      </div>
                    </div>
                    <ul className="grid sm:grid-cols-2 gap-1 text-xs text-slate-700">
                      {q.options.map((o, i) => (
                        <li key={i} className={i === q.correct_index ? 'font-bold text-green-700' : ''}>{LETTERS[i]}. {o}{i === q.correct_index ? ' ✓' : ''}</li>
                      ))}
                    </ul>
                    <p className="text-xs text-slate-500">
                      {q.status !== 'draft' && <>{q.answers} {q.answers === 1 ? 'respuesta' : 'respuestas'}</>}
                      {q.status === 'closed' && <> · Salieron {q.eliminated_count} · Siguen {q.survivors_count}{q.eliminated_count === 0 ? ' (nadie acertó: nadie sale)' : ''}</>}
                    </p>
                  </li>
                ))}
                {r.questions.length === 0 && <li className="text-sm text-slate-500">Aún no hay preguntas. Agrega la primera abajo.</li>}
              </ul>

              {r.status === 'draft' && r.questions.length === 0 && (
                <button
                  onClick={() => {
                    if (!window.confirm(`¿Cargar las ${DECK_QUESTIONS.length} preguntas de la presentación del evento? Podrás quitar o agregar las que quieras.`)) return;
                    run(async () => {
                      let d: RaffleAdminData | undefined;
                      for (const q of DECK_QUESTIONS) d = await addRaffleQuestion(r.id, q.question, q.options, q.correct, q.seconds);
                      return d;
                    }, `Se cargaron ${DECK_QUESTIONS.length} preguntas de la presentación.`);
                  }}
                  disabled={busy}
                  className="rounded-lg border border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-800 text-xs font-bold px-3 py-2 disabled:opacity-50">
                  Cargar las {DECK_QUESTIONS.length} preguntas de la presentación
                </button>
              )}

              {r.status !== 'finished' && (
                <QuestionForm disabled={busy} onAdd={async (q, opts, ok, sec) => { await run(() => addRaffleQuestion(r.id, q, opts, ok, sec), 'Pregunta agregada.'); }} />
              )}
            </div>
          );
        })}
        {data && data.raffles.length === 0 && <p className="text-sm text-slate-500">Aún no hay rifas. Crea la primera arriba.</p>}
      </div>
    </section>
  );
}
