import { useCallback, useEffect, useState } from 'react';
import { GameState, getEventsWebSocketUrl, getGameQrUrl, getGameState } from '../../../services/events';
import { useLiveRefresh } from '../hooks/useLiveRefresh';
import { formatCountdown, useRoundCountdown } from '../hooks/useRoundCountdown';
import { GameStats } from '../components/GameStats';

/**
 * Pantalla del presentador para proyectar: el QR para entrar, la pregunta en curso con el contador de un minuto y cuántos
 * han respondido y, al cerrar la ronda, las estadísticas de lo que respondió la gente (barras por opción, sin nombres).
 * No requiere sesión y no recibe las opciones (solo llegan a los celulares). Se actualiza en vivo por WebSocket.
 */
export function EventGameScreenPage() {
  const [state, setState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setState(await getGameState());
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Sin conexión con el servidor.');
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useLiveRefresh(getEventsWebSocketUrl('/game/ws'), load, 3000);

  const round = state?.round ?? null;
  const timeLeft = useRoundCountdown(round, load);
  const urgent = timeLeft !== null && timeLeft <= 10;
  const joinUrl = `${window.location.origin}/dinamica`;

  const qr = (size: string) => (
    <div className="text-center">
      <img src={getGameQrUrl()} alt="Código QR para entrar a la dinámica" className={`${size} bg-white rounded-2xl p-3 mx-auto`} />
      <p className="mt-3 text-lg sm:text-xl font-bold">Escanea y responde desde tu celular</p>
      <p className="text-sm text-slate-400 font-mono break-all">{joinUrl}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white px-6 sm:px-12 py-8 flex flex-col">
      <p className="text-sm sm:text-base font-bold tracking-widest text-orange-400 uppercase">Gloint Power Tech · Dinámica</p>
      {error && <p role="status" className="mt-2 text-sm text-amber-300">Sin conexión: se muestran los últimos datos. {error}</p>}

      <div className="flex-1 flex items-center justify-center">
        {!round && (
          <div className="grid gap-10 md:grid-cols-[1fr_auto] items-center max-w-5xl w-full">
            <div>
              <h1 className="text-4xl sm:text-6xl font-extrabold leading-tight">Prepárate para responder</h1>
              <p className="mt-4 text-xl sm:text-2xl text-slate-300">Escanea el QR: la pregunta y las opciones aparecen en tu celular.</p>
            </div>
            {qr('w-64 sm:w-80')}
          </div>
        )}

        {round && round.status === 'open' && (
          <div className="grid gap-10 lg:grid-cols-[1fr_auto] items-center w-full max-w-7xl">
            <div>
              {timeLeft !== null && (
                <div className="mb-8" aria-live="off">
                  <div className="flex items-baseline gap-4">
                    <span className={`text-7xl sm:text-8xl font-extrabold tabular-nums ${urgent ? 'text-red-400 animate-pulse' : 'text-orange-400'}`} data-testid="countdown">{formatCountdown(timeLeft)}</span>
                    <span className="text-xl text-slate-400">para responder</span>
                  </div>
                  <div className="mt-3 h-3 rounded-full bg-white/10 overflow-hidden" aria-hidden="true">
                    <div className={`h-full transition-all duration-300 ${urgent ? 'bg-red-500' : 'bg-orange-500'}`}
                      style={{ width: `${Math.min(100, (timeLeft / (round.duration_seconds || 60)) * 100)}%` }} />
                  </div>
                </div>
              )}
              <h1 className="text-4xl sm:text-6xl font-extrabold leading-tight">{round.question}</h1>
              {/* Las opciones no se muestran aquí: solo llegan al celular de quien participa */}
              <p className="mt-8 text-2xl sm:text-3xl text-slate-300">📱 Las opciones aparecen en tu celular: escanea el QR y responde.</p>
              <p className="mt-6 text-2xl text-slate-300"><strong className="text-white">{round.answers}</strong> {round.answers === 1 ? 'respuesta' : 'respuestas'}</p>
            </div>
            <div>{qr('w-56 sm:w-72')}</div>
          </div>
        )}

        {round && round.status === 'closed' && (
          <div className="w-full max-w-4xl">
            <p className="text-xl sm:text-2xl text-slate-400 text-center">Resultados</p>
            <h1 className="mt-2 text-3xl sm:text-5xl font-extrabold leading-tight text-center">{round.question}</h1>
            {round.distribution && round.answers > 0 ? (
              <div className="mt-10">
                <GameStats distribution={round.distribution} variant="screen" />
                <p className="mt-6 text-lg sm:text-xl text-slate-300 text-center">
                  {round.answers} {round.answers === 1 ? 'respuesta' : 'respuestas'}
                </p>
              </div>
            ) : (
              <p className="mt-10 text-3xl sm:text-4xl text-slate-300 text-center">Nadie respondió esta pregunta.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
