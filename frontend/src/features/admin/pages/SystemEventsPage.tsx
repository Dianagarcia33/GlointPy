import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, CalendarDays } from 'lucide-react';
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
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in duration-300">
      {/* Header Ejecutivo */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute right-0 top-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-bold text-brand-300 backdrop-blur-sm">
            <CalendarDays className="w-4 h-4 text-emerald-400" /> Ventanas de Tiempo & Automatizaciones
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight font-montserrat">
            Fechas del Sistema
          </h1>
          <p className="text-slate-300 text-sm max-w-xl">
            Configura ventanas de tiempo y eventos recurrentes para automatizar la liquidación y validaciones del ecosistema.
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="relative z-10 flex items-center gap-2 bg-brand-500 text-white px-6 py-3 rounded-2xl hover:bg-brand-600 transition-all shadow-lg shadow-brand-500/30 text-sm font-bold cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Evento</span>
        </button>
      </div>

      {/* Contenedor Tabla */}
      <div className="bg-white rounded-3xl shadow-xs border border-slate-200 overflow-hidden">
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
