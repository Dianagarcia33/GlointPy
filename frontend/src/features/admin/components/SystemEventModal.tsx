import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { systemEventsService, SystemEvent, SystemEventCreate } from '../../../services/systemEvents';

interface SystemEventModalProps {
    event: SystemEvent | null;
    onClose: () => void;
    onSuccess: () => void;
}

export const SystemEventModal = ({ event, onClose, onSuccess }: SystemEventModalProps) => {
    const [isLoading, setIsLoading] = useState(false);
    const [isRecurring, setIsRecurring] = useState(event ? event.is_recurring === 1 : true);

    const [formData, setFormData] = useState<Partial<SystemEventCreate>>({
        type: event?.type || 'retiro',
        description: event?.description || '',
        is_active: event ? event.is_active : 1,
        recurrence_start_day: event?.recurrence_start_day || 1,
        recurrence_end_day: event?.recurrence_end_day || 5,
        start_date: event?.start_date ? event.start_date.split('T')[0] : '',
        end_date: event?.end_date ? event.end_date.split('T')[0] : ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const payload: SystemEventCreate = {
                type: formData.type!,
                is_recurring: isRecurring ? 1 : 0,
                is_active: formData.is_active!,
                description: formData.description || null,
            };

            if (isRecurring) {
                payload.recurrence_start_day = Number(formData.recurrence_start_day);
                payload.recurrence_end_day = Number(formData.recurrence_end_day);
            } else {
                payload.start_date = formData.start_date ? new Date(formData.start_date).toISOString() : null;
                payload.end_date = formData.end_date ? new Date(formData.end_date).toISOString() : null;
            }

            if (event) {
                await systemEventsService.updateEvent(event.id, payload);
            } else {
                await systemEventsService.createEvent(payload);
            }
            onSuccess();
        } catch (error: any) {
            console.error('Error saving event:', error);
            alert('Error al guardar el evento: ' + (error.response?.data?.detail || error.message));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-slate-100">
                    <h2 className="text-xl font-bold text-slate-900">
                        {event ? 'Editar Evento' : 'Nuevo Evento'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Tipo de Evento
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                            placeholder="Ej: retiro"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Descripción (Opcional)
                        </label>
                        <input
                            type="text"
                            value={formData.description || ''}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                            placeholder="Ej: Ventana mensual de retiros"
                        />
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                        <label className="flex items-center gap-2 mb-4 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isRecurring}
                                onChange={(e) => setIsRecurring(e.target.checked)}
                                className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
                            />
                            <span className="text-sm font-medium text-slate-700">
                                Es un evento recurrente (mensual)
                            </span>
                        </label>

                        {isRecurring ? (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Día de Inicio
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="31"
                                        required={isRecurring}
                                        value={formData.recurrence_start_day || ''}
                                        onChange={(e) => setFormData({ ...formData, recurrence_start_day: parseInt(e.target.value) })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Día de Fin
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="31"
                                        required={isRecurring}
                                        value={formData.recurrence_end_day || ''}
                                        onChange={(e) => setFormData({ ...formData, recurrence_end_day: parseInt(e.target.value) })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Fecha de Inicio
                                    </label>
                                    <input
                                        type="date"
                                        required={!isRecurring}
                                        value={formData.start_date || ''}
                                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Fecha de Fin
                                    </label>
                                    <input
                                        type="date"
                                        required={!isRecurring}
                                        value={formData.end_date || ''}
                                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.is_active === 1}
                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked ? 1 : 0 })}
                                className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
                            />
                            <span className="text-sm font-medium text-slate-700">
                                Evento Activo
                            </span>
                        </label>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white rounded-xl font-bold transition-colors flex items-center gap-2"
                        >
                            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                            Guardar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
