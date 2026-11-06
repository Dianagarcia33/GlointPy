import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, CalendarDays, RefreshCw, CheckCircle2, RotateCw, Clock } from 'lucide-react';
import { systemEventsService, SystemEvent } from '../../../services/systemEvents';
import { SystemEventModal } from '../components/SystemEventModal';
import { SystemEventsTable } from '../components/SystemEventsTable';

export const SystemEventsPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<SystemEvent | null>(null);
  const queryClient = useQueryClient();

  const { data: events = [], isLoading, isRefetching } = useQuery({
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

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['systemEvents'] });
  };

  const activeEventsCount = events.filter(e => e.is_active).length;
  const recurringEventsCount = events.filter(e => e.is_recurring).length;
  const fixedEventsCount = events.filter(e => !e.is_recurring).length;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in duration-300 font-inter">
      {/* Header Ejecutivo Estandarizado */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-montserrat flex items-center gap-2.5 whitespace-nowrap sm:whitespace-normal">
              <div className="p-2.5 bg-brand-50 border border-brand-200/80 rounded-2xl text-brand-700 shadow-2xs">
                <CalendarDays className="w-6 h-6" />
              </div>
              <span>Fechas del Sistema</span>
            </h1>
            <button
              onClick={handleRefresh}
              disabled={isLoading || isRefetching}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              title="Actualizar datos"
            >
              <RefreshCw className={`w-4 h-4 ${(isLoading || isRefetching) ? 'animate-spin text-brand-600' : ''}`} />
            </button>
          </div>
          <p className="text-slate-500 text-sm mt-1 font-normal">
            Configura ventanas de tiempo y eventos recurrentes para automatizar liquidaciones y validaciones del ecosistema.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-brand-600 to-amber-600 hover:from-brand-700 hover:to-amber-700 text-white px-4 sm:px-5 py-2.5 rounded-xl transition-all shadow-md shadow-brand-500/20 text-xs font-bold font-montserrat cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Evento</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Summary (4 Métricas Clave Estandarizadas) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Eventos */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block font-montserrat">
              Total Ventanas
            </span>
            <div className="p-2 bg-brand-50 text-brand-600 rounded-xl shrink-0">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-black text-slate-900 block tracking-tight font-mono">
            {events.length}
          </span>
          <span className="text-[11px] text-slate-500 font-medium block truncate">
            {activeEventsCount} reglas en ejecución activa
          </span>
        </div>

        {/* Activos */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-emerald-700 font-bold uppercase tracking-wider block font-montserrat">
              Eventos Activos
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-black text-emerald-600 block tracking-tight font-mono">
            {activeEventsCount}
          </span>
          <span className="text-[11px] text-emerald-600 font-medium block truncate">
            Automatizaciones operativas
          </span>
        </div>

        {/* Recurrentes */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-blue-700 font-bold uppercase tracking-wider block font-montserrat">
              Ciclos Recurrentes
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl shrink-0">
              <RotateCw className="w-4 h-4" />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-black text-blue-700 block tracking-tight font-mono">
            {recurringEventsCount}
          </span>
          <span className="text-[11px] text-blue-600 font-medium block truncate">
            Ventanas mensuales periódicas
          </span>
        </div>

        {/* Fechas Puntuales */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-amber-700 font-bold uppercase tracking-wider block font-montserrat">
              Fechas Específicas
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl shrink-0">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-black text-amber-600 block tracking-tight font-mono">
            {fixedEventsCount}
          </span>
          <span className="text-[11px] text-amber-600 font-medium block truncate">
            Rango de calendario fijo
          </span>
        </div>
      </div>

      {/* Contenedor Tabla */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
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
