import React from 'react';

/**
 * Esqueletos de carga compartidos por los módulos. Mismo estilo que el del dashboard:
 * barras slate sobre tarjetas blancas con animate-pulse (se detiene con prefers-reduced-motion).
 */

const PULSE = 'animate-pulse motion-reduce:animate-none';
const BAR_WIDTHS = ['w-24', 'w-40', 'w-28', 'w-20', 'w-32', 'w-16', 'w-36', 'w-24'];

/** Barra o bloque genérico. Decorativo: los lectores de pantalla lo ignoran. */
export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div aria-hidden="true" className={`${PULSE} bg-slate-200 rounded-lg ${className}`} />
);

/** Envuelve un esqueleto y anuncia la carga una sola vez a los lectores de pantalla. */
export const SkeletonRegion: React.FC<{ label?: string; className?: string; children: React.ReactNode }> = ({
  label = 'Cargando…',
  className = '',
  children,
}) => (
  <div role="status" aria-busy="true" aria-live="polite" className={className}>
    <span className="sr-only">{label}</span>
    {children}
  </div>
);

/** Filas para el `<tbody>` de una tabla mientras carga. */
export const SkeletonTableRows: React.FC<{ rows?: number; cols: number; label?: string }> = ({
  rows = 6,
  cols,
  label = 'Cargando…',
}) => (
  <>
    {Array.from({ length: rows }).map((_, r) => (
      <tr key={r} aria-hidden={r > 0 ? 'true' : undefined}>
        {Array.from({ length: cols }).map((__, c) => (
          <td key={c} className="px-5 py-4">
            {r === 0 && c === 0 && (
              <span role="status" className="sr-only">
                {label}
              </span>
            )}
            <div aria-hidden="true" className={`${PULSE} h-4 max-w-full rounded bg-slate-200 ${BAR_WIDTHS[(r + c) % BAR_WIDTHS.length]}`} />
          </td>
        ))}
      </tr>
    ))}
  </>
);

/** Filas tipo tabla para contenedores que no usan `<table>` (listas, directorios). */
export const SkeletonTable: React.FC<{ rows?: number; label?: string; className?: string }> = ({
  rows = 6,
  label,
  className = '',
}) => (
  <SkeletonRegion label={label} className={className}>
    <div className="px-5 py-3.5 border-b border-slate-100 flex gap-6 bg-slate-50/60">
      {['w-28', 'w-20', 'w-24', 'w-16'].map((w) => (
        <Skeleton key={w} className={`h-3 ${w} bg-slate-300/70`} />
      ))}
    </div>
    <div className="divide-y divide-slate-100">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="px-5 py-4 flex items-center gap-4">
          <Skeleton className="h-9 w-9 rounded-xl shrink-0 bg-slate-100" />
          <div className="flex-1 space-y-2">
            <Skeleton className={`h-3.5 ${r % 2 ? 'w-1/3' : 'w-1/2'}`} />
            <Skeleton className="h-3 w-1/4 bg-slate-100" />
          </div>
          <Skeleton className="hidden sm:block h-6 w-20 rounded-full bg-slate-100" />
        </div>
      ))}
    </div>
  </SkeletonRegion>
);

/** Lista compacta de tarjetas (paneles laterales, historiales). */
export const SkeletonList: React.FC<{ rows?: number; label?: string; className?: string }> = ({
  rows = 4,
  label,
  className = '',
}) => (
  <SkeletonRegion label={label} className={`space-y-2 ${className}`}>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
        <Skeleton className="h-3.5 w-2/3" />
        <Skeleton className="h-3 w-1/2 bg-slate-100" />
      </div>
    ))}
  </SkeletonRegion>
);

/** Cuadrícula de tarjetas con título, cifra y nota (KPIs, salas, proyectos). */
export const SkeletonCards: React.FC<{ count?: number; label?: string; className?: string }> = ({
  count = 4,
  label,
  className = 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4',
}) => (
  <SkeletonRegion label={label} className={className}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
        <Skeleton className="h-3 w-32 rounded" />
        <Skeleton className="h-7 w-40 bg-slate-300" />
        <Skeleton className="h-3 w-24 bg-slate-100 rounded" />
      </div>
    ))}
  </SkeletonRegion>
);

/** Página completa: encabezado, cifras y una tabla. Para vistas de detalle que cargan de una vez. */
export const SkeletonPage: React.FC<{ label?: string }> = ({ label = 'Cargando…' }) => (
  <SkeletonRegion label={label} className="space-y-6 w-full min-w-0">
    <div className="space-y-3">
      <Skeleton className="h-8 w-64 rounded-xl" />
      <Skeleton className="h-4 w-96 max-w-full bg-slate-100" />
    </div>
    <SkeletonCards />
    <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
      <Skeleton className="h-5 w-48" />
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-14 w-full rounded-xl bg-slate-100" />
      ))}
    </div>
  </SkeletonRegion>
);
