import React from 'react';
import { FolderKanban, TrendingUp, Users, CheckCircle2, ArrowRight, DollarSign, Calendar } from 'lucide-react';
import { CRMProject } from '../../../services/crmService';

interface ProjectGridProps {
  projects: CRMProject[];
  onSelectProject: (projectId: number) => void;
  onCreateProject: () => void;
}

export const ProjectGrid: React.FC<ProjectGridProps> = ({
  projects,
  onSelectProject,
  onCreateProject
}) => {
  return (
    <div className="space-y-6">
      {/* Header secundario de Proyectos */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 font-outfit">Proyectos de Inversión</h2>
          <p className="text-xs text-slate-500">Selecciona un proyecto para abrir su pipeline comercial o crea uno nuevo</p>
        </div>
        <button
          onClick={onCreateProject}
          className="px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-xl shadow-sm shadow-brand-500/20 flex items-center gap-2 transition-all active:scale-95"
        >
          <FolderKanban className="w-4 h-4" />
          <span>Nuevo Proyecto</span>
        </button>
      </div>

      {/* Grid de Tarjetas de Proyectos */}
      {projects.length === 0 ? (
        <div className="p-12 bg-white rounded-3xl border border-slate-200 text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-brand-50 text-brand-500 flex items-center justify-center mx-auto border border-brand-100">
            <FolderKanban className="w-8 h-8 opacity-80" />
          </div>
          <h3 className="text-base font-bold text-slate-900 font-outfit">No hay proyectos registrados</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Crea tu primer Proyecto de Inversión para estructurar metas de capital y gestionar prospectos.
          </p>
          <button
            onClick={onCreateProject}
            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-xl transition-all"
          >
            Crear Primer Proyecto
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((project) => {
            const isCompleted = project.status === 'meta_alcanzada' || project.progress_percentage >= 100;

            return (
              <div
                key={project.id}
                onClick={() => onSelectProject(project.id)}
                className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-brand-300 transition-all cursor-pointer group flex flex-col justify-between space-y-4"
              >
                <div>
                  {/* Top Bar de la Tarjeta */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold text-[10px] rounded-lg font-outfit tracking-wide">
                      {project.code}
                    </span>
                    <span
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                        isCompleted
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : project.status === 'en_pausa'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-brand-50 text-brand-700 border border-brand-200'
                      }`}
                    >
                      {isCompleted ? 'Meta Cumplida 🏆' : project.status}
                    </span>
                  </div>

                  {/* Nombre y Descripción */}
                  <h3 className="text-lg font-extrabold text-slate-900 font-outfit group-hover:text-brand-600 transition-colors leading-snug">
                    {project.name}
                  </h3>
                  {project.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {project.description}
                    </p>
                  )}
                </div>

                {/* Métricas y Barra de Progreso */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-500">Recaudado / Meta</span>
                    <span className="text-slate-900 font-bold font-outfit">
                      ${project.raised_amount.toLocaleString()} / ${project.target_amount.toLocaleString()} COP
                    </span>
                  </div>

                  {/* Barra de Progreso */}
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCompleted ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-brand-500 to-amber-400'
                      }`}
                      style={{ width: `${Math.min(100, project.progress_percentage)}%` }}
                    />
                  </div>
                  <div className="text-right text-[11px] font-bold text-brand-600 font-outfit">
                    {project.progress_percentage}% Recaudado
                  </div>

                  {/* Footer Stats & Acción */}
                  <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 font-semibold text-slate-700">
                        <Users className="w-3.5 h-3.5 text-brand-500" />
                        {project.total_leads} Prospectos
                      </span>
                    </div>

                    <span className="text-brand-600 group-hover:translate-x-1 transition-transform flex items-center gap-1 text-xs font-bold font-outfit">
                      Ver Pipeline <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
