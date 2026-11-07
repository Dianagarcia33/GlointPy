import { useCallback, useEffect, useRef, useState } from 'react';
import { GameState, gameAnswer, gameJoin, getEventsWebSocketUrl, getGameState } from '../../../services/events';
import { useLiveRefresh } from '../hooks/useLiveRefresh';
import { formatCountdown, useRoundCountdown } from '../hooks/useRoundCountdown';
import { GameStats } from '../components/GameStats';

const TOKEN_KEY = 'gloint_game_token';
const LETTERS = ['A', 'B', 'C', 'D'];

function storedToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
function saveToken(token: string) {
  try { localStorage.setItem(TOKEN_KEY, token); } catch { /* sin almacenamiento: se pedirá un token nuevo al recargar */ }
}

/**
 * Dinámica desde el celular. Se llega escaneando el QR: no hay sesión ni se piden datos, y no se muestra ningún código.
 * El presentador hace la pregunta, aquí aparecen las opciones y hay un minuto para responder (una vez). Al cerrar la
 * ronda se ven las estadísticas de lo que respondió la gente.
 */
export function EventGamePage() {
  const [token, setToken] = useState<string | null>(storedToken());
  const [state, setState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState<number | null>(null);
  const joining = useRef(false);

  const load = useCallback(async () => {
    try {
      const s = await getGameState(token);
      if (token && !s.me && !joining.current) {
        // Token guardado que el servidor no reconoce: se pide uno nuevo
        joining.current = true;
        const j = await gameJoin();
        saveToken(j.token);
        setToken(j.token);
        joining.current = false;
        return;
      }
      setState(s);
      setError(null);
    } catch (e: any) {
      joining.current = false;
      setError(e?.message || 'No se pudo conectar. Reintentando…');
    }
  }, [token]);

  // Primera visita: pedir un token anónimo
  useEffect(() => {
    if (token || joining.current) return;
    joining.current = true;
    gameJoin()
      .then((j) => { saveToken(j.token); setToken(j.token); })
      .catch((e: any) => setError(e?.message || 'No se pudo conectar. Recarga la página.'))
      .finally(() => { joining.current = false; });
  }, [token]);

  useEffect(() => { if (token) load(); }, [token, load]);
  useLiveRefresh(token ? getEventsWebSocketUrl('/game/ws') : null, load, 4000, { jitterMs: 400 });

  const answer = async (roundId: number, optionIndex: number) => {
    if (!token || sending !== null) return;
    setSending(optionIndex);
    setError(null);
    try {
      await gameAnswer(token, roundId, optionIndex);
    } catch (e: any) {
      setError(e?.message || 'No se pudo enviar tu respuesta.');
    } finally {
      setSending(null);
      load();
    }
  };

  const round = state?.round ?? null;
  const timeLeft = useRoundCountdown(round, load);
  const urgent = timeLeft !== null && timeLeft <= 10;
  const me = state?.me ?? null;

  return (
    <div className="min-h-screen px-4 py-6 flex flex-col items-center bg-slate-950 text-white">
      <div className="w-full max-w-md flex-1 flex flex-col">
        <p className="text-center text-xs font-bold tracking-widest text-orange-400 uppercase">Gloint Power Tech</p>

        {error && <p role="alert" className="mt-4 rounded-lg bg-red-500/20 border border-red-400/40 text-red-200 text-sm p-3">{error}</p>}

        <div className="flex-1 flex flex-col justify-center py-6">
          {!state && !error && <p className="text-center text-slate-400">Conectando…</p>}

          {state && !round && (
            <p className="text-center text-lg text-slate-300">Prepárate: esperamos la próxima pregunta del presentador.</p>
          )}

          {round && round.status === 'open' && (
            <div>
              {timeLeft !== null && (
                <div className="mb-5 text-center">
                  <span className={`text-5xl font-extrabold tabular-nums ${urgent ? 'text-red-400 animate-pulse' : 'text-orange-400'}`}>{formatCountdown(timeLeft)}</span>
                  <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden" aria-hidden="true">
                    <div className={`h-full transition-all duration-300 ${urgent ? 'bg-red-500' : 'bg-orange-500'}`}
                      style={{ width: `${Math.min(100, (timeLeft / (round.duration_seconds || 60)) * 100)}%` }} />
                  </div>
                </div>
              )}
              <h1 className="text-2xl font-extrabold leading-snug text-center">{round.question}</h1>
              {me?.answered ? (
                <div className="mt-8 rounded-2xl bg-white/10 border border-white/15 p-6 text-center">
                  <p className="text-xl font-bold">¡Respuesta enviada!</p>
                  <p className="mt-1 text-slate-300">Tu opción: <strong>{LETTERS[me.option_index ?? 0]}</strong>. Al terminar el tiempo verás lo que respondió la gente.</p>
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  {round.options.map((opt, i) => (
                    <button key={i} disabled={sending !== null || timeLeft === 0} onClick={() => answer(round.id, i)}
                      className="w-full flex items-center gap-3 text-left rounded-2xl bg-white text-slate-900 active:scale-[0.98] disabled:opacity-60 px-4 py-4 text-lg font-semibold shadow">
                      <span className="shrink-0 w-9 h-9 rounded-full bg-orange-500 text-white flex items-center justify-center font-extrabold">{LETTERS[i]}</span>
                      <span>{opt}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {round && round.status === 'closed' && (
            <div className="space-y-5">
              <div className="text-center">
                <p className="text-xs uppercase tracking-wider text-slate-400">Resultados</p>
                <h1 className="mt-1 text-xl font-extrabold leading-snug">{round.question}</h1>
              </div>
              {round.distribution && round.answers > 0 ? (
                <>
                  <GameStats distribution={round.distribution} options={round.options} variant="phone" />
                  <p className="text-center text-sm text-slate-400">
                    {round.answers} {round.answers === 1 ? 'respuesta' : 'respuestas'}
                    {me?.answered && me.option_index !== null ? ` · Tú elegiste ${LETTERS[me.option_index]}` : ''}
                  </p>
                </>
              ) : (
                <p className="text-center text-slate-300">Nadie respondió esta pregunta.</p>
              )}
              <p className="text-center text-xs text-slate-500">Cuando el presentador abra otra pregunta aparecerá aquí.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
