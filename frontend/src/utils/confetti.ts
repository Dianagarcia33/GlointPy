import confetti from 'canvas-confetti';

/**
 * Dispara una ráfaga de confeti elegante y festiva (tonos dorados, cian, esmeralda y blanco)
 * para celebrar la confirmación exitosa de asistencia al evento Gloint Power Tech.
 */
export const triggerRsvpConfetti = () => {
  // 1. Ráfaga central con mezcla de partículas premium
  confetti({
    particleCount: 75,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#f59e0b', '#fbbf24', '#06b6d4', '#10b981', '#ffffff', '#e0e7ff'],
    zIndex: 99999,
    disableForReducedMotion: true,
  });

  // 2. Cañón lateral izquierdo
  setTimeout(() => {
    confetti({
      particleCount: 45,
      angle: 60,
      spread: 55,
      origin: { x: 0.15, y: 0.65 },
      colors: ['#f59e0b', '#fbbf24', '#06b6d4', '#10b981'],
      zIndex: 99999,
      disableForReducedMotion: true,
    });
  }, 180);

  // 3. Cañón lateral derecho
  setTimeout(() => {
    confetti({
      particleCount: 45,
      angle: 120,
      spread: 55,
      origin: { x: 0.85, y: 0.65 },
      colors: ['#f59e0b', '#fbbf24', '#06b6d4', '#10b981'],
      zIndex: 99999,
      disableForReducedMotion: true,
    });
  }, 360);
};
