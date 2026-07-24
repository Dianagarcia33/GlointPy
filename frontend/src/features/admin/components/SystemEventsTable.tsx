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
      <div className="p-8 space-y-4 animate-pulse">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-14 bg-slate-100/80 rounded-2xl w-full" />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="p-12 text-center text-slate-500">
        <AlertCircle className="w-10 h-10 mx-auto mb-3 text-slate-300" />
        <p className="font-medium text-slate-600">No hay eventos del sistema configurados.</p>
        <p className="text-xs text-slate-400 mt-1">Crea un nuevo evento para definir ventanas de tiempo o periodos recurrentes.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider font-montserrat">
            <th className="px-6 py-4">Tipo / Estado</th>
            <th className="px-6 py-4">Descripción</th>
            <th className="px-6 py-4">Configuración de Tiempo</th>
            <th className="px-6 py-4 text-center">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-medium">
          {events.map((event) => (
            <tr key={event.id} className="hover:bg-slate-50/80 transition-colors">
              <td className="px-6 py-4">
                <div className="flex flex-col gap-1">
                  <span className="font-extrabold text-slate-900 capitalize text-sm">{event.type.replace(/_/g, ' ')}</span>
                  <div>
                    {event.is_active ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200">
                        Inactivo
                      </span>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <p className="text-slate-600 font-medium leading-relaxed max-w-xs">{event.description || 'Sin descripción'}</p>
              </td>
              <td className="px-6 py-4">
                {event.is_recurring ? (
                  <div className="flex items-center gap-2 text-slate-700 bg-blue-50/80 border border-blue-100 px-3 py-1.5 rounded-xl w-fit">
                    <RotateCw className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="font-bold text-blue-950">
                      Día {event.recurrence_start_day} al {event.recurrence_end_day} de cada mes
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5 text-slate-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>
                        Inicio: <strong className="text-slate-800">{event.start_date ? format(new Date(event.start_date), "d MMM yyyy, HH:mm", { locale: es }) : 'N/A'}</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>
                        Fin: <strong className="text-slate-800">{event.end_date ? format(new Date(event.end_date), "d MMM yyyy, HH:mm", { locale: es }) : 'N/A'}</strong>
                      </span>
                    </div>
                  </div>
                )}
              </td>
              <td className="px-6 py-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => onEdit(event)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-xl transition-all border border-brand-200 cursor-pointer"
                    title="Editar evento"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>
                  <button
                    onClick={() => handleDelete(event.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all border border-rose-200 cursor-pointer"
                    title="Eliminar evento"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar</span>
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
