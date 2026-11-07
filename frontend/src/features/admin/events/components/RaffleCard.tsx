import { useCallback, useEffect, useState } from 'react';
import { Gift } from 'lucide-react';
import {
  RaffleAdminData,
  RaffleAdminItem,
  createRaffle,
  deleteRaffle,
  drawRaffle,
  eliminateRaffleRandom,
  getAdminRaffle,
  getEventsWebSocketUrl,
  resetRaffle,
  startRaffle,
} from '../../../../services/events';
import { useLatestOnly } from '../hooks/useLatestOnly';
import { useLiveRefresh } from '../../../events/hooks/useLiveRefresh';

const STATUS_LABEL: Record<RaffleAdminItem['status'], string> = { draft: 'Preparando', running: 'En curso', finished: 'Terminada' };
const STATUS_STYLE: Record<RaffleAdminItem['status'], string> = {
  draft: 'bg-slate-100 text-slate-700', running: 'bg-green-100 text-green-800', finished: 'bg-orange-100 text-orange-800',
};

/** Ronda al azar: el presentador elige cuántos salen y el sistema los escoge sin preguntas, hasta que quede uno. */
function RandomEliminate({ remaining, disabled, onEliminate }: { remaining: number; disabled: boolean; onEliminate: (n: number) => void }) {
  const [custom, setCustom] = useState('');
  const half = Math.max(1, Math.floor(remaining / 2));
  const go = (n: number) => {
    const real = Math.min(n, remaining - 1);
    if (real >= 1 && window.confirm(`¿Eliminar al azar a ${real} de los ${remaining} que siguen?`)) onEliminate(real);
  };
  const quick = Array.from(new Set([1, 5, 10, half])).filter((n) => n < remaining).sort((a, b) => a - b);
  const customN = Number(custom);
  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 space-y-2">
      <p className="text-xs font-bold text-orange-900">Eliminar al azar · siguen {remaining}</p>
      <div className="flex flex-wrap items-center gap-2">
        {quick.map((n) => (
          <button key={n} onClick={() => go(n)} disabled={disabled}
            className="rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-1.5 disabled:opacity-50">
            {n === 1 ? '🎡 Ruleta: sacar a 1' : n === half && n > 10 ? `La mitad (${n})` : `Sacar ${n}`}
          </button>
        ))}
        <input type="number" min={1} max={remaining - 1} value={custom} onChange={(e) => setCustom(e.target.value)}
          aria-label="Cantidad a eliminar" placeholder="Otra cantidad" className="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-xs" />
        <button onClick={() => go(customN)} disabled={disabled || !Number.isInteger(customN) || customN < 1}
          className="rounded-lg border border-orange-400 text-orange-800 hover:bg-orange-100 text-xs font-bold px-3 py-1.5 disabled:opacity-50">Sacar</button>
      </div>
      <p className="text-[11px] text-orange-800">La ruleta gira en la pantalla del presentador cuando sale 1 persona o se elige al ganador. Siempre queda al menos uno; cuando queda uno solo, es el ganador.</p>
    </div>
  );
}

/**
 * Rifa por eliminación al azar: la bolsa son los presenciales que ya entraron al evento. El presentador elige cuántos
 * salen en cada ronda y el sistema los escoge; al final queda un solo ganador.
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
              Participan los presenciales que ya entraron al evento{data ? ` (ahora hay ${data.eligible_now})` : ''}. En cada ronda eliges cuántos salen y el
              sistema los escoge al azar, hasta quedar el ganador. En pantalla aparecen como «Nombre I.».
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
        <button onClick={() => run(async () => { const d = await createRaffle(title); setTitle(''); return d; }, 'Rifa creada. Pulsa «Iniciar rifa» cuando los invitados ya hayan entrado.')}
          disabled={busy || !title.trim()}
          className="rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-4 py-2 disabled:opacity-50">Crear rifa</button>
      </div>

      <div className="space-y-5">
        {data?.raffles.map((r) => {
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
                    <button onClick={() => run(() => startRaffle(r.id), 'Rifa iniciada: ya puedes eliminar al azar por rondas.')} disabled={busy || (data?.eligible_now ?? 0) < 2}
                      title={(data?.eligible_now ?? 0) < 2 ? 'Hacen falta al menos 2 presenciales que ya hayan entrado' : undefined}
                      className="rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-1.5 disabled:opacity-50">
                      Iniciar rifa ({data?.eligible_now ?? 0} participantes)
                    </button>
                  )}
                  {r.status === 'running' && (
                    <button onClick={() => { if (window.confirm(`¿Girar la ruleta para elegir al ganador entre los ${r.remaining} que siguen en juego?`)) run(() => drawRaffle(r.id), 'Ganador sorteado.'); }}
                      disabled={busy || r.remaining < 1}
                      className="rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-1.5 disabled:opacity-50">
                      Girar ruleta: elegir ganador
                    </button>
                  )}
                  {r.status !== 'draft' && (
                    <button onClick={() => { if (window.confirm('¿Reiniciar la rifa? Se borran sus participantes y el ganador.')) run(() => resetRaffle(r.id), 'Rifa reiniciada.'); }}
                      disabled={busy} className="rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold px-3 py-1.5 disabled:opacity-50">Reiniciar</button>
                  )}
                  {r.status !== 'running' && (
                    <button onClick={() => { if (window.confirm('¿Eliminar esta rifa?')) run(() => deleteRaffle(r.id)); }}
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

              {r.status === 'running' && r.remaining > 1 && (
                <RandomEliminate remaining={r.remaining} disabled={busy}
                  onEliminate={(n) => run(() => eliminateRaffleRandom(r.id, n), `Se eliminaron ${Math.min(n, r.remaining - 1)} al azar.`)} />
              )}
            </div>
          );
        })}
        {data && data.raffles.length === 0 && <p className="text-sm text-slate-500">Aún no hay rifas. Crea la primera arriba.</p>}
      </div>
    </section>
  );
}
