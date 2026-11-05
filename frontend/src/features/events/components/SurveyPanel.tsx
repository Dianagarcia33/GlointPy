import { useCallback, useEffect, useState } from 'react';
import {
  RATING_FIELDS,
  RatingField,
  SurveyStatus,
  getEventsWebSocketUrl,
  getSurveyStatus,
  submitSurvey,
} from '../../../services/events';
import { useLiveRefresh } from '../hooks/useLiveRefresh';

const LABELS: Record<RatingField, string> = {
  overall_rating: 'Tu experiencia general',
  content_rating: 'El contenido de las presentaciones',
  speakers_rating: 'Los presentadores',
  organization_rating: 'La organización (y la transmisión, si te conectaste en línea)',
};

function Scale({ name, label, min, max, value, onChange }: {
  name: string; label: string; min: number; max: number; value: number | null; onChange: (v: number) => void;
}) {
  const options = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <fieldset className="mt-4">
      <legend className="text-sm font-semibold text-slate-800">{label}</legend>
      <div role="radiogroup" aria-label={label} className="mt-2 flex flex-wrap gap-2">
        {options.map((n) => (
          <button key={n} type="button" role="radio" aria-checked={value === n} name={name} onClick={() => onChange(n)}
            className={`min-w-10 h-10 rounded-lg border text-sm font-bold ${value === n ? 'bg-orange-500 border-orange-500 text-white' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
            {n}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Encuesta de satisfacción en vivo para presenciales y virtuales. Se habilita cuando el equipo la abre
 * (aparece sola por el aviso en vivo) y cada inscrito responde una sola vez.
 */
export function SurveyPanel({ token }: { token: string }) {
  const [status, setStatus] = useState<SurveyStatus | null>(null);
  const [ratings, setRatings] = useState<Partial<Record<RatingField, number>>>({});
  const [nps, setNps] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const load = useCallback(async () => {
    try {
      setStatus(await getSurveyStatus(token));
    } catch (e: any) {
      setError(e?.message || 'No se pudo cargar la encuesta.');
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);
  // Solo avisos de la encuesta (abrir/cerrar), con espera aleatoria
  useLiveRefresh(getEventsWebSocketUrl(`/questions/${encodeURIComponent(token)}/ws`), load, 30000, { scopes: ['survey'], jitterMs: 3000 });

  const complete = RATING_FIELDS.every((f) => ratings[f]) && nps !== null;

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complete || nps === null) return;
    setBusy(true);
    setError(null);
    try {
      await submitSurvey(token, {
        overall_rating: ratings.overall_rating!, content_rating: ratings.content_rating!,
        speakers_rating: ratings.speakers_rating!, organization_rating: ratings.organization_rating!,
        nps, comment: comment.trim() || undefined,
      });
      setDone(true);
    } catch (err: any) {
      setError(err?.message || 'No se pudo enviar la encuesta.');
      load();
    } finally {
      setBusy(false);
    }
  };

  if (!status) return error ? <p role="alert" className="mt-6 text-sm text-red-700">{error}</p> : null;
  if (!status.survey_open && !done && !status.already_answered) return null; // aún no se abre: no estorba en la sala

  return (
    <section className="mt-6 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
      <h2 className="text-lg font-bold text-slate-900">Encuesta de satisfacción</h2>

      {(done || status.already_answered) ? (
        <p className="mt-3 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm p-3">¡Gracias por tu opinión! Ya registramos tu respuesta.</p>
      ) : (
        <form onSubmit={send}>
          <p className="mt-1 text-sm text-slate-600">Son 5 preguntas rápidas y tu respuesta es anónima para el resto de asistentes.</p>
          {RATING_FIELDS.map((f) => (
            <Scale key={f} name={f} label={`${LABELS[f]} (1 = muy mal, 5 = excelente)`} min={1} max={5}
              value={ratings[f] ?? null} onChange={(v) => setRatings((r) => ({ ...r, [f]: v }))} />
          ))}
          <Scale name="nps" label="¿Qué tan probable es que recomiendes este evento? (0 = nada, 10 = totalmente)" min={0} max={10}
            value={nps} onChange={setNps} />
          <label htmlFor="survey-comment" className="mt-4 block text-sm font-semibold text-slate-800">Comentarios (opcional)</label>
          <textarea id="survey-comment" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} rows={3}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          {error && <p role="alert" className="mt-3 text-xs rounded-lg p-2.5 border bg-red-50 border-red-200 text-red-700">{error}</p>}
          <button type="submit" disabled={busy || !complete}
            className="mt-4 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-semibold px-6 py-2.5">
            Enviar encuesta
          </button>
        </form>
      )}
    </section>
  );
}
