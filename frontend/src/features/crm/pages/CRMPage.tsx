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
  PieChart,
  Key,
  RefreshCw
} from 'lucide-react';

import { crmService, CRMProject, CRMLead, CRMKPIs } from '../../../services/crmService';
import { ProjectGrid } from '../components/ProjectGrid';
import { ProjectKanban } from '../components/ProjectKanban';
import { CreateProjectModal } from '../components/CreateProjectModal';
import { CreateLeadModal } from '../components/CreateLeadModal';
import { LeadDetailModal } from '../components/LeadDetailModal';
import { CRMFormKeysModal } from '../components/CRMFormKeysModal';
import { ConfirmationModal } from '../../../components/common/ConfirmationModal';
import { Can } from '../../../components/security/Can';

export const CRMPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'grid' | 'kanban'>('grid');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  // Modales
  const [isFormKeysModalOpen, setIsFormKeysModalOpen] = useState(false);
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
      
      {/* Header Estándar Soporte en Tickets */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div className="flex items-center gap-3">
          <span className="p-2 bg-brand-50 text-brand-600 border border-brand-200 rounded-2xl inline-flex shadow-xs">
            <FolderKanban className="w-6 h-6" />
          </span>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight font-montserrat flex items-center gap-2.5">
              <span>Gestión de Prospectos & Proyectos</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Monitoreo en tiempo real del embudo de ventas, metas de capital y recaudación por proyecto de inversión.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={handleRefreshAll}
            title="Actualizar datos"
            className="p-2.5 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-2xl transition-all shadow-xs cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <Can permissions={['crm:form_keys:manage', 'crm:projects:manage', 'admin.crm.manage']}>
            <button
              onClick={() => setIsFormKeysModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl transition-all text-xs font-bold shadow-xs cursor-pointer font-montserrat"
            >
              <Key className="w-4 h-4 text-amber-500" />
              <span>Claves de Formularios</span>
            </button>
          </Can>

          <Can permissions={['crm:projects:create', 'crm:projects:manage', 'admin.crm.manage']}>
            <button
              onClick={handleOpenCreateProject}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl transition-all text-xs font-bold shadow-xs cursor-pointer font-montserrat"
            >
              <Plus className="w-4 h-4 text-brand-600" />
              <span>Nuevo Proyecto</span>
            </button>
          </Can>

          <Can permissions={['crm:leads:manage', 'admin.crm.manage']}>
            <button
              onClick={() => setIsLeadModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-brand-600 to-amber-600 hover:from-brand-700 hover:to-amber-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-brand-500/20 font-montserrat transition-all active:scale-95 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Prospecto</span>
            </button>
          </Can>
        </div>
      </div>

      {/* Tarjetas de KPIs Consolidados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block font-montserrat">
              Proyectos Activos
            </span>
            <div className="p-2 bg-brand-50 text-brand-600 rounded-xl">
              <FolderKanban className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-black text-slate-900 block tracking-tight font-mono">
            {kpis?.total_projects || 0}
          </span>
          <span className="text-[11px] text-slate-500 font-medium block">
            Desarrollos e inversiones activas
          </span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block font-montserrat">
              Total Prospectos
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-black text-slate-900 block tracking-tight font-mono">
            {kpis?.total_leads || 0}
          </span>
          <span className="text-[11px] text-slate-500 font-medium block">
            Oportunidades en seguimiento
          </span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-700 font-bold uppercase tracking-wider block font-montserrat">
              Recaudación Cerrada
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-black text-emerald-600 block tracking-tight font-mono">
            ${(kpis?.won_amount || 0).toLocaleString('es-CO')}
          </span>
          <span className="text-[11px] text-slate-500 font-medium block">
            Cierres ganados del equipo
          </span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-700 font-bold uppercase tracking-wider block font-montserrat">
              Tasa de Conversión
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-black text-amber-600 block tracking-tight font-mono">
            {kpis?.conversion_rate || 0}%
          </span>
          <span className="text-[11px] text-slate-500 font-medium block">
            Efectividad de cierre comercial
          </span>
        </div>
      </div>

      {/* Selector de Navegación entre Vistas */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1.5 bg-slate-100/80 rounded-2xl w-fit border border-slate-200/80">
          <button
            onClick={() => setActiveTab('grid')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 font-montserrat cursor-pointer ${
              activeTab === 'grid'
                ? 'bg-white text-brand-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Vista de Proyectos</span>
          </button>

          <button
            onClick={() => setActiveTab('kanban')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 font-montserrat cursor-pointer ${
              activeTab === 'kanban'
                ? 'bg-white text-brand-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Kanban className="w-4 h-4" />
            <span>Tablero Kanban</span>
          </button>
        </div>

        {/* Dropdown de Selección Rápida de Proyecto en el Header */}
        {activeTab === 'kanban' && projects.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200/90 rounded-2xl shadow-xs">
            <span className="text-xs font-bold text-slate-400 font-montserrat uppercase">Proyecto:</span>
            <select
              value={activeProject?.id || ''}
              onChange={(e) => setSelectedProjectId(Number(e.target.value))}
              className="bg-transparent text-slate-900 text-xs font-bold py-1 px-2 rounded-xl focus:outline-none focus:border-brand-500 font-montserrat cursor-pointer"
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

      {/* Modal de Gestión de Claves de Formularios Web */}
      <CRMFormKeysModal
        isOpen={isFormKeysModalOpen}
        onClose={() => setIsFormKeysModalOpen(false)}
        projects={projects}
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
