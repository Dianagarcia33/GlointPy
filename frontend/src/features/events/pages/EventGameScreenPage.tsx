import { useCallback, useEffect, useState } from 'react';
import { GameState, getEventsWebSocketUrl, getGameQrUrl, getGameState } from '../../../services/events';
import { useLiveRefresh } from '../hooks/useLiveRefresh';

const LETTERS = ['A', 'B', 'C', 'D'];
const seconds = (ms: number | null) => (ms === null || ms === undefined ? '' : `${(ms / 1000).toFixed(1)} s`);

/**
 * Pantalla del presentador para proyectar: el QR para entrar, la pregunta en curso con cuántos han respondido y, apenas
 * alguien acierta primero, su código en grande («Colibrí 47»). No requiere sesión y no muestra la respuesta correcta
 * hasta que la ronda cierra. Se actualiza en vivo por WebSocket.
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
              <h1 className="text-4xl sm:text-6xl font-extrabold leading-tight">¿Quién responderá primero?</h1>
              <p className="mt-4 text-xl sm:text-2xl text-slate-300">Escanea el QR y prepárate: la pregunta aparece en tu celular.</p>
            </div>
            {qr('w-64 sm:w-80')}
          </div>
        )}

        {round && round.status === 'open' && (
          <div className="grid gap-10 lg:grid-cols-[1fr_auto] items-center w-full max-w-7xl">
            <div>
              <h1 className="text-4xl sm:text-6xl font-extrabold leading-tight">{round.question}</h1>
              <ul className="mt-8 grid gap-4 sm:grid-cols-2">
                {round.options.map((opt, i) => (
                  <li key={i} className="flex items-center gap-4 rounded-2xl bg-white/10 border border-white/15 px-5 py-4 text-2xl sm:text-3xl font-semibold">
                    <span className="shrink-0 w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center font-extrabold">{LETTERS[i]}</span>
                    {opt}
                  </li>
                ))}
              </ul>
              <p className="mt-8 text-2xl text-slate-300"><strong className="text-white">{round.answers}</strong> {round.answers === 1 ? 'respuesta' : 'respuestas'}</p>
            </div>
            <div className="hidden lg:block">{qr('w-56')}</div>
          </div>
        )}

        {round && round.status === 'closed' && (
          <div className="text-center max-w-5xl w-full">
            {round.winner_alias ? (
              <>
                <p className="text-3xl sm:text-4xl text-slate-300">🏆 Respondió primero</p>
                <h1 className="mt-4 text-6xl sm:text-9xl font-extrabold text-orange-400 break-words" data-testid="winner-alias">{round.winner_alias}</h1>
                <p className="mt-4 text-3xl sm:text-4xl text-slate-200">en {seconds(round.winner_ms)}</p>
                <p className="mt-6 text-xl sm:text-2xl text-slate-400">Levanta tu celular y dinos: «¡fui yo!»</p>
              </>
            ) : (
              <h1 className="text-5xl sm:text-7xl font-extrabold">La ronda terminó sin ganador</h1>
            )}
            {round.correct_index !== null && (
              <p className="mt-8 text-2xl sm:text-3xl">
                Respuesta correcta: <strong className="text-green-400">{LETTERS[round.correct_index]}. {round.options[round.correct_index]}</strong>
              </p>
            )}
            <p className="mt-6 text-sm text-slate-500">{round.question}</p>
          </div>
        )}
      </div>
    </div>
  );
}
