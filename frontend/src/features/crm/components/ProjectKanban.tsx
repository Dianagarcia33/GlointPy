import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  User, 
  DollarSign, 
  Phone, 
  Mail, 
  ArrowRight, 
  ChevronRight, 
  Trophy, 
  XCircle, 
  MessageSquare,
  FileText,
  Edit3,
  Trash2
} from 'lucide-react';
import { CRMProject, CRMLead, CRMLeadStage, crmService } from '../../../services/crmService';

interface ProjectKanbanProps {
  project: CRMProject;
  leads: CRMLead[];
  onSelectLead: (lead: CRMLead) => void;
  onCreateLead: () => void;
  onRefreshLeads: () => void;
  onEditProject?: (project: CRMProject) => void;
  onDeleteProject?: (project: CRMProject) => void;
}

export const ProjectKanban: React.FC<ProjectKanbanProps> = ({
  project,
  leads,
  onSelectLead,
  onCreateLead,
  onRefreshLeads,
  onEditProject,
  onDeleteProject
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const stages: { key: CRMLeadStage; title: string; badgeColor: string; headerBg: string }[] = [
    { key: 'lead_entrante', title: '1. Lead Entrante', badgeColor: 'bg-slate-100 text-slate-700', headerBg: 'bg-slate-100/80 border-slate-200' },
    { key: 'contactado', title: '2. Contactado', badgeColor: 'bg-blue-100 text-blue-800', headerBg: 'bg-blue-50/80 border-blue-200' },
    { key: 'cita_presentacion', title: '3. Presentación', badgeColor: 'bg-indigo-100 text-indigo-800', headerBg: 'bg-indigo-50/80 border-indigo-200' },
    { key: 'negociacion', title: '4. Negociación', badgeColor: 'bg-amber-100 text-amber-900', headerBg: 'bg-amber-50/80 border-amber-200' },
    { key: 'cierre_ganado', title: '5. Cierre Ganado 🏆', badgeColor: 'bg-emerald-100 text-emerald-900', headerBg: 'bg-emerald-50/80 border-emerald-200' },
    { key: 'perdido', title: '6. Perdido ❌', badgeColor: 'bg-rose-100 text-rose-800', headerBg: 'bg-rose-50/80 border-rose-200' }
  ];

  const filteredLeads = leads.filter((l) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return l.name.toLowerCase().includes(term) || (l.phone && l.phone.includes(term)) || (l.email && l.email.toLowerCase().includes(term));
  });

  const handleQuickMove = async (e: React.MouseEvent, leadId: number, nextStage: CRMLeadStage) => {
    e.stopPropagation();
    try {
      await crmService.updateLeadStage(leadId, { stage: nextStage });
      onRefreshLeads();
    } catch (err: any) {
      alert(err.message || 'Error al mover etapa');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header del Kanban */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 bg-brand-50 text-brand-700 font-bold text-xs rounded-xl font-montserrat">
              {project.code}
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-montserrat">{project.name}</h2>
            
            <div className="flex items-center gap-1 ml-2">
              {onEditProject && (
                <button
                  type="button"
                  onClick={() => onEditProject(project)}
                  title="Editar Proyecto"
                  className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-all cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              )}
              {onDeleteProject && (
                <button
                  type="button"
                  onClick={() => onDeleteProject(project)}
                  title="Eliminar Proyecto"
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-sans">
            Meta: <strong className="font-montserrat">${project.target_amount.toLocaleString('es-CO')} COP</strong> • Recaudado: <strong className="font-montserrat">${project.raised_amount.toLocaleString('es-CO')} COP ({project.progress_percentage}%)</strong>
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Búsqueda */}
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar prospecto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-brand-500 font-sans"
            />
          </div>

          <button
            onClick={onCreateLead}
            className="px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-2xl shadow-sm shadow-brand-500/20 flex items-center gap-1.5 transition-all flex-shrink-0 font-montserrat cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Lead</span>
          </button>
        </div>
      </div>

      {/* Tablero Kanban (6 Columnas) */}
      <div className="overflow-x-auto pb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 min-w-[1200px]">
          {stages.map((stg, colIdx) => {
            const columnLeads = filteredLeads.filter((l) => l.stage === stg.key);
            const totalColAmount = columnLeads.reduce((acc, curr) => acc + (curr.estimated_amount || 0), 0);

            return (
              <div key={stg.key} className="bg-slate-50/80 rounded-3xl p-3.5 border border-slate-200/80 flex flex-col h-[700px]">
                {/* Header de Columna */}
                <div className={`p-3 rounded-2xl border mb-3 flex flex-col justify-between ${stg.headerBg}`}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-xs text-slate-900 font-montserrat">{stg.title}</h3>
                    <span className="w-5 h-5 rounded-full bg-white text-slate-900 text-[10px] font-bold flex items-center justify-center shadow-2xs font-montserrat">
                      {columnLeads.length}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 mt-1 font-mono">
                    ${totalColAmount.toLocaleString('es-CO')}
                  </span>
                </div>

                {/* Lista de Tarjetas (Scrollable) */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {columnLeads.map((lead) => (
                    <div
                      key={lead.id}
                      onClick={() => onSelectLead(lead)}
                      className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-brand-300 transition-all cursor-pointer group flex flex-col justify-between space-y-2"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="font-extrabold text-xs text-slate-900 group-hover:text-brand-600 transition-colors font-montserrat">
                            {lead.name}
                          </h4>
                          {lead.source && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-sans shrink-0">
                              {lead.source}
                            </span>
                          )}
                        </div>

                        {lead.phone && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{lead.phone}</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="font-extrabold text-slate-900 font-mono text-[11px]">
                          ${lead.estimated_amount.toLocaleString('es-CO')}
                        </span>

                        {/* Botón rápido mover a siguiente etapa */}
                        {colIdx < stages.length - 2 && (
                          <button
                            onClick={(e) => handleQuickMove(e, lead.id, stages[colIdx + 1].key)}
                            title={`Avanzar a ${stages[colIdx + 1].title}`}
                            className="p-1 text-slate-300 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {columnLeads.length === 0 && (
                    <div className="h-32 border-2 border-dashed border-slate-200/80 rounded-2xl flex items-center justify-center p-4 text-center">
                      <span className="text-[11px] text-slate-400 font-medium font-sans">Sin prospectos</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
