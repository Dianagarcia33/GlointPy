import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  FolderKanban, 
  TrendingUp, 
  Users, 
  Trophy, 
  DollarSign, 
  Plus, 
  Kanban, 
  ArrowLeft,
  LayoutGrid,
  Filter,
  CheckCircle2,
  PieChart
} from 'lucide-react';

import { crmService, CRMProject, CRMLead, CRMKPIs } from '../../../services/crmService';
import { ProjectGrid } from '../components/ProjectGrid';
import { ProjectKanban } from '../components/ProjectKanban';
import { CreateProjectModal } from '../components/CreateProjectModal';
import { CreateLeadModal } from '../components/CreateLeadModal';
import { LeadDetailModal } from '../components/LeadDetailModal';

export const CRMPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'grid' | 'kanban'>('grid');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  // Modales
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<CRMLead | null>(null);

  // Query: KPIs
  const { data: kpis, refetch: refetchKPIs } = useQuery<CRMKPIs>({
    queryKey: ['crm_kpis'],
    queryFn: () => crmService.getKPIs()
  });

  // Query: Proyectos
  const { data: projects = [], refetch: refetchProjects } = useQuery<CRMProject[]>({
    queryKey: ['crm_projects'],
    queryFn: () => crmService.getProjects()
  });

  // Proyecto seleccionado actualmente
  const activeProject = projects.find((p) => p.id === selectedProjectId) || projects[0] || null;

  // Query: Leads del proyecto seleccionado
  const { data: leads = [], refetch: refetchLeads } = useQuery<CRMLead[]>({
    queryKey: ['crm_project_leads', activeProject?.id],
    queryFn: () => (activeProject ? crmService.getProjectLeads(activeProject.id) : Promise.resolve([])),
    enabled: Boolean(activeProject)
  });

  const handleSelectProject = (projectId: number) => {
    setSelectedProjectId(projectId);
    setActiveTab('kanban');
  };

  const handleRefreshAll = () => {
    refetchKPIs();
    refetchProjects();
    refetchLeads();
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in duration-300">
      
      {/* Header Ejecutivo Principal */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute right-0 top-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-brand-500/20 text-brand-300 text-xs font-bold rounded-full border border-brand-500/30 uppercase tracking-wider font-outfit">
              CRM Comercial Multiproyecto
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-outfit">
            Gestión de Prospectos & Proyectos
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm max-w-xl">
            Monitoreo en tiempo real del embudo de ventas, metas de capital y recaudación por proyecto de inversión.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => setIsProjectModalOpen(true)}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl backdrop-blur-xs transition-all flex items-center gap-2 border border-white/10"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Proyecto</span>
          </button>
          <button
            onClick={() => setIsLeadModalOpen(true)}
            className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-brand-500/30 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Prospecto</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de KPIs Consolidados */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-brand-50 text-brand-600 rounded-2xl border border-brand-100">
            <FolderKanban className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Proyectos Activos</span>
            <h3 className="text-xl font-extrabold text-slate-900 font-outfit">{kpis?.total_projects || 0}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Prospectos</span>
            <h3 className="text-xl font-extrabold text-slate-900 font-outfit">{kpis?.total_leads || 0}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Recaudación Cerrada</span>
            <h3 className="text-xl font-extrabold text-slate-900 font-outfit">
              ${(kpis?.won_amount || 0).toLocaleString()} COP
            </h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Tasa de Conversión</span>
            <h3 className="text-xl font-extrabold text-slate-900 font-outfit">{kpis?.conversion_rate || 0}%</h3>
          </div>
        </div>
      </div>

      {/* Selector de Navegación entre Vistas */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('grid')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'grid'
                ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Vista de Proyectos</span>
          </button>

          <button
            onClick={() => setActiveTab('kanban')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'kanban'
                ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Kanban className="w-4 h-4" />
            <span>Tablero Kanban</span>
          </button>
        </div>

        {/* Dropdown de Selección Rápida de Proyecto en el Header */}
        {activeTab === 'kanban' && projects.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 hidden sm:inline">Proyecto:</span>
            <select
              value={activeProject?.id || ''}
              onChange={(e) => setSelectedProjectId(Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold py-1.5 px-3 rounded-xl focus:outline-none focus:border-brand-500"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Vista de Contenido según pestaña */}
      {activeTab === 'grid' ? (
        <ProjectGrid
          projects={projects}
          onSelectProject={handleSelectProject}
          onCreateProject={() => setIsProjectModalOpen(true)}
        />
      ) : activeProject ? (
        <ProjectKanban
          project={activeProject}
          leads={leads}
          onSelectLead={(lead) => setSelectedLead(lead)}
          onCreateLead={() => setIsLeadModalOpen(true)}
          onRefreshLeads={handleRefreshAll}
        />
      ) : (
        <div className="p-12 text-center text-slate-500">No hay proyectos para mostrar en el Kanban.</div>
      )}

      {/* Modales */}
      <CreateProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onSuccess={handleRefreshAll}
      />

      <CreateLeadModal
        isOpen={isLeadModalOpen}
        projects={projects}
        defaultProjectId={activeProject?.id}
        onClose={() => setIsLeadModalOpen(false)}
        onSuccess={handleRefreshAll}
      />

      <LeadDetailModal
        lead={selectedLead}
        isOpen={Boolean(selectedLead)}
        onClose={() => setSelectedLead(null)}
        onUpdate={handleRefreshAll}
      />
    </div>
  );
};
