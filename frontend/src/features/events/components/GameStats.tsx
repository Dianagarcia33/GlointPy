const LETTERS = ['A', 'B', 'C', 'D'];

interface GameStatsProps {
  distribution: number[];
  /** Textos de las opciones: solo el celular y el panel del equipo los tienen; la pantalla muestra solo las letras */
  options?: string[];
  /** 'screen' = proyector (grande, fondo oscuro); 'phone' = celular (fondo oscuro); 'admin' = panel (fondo claro) */
  variant?: 'screen' | 'phone' | 'admin';
}

/** Barras con cuántas personas eligieron cada opción. Solo cifras: no hay nombres. */
export function GameStats({ distribution, options = [], variant = 'screen' }: GameStatsProps) {
  const total = distribution.reduce((a, b) => a + b, 0);
  const size = variant === 'screen'
    ? { badge: 'w-12 h-12 text-xl', bar: 'h-8', num: 'text-xl sm:text-2xl', gap: 'gap-4', row: 'grid-cols-[3rem_1fr_9rem]' }
    : variant === 'phone'
      ? { badge: 'w-8 h-8 text-sm', bar: 'h-4', num: 'text-sm', gap: 'gap-3', row: 'grid-cols-[2rem_1fr_5.5rem]' }
      : { badge: 'w-6 h-6 text-xs', bar: 'h-3', num: 'text-xs', gap: 'gap-2', row: 'grid-cols-[1.5rem_1fr_5rem]' };
  const light = variant === 'admin';

  return (
    <ul className="space-y-3" data-testid="stats">
      {distribution.map((count, i) => {
        const pct = total > 0 ? Math.round((count * 100) / total) : 0;
        return (
          <li key={i} className={`grid items-center ${size.gap} ${size.row}`}>
            <span className={`${size.badge} rounded-full bg-orange-500 text-white flex items-center justify-center font-extrabold`}>{LETTERS[i]}</span>
            <div>
              {options[i] && <p className={`mb-1 truncate ${light ? 'text-xs text-slate-600' : 'text-sm text-slate-300'}`}>{options[i]}</p>}
              <div className={`${size.bar} rounded-full overflow-hidden ${light ? 'bg-slate-100' : 'bg-white/10'}`} aria-hidden="true">
                <div className="h-full bg-orange-500 transition-all duration-700" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <span className={`${size.num} font-bold tabular-nums text-right ${light ? 'text-slate-900' : 'text-white'}`}>
              {count} <span className={light ? 'text-slate-400' : 'text-slate-400 text-[0.8em]'}>({pct} %)</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
