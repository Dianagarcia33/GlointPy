import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Edit2, Trash2, Calendar, Clock, RotateCw, AlertCircle } from 'lucide-react';
import { SystemEvent, systemEventsService } from '../../../services/systemEvents';

interface SystemEventsTableProps {
  events: SystemEvent[];
  isLoading: boolean;
  onEdit: (event: SystemEvent) => void;
}

export const SystemEventsTable: React.FC<SystemEventsTableProps> = ({ events, isLoading, onEdit }) => {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: systemEventsService.deleteEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemEvents'] });
    }
  });

  const handleDelete = (id: number) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este evento?')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-500">
        <RotateCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-500" />
        <p>Cargando eventos...</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-400" />
        <p>No hay eventos del sistema configurados.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="px-6 py-4 text-xs font-semibold tracking-wider text-slate-500 uppercase">Tipo / Estado</th>
            <th className="px-6 py-4 text-xs font-semibold tracking-wider text-slate-500 uppercase">Descripción</th>
            <th className="px-6 py-4 text-xs font-semibold tracking-wider text-slate-500 uppercase">Configuración de Tiempo</th>
            <th className="px-6 py-4 text-xs font-semibold tracking-wider text-slate-500 uppercase text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {events.map((event) => (
            <tr key={event.id} className="hover:bg-slate-50/50 transition-colors">
              <td className="px-6 py-4">
                <div className="flex flex-col">
                  <span className="font-medium text-slate-900 capitalize">{event.type.replace('_', ' ')}</span>
                  <div className="mt-1">
                    {event.is_active ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">
                        Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                        Inactivo
                      </span>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <p className="text-sm text-slate-600">{event.description || 'Sin descripción'}</p>
              </td>
              <td className="px-6 py-4">
                {event.is_recurring ? (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <RotateCw className="w-4 h-4 text-blue-500" />
                    <span>
                      Día {event.recurrence_start_day} al {event.recurrence_end_day} de cada mes
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-emerald-500" />
                      <span>
                        Inicio: {event.start_date ? format(new Date(event.start_date), "d MMM yyyy, HH:mm", { locale: es }) : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-rose-500" />
                      <span>
                        Fin: {event.end_date ? format(new Date(event.end_date), "d MMM yyyy, HH:mm", { locale: es }) : 'N/A'}
                      </span>
                    </div>
                  </div>
                )}
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => onEdit(event)}
                    className="p-2 text-slate-400 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition-colors"
                    title="Editar evento"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(event.id)}
                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Eliminar evento"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
