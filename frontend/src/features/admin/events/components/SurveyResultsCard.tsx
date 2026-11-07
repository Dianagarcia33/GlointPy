import { useCallback, useEffect, useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import {
  RATING_FIELDS,
  RatingField,
  SurveyResults,
  SurveyStats,
  getEventsWebSocketUrl,
  getSurveyResults,
  getSurveyViewerLink,
  revokeSurveyViewerLink,
  rotateSurveyViewerLink,
  setSurveyOpen,
} from '../../../../services/events';
import { useLatestOnly } from '../hooks/useLatestOnly';
import { useLiveRefresh } from '../../../events/hooks/useLiveRefresh';

const SHORT: Record<RatingField, string> = {
  overall_rating: 'General', content_rating: 'Contenido', speakers_rating: 'Presentadores', organization_rating: 'Organización',
};
const GROUPS: { key: string; label: string }[] = [
  { key: 'investor:in_person', label: 'Inversionistas presenciales' },
  { key: 'investor:virtual', label: 'Inversionistas virtuales' },
  { key: 'external:in_person', label: 'Externos presenciales' },
  { key: 'external:virtual', label: 'Externos virtuales' },
];
const groupLabel = (key: string) => GROUPS.find((g) => g.key === key)?.label ?? key;
const fmt = (n: number | null) => (n === null ? '—' : n.toFixed(2));

function Bar({ value }: { value: number | null }) {
  return (
    <div className="h-2 rounded-full bg-slate-100 overflow-hidden" aria-hidden="true">
      <div className="h-full bg-orange-500" style={{ width: `${((value ?? 0) / 5) * 100}%` }} />
    </div>
  );
}

function Nps({ stats }: { stats: SurveyStats }) {
  const s = stats.nps.score;
  return <span className={`font-bold ${s === null ? 'text-slate-400' : s >= 50 ? 'text-green-600' : s >= 0 ? 'text-amber-600' : 'text-red-600'}`}>{s === null ? '—' : s}</span>;
}

/** Resultados de la encuesta en vivo, en conjunto y comparados por los cuatro grupos. Anónimos. */
export function SurveyResultsCard() {
  const [data, setData] = useState<SurveyResults | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Enlace secreto para quien presenta (ve los resultados en vivo, sin iniciar sesión)
  const [viewerToken, setViewerToken] = useState<string | null>(null);
  const [linkBusy, setLinkBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const { startRead, invalidate } = useLatestOnly();

  const load = useCallback(async () => {
    const isFresh = startRead();
    try {
      const d = await getSurveyResults();
      if (isFresh()) setData(d);   // si hubo una acción mientras se consultaba, esta respuesta ya es vieja
    } catch {
      // el siguiente aviso en vivo o refresco lo reintenta
    }
  }, [startRead]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { getSurveyViewerLink().then((r) => setViewerToken(r.token)).catch(() => {}); }, []);

  const viewerUrl = viewerToken ? `${window.location.origin}/evento/presentador/${viewerToken}` : '';

  const changeLink = async (action: 'rotate' | 'revoke') => {
    if (action === 'rotate' && viewerToken && !window.confirm('¿Crear un enlace nuevo? El anterior dejará de funcionar.')) return;
    if (action === 'revoke' && !window.confirm('¿Desactivar el enlace? Quien lo tenga ya no podrá ver los resultados.')) return;
    setLinkBusy(true);
    setError(null);
    try {
      const r = action === 'rotate' ? await rotateSurveyViewerLink() : await revokeSurveyViewerLink();
      setViewerToken(r.token);
      setCopied(false);
    } catch (e: any) {
      setError(e?.message || 'No se pudo completar la acción.');
    } finally {
      setLinkBusy(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(viewerUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // sin permiso de portapapeles: se puede seleccionar el enlace a mano
    }
  };
  useLiveRefresh(getEventsWebSocketUrl('/admin/questions/ws'), load, 15000, { scopes: ['survey'] });

  const toggle = async () => {
    if (!data) return;
    if (data.survey_open && !window.confirm('¿Cerrar la encuesta? Nadie podrá responder más, pero se conservan los resultados.')) return;
    setBusy(true);
    setError(null);
    invalidate();
    try {
      setData(await setSurveyOpen(!data.survey_open));
    } catch (e: any) {
      setError(e?.message || 'No se pudo completar la acción.');
    } finally {
      invalidate();
      setBusy(false);
    }
  };

  const total = data?.overall.total ?? 0;
  const rate = data && data.eligible_attendees > 0 ? Math.round((total * 100) / data.eligible_attendees) : 0;

  return (
    <section className="bg-white border border-slate-200 rounded-2xl shadow-xs p-5 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ClipboardCheck className={`w-5 h-5 ${data?.survey_open ? 'text-orange-500' : 'text-slate-400'}`} />
          <div>
            <h2 className="text-sm font-bold text-slate-900">Encuesta de satisfacción en vivo</h2>
            <p className="text-xs text-slate-500">Se habilita para presenciales y virtuales al abrirla. Resultados anónimos, comparados por grupo.</p>
          </div>
        </div>
        <button onClick={toggle} disabled={busy || !data}
          className={`rounded-xl px-4 py-2 text-xs font-bold text-white disabled:opacity-50 ${data?.survey_open ? 'bg-slate-800 hover:bg-slate-900' : 'bg-orange-500 hover:bg-orange-600'}`}>
          {data?.survey_open ? 'Cerrar encuesta' : 'Abrir encuesta'}
        </button>
      </div>

      {error && <p role="alert" className="text-xs rounded-lg p-2.5 border bg-red-50 border-red-200 text-red-700">{error}</p>}

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
        <p className="text-xs font-bold text-slate-700">Enlace para quien presenta</p>
        <p className="text-[11px] text-slate-500">Muestra los resultados en vivo, sin iniciar sesión y solo en lectura. Quien tenga el enlace los ve: compártelo solo con el presentador.</p>
        {viewerToken ? (
          <div className="flex flex-wrap items-center gap-2">
            <input readOnly value={viewerUrl} onFocus={(e) => e.currentTarget.select()}
              aria-label="Enlace para el presentador"
              className="flex-1 min-w-[220px] rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-700" />
            <button onClick={copyLink} className="rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-3 py-1.5">{copied ? '¡Copiado!' : 'Copiar'}</button>
            <a href={viewerUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold px-3 py-1.5">Abrir</a>
            <button onClick={() => changeLink('rotate')} disabled={linkBusy} className="rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold px-3 py-1.5 disabled:opacity-50">Crear uno nuevo</button>
            <button onClick={() => changeLink('revoke')} disabled={linkBusy} className="rounded-lg border border-red-200 bg-white hover:bg-red-50 text-red-700 text-xs font-bold px-3 py-1.5 disabled:opacity-50">Desactivar</button>
          </div>
        ) : (
          <button onClick={() => changeLink('rotate')} disabled={linkBusy} className="rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-2 disabled:opacity-50">Crear enlace para el presentador</button>
        )}
      </div>

      {data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-slate-50 border border-slate-200 py-3">
              <p className="text-xl font-bold text-slate-900">{total}<span className="text-sm font-medium text-slate-500"> / {data.eligible_attendees}</span></p>
              <p className="text-[11px] text-slate-500">Respuestas ({rate}%)</p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 py-3">
              <p className="text-xl"><Nps stats={data.overall} /></p>
              <p className="text-[11px] text-slate-500">NPS (de −100 a 100)</p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 py-3 col-span-2 sm:col-span-1">
              <p className="text-xl font-bold text-slate-900">{fmt(data.overall.averages.overall_rating)}</p>
              <p className="text-[11px] text-slate-500">Experiencia general (de 5)</p>
            </div>
          </div>

          <div className="space-y-2">
            {RATING_FIELDS.map((f) => (
              <div key={f} className="grid grid-cols-[110px_1fr_40px] items-center gap-3 text-xs">
                <span className="text-slate-600">{SHORT[f]}</span>
                <Bar value={data.overall.averages[f]} />
                <span className="font-bold text-slate-900 text-right">{fmt(data.overall.averages[f])}</span>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-3 font-semibold">Grupo</th>
                  <th className="py-2 pr-3 font-semibold">Resp.</th>
                  <th className="py-2 pr-3 font-semibold">NPS</th>
                  {RATING_FIELDS.map((f) => <th key={f} className="py-2 pr-3 font-semibold">{SHORT[f]}</th>)}
                </tr>
              </thead>
              <tbody>
                {GROUPS.map((g) => {
                  const s = data.groups[g.key];
                  return (
                    <tr key={g.key} className="border-b border-slate-100">
                      <td className="py-2 pr-3 font-semibold text-slate-900">{g.label}</td>
                      <td className="py-2 pr-3">{s?.total ?? 0}</td>
                      <td className="py-2 pr-3">{s ? <Nps stats={s} /> : '—'}</td>
                      {RATING_FIELDS.map((f) => <td key={f} className="py-2 pr-3">{fmt(s?.averages[f] ?? null)}</td>)}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div>
            <h3 className="text-xs font-bold text-slate-700">Comentarios recientes</h3>
            <ul className="mt-2 space-y-2">
              {data.recent_comments.map((c, i) => (
                <li key={i} className="rounded-lg border border-slate-200 p-2.5 text-sm text-slate-800 break-words">
                  {c.comment}
                  <span className="block text-[11px] text-slate-400 mt-1">{groupLabel(c.group)}</span>
                </li>
              ))}
              {data.recent_comments.length === 0 && <li className="text-sm text-slate-500">Aún no hay comentarios.</li>}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}
