import MuxPlayer from '@mux/mux-player-react';

// Playback ID reservado para probar la sala sin cuenta de Mux (el backend no firma token para él)
export const SIMULATED_PLAYBACK_ID = 'simulado';

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

/** Reproductor de la transmisión: el de Mux, o uno simulado cuando el Playback ID es «simulado». */
export function LivePlayer({ playbackId, playbackToken }: { playbackId: string; playbackToken?: string | null }) {
  if (playbackId === SIMULATED_PLAYBACK_ID) return <SimulatedPlayer />;
  return (
    <MuxPlayer
      streamType="live"
      playbackId={playbackId}
      tokens={playbackToken ? { playback: playbackToken } : undefined}
      autoPlay
      accentColor="#f97316"
      style={{ width: '100%', aspectRatio: '16 / 9' }}
    />
  );
}
