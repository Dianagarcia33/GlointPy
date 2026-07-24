import React, { useState, useEffect } from 'react';
import { DocumentTemplate, templatesService } from '../../../../services/templates';
import { TemplateModal } from '../components/TemplateModal';
import { Plus, Edit2, Trash2, FileText, Loader2, AlertCircle, CheckCircle, Code, Eye, X } from 'lucide-react';
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

      {/* Header Ejecutivo Principal */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute right-0 top-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-bold text-brand-300 backdrop-blur-sm">
            <FileText className="w-4 h-4 text-emerald-400" /> Plantillas & Documentos Legales
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight font-montserrat">
            Gestión de Plantillas
          </h1>
          <p className="text-slate-300 text-sm max-w-xl">
            Diseña, edita y administra los formatos de contratos de inversión y certificados legales.
          </p>
        </div>
        
        <Can permission="admin.roles.manage">
          <div className="relative z-10 flex items-center gap-3 shrink-0">
            <button 
              onClick={handleCreate}
              className="flex items-center gap-2 px-6 py-3 bg-brand-500 text-white rounded-2xl hover:bg-brand-600 transition-all shadow-lg shadow-brand-500/30 text-sm font-bold cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Plantilla</span>
            </button>
          </div>
        </Can>
      </div>

      {/* Tabla de Plantillas */}
      <div className="bg-white rounded-3xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider font-montserrat">
              <tr>
                <th className="px-6 py-4 w-16">ID</th>
                <th className="px-6 py-4">Nombre de la Plantilla</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Ruta Archivo</th>
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
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileText className="w-8 h-8 text-slate-300" />
                      <p>No hay plantillas de documentos registradas.</p>
                      <button onClick={handleCreate} className="text-brand-600 font-bold hover:underline text-xs mt-1 cursor-pointer">
                        Crea la primera plantilla
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                templates.map((tpl) => (
                  <tr key={tpl.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-mono text-slate-500">#{tpl.id}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800 text-sm">{tpl.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-brand-50 text-brand-700 uppercase tracking-wider">
                        {tpl.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-mono text-[11px]">
                      {tpl.file_path || <span className="text-slate-400 font-sans italic">Sin ruta específica</span>}
                    </td>
                    <Can permission="admin.roles.manage">
                      <td className="px-6 py-4 text-center whitespace-nowrap min-w-[200px]">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(tpl)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-xl transition-all border border-brand-200 cursor-pointer"
                            title="Editar Plantilla"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>
                          <button
                            onClick={() => setTemplateToDelete(tpl)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all border border-rose-200 cursor-pointer"
                            title="Eliminar Plantilla"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Eliminar</span>
                          </button>
                        </div>
                      </td>
                    </Can>
                  </tr>
                ))
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
