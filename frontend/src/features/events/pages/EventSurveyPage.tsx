import { useParams } from 'react-router-dom';
import { SurveyPanel } from '../components/SurveyPanel';

/** Encuesta de satisfacción con el enlace personal del inscrito (sobre todo presenciales); no requiere sesión. */
export function EventSurveyPage() {
  const { token = '' } = useParams();
  return (
    <div className="pt-24 pb-16 min-h-screen bg-slate-50 px-4">
      <div className="max-w-2xl mx-auto">
        <p className="text-xs font-bold tracking-widest text-orange-600 uppercase">Gloint Power Tech</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Cuéntanos cómo te fue</h1>
        <SurveyPanel token={token} />
        <p className="mt-6 text-sm text-slate-500">Si la encuesta no aparece, aún no está abierta: esta página se actualiza sola cuando el equipo la habilite.</p>
      </div>
    </div>
  );
}
