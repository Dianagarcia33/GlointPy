import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

const SAME_CODE_PAUSE_MS = 10000; // el mismo QR frente a la cámara no se envía otra vez durante este tiempo
const SCAN_INTERVAL_MS = 120;     // ~8 lecturas por segundo: suficiente y no recarga el celular
const MAX_FRAME_WIDTH = 960;      // los fotogramas HD/4K se reducen antes de leerlos con jsQR
const DETECTED_FLASH_MS = 1500;

type Status = 'starting' | 'searching' | 'detected';

/**
 * Lee códigos QR con la cámara. Usa el lector nativo del navegador (BarcodeDetector) cuando existe, que tolera mejor
 * brillos y desenfoque, y jsQR como respaldo (Safari, Firefox). Muestra en el propio video si está buscando o ya leyó,
 * para que se note que está activo. No repite el mismo código durante unos segundos.
 */
export function QrScanner({ onCode }: { onCode: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onCodeRef = useRef(onCode);
  onCodeRef.current = onCode;
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('starting');

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let flash: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;
    let last = { code: '', at: 0 };
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const Detector = (window as any).BarcodeDetector;
    let detector: any = null;
    if (Detector) {
      try { detector = new Detector({ formats: ['qr_code'] }); } catch { detector = null; }
    }

    const read = async (video: HTMLVideoElement): Promise<string | null> => {
      if (detector) {
        try {
          const found = await detector.detect(video);
          if (found?.[0]?.rawValue) return found[0].rawValue as string;
        } catch {
          // si el lector nativo falla en este fotograma, se prueba con jsQR
        }
      }
      if (!ctx) return null;
      const scale = Math.min(1, MAX_FRAME_WIDTH / video.videoWidth);
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      return jsQR(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' })?.data ?? null;
    };

    const tick = async () => {
      const video = videoRef.current;
      if (stopped) return;
      if (video && video.readyState >= video.HAVE_CURRENT_DATA && video.videoWidth > 0) {
        setStatus((s) => (s === 'starting' ? 'searching' : s));
        const value = await read(video);
        const now = Date.now();
        if (!stopped && value && (value !== last.code || now - last.at > SAME_CODE_PAUSE_MS)) {
          last = { code: value, at: now };
          setStatus('detected');
          if (flash) clearTimeout(flash);
          flash = setTimeout(() => setStatus('searching'), DETECTED_FLASH_MS);
          onCodeRef.current(value);
        }
      }
      if (!stopped) timer = setTimeout(tick, SCAN_INTERVAL_MS);
    };

    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((s) => {
        if (stopped) { s.getTracks().forEach((t) => t.stop()); return; }
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play().catch(() => {});
        }
        tick();
      })
      .catch(() => setError('No se pudo acceder a la cámara. Revisa el permiso del navegador o usa el campo de código / la lista.'));

    if (!navigator.mediaDevices) setError('Este navegador no permite usar la cámara (se requiere HTTPS). Usa el campo de código o la lista.');

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      if (flash) clearTimeout(flash);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  if (error) return <p role="alert" className="text-xs rounded-lg p-2.5 border bg-amber-50 border-amber-200 text-amber-800">{error}</p>;

  return (
    <div className="relative w-full max-w-sm">
      <video ref={videoRef} muted playsInline className="w-full rounded-xl bg-black aspect-square object-cover" />
      {/* Marco guía y estado: dejan claro que la cámara está buscando */}
      <div className={`pointer-events-none absolute inset-6 rounded-2xl border-4 transition-colors ${status === 'detected' ? 'border-green-400' : 'border-white/70'}`} />
      <p role="status" aria-live="polite"
        className={`absolute bottom-3 left-3 right-3 rounded-lg px-3 py-1.5 text-center text-xs font-bold ${status === 'detected' ? 'bg-green-500 text-white' : 'bg-black/60 text-white'}`}>
        {status === 'starting' && 'Iniciando la cámara…'}
        {status === 'searching' && 'Apunta al código QR del inscrito'}
        {status === 'detected' && '✓ QR leído'}
      </p>
    </div>
  );
}
