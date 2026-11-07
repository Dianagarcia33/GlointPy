import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { RaffleMyState, answerRaffle, getEventsWebSocketUrl, getMyRaffleState } from '../../../services/events';
import { useLiveRefresh } from '../hooks/useLiveRefresh';
import { formatCountdown, useRoundCountdown } from '../hooks/useRoundCountdown';

const LETTERS = ['A', 'B', 'C', 'D'];

/**
 * Rifa por eliminación desde el celular del invitado presencial, con su enlace personal (el mismo del correo y de su QR).
 * Cada pregunta tiene su tiempo: quien falla o no responde queda eliminado, y el que queda gana. Las opciones solo se ven
 * aquí mientras sigues en juego.
 */
export function EventRaffleMePage() {
  const { token = '' } = useParams();
  const [state, setState] = useState<RaffleMyState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [sending, setSending] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setState(await getMyRaffleState(token));
      setError(null);
    } catch (e: any) {
      const msg = e?.message || 'No se pudo conectar. Reintentando…';
      if (/no es v[aá]lido|no encontrad|cancelada/i.test(msg)) setInvalid(true);
      setError(msg);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);
  useLiveRefresh(token ? getEventsWebSocketUrl('/raffle/ws') : null, load, 4000, { jitterMs: 300 });

  const raffle = state?.raffle ?? null;
  const q = raffle?.question ?? null;
  const me = state?.me ?? null;
  const timeLeft = useRoundCountdown(q, load);
  const urgent = timeLeft !== null && timeLeft <= 10;
  const won = me?.status === 'winner';

  const answer = async (optionIndex: number) => {
    if (!q || sending !== null) return;
    setSending(optionIndex);
    setError(null);
    try {
      await answerRaffle(token, q.id, optionIndex);
    } catch (e: any) {
      setError(e?.message || 'No se pudo enviar tu respuesta.');
    } finally {
      setSending(null);
      load();
    }
  };

  return (
    <div className={`min-h-screen px-4 py-6 flex flex-col items-center transition-colors duration-500 ${won ? 'bg-green-600' : 'bg-slate-950'} text-white`}>
      <div className="w-full max-w-md flex-1 flex flex-col">
        <p className="text-center text-xs font-bold tracking-widest text-orange-400 uppercase">Gloint Power Tech · Rifa</p>
        {raffle && <p className="mt-1 text-center text-lg font-extrabold">{raffle.title}</p>}

        {error && !invalid && state && <p role="status" className="mt-3 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-100 text-xs p-2.5">{error}</p>}

        <div className="flex-1 flex flex-col justify-center py-6">
          {invalid && <p role="alert" className="text-center rounded-lg bg-red-500/20 border border-red-400/40 text-red-100 text-sm p-4">{error}</p>}
          {!invalid && !state && !error && <p className="text-center text-slate-400">Conectando…</p>}

          {!invalid && state && (
            <>
              <p className="text-center text-sm text-slate-300">Hola <strong>{state.full_name}</strong></p>

              {!state.in_person && (
                <p className="mt-6 text-center text-slate-300">La rifa es solo para quienes asisten de forma presencial.</p>
              )}

              {state.in_person && !raffle && (
                <p className="mt-6 text-center text-lg text-slate-300">Aún no hay una rifa en curso. Esta página se actualiza sola.</p>
              )}

              {state.in_person && raffle && me && !me.in_raffle && (
                <p className="mt-6 text-center text-slate-300">
                  No estás en esta rifa: participan los presenciales que ya habían entrado al evento cuando empezó. Puedes seguirla en la pantalla.
                </p>
              )}

              {state.in_person && raffle && me?.in_raffle && (
                <div className="mt-4 space-y-5">
                  {/* Mi estado */}
                  <div className="rounded-2xl bg-white/10 border border-white/15 py-3 text-center">
                    <p className="text-[11px] uppercase tracking-wider text-slate-300">Tú apareces como</p>
                    <p className="text-2xl font-extrabold">{me.display_name}</p>
                    <p className={`mt-1 text-sm font-bold ${me.status === 'eliminated' ? 'text-red-300' : me.status === 'winner' ? 'text-white' : 'text-emerald-300'}`}>
                      {me.status === 'eliminated' ? 'Eliminado' : me.status === 'winner' ? '¡Ganador!' : 'Sigues en juego'}
                    </p>
                    {raffle.status === 'running' && <p className="text-xs text-slate-400">Quedan {raffle.remaining} de {raffle.total}</p>}
                  </div>

                  {won && (
                    <div className="text-center space-y-2">
                      <p className="text-5xl">🏆</p>
                      <h1 className="text-3xl font-extrabold">¡Ganaste la rifa!</h1>
                      <p className="text-lg">Acércate con el presentador.</p>
                    </div>
                  )}

                  {!won && raffle.status === 'finished' && (
                    <p className="text-center text-slate-300">La rifa terminó. El ganador fue <strong className="text-orange-400">{raffle.winner}</strong>.</p>
                  )}

                  {/* Pregunta abierta */}
                  {!won && raffle.status === 'running' && q && q.status === 'open' && (
                    <div>
                      {timeLeft !== null && (
                        <div className="mb-4 text-center">
                          <span className={`text-5xl font-extrabold tabular-nums ${urgent ? 'text-red-400 animate-pulse' : 'text-orange-400'}`}>{formatCountdown(timeLeft)}</span>
                          <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden" aria-hidden="true">
                            <div className={`h-full transition-all duration-300 ${urgent ? 'bg-red-500' : 'bg-orange-500'}`}
                              style={{ width: `${Math.min(100, (timeLeft / (q.duration_seconds || 30)) * 100)}%` }} />
                          </div>
                        </div>
                      )}
                      <h2 className="text-2xl font-extrabold leading-snug text-center">{q.question}</h2>
                      {me.status !== 'active' ? (
                        <p className="mt-6 rounded-2xl bg-white/10 border border-white/15 p-5 text-center text-slate-200">
                          Quedaste fuera de la rifa. Sigue el resultado en la pantalla.
                        </p>
                      ) : me.answered ? (
                        <div className="mt-6 rounded-2xl bg-white/10 border border-white/15 p-5 text-center">
                          <p className="text-xl font-bold">¡Respuesta enviada!</p>
                          <p className="mt-1 text-slate-300">Tu opción: <strong>{LETTERS[me.option_index ?? 0]}</strong>. Al cerrarse el tiempo sabrás si pasas.</p>
                        </div>
                      ) : (
                        <div className="mt-5 space-y-3">
                          {q.options.map((opt, i) => (
                            <button key={i} disabled={sending !== null || timeLeft === 0} onClick={() => answer(i)}
                              className="w-full flex items-center gap-3 text-left rounded-2xl bg-white text-slate-900 active:scale-[0.98] disabled:opacity-60 px-4 py-4 text-lg font-semibold shadow">
                              <span className="shrink-0 w-9 h-9 rounded-full bg-orange-500 text-white flex items-center justify-center font-extrabold">{LETTERS[i]}</span>
                              <span>{opt}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Resultado de la última pregunta */}
                  {!won && raffle.status === 'running' && q && q.status === 'closed' && (
                    <div className="rounded-2xl bg-white/10 border border-white/15 p-5 text-center space-y-2">
                      {me.passed ? (
                        <p className="text-xl font-extrabold text-emerald-300">¡Pasaste a la siguiente ronda!</p>
                      ) : me.eliminated_now ? (
                        <p className="text-xl font-extrabold text-red-300">Esta vez quedaste eliminado</p>
                      ) : me.status === 'active' ? (
                        <p className="text-xl font-extrabold text-emerald-300">Sigues en juego: nadie acertó, nadie sale</p>
                      ) : null}
                      {q.correct_index !== null && (
                        <p className="text-sm text-slate-200">Respuesta correcta: <strong>{LETTERS[q.correct_index]}{q.correct_text ? `. ${q.correct_text}` : ''}</strong></p>
                      )}
                      {me.status === 'active' && <p className="text-xs text-slate-400">Atento a la siguiente pregunta del presentador.</p>}
                    </div>
                  )}

                  {!won && raffle.status === 'running' && !q && me.status === 'active' && (
                    <p className="text-center text-slate-300">
                      {raffle.last_round ? '¡Sigues en juego! Mira la pantalla: el presentador continúa.' : 'Atento a la pantalla: el presentador continúa con la rifa.'}
                    </p>
                  )}
                  {!won && raffle.status === 'running' && !q && me.status === 'eliminated' && (
                    <p className="rounded-2xl bg-white/10 border border-white/15 p-5 text-center text-slate-200">Quedaste fuera de la rifa. Sigue el resultado en la pantalla.</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
