import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Edit2, Trash2, Loader2 } from 'lucide-react';
import { systemEventsService, SystemEvent } from '../../../services/systemEvents';
import { SystemEventModal } from '../components/SystemEventModal';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const SystemEventsPage = () => {
    const [events, setEvents] = useState<SystemEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<SystemEvent | null>(null);

    const fetchEvents = async () => {
        setIsLoading(true);
        try {
            const data = await systemEventsService.getAllEvents();
            setEvents(data);
        } catch (error) {
            console.error('Error fetching events:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    const handleCreate = () => {
        setSelectedEvent(null);
        setIsModalOpen(true);
    };

    const handleEdit = (event: SystemEvent) => {
        setSelectedEvent(event);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Estás seguro de eliminar este evento?')) return;
        try {
            await systemEventsService.deleteEvent(id);
            fetchEvents();
        } catch (error) {
            console.error('Error deleting event:', error);
            alert('Error al eliminar el evento');
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600">
                        <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Fechas del Sistema</h1>
                        <p className="text-slate-500 text-sm">Configura eventos globales como ventanas de retiros</p>
                    </div>
                </div>
                <button
                    onClick={handleCreate}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl shadow-sm transition-all flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Nuevo Evento
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {isLoading ? (
                    <div className="p-12 flex justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
                    </div>
                ) : events.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">
                        No hay eventos configurados.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                                    <th className="px-6 py-4 font-semibold">Tipo</th>
                                    <th className="px-6 py-4 font-semibold">Descripción</th>
                                    <th className="px-6 py-4 font-semibold">Modalidad</th>
                                    <th className="px-6 py-4 font-semibold">Regla / Fechas</th>
                                    <th className="px-6 py-4 font-semibold">Estado</th>
                                    <th className="px-6 py-4 font-semibold text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {events.map(event => (
                                    <tr key={event.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-900 capitalize">
                                            {event.type}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {event.description || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {event.is_recurring ? (
                                                <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium">Recurrente</span>
                                            ) : (
                                                <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded-md text-xs font-medium">Fecha Fija</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 font-medium">
                                            {event.is_recurring ? (
                                                `Días: ${event.recurrence_start_day} al ${event.recurrence_end_day}`
                                            ) : (
                                                `${event.start_date ? format(new Date(event.start_date), 'dd/MMM/yyyy', { locale: es }) : ''} - ${event.end_date ? format(new Date(event.end_date), 'dd/MMM/yyyy', { locale: es }) : ''}`
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {event.is_active ? (
                                                <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md text-xs font-medium">Activo</span>
                                            ) : (
                                                <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-medium">Inactivo</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(event)}
                                                    className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(event.id)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Eliminar"
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
                )}
            </div>

            {isModalOpen && (
                <SystemEventModal
                    event={selectedEvent}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={() => {
                        setIsModalOpen(false);
                        fetchEvents();
                    }}
                />
            )}
        </div>
    );
};
