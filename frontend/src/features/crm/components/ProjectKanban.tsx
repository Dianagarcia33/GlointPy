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
  FileText
} from 'lucide-react';
import { CRMProject, CRMLead, CRMLeadStage, crmService } from '../../../services/crmService';

interface ProjectKanbanProps {
  project: CRMProject;
  leads: CRMLead[];
  onSelectLead: (lead: CRMLead) => void;
  onCreateLead: () => void;
  onRefreshLeads: () => void;
}

export const ProjectKanban: React.FC<ProjectKanbanProps> = ({
  project,
  leads,
  onSelectLead,
  onCreateLead,
  onRefreshLeads
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const stages: { key: CRMLeadStage; title: string; badgeColor: string; headerBg: string }[] = [
    { key: 'lead_entrante', title: '1. Lead Entrante', badgeColor: 'bg-slate-100 text-slate-700', headerBg: 'bg-slate-100/80 border-slate-200' },
    { key: 'contactado', title: '2. Contactado', badgeColor: 'bg-blue-100 text-blue-700', headerBg: 'bg-blue-50/80 border-blue-200' },
    { key: 'cita_presentacion', title: '3. Presentación', badgeColor: 'bg-indigo-100 text-indigo-700', headerBg: 'bg-indigo-50/80 border-indigo-200' },
    { key: 'negociacion', title: '4. Negociación', badgeColor: 'bg-amber-100 text-amber-700', headerBg: 'bg-amber-50/80 border-amber-200' },
    { key: 'cierre_ganado', title: '5. Cierre Ganado 🏆', badgeColor: 'bg-emerald-100 text-emerald-800', headerBg: 'bg-emerald-50/80 border-emerald-200' },
    { key: 'perdido', title: '6. Perdido ❌', badgeColor: 'bg-rose-100 text-rose-700', headerBg: 'bg-rose-50/80 border-rose-200' }
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
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-brand-50 text-brand-700 font-bold text-xs rounded-md font-outfit">
              {project.code}
            </span>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 font-outfit">{project.name}</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Meta: <strong>${project.target_amount.toLocaleString()} COP</strong> • Recaudado: <strong>${project.raised_amount.toLocaleString()} COP ({project.progress_percentage}%)</strong>
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
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-brand-500"
            />
          </div>

          <button
            onClick={onCreateLead}
            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-xl shadow-sm shadow-brand-500/20 flex items-center gap-1.5 transition-all flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Lead</span>
          </button>
        </div>
      </div>

      {/* Tablero Kanban (6 Columnas) */}
      <div className="overflow-x-auto pb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3.5 min-w-[1100px]">
          {stages.map((st) => {
            const columnLeads = filteredLeads.filter((l) => l.stage === st.key);
            const columnTotal = columnLeads.reduce((acc, l) => acc + (l.estimated_amount || 0), 0);

            return (
              <div key={st.key} className="flex flex-col bg-slate-100/60 rounded-3xl p-3 border border-slate-200/80 min-h-[500px]">
                {/* Header Columna */}
                <div className={`p-3 rounded-2xl border ${st.headerBg} mb-3 flex items-center justify-between shadow-xs`}>
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-900 font-outfit leading-tight">{st.title}</h3>
                    <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
                      ${columnTotal.toLocaleString()} COP
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 text-[11px] font-bold rounded-lg ${st.badgeColor}`}>
                    {columnLeads.length}
                  </span>
                </div>

                {/* Feed de Tarjetas de Prospectos */}
                <div className="flex-1 space-y-2.5 overflow-y-auto pr-0.5">
                  {columnLeads.length === 0 ? (
                    <div className="p-4 text-center text-[11px] text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                      Sin prospectos
                    </div>
                  ) : (
                    columnLeads.map((lead) => (
                      <div
                        key={lead.id}
                        onClick={() => onSelectLead(lead)}
                        className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs hover:shadow-md hover:border-brand-300 transition-all cursor-pointer group relative flex flex-col justify-between space-y-2.5"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <h4 className="text-xs font-extrabold text-slate-900 font-outfit group-hover:text-brand-600 transition-colors truncate">
                              {lead.name}
                            </h4>
                          </div>

                          <div className="text-xs font-bold text-brand-600 font-outfit">
                            ${lead.estimated_amount.toLocaleString()} COP
                          </div>
                        </div>

                        {/* Info secundaria */}
                        <div className="text-[10px] text-slate-500 space-y-0.5 pt-2 border-t border-slate-100">
                          {lead.phone && <div className="truncate">📞 {lead.phone}</div>}
                          <div className="truncate">👤 {lead.commercial_name}</div>
                        </div>

                        {/* Botón rápido de movimiento si no está finalizado */}
                        {st.key !== 'cierre_ganado' && st.key !== 'perdido' && (
                          <div className="pt-1 flex items-center justify-end">
                            <button
                              onClick={(e) => {
                                const nextIndex = stages.findIndex((s) => s.key === st.key) + 1;
                                if (nextIndex < stages.length) {
                                  handleQuickMove(e, lead.id, stages[nextIndex].key);
                                }
                              }}
                              className="px-2 py-1 bg-slate-100 hover:bg-brand-50 text-slate-600 hover:text-brand-600 rounded-lg text-[10px] font-bold transition-all flex items-center gap-0.5"
                              title="Avanzar a la siguiente etapa"
                            >
                              <span>Avanzar</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))
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
