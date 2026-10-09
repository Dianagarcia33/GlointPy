import React, { useState, useEffect } from 'react';
import { DocumentTemplate, templatesService } from '../../../../services/templates';
import { TemplateModal } from '../components/TemplateModal';
import { Plus, Edit2, Trash2, FileText, Loader2, AlertCircle, CheckCircle, Code, Eye, X, RefreshCw, FileCheck, Sparkles, Image } from 'lucide-react';
import { Can } from '../../../../components/security/Can';

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, templateName, isDeleting }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl border border-slate-100">
        <div className="p-6">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-rose-100 mb-4 mx-auto">
            <Trash2 className="w-6 h-6 text-rose-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 text-center mb-2 font-montserrat">Eliminar Plantilla</h2>
          <p className="text-slate-500 text-center text-xs mb-6">
            ¿Estás seguro de que deseas eliminar la plantilla <span className="font-bold text-slate-700">{templateName}</span>? Esta acción no se puede deshacer.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-rose-600/20"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Eliminar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const TemplateTableSkeleton = () => {
  return (
    <>
      {[...Array(4)].map((_, i) => (
        <tr key={i} className="animate-pulse">
          <td className="px-6 py-4"><div className="h-4 w-8 bg-slate-200 rounded"></div></td>
          <td className="px-6 py-4"><div className="h-4 w-48 bg-slate-200 rounded"></div></td>
          <td className="px-6 py-4"><div className="h-5 w-24 bg-slate-200 rounded-lg"></div></td>
          <td className="px-6 py-4"><div className="h-4 w-32 bg-slate-200 rounded"></div></td>
          <td className="px-6 py-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <div className="h-7 w-16 bg-slate-200 rounded-xl"></div>
              <div className="h-7 w-16 bg-slate-200 rounded-xl"></div>
            </div>
          </td>
        </tr>
      ))}
    </>
  );
};

