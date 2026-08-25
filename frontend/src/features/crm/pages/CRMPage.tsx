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
import { ConfirmationModal } from '../../../components/common/ConfirmationModal';

export const CRMPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'grid' | 'kanban'>('grid');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  // Modales
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<CRMProject | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<CRMProject | null>(null);
  const [isDeletingProject, setIsDeletingProject] = useState(false);

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

  const handleOpenCreateProject = () => {
    setProjectToEdit(null);
    setIsProjectModalOpen(true);
  };

  const handleEditProject = (project: CRMProject) => {
    setProjectToEdit(project);
    setIsProjectModalOpen(true);
  };

  const handleDeleteProject = (project: CRMProject) => {
    setProjectToDelete(project);
  };

  const handleConfirmDeleteProject = async () => {
    if (!projectToDelete) return;
    try {
      setIsDeletingProject(true);
      await crmService.deleteProject(projectToDelete.id);
      if (selectedProjectId === projectToDelete.id) {
        setSelectedProjectId(null);
      }
      setProjectToDelete(null);
      handleRefreshAll();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar el proyecto');
    } finally {
      setIsDeletingProject(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in duration-300">
      
      {/* Header Ejecutivo Principal */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute right-0 top-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-brand-500/20 text-brand-300 text-xs font-bold rounded-full border border-brand-500/30 uppercase tracking-wider font-montserrat">
              CRM Comercial Multiproyecto
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight font-montserrat">
            Gestión de Prospectos & Proyectos
          </h1>
          <p className="text-slate-300 text-sm max-w-xl">
            Monitoreo en tiempo real del embudo de ventas, metas de capital y recaudación por proyecto de inversión.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={handleOpenCreateProject}
            className="flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all text-xs font-bold border border-white/10 backdrop-blur-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Proyecto</span>
          </button>
          <button
            onClick={() => setIsLeadModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-brand-500 text-white rounded-2xl hover:bg-brand-600 transition-all shadow-lg shadow-brand-500/30 text-sm font-bold cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Prospecto</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de KPIs Consolidados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-2">
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block font-montserrat">Proyectos Activos</span>
          <span className="text-2xl font-extrabold text-slate-900 block tracking-tight font-montserrat">
            {kpis?.total_projects || 0}
          </span>
          <span className="text-[11px] text-slate-500 font-medium">Desarrollos e inversiones activas</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-2">
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block font-montserrat">Total Prospectos</span>
          <span className="text-2xl font-extrabold text-slate-900 block tracking-tight font-montserrat">
            {kpis?.total_leads || 0}
          </span>
          <span className="text-[11px] text-slate-500 font-medium">Oportunidades en seguimiento</span>
        </div>

        <div className="bg-emerald-50/80 border border-emerald-200 rounded-3xl p-6 shadow-xs space-y-2">
          <span className="text-xs text-emerald-800 font-bold uppercase tracking-wider block font-montserrat">Recaudación Cerrada</span>
          <span className="text-2xl font-extrabold text-emerald-700 block tracking-tight font-montserrat">
            ${(kpis?.won_amount || 0).toLocaleString('es-CO')}
          </span>
          <span className="text-[11px] text-emerald-700 font-medium">Cierres ganados del equipo</span>
        </div>

        <div className="bg-amber-50/70 border border-amber-200 rounded-3xl p-6 shadow-xs space-y-2">
          <span className="text-xs text-amber-900 font-bold uppercase tracking-wider block font-montserrat">Tasa de Conversión</span>
          <span className="text-2xl font-extrabold text-amber-950 block tracking-tight font-montserrat">
            {kpis?.conversion_rate || 0}%
          </span>
          <span className="text-[11px] text-amber-800 font-medium">Efectividad de cierre</span>
        </div>
      </div>

      {/* Selector de Navegación entre Vistas */}
      <div className="bg-white p-2.5 rounded-3xl border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('grid')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 font-montserrat cursor-pointer ${
              activeTab === 'grid'
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Vista de Proyectos</span>
          </button>

          <button
            onClick={() => setActiveTab('kanban')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 font-montserrat cursor-pointer ${
              activeTab === 'kanban'
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Kanban className="w-4 h-4" />
            <span>Tablero Kanban</span>
          </button>
        </div>

        {/* Dropdown de Selección Rápida de Proyecto en el Header */}
        {activeTab === 'kanban' && projects.length > 0 && (
          <div className="flex items-center gap-2 px-2">
            <span className="text-xs font-bold text-slate-500 font-montserrat hidden sm:inline uppercase">Proyecto:</span>
            <select
              value={activeProject?.id || ''}
              onChange={(e) => setSelectedProjectId(Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold py-2 px-3 rounded-2xl focus:outline-none focus:border-brand-500 font-montserrat cursor-pointer"
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
          onCreateProject={handleOpenCreateProject}
          onEditProject={handleEditProject}
          onDeleteProject={handleDeleteProject}
        />
      ) : activeProject ? (
        <ProjectKanban
          project={activeProject}
          leads={leads}
          onSelectLead={(lead) => setSelectedLead(lead)}
          onCreateLead={() => setIsLeadModalOpen(true)}
          onRefreshLeads={handleRefreshAll}
          onEditProject={handleEditProject}
          onDeleteProject={handleDeleteProject}
        />
      ) : (
        <div className="p-12 text-center text-slate-500">No hay proyectos para mostrar en el Kanban.</div>
      )}

      {/* Modales */}
      <CreateProjectModal
        isOpen={isProjectModalOpen}
        projectToEdit={projectToEdit}
        onClose={() => {
          setIsProjectModalOpen(false);
          setProjectToEdit(null);
        }}
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

      {/* Confirmación para Eliminar Proyecto */}
      <ConfirmationModal
        isOpen={Boolean(projectToDelete)}
        onClose={() => setProjectToDelete(null)}
        onConfirm={handleConfirmDeleteProject}
        title="¿Eliminar Proyecto de Inversión?"
        description={`¿Estás seguro de que deseas eliminar permanentemente el proyecto "${projectToDelete?.name}" (${projectToDelete?.code})? Esta acción retirará las metas asociadas y los prospectos registrados en su embudo.`}
        confirmText="Sí, Eliminar Proyecto"
        cancelText="Cancelar"
        variant="danger"
        isLoading={isDeletingProject}
      />
    </div>
  );
};
