import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  RATING_FIELDS,
  RatingField,
  SurveyResults,
  SurveyStats,
  getEventsWebSocketUrl,
  getSurveyViewerResults,
} from '../../../services/events';
import { useLatestOnly } from '../../admin/events/hooks/useLatestOnly';
import { useLiveRefresh } from '../hooks/useLiveRefresh';

const LABEL: Record<RatingField, string> = {
  overall_rating: 'Experiencia general', content_rating: 'Contenido', speakers_rating: 'Presentadores', organization_rating: 'Organización',
};
const GROUPS: { key: string; label: string }[] = [
  { key: 'investor:in_person', label: 'Inversionistas presenciales' },
  { key: 'investor:virtual', label: 'Inversionistas virtuales' },
  { key: 'external:in_person', label: 'Externos presenciales' },
  { key: 'external:virtual', label: 'Externos virtuales' },
];
const groupLabel = (key: string) => GROUPS.find((g) => g.key === key)?.label ?? key;
const fmt = (n: number | null | undefined) => (n === null || n === undefined ? '—' : n.toFixed(2));

function nps(stats: SurveyStats) {
  const s = stats.nps.score;
  const color = s === null ? 'text-slate-500' : s >= 50 ? 'text-green-400' : s >= 0 ? 'text-amber-400' : 'text-red-400';
  return <span className={color}>{s === null ? '—' : s}</span>;
}

/**
 * Resultados de la encuesta para quien presenta. Se abre con un enlace secreto (sin iniciar sesión), es de solo lectura,
 * anónimo, y se actualiza solo: el servidor avisa por WebSocket cada respuesta nueva y la página vuelve a pedir los datos.
 * Pensada para verse en pantalla grande (fondo oscuro, números grandes).
 */
export function EventSurveyViewerPage() {
  const { token = '' } = useParams();
  const [data, setData] = useState<SurveyResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [flash, setFlash] = useState(false);
  const { startRead } = useLatestOnly();

  const load = useCallback(async () => {
    const isFresh = startRead();
    try {
      const d = await getSurveyViewerResults(token);
      if (!isFresh()) return;
      setData((prev) => {
        if (prev && d.overall.total > prev.overall.total) setFlash(true); // destello cuando entra una respuesta nueva
        return d;
      });
      setUpdatedAt(new Date());
      setError(null);
    } catch (e: any) {
      if (isFresh()) setError(e?.message || 'No se pudieron cargar los resultados.');
    }
  }, [token, startRead]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(false), 1500);
    return () => clearTimeout(t);
  }, [flash]);

  // Aviso en vivo por cada respuesta nueva; el refresco cada 10 s es solo una red de seguridad
  useLiveRefresh(token ? getEventsWebSocketUrl(`/survey-viewer/${encodeURIComponent(token)}/ws`) : null, load, 10000, { scopes: ['survey'] });

  const total = data?.overall.total ?? 0;
  const rate = data && data.eligible_attendees > 0 ? Math.round((total * 100) / data.eligible_attendees) : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-white px-4 sm:px-8 py-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-widest text-orange-400 uppercase">{data?.event_title || 'Gloint Power Tech'}</p>
            <h1 className="mt-1 text-2xl sm:text-4xl font-extrabold">Resultados de la encuesta</h1>
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
            En vivo{updatedAt ? ` · actualizado ${updatedAt.toLocaleTimeString('es-CO')}` : ''}
          </div>
        </header>

        {error && !data && <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 text-red-300 p-4">{error}</p>}
        {error && data && <p role="status" className="rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-300 text-sm p-3">Sin conexión con el servidor: se muestran los últimos datos. {error}</p>}
        {!data && !error && <p className="text-slate-400">Cargando…</p>}

        {data && (
          <>
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div className={`rounded-2xl border py-6 transition-colors duration-700 ${flash ? 'border-orange-400 bg-orange-500/15' : 'border-slate-800 bg-slate-900'}`}>
                <p className="text-5xl sm:text-6xl font-extrabold">{total}<span className="text-2xl font-medium text-slate-500"> / {data.eligible_attendees}</span></p>
                <p className="mt-1 text-sm text-slate-400">Respuestas ({rate}%)</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900 py-6">
                <p className="text-5xl sm:text-6xl font-extrabold">{nps(data.overall)}</p>
                <p className="mt-1 text-sm text-slate-400">NPS (de −100 a 100)</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900 py-6">
                <p className="text-5xl sm:text-6xl font-extrabold">{fmt(data.overall.averages.overall_rating)}</p>
                <p className="mt-1 text-sm text-slate-400">Experiencia general (de 5)</p>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6 space-y-4">
              {RATING_FIELDS.map((f) => (
                <div key={f} className="grid grid-cols-[140px_1fr_56px] sm:grid-cols-[200px_1fr_70px] items-center gap-3 sm:gap-4">
                  <span className="text-sm sm:text-lg text-slate-300">{LABEL[f]}</span>
                  <div className="h-3 sm:h-4 rounded-full bg-slate-800 overflow-hidden" aria-hidden="true">
                    <div className="h-full bg-orange-500 transition-all duration-700" style={{ width: `${((data.overall.averages[f] ?? 0) / 5) * 100}%` }} />
                  </div>
                  <span className="text-lg sm:text-2xl font-bold text-right">{fmt(data.overall.averages[f])}</span>
                </div>
              ))}
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6 overflow-x-auto">
              <h2 className="text-sm font-bold text-slate-300 mb-3">Por grupo</h2>
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800">
                    <th className="py-2 pr-4 font-semibold">Grupo</th>
                    <th className="py-2 pr-4 font-semibold">Resp.</th>
                    <th className="py-2 pr-4 font-semibold">NPS</th>
                    {RATING_FIELDS.map((f) => <th key={f} className="py-2 pr-4 font-semibold">{LABEL[f]}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {GROUPS.map((g) => {
                    const s = data.groups[g.key];
                    return (
                      <tr key={g.key} className="border-b border-slate-800/70">
                        <td className="py-2.5 pr-4 font-semibold">{g.label}</td>
                        <td className="py-2.5 pr-4">{s?.total ?? 0}</td>
                        <td className="py-2.5 pr-4 font-bold">{s ? nps(s) : '—'}</td>
                        {RATING_FIELDS.map((f) => <td key={f} className="py-2.5 pr-4">{fmt(s?.averages[f])}</td>)}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>

            <section>
              <h2 className="text-sm font-bold text-slate-300">Comentarios recientes</h2>
              <ul className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.recent_comments.map((c, i) => (
                  <li key={`${c.created_at}-${i}`} className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-base sm:text-lg break-words">
                    “{c.comment}”
                    <span className="block text-xs text-slate-500 mt-2">{groupLabel(c.group)}</span>
                  </li>
                ))}
                {data.recent_comments.length === 0 && <li className="text-slate-500">Aún no hay comentarios.</li>}
              </ul>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