export const AdminTemplatesPage = () => {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);
  
  const [templateToDelete, setTemplateToDelete] = useState<DocumentTemplate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const data = await templatesService.getTemplates();
      setTemplates(data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Error al cargar plantillas');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = () => {
    setEditingTemplate(null);
    setIsModalOpen(true);
  };

  const handleEdit = (tpl: DocumentTemplate) => {
    setEditingTemplate(tpl);
    setIsModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!templateToDelete) return;
    setIsDeleting(true);
    try {
      await templatesService.deleteTemplate(templateToDelete.id);
      setToast({ message: `Plantilla "${templateToDelete.name}" eliminada correctamente`, type: 'success' });
      setTemplateToDelete(null);
      await fetchData();
    } catch (err: any) {
      setToast({ message: err.response?.data?.detail || err.message || 'Error al eliminar la plantilla', type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in duration-300">
      
      {/* Toast Notification Banner */}
      {toast && (
        <div className={`p-4 rounded-2xl flex items-center justify-between shadow-lg animate-in slide-in-from-top duration-300 ${
          toast.type === 'success' 
            ? 'bg-emerald-500 text-white shadow-emerald-500/20' 
            : 'bg-rose-500 text-white shadow-rose-500/20'
        }`}>
          <div className="flex items-center gap-3">
            {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="font-bold text-xs">{toast.message}</span>
          </div>
          <button onClick={() => setToast(null)} className="p-1 hover:bg-white/20 rounded-lg cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Ejecutivo Estandarizado */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-montserrat flex items-center gap-2.5 whitespace-nowrap sm:whitespace-normal">
              <div className="p-2.5 bg-brand-50 border border-brand-200/80 rounded-2xl text-brand-700 shadow-2xs">
                <FileText className="w-6 h-6" />
              </div>
              <span>Gestión de Plantillas</span>
            </h1>
            <button
              onClick={fetchData}
              disabled={isLoading}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              title="Actualizar datos"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-brand-600' : ''}`} />
            </button>
          </div>
          <p className="text-slate-500 text-sm mt-1 font-normal">
            Diseña, edita y administra los formatos de contratos de inversión y certificados legales con HTML dinámico.
          </p>
        </div>
        
        <Can permission="admin.roles.manage">
          <div className="flex items-center gap-2.5 shrink-0">
            <button 
              onClick={handleCreate}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-600 to-amber-600 hover:from-brand-700 hover:to-amber-700 text-white rounded-xl transition-all shadow-md shadow-brand-500/20 text-xs font-bold font-montserrat cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Plantilla</span>
            </button>
          </div>
        </Can>
      </div>

      {/* KPI Cards Summary (4 Métricas Clave Estandarizadas) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Plantillas */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block font-montserrat">
              Total Plantillas
            </span>
            <div className="p-2 bg-brand-50 text-brand-600 rounded-xl shrink-0">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-black text-slate-900 block tracking-tight font-mono">
            {templates.length}
          </span>
          <span className="text-[11px] text-slate-500 font-medium block truncate">
            Formatos legales configurados
          </span>
        </div>

        {/* Contratos */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-blue-700 font-bold uppercase tracking-wider block font-montserrat">
              Contratos de Inversión
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl shrink-0">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-black text-blue-700 block tracking-tight font-mono">
            {templates.filter(t => t.type?.toLowerCase() === 'contract').length}
          </span>
          <span className="text-[11px] text-blue-600 font-medium block truncate">
            Plantillas para contratos y pagarés
          </span>
        </div>

        {/* Certificados */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-emerald-700 font-bold uppercase tracking-wider block font-montserrat">
              Certificados Accionarios
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-black text-emerald-600 block tracking-tight font-mono">
            {templates.filter(t => t.type?.toLowerCase() === 'certificate').length}
          </span>
          <span className="text-[11px] text-emerald-600 font-medium block truncate">
            Títulos de acciones emitidos
          </span>
        </div>

        {/* Con Membrete Custom */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-purple-700 font-bold uppercase tracking-wider block font-montserrat">
              Membrete Custom
            </span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl shrink-0">
              <Image className="w-4 h-4" />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-black text-purple-700 block tracking-tight font-mono">
            {templates.filter(t => !!(t.file_path || (t as any).background_image)).length}
          </span>
          <span className="text-[11px] text-purple-600 font-medium block truncate">
            Fondos corporativos personalizados
          </span>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-brand-50/60 border border-brand-200/80 rounded-2xl p-4 flex items-start gap-3 text-xs text-brand-950 shadow-2xs">
        <div className="p-1.5 bg-brand-100 rounded-xl text-brand-700 shrink-0 mt-0.5">
          <Code className="w-4 h-4" />
        </div>
        <div>
          <span className="font-bold block text-sm mb-0.5 font-montserrat">Plantillas HTML Dinámicas con Variables del Sistema</span>
          <p className="text-slate-600 leading-relaxed">
            Las plantillas generan documentos legales en tiempo real integrando variables dinámicas como <code className="bg-white px-1.5 py-0.5 rounded border border-brand-200 font-mono text-[11px] text-brand-700 font-semibold">&#123;nombre_completo&#125;</code>, <code className="bg-white px-1.5 py-0.5 rounded border border-brand-200 font-mono text-[11px] text-brand-700 font-semibold">&#123;documento&#125;</code>, <code className="bg-white px-1.5 py-0.5 rounded border border-brand-200 font-mono text-[11px] text-brand-700 font-semibold">&#123;codigo_inversion&#125;</code> y <code className="bg-white px-1.5 py-0.5 rounded border border-brand-200 font-mono text-[11px] text-brand-700 font-semibold">&#123;firma_digital&#125;</code>.
            La <strong>Hoja Membretada</strong> de fondo es opcional; si no se carga una imagen personalizada, el generador aplicará automáticamente el membrete estándar corporativo de <strong>GLOINT INTERNATIONAL PARTNERS S.A.S.</strong>
          </p>
        </div>
      </div>

      {/* Tabla de Plantillas */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-slate-400 font-bold border-b border-slate-200/80 uppercase text-[10px] tracking-wider font-montserrat">
              <tr>
                <th className="px-6 py-4 w-16">ID</th>
                <th className="px-6 py-4">Nombre de la Plantilla</th>
                <th className="px-6 py-4">Tipo de Documento</th>
                <th className="px-6 py-4">Formato</th>
                <th className="px-6 py-4">Hoja Membretada</th>
                <Can permission="admin.roles.manage">
                  <th className="px-6 py-4 text-center whitespace-nowrap min-w-[200px]">Acciones</th>
                </Can>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-xs">
              {isLoading ? (
                <TemplateTableSkeleton />
              ) : templates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileText className="w-8 h-8 text-slate-300" />
                      <p className="font-semibold text-slate-600">No hay plantillas de documentos registradas.</p>
                      <button onClick={handleCreate} className="text-brand-600 font-bold hover:underline text-xs mt-1 cursor-pointer font-montserrat">
                        + Crea tu primera plantilla
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                templates.map((tpl) => {
                  const getTypeBadge = (type: string) => {
                    switch (type?.toLowerCase()) {
                      case 'certificate':
                        return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80 uppercase tracking-wider font-montserrat">Certificado Accionario</span>;
                      case 'contract':
                        return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200/80 uppercase tracking-wider font-montserrat">Contrato de Inversión</span>;
                      case 'promissory_note':
                        return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200/80 uppercase tracking-wider font-montserrat">Pagaré</span>;
                      case 'receipt':
                        return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80 uppercase tracking-wider font-montserrat">Comprobante</span>;
                      default:
                        return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wider font-montserrat">{type || 'General'}</span>;
                    }
                  };

                  const hasCustomLetterhead = !!(tpl.file_path || (tpl as any).background_image);

                  return (
                    <tr key={tpl.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 font-mono text-slate-400 font-bold">#{tpl.id}</td>
                      <td className="px-6 py-4">
                        <div className="font-extrabold text-slate-900 text-sm font-montserrat">{tpl.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        {getTypeBadge(tpl.type)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200/80 font-mono">
                          <Code className="w-3 h-3 text-purple-600" />
                          <span>HTML Dinámico</span>
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {hasCustomLetterhead ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                            🖼️ Membrete Personalizado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            📄 Membrete Estándar Gloint
                          </span>
                        )}
                      </td>
                      <Can permission="admin.roles.manage">
                        <td className="px-6 py-4 text-center whitespace-nowrap min-w-[200px]">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEdit(tpl)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:text-brand-800 hover:bg-brand-100/70 bg-brand-50/70 rounded-xl transition-all border border-brand-200/80 shadow-2xs cursor-pointer font-montserrat"
                              title="Editar Plantilla"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Editar</span>
                            </button>
                            <button
                              onClick={() => setTemplateToDelete(tpl)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:text-rose-800 hover:bg-rose-100/70 bg-rose-50/70 rounded-xl transition-all border border-rose-200/80 shadow-2xs cursor-pointer font-montserrat"
                              title="Eliminar Plantilla"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Eliminar</span>
                            </button>
                          </div>
                        </td>
                      </Can>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Editor de Plantilla */}
      <TemplateModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={fetchData}
        template={editingTemplate}
      />

      {/* Modal de Confirmación de Eliminación */}
      <DeleteConfirmationModal 
        isOpen={!!templateToDelete}
        onClose={() => setTemplateToDelete(null)}
        onConfirm={handleDeleteConfirm}
        templateName={templateToDelete?.name}
        isDeleting={isDeleting}
      />
    </div>
  );
};
