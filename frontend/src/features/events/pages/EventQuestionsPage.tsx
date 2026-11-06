import { useParams } from 'react-router-dom';
import { QuestionsPanel } from '../components/QuestionsPanel';

/** Preguntas para quienes asisten (sobre todo presenciales) con su enlace personal; no requiere sesión. */
export function EventQuestionsPage() {
  const { token = '' } = useParams();
  return (
    <div className="pt-24 pb-16 min-h-screen bg-slate-50 px-4">
      <div className="max-w-2xl mx-auto">
        <p className="text-xs font-bold tracking-widest text-orange-600 uppercase">Gloint Power Tech</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Preguntas para los presentadores</h1>
        <QuestionsPanel token={token} />
      </div>
    </div>
  );
}
