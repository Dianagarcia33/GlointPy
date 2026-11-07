import { useCallback, useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import {
  GameAdminData,
  GameRound,
  closeGameRound,
  createGameRound,
  deleteGameRound,
  getAdminGame,
  getEventsWebSocketUrl,
  openGameRound,
} from '../../../../services/events';
import { useLatestOnly } from '../hooks/useLatestOnly';
import { useLiveRefresh } from '../../../events/hooks/useLiveRefresh';

const LETTERS = ['A', 'B', 'C', 'D'];
const STATUS_LABEL: Record<GameRound['status'], string> = { draft: 'Lista', open: 'Abierta', closed: 'Cerrada' };
const STATUS_STYLE: Record<GameRound['status'], string> = {
  draft: 'bg-slate-100 text-slate-700', open: 'bg-green-100 text-green-800', closed: 'bg-slate-200 text-slate-600',
};

/**
 * Dinámica «¿quién respondió primero?»: el equipo crea preguntas de opción múltiple, abre una a la vez y proyecta la
 * pantalla con el QR. Cada ronda dura 1 minuto y todos pueden responder; al terminar se anuncia el código de quien acertó primero.
 */
export function GameCard() {
  const [data, setData] = useState<GameAdminData | null>(null);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [correct, setCorrect] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const { startRead, invalidate } = useLatestOnly();

  const load = useCallback(async () => {
    const isFresh = startRead();
    try {
      const d = await getAdminGame();
      if (isFresh()) setData(d);
    } catch {
      // el siguiente aviso en vivo o refresco lo reintenta
    }
  }, [startRead]);

  useEffect(() => { load(); }, [load]);
  useLiveRefresh(getEventsWebSocketUrl('/game/ws'), load, 10000);

  const run = async (action: () => Promise<GameAdminData | void>, ok?: string) => {
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

  const create = () => run(async () => {
    const d = await createGameRound(question, options, correct);
    setQuestion('');
    setOptions(['', '']);
    setCorrect(0);
    return d;
  }, 'Pregunta creada. Ábrela cuando quieras lanzarla.');

  const setOption = (i: number, value: string) => setOptions((o) => o.map((x, j) => (j === i ? value : x)));
  const addOption = () => setOptions((o) => (o.length < 4 ? [...o, ''] : o));
  const removeOption = (i: number) => {
    setOptions((o) => (o.length > 2 ? o.filter((_, j) => j !== i) : o));
    setCorrect((c) => (c === i ? 0 : c > i ? c - 1 : c));
  };

  const joinUrl = `${window.location.origin}/dinamica`;
  const screenUrl = `${window.location.origin}/dinamica/pantalla`;
  const copyJoin = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // sin permiso de portapapeles: se puede copiar a mano
    }
  };

  const open = data?.rounds.find((r) => r.status === 'open');

  return (
    <section className="bg-white border border-slate-200 rounded-2xl shadow-xs p-5 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Trophy className={`w-5 h-5 ${open ? 'text-orange-500' : 'text-slate-400'}`} />
          <div>
            <h2 className="text-sm font-bold text-slate-900">Dinámica: ¿quién respondió primero?</h2>
            <p className="text-xs text-slate-500">
              La gente escanea un QR y responde sin iniciar sesión. Cada ronda dura 1 minuto y todos pueden responder: al terminar se cierra sola y la pantalla muestra el código de quien acertó primero y las estadísticas.
              {data ? ` Participantes: ${data.participants}.` : ''}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={screenUrl} target="_blank" rel="noopener noreferrer"
            className="rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-3 py-2">Abrir pantalla del presentador</a>
          <button onClick={copyJoin} className="rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold px-3 py-2">
            {copied ? '¡Copiado!' : 'Copiar enlace público'}
          </button>
        </div>
      </div>

      {message && (
        <p role="status" className={`text-xs rounded-lg p-2.5 border ${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {message.text}
        </p>
      )}

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
        <p className="text-xs font-bold text-slate-700">Nueva pregunta</p>
        <input value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={300} placeholder="Pregunta que hará el presentador"
          aria-label="Pregunta" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <div className="space-y-2">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="radio" name="game-correct" checked={correct === i} onChange={() => setCorrect(i)}
                aria-label={`Marcar la opción ${LETTERS[i]} como correcta`} className="shrink-0" />
              <span className="w-5 text-xs font-bold text-slate-500">{LETTERS[i]}</span>
              <input value={opt} onChange={(e) => setOption(i, e.target.value)} maxLength={120} placeholder={`Opción ${LETTERS[i]}`}
                aria-label={`Opción ${LETTERS[i]}`} className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
              {options.length > 2 && (
                <button type="button" onClick={() => removeOption(i)} className="text-xs text-slate-400 hover:text-red-600" aria-label={`Quitar la opción ${LETTERS[i]}`}>✕</button>
              )}
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-500">El círculo marca la respuesta correcta. Nadie la ve hasta que la ronda cierre.</p>
        <div className="flex flex-wrap gap-2">
          {options.length < 4 && (
            <button type="button" onClick={addOption} className="rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold px-3 py-1.5">Agregar opción</button>
          )}
          <button onClick={create} disabled={busy || !question.trim() || options.some((o) => !o.trim())}
            className="rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-4 py-1.5 disabled:opacity-50">Crear pregunta</button>
        </div>
      </div>

      <ul className="space-y-3">
        {data?.rounds.map((r) => (
          <li key={r.id} className="rounded-xl border border-slate-200 p-3 space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <span className={`inline-block text-[10px] font-bold rounded-full px-2 py-0.5 ${STATUS_STYLE[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                <p className="mt-1 text-sm font-semibold text-slate-900 break-words">{r.question}</p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                {r.status === 'draft' && (
                  <button onClick={() => run(() => openGameRound(r.id))} disabled={busy}
                    className="rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-1.5 disabled:opacity-50">
                    {open ? 'Abrir (cierra la actual)' : 'Abrir ronda'}
                  </button>
                )}
                {r.status === 'open' && (
                  <button onClick={() => run(() => closeGameRound(r.id))} disabled={busy}
                    className="rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-3 py-1.5 disabled:opacity-50">Cerrar ahora</button>
                )}
                {r.status !== 'open' && (
                  <button onClick={() => { if (window.confirm('¿Eliminar esta pregunta y sus respuestas?')) run(() => deleteGameRound(r.id)); }} disabled={busy}
                    className="rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-xs font-bold px-3 py-1.5 disabled:opacity-50">Eliminar</button>
                )}
              </div>
            </div>
            <ul className="grid sm:grid-cols-2 gap-1 text-xs text-slate-700">
              {r.options.map((o, i) => (
                <li key={i} className={i === r.correct_index ? 'font-bold text-green-700' : ''}>
                  {LETTERS[i]}. {o}{i === r.correct_index ? ' ✓' : ''}
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate-500">
              {r.answers} {r.answers === 1 ? 'respuesta' : 'respuestas'}
              {r.winner_alias ? <> · {r.status === 'open' ? 'Va ganando' : 'Ganó'} <strong className="text-slate-900">{r.winner_alias}</strong> en {((r.winner_ms ?? 0) / 1000).toFixed(1)} s</> : r.status === 'closed' ? ' · Sin ganador' : ''}
            </p>
          </li>
        ))}
        {data && data.rounds.length === 0 && <li className="text-sm text-slate-500">Aún no hay preguntas. Crea la primera arriba.</li>}
      </ul>
    </section>
  );
}
