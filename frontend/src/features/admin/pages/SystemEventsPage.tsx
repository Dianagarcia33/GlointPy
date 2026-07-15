import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Calendar, Clock, RotateCw, Settings, Trash2, Edit2 } from 'lucide-react';
import { systemEventsService, SystemEvent } from '../../../services/systemEvents';
import { SystemEventModal } from '../components/SystemEventModal';
import { SystemEventsTable } from '../components/SystemEventsTable';

export const SystemEventsPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<SystemEvent | null>(null);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['systemEvents'],
    queryFn: systemEventsService.getAllEvents
  });

  const handleOpenModal = (event?: SystemEvent) => {
    setSelectedEvent(event || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedEvent(null);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Fechas del Sistema</h1>
          <p className="text-slate-500 text-sm mt-1">
            Configura ventanas de tiempo y eventos recurrentes para automatizar el sistema.
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-xl hover:bg-brand-600 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span className="font-medium text-sm">Nuevo Evento</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <SystemEventsTable 
          events={events} 
          isLoading={isLoading} 
          onEdit={handleOpenModal} 
        />
      </div>

      {isModalOpen && (
        <SystemEventModal
          event={selectedEvent}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};
