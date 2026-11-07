import { useEffect, useRef } from 'react';

const COLORS = ['#f97316', '#0ea5e9', '#a855f7', '#22c55e', '#ef4444', '#eab308', '#14b8a6', '#ec4899'];
const SPIN_MS = 7000;

interface Props {
  names: string[];
  /** Posición (en `names`) del participante en el que debe parar la ruleta; el resultado ya lo decidió el servidor */
  targetIndex: number;
  onDone: () => void;
}

/**
 * Ruleta de nombres para la pantalla del presentador. Solo es la animación: quién sale o gana lo decide el servidor
 * al azar y la ruleta aterriza en esa persona (con un pequeño desfase dentro de su sector para que se vea natural).
 */
export function RaffleWheel({ names, targetIndex, onDone }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || names.length === 0) { doneRef.current(); return; }
    const size = Math.min(window.innerWidth * 0.9, window.innerHeight * 0.68, 760);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) { doneRef.current(); return; }
    ctx.scale(dpr, dpr);

    const n = names.length;
    const seg = (2 * Math.PI) / n;
    const cx = size / 2;
    const cy = size / 2 + 14;
    const radius = size / 2 - 24;
    const jitter = (Math.random() - 0.5) * seg * 0.6;
    const final = 6 * 2 * Math.PI - (targetIndex + 0.5) * seg + jitter;

    const draw = (rot: number) => {
      ctx.clearRect(0, 0, size, size);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      for (let i = 0; i < n; i++) {
        const a0 = -Math.PI / 2 + i * seg;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, a0, a0 + seg);
        ctx.closePath();
        ctx.fillStyle = COLORS[i % COLORS.length];
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.save();
        ctx.rotate(a0 + seg / 2);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.font = `bold ${Math.max(9, Math.min(22, (radius * seg) * 0.7))}px sans-serif`;
        ctx.fillText(names[i], radius - 12, 0, radius * 0.62);
        ctx.restore();
      }
      ctx.restore();
      // centro y puntero fijo (arriba)
      ctx.beginPath();
      ctx.arc(cx, cy, 26, 0, 2 * Math.PI);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#fff';
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - 20, 2);
      ctx.lineTo(cx + 20, 2);
      ctx.lineTo(cx, 46);
      ctx.closePath();
      ctx.fillStyle = '#facc15';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#0f172a';
      ctx.stroke();
    };

    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / SPIN_MS);
      const eased = 1 - Math.pow(1 - t, 4);
      draw(final * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else doneRef.current();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [names, targetIndex]);

  return <canvas ref={canvasRef} aria-label="Ruleta de participantes" role="img" className="mx-auto drop-shadow-2xl" />;
}
