import { useEffect, useRef, useState } from 'react';
/** Lo que necesita el contador de cualquier ronda (dinámica de preguntas o rifa): su id, estado y segundos restantes. */
export interface CountdownRound {
  id: number;
  status: string;
  seconds_left: number | null;
}

/**
 * Cuenta regresiva de la ronda abierta. Se sincroniza con el servidor cada vez que llega el estado (`seconds_left`), así
 * no depende del reloj del celular. Al llegar a cero pide el estado de nuevo (`onZero`): es el servidor quien cierra la
 * ronda; si todavía la ve abierta por unos milisegundos, reintenta cada segundo.
 */
export function useRoundCountdown(round: CountdownRound | null, onZero: () => void): number | null {
  const deadline = useRef<number | null>(null);
  const [left, setLeft] = useState<number | null>(null);
  const onZeroRef = useRef(onZero);
  onZeroRef.current = onZero;

  useEffect(() => {
    deadline.current = round?.status === 'open' && round.seconds_left !== null && round.seconds_left !== undefined
      ? Date.now() + round.seconds_left * 1000
      : null;
    setLeft(deadline.current === null ? null : Math.ceil((deadline.current - Date.now()) / 1000));
  }, [round?.id, round?.status, round?.seconds_left]);

  useEffect(() => {
    let lastZero = 0;
    const id = setInterval(() => {
      if (deadline.current === null) { setLeft((l) => (l === null ? l : null)); return; }
      const remaining = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining === 0 && Date.now() - lastZero > 1000) {
        lastZero = Date.now();
        onZeroRef.current();
      }
    }, 250);
    return () => clearInterval(id);
  }, []);

  return left;
}

export const formatCountdown = (seconds: number | null): string => {
  if (seconds === null) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};
