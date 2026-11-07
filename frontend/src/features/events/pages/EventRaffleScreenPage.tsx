import { useCallback, useEffect, useState } from 'react';
import { RafflePublic, getEventsWebSocketUrl, getRaffleState } from '../../../services/events';
import { useLiveRefresh } from '../hooks/useLiveRefresh';
import { formatCountdown, useRoundCountdown } from '../hooks/useRoundCountdown';

/**
 * Pantalla del presentador para la rifa por eliminación. Muestra solo nombres cortos («Diana G.»): quiénes siguen en
 * juego, la pregunta en curso con su cuenta regresiva, quiénes salieron y, al final, el ganador. No recibe las opciones
 * ni la respuesta correcta (eso va solo a los celulares). Se actualiza en vivo por WebSocket.
 */
export function EventRaffleScreenPage() {
  const [raffle, setRaffle] = useState<RafflePublic | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRaffle((await getRaffleState()).raffle);
      setLoaded(true);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Sin conexión con el servidor.');
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useLiveRefresh(getEventsWebSocketUrl('/raffle/ws'), load, 3000);

  const q = raffle?.question ?? null;
  const timeLeft = useRoundCountdown(q, load);
  const urgent = timeLeft !== null && timeLeft <= 10;
  const running = raffle?.status === 'running';

  return (
    <div className="min-h-screen bg-slate-950 text-white px-6 sm:px-12 py-8 flex flex-col">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-sm sm:text-base font-bold tracking-widest text-orange-400 uppercase">Gloint Power Tech · Rifa</p>
        {raffle && <p className="text-lg sm:text-2xl font-extrabold">{raffle.title}</p>}
      </div>
      {error && <p role="status" className="mt-2 text-sm text-amber-300">Sin conexión: se muestran los últimos datos. {error}</p>}

      <div className="flex-1 flex items-center justify-center py-6">
        {loaded && !raffle && (
          <div className="text-center">
            <h1 className="text-5xl sm:text-7xl font-extrabold">Rifa en preparación</h1>
            <p className="mt-4 text-xl sm:text-2xl text-slate-300">Muy pronto empezamos.</p>
          </div>
        )}

        {raffle && raffle.status === 'finished' && (
          <div className="text-center max-w-5xl">
            <p className="text-3xl sm:text-5xl text-slate-300">🏆 ¡Tenemos ganador!</p>
            <h1 className="mt-6 text-6xl sm:text-9xl font-extrabold text-orange-400 break-words animate-pulse" data-testid="raffle-winner">{raffle.winner}</h1>
            <p className="mt-8 text-xl sm:text-3xl text-slate-300">{raffle.title}</p>
          </div>
        )}

        {raffle && running && (
          <div className="w-full max-w-7xl space-y-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-6xl sm:text-8xl font-extrabold tabular-nums leading-none" data-testid="remaining">{raffle.remaining}</p>
                <p className="mt-2 text-xl sm:text-2xl text-slate-300">siguen en juego <span className="text-slate-500">de {raffle.total}</span></p>
              </div>
              {q && q.status === 'open' && timeLeft !== null && (
                <div className="text-right">
                  <p className={`text-6xl sm:text-8xl font-extrabold tabular-nums ${urgent ? 'text-red-400 animate-pulse' : 'text-orange-400'}`} data-testid="countdown">{formatCountdown(timeLeft)}</p>
                  <p className="text-lg text-slate-400">para responder · {q.answers} {q.answers === 1 ? 'respuesta' : 'respuestas'}</p>
                </div>
              )}
            </div>

            {q && q.status === 'open' && (
              <div>
                <div className="h-3 rounded-full bg-white/10 overflow-hidden" aria-hidden="true">
                  <div className={`h-full transition-all duration-300 ${urgent ? 'bg-red-500' : 'bg-orange-500'}`}
                    style={{ width: `${Math.min(100, ((timeLeft ?? 0) / (q.duration_seconds || 30)) * 100)}%` }} />
                </div>
                <h2 className="mt-6 text-3xl sm:text-6xl font-extrabold leading-tight">{q.question}</h2>
                {/* Las opciones no se muestran aquí: solo llegan al celular de quien sigue en juego */}
                <p className="mt-4 text-xl sm:text-2xl text-slate-300">📱 Responde en tu celular desde tu enlace personal.</p>
              </div>
            )}

            {(!q || q.status === 'closed') && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
                {q && q.status === 'closed' && (
                  <p className="mb-4 text-xl sm:text-2xl font-bold">
                    {q.eliminated_count === 0
                      ? 'Nadie acertó: nadie sale en esta ronda'
                      : <>Quedaron eliminados <span className="text-red-400">{q.eliminated_count}</span>{raffle.last_eliminated && raffle.last_eliminated.length > 0 ? ':' : ''}</>}
                    {raffle.last_eliminated && raffle.last_eliminated.length > 0 && (
                      <span className="ml-2 text-red-300 font-semibold">{raffle.last_eliminated.join(' · ')}</span>
                    )}
                  </p>
                )}
                {!q && <p className="mb-4 text-xl sm:text-2xl font-bold text-slate-300">Estos son los que juegan:</p>}
                {raffle.names ? (
                  <ul className="flex flex-wrap gap-2 sm:gap-3">
                    {raffle.names.map((n, i) => (
                      <li key={`${n}-${i}`} className="rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-100 px-4 py-1.5 text-base sm:text-xl font-semibold">{n}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xl text-slate-300">Son demasiados para mostrarlos todos: seguimos eliminando.</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
