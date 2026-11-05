import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

const SAME_CODE_PAUSE_MS = 3000;

/**
 * Lee códigos QR con la cámara (jsQR: funciona en Chrome, Safari y celulares, sin depender de BarcodeDetector).
 * Evita repetir el mismo código durante unos segundos para no registrar dos veces por un escaneo largo.
 */
export function QrScanner({ onCode }: { onCode: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onCodeRef = useRef(onCode);
  onCodeRef.current = onCode;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    let last = { code: '', at: 0 };
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const tick = () => {
      const video = videoRef.current;
      if (stopped || !video || !ctx) return;
      if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const found = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
        const now = Date.now();
        if (found?.data && (found.data !== last.code || now - last.at > SAME_CODE_PAUSE_MS)) {
          last = { code: found.data, at: now };
          onCodeRef.current(found.data);
        }
      }
      raf = requestAnimationFrame(tick);
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
        raf = requestAnimationFrame(tick);
      })
      .catch(() => setError('No se pudo acceder a la cámara. Revisa el permiso del navegador o usa el campo de código / la lista.'));

    if (!navigator.mediaDevices) setError('Este navegador no permite usar la cámara (se requiere HTTPS). Usa el campo de código o la lista.');

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  if (error) return <p role="alert" className="text-xs rounded-lg p-2.5 border bg-amber-50 border-amber-200 text-amber-800">{error}</p>;
  return <video ref={videoRef} muted playsInline className="w-full max-w-sm rounded-xl bg-black aspect-square object-cover" />;
}
