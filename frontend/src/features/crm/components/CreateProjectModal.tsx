import React, { useState, useEffect } from 'react';
import { X, FolderPlus, DollarSign, Calendar, FileText, Code, Loader2, Edit3, Activity } from 'lucide-react';
import { crmService, CRMProject } from '../../../services/crmService';

interface CreateProjectModalProps {
  isOpen: boolean;
  projectToEdit?: CRMProject | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ 
  isOpen, 
  projectToEdit,
  onClose, 
  onSuccess 
}) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [status, setStatus] = useState<'activo' | 'en_pausa' | 'meta_alcanzada' | 'archivado'>('activo');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!projectToEdit;

  useEffect(() => {
    if (projectToEdit) {
      setCode(projectToEdit.code || '');
      setName(projectToEdit.name || '');
      setDescription(projectToEdit.description || '');
      setTargetAmount(projectToEdit.target_amount ? String(projectToEdit.target_amount) : '');
      setStatus(projectToEdit.status || 'activo');
      setStartDate(projectToEdit.start_date ? projectToEdit.start_date.split('T')[0] : '');
      setEndDate(projectToEdit.end_date ? projectToEdit.end_date.split('T')[0] : '');
    } else {
      setCode('');
      setName('');
      setDescription('');
      setTargetAmount('');
      setStatus('activo');
      setStartDate('');
      setEndDate('');
    }
    setError(null);
  }, [projectToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim() || !targetAmount) {
      setError('Por favor completa el código, nombre y meta de recaudación.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (isEditing && projectToEdit) {
        await crmService.updateProject(projectToEdit.id, {
          code: code.trim(),
          name: name.trim(),
          description: description.trim() || undefined,
          target_amount: Number(targetAmount),
          status: status,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        });
      } else {
        await crmService.createProject({
          code: code.trim(),
          name: name.trim(),
          description: description.trim() || undefined,
          target_amount: Number(targetAmount),
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          status: status
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || `Error al ${isEditing ? 'actualizar' : 'crear'} el proyecto`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600">
              {isEditing ? <Edit3 className="w-5 h-5" /> : <FolderPlus className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 font-montserrat">
                {isEditing ? 'Editar Proyecto de Inversión' : 'Nuevo Proyecto de Inversión'}
              </h2>
              <p className="text-xs text-slate-500">
                {isEditing ? 'Modifica los parámetros y metas del proyecto' : 'Define las metas de capital y datos del proyecto'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-2xl transition-all cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-2xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 font-montserrat">Código del Proyecto *</label>
              <div className="relative">
                <Code className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="ej: PROJ-LOTE-01"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-9 pr-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-brand-500 font-montserrat uppercase font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 font-montserrat">Meta Recaudación (COP) *</label>
              <div className="relative">
                <DollarSign className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="number"
                  placeholder="500000000"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-9 pr-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-brand-500 font-mono font-bold"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 font-montserrat">Nombre del Proyecto *</label>
            <input
              type="text"
              placeholder="ej: Desarrollo Vistas del Sol II"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-brand-500 font-montserrat font-bold"
            />
          </div>

          {isEditing && (
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 font-montserrat">Estado del Proyecto</label>
              <div className="relative">
                <Activity className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-9 pr-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-brand-500 font-montserrat font-bold cursor-pointer"
                >
                  <option value="activo">Activo</option>
                  <option value="en_pausa">En Pausa</option>
                  <option value="meta_alcanzada">Meta Alcanzada 🏆</option>
                  <option value="archivado">Archivado</option>
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 font-montserrat">Descripción</label>
            <textarea
              rows={2}
              placeholder="Breve descripción del vehículo o desarrollo de inversión..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-sm text-slate-900 focus:outline-none focus:border-brand-500 font-sans resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 font-montserrat">Fecha Inicio</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-brand-500 font-montserrat"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 font-montserrat">Fecha Cierre Estimada</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-brand-500 font-montserrat"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-2xl transition-all font-montserrat cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 rounded-2xl transition-all shadow-md shadow-brand-500/20 flex items-center gap-2 disabled:opacity-50 font-montserrat cursor-pointer"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isEditing ? 'Guardar Cambios' : 'Crear Proyecto'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
