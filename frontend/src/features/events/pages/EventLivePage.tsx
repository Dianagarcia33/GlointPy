import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import MuxPlayer from '@mux/mux-player-react';
import { QuestionsPanel } from '../components/QuestionsPanel';
import { SurveyPanel } from '../components/SurveyPanel';
import { LiveJoin, LiveStatus, getLiveStatus, joinLive, liveHeartbeat } from '../../../services/events';

function formatDate(value?: string | null): string {
  if (!value) return 'Próximamente';
  try {
    return new Date(value).toLocaleString('es-CO', {
      weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit',
    });
  } catch {
    return value;
  }
}

// Playback ID reservado para probar la sala sin cuenta de Mux (el backend no firma token para él)
const SIMULATED_PLAYBACK_ID = 'simulado';

function SimulatedPlayer() {
  return (
    <div className="relative flex flex-col items-center justify-center gap-3 text-white"
         style={{ width: '100%', aspectRatio: '16 / 9', background: 'linear-gradient(135deg,#0f172a,#1e293b)' }}>
      <span className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-xs font-bold">
        <span className="h-2 w-2 rounded-full bg-white animate-pulse" />EN VIVO
      </span>
      <p className="text-lg font-semibold">Transmisión simulada</p>
      <p className="text-xs text-slate-400 px-6 text-center">Modo de prueba: aquí se verá el video de Mux cuando se configure el Playback ID real.</p>
    </div>
  );
}

type Phase = 'loading' | 'invalid' | 'waiting' | 'ready' | 'watching' | 'replaced' | 'ended';

/**
 * Sala en vivo para inscritos virtuales. El token de la URL identifica al inscrito (sin sesión).
 * Entrar queda registrado; mientras el video se ve, un latido avisa que la persona sigue conectada.
 * Si el enlace se abre en otro dispositivo, esta sesión se corta.
 */
export function EventLivePage() {
  const { token = '' } = useParams();
  const [status, setStatus] = useState<LiveStatus | null>(null);
  const [join, setJoin] = useState<LiveJoin | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const wasOpen = useRef(false);

  const loadStatus = useCallback(async () => {
    try {
      const s = await getLiveStatus(token);
      setStatus(s);
      setPhase((p) => {
        if (p === 'watching' || p === 'replaced' || p === 'ended') return p;
        return s.live_open ? 'ready' : 'waiting';
      });
      wasOpen.current = wasOpen.current || s.live_open;
    } catch (e: any) {
      setError(e?.message || 'Este enlace no es válido o ya no está disponible.');
      setPhase('invalid');
    }
  }, [token]);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  // Mientras la sala está cerrada, revisa cada 10 s si ya se abrió
  useEffect(() => {
    if (phase !== 'waiting') return;
    const id = setInterval(loadStatus, 10000);
    return () => clearInterval(id);
  }, [phase, loadStatus]);

  // Latido de presencia mientras se ve la transmisión
  useEffect(() => {
    if (phase !== 'watching' || !join) return;
    const id = setInterval(async () => {
      try {
        const res = await liveHeartbeat(token, join.session_id);
        if (!res.live_open) setPhase('ended');
      } catch (e: any) {
        const msg = String(e?.message || '');
        if (msg.includes('otro dispositivo')) setPhase('replaced');
        // Fallos de red transitorios: se reintenta en el siguiente latido
      }
    }, (join.heartbeat_seconds || 20) * 1000);
    return () => clearInterval(id);
  }, [phase, join, token]);

  const enter = async () => {
    setBusy(true);
    setError(null);
    try {
      setJoin(await joinLive(token));
      setPhase('watching');
    } catch (e: any) {
      setError(e?.message || 'No se pudo entrar a la transmisión. Inténtalo de nuevo.');
      loadStatus();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pt-24 pb-16 min-h-screen bg-slate-50 px-4">
      <div className="max-w-4xl mx-auto">
        <p className="text-xs font-bold tracking-widest text-orange-600 uppercase">Gloint Power Tech</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Transmisión en vivo</h1>

        {phase === 'loading' && <p className="mt-6 text-slate-500">Cargando…</p>}

        {phase === 'invalid' && (
          <p role="alert" className="mt-6 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">
            {error || 'Este enlace no es válido o ya no está disponible.'}
          </p>
        )}

        {status && phase !== 'invalid' && phase !== 'loading' && (
          <p className="mt-2 text-slate-700">
            Hola <strong>{status.full_name}</strong>, bienvenido/a a <strong>{status.event_title}</strong>.
          </p>
        )}

        {error && phase !== 'invalid' && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">{error}</p>
        )}

        {phase === 'waiting' && status && (
          <div className="mt-6 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 text-center">
            <p className="text-slate-900 font-semibold">La transmisión aún no ha comenzado.</p>
            <p className="mt-1 text-sm text-slate-600">Fecha del evento: {formatDate(status.event_date)}</p>
            <p className="mt-3 text-sm text-slate-500">Deja esta página abierta: te avisaremos aquí cuando se habilite la entrada.</p>
          </div>
        )}

        {phase === 'ready' && (
          <div className="mt-6 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 text-center">
            <p className="text-slate-900 font-semibold">¡La transmisión ya está disponible!</p>
            <p className="mt-1 text-sm text-slate-600">Tu entrada quedará registrada. Tu enlace es personal: solo puede estar activo en un dispositivo.</p>
            <button disabled={busy} onClick={enter}
              className="mt-5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold px-8 py-3">
              Entrar a la transmisión
            </button>
          </div>
        )}

        {phase === 'watching' && join && (
          <div className="mt-6 rounded-2xl overflow-hidden bg-black shadow-sm">
            {join.playback_id === SIMULATED_PLAYBACK_ID ? (
              <SimulatedPlayer />
            ) : (
              <MuxPlayer
                streamType="live"
                playbackId={join.playback_id}
                tokens={join.playback_token ? { playback: join.playback_token } : undefined}
                autoPlay
                accentColor="#f97316"
                style={{ width: '100%', aspectRatio: '16 / 9' }}
              />
            )}
          </div>
        )}

        {phase === 'watching' && <SurveyPanel token={token} />}
        {phase === 'watching' && <QuestionsPanel token={token} />}

        {phase === 'replaced' && (
          <p role="alert" className="mt-6 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm p-4">
            Tu enlace se abrió en otro dispositivo, por eso esta sesión se cerró. Si quieres verla aquí, recarga la página y entra de nuevo.
          </p>
        )}

        {phase === 'ended' && (
          <p className="mt-6 rounded-lg bg-slate-100 text-slate-700 text-sm p-4">
            La transmisión ha finalizado. ¡Gracias por acompañarnos!
          </p>
        )}
      </div>
    </div>
  );
}
