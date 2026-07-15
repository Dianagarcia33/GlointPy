import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Calendar, RotateCw, Save } from 'lucide-react';
import { SystemEvent, systemEventsService, SystemEventCreate } from '../../../services/systemEvents';

interface SystemEventModalProps {
  event: SystemEvent | null;
  onClose: () => void;
}

export const SystemEventModal: React.FC<SystemEventModalProps> = ({ event, onClose }) => {
  const queryClient = useQueryClient();
  const isEditing = !!event;

  const [formData, setFormData] = useState<SystemEventCreate>({
    type: 'retiro',
    is_recurring: 0,
    recurrence_start_day: null,
    recurrence_end_day: null,
    start_date: null,
    end_date: null,
    description: '',
    is_active: 1
  });

  useEffect(() => {
    if (event) {
      setFormData({
        type: event.type,
        is_recurring: event.is_recurring,
        recurrence_start_day: event.recurrence_start_day,
        recurrence_end_day: event.recurrence_end_day,
        start_date: event.start_date ? event.start_date.slice(0, 16) : null, // format for input type="datetime-local"
        end_date: event.end_date ? event.end_date.slice(0, 16) : null,
        description: event.description || '',
        is_active: event.is_active
      });
    }
  }, [event]);

  const createMutation = useMutation({
    mutationFn: systemEventsService.createEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemEvents'] });
      onClose();
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: SystemEventCreate) => systemEventsService.updateEvent(event!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemEvents'] });
      onClose();
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Cleanup data based on type
    const submitData = { ...formData };
    if (submitData.is_recurring) {
      submitData.start_date = null;
      submitData.end_date = null;
    } else {
      submitData.recurrence_start_day = null;
      submitData.recurrence_end_day = null;
    }

    if (isEditing) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">
            {isEditing ? 'Editar Evento' : 'Nuevo Evento'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <label className="text-sm font-medium text-slate-700">Tipo de Evento</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                required
              >
                <option value="retiro">Retiro</option>
                <option value="mercado_acciones">Mercado de Acciones</option>
                <option value="mantenimiento">Mantenimiento</option>
              </select>
            </div>

            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <label className="text-sm font-medium text-slate-700">Estado</label>
              <select
                value={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: Number(e.target.value) })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
              >
                <option value={1}>Activo</option>
                <option value={0}>Inactivo</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Descripción (Opcional)</label>
            <input
              type="text"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
              placeholder="Ej: Ventana de retiros mensual"
            />
          </div>

          <div className="border-t border-slate-100 pt-6">
            <div className="flex gap-4 mb-6">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, is_recurring: 1 })}
                className={`flex-1 py-3 px-4 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${
                  formData.is_recurring
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'
                }`}
              >
                <RotateCw className="w-5 h-5" />
                <span className="font-medium text-sm">Evento Recurrente</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, is_recurring: 0 })}
                className={`flex-1 py-3 px-4 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${
                  !formData.is_recurring
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'
                }`}
              >
                <Calendar className="w-5 h-5" />
                <span className="font-medium text-sm">Fecha Específica</span>
              </button>
            </div>

            {formData.is_recurring ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Día de Inicio (1-31)</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={formData.recurrence_start_day || ''}
                    onChange={(e) => setFormData({ ...formData, recurrence_start_day: parseInt(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Día de Fin (1-31)</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={formData.recurrence_end_day || ''}
                    onChange={(e) => setFormData({ ...formData, recurrence_end_day: parseInt(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Fecha y Hora de Inicio</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.start_date || ''}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Fecha y Hora de Fin</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.end_date || ''}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 bg-brand-500 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {isPending ? 'Guardando...' : 'Guardar Evento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
