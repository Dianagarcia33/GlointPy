import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  Clock,
  Video,
  MapPin,
  Plus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Key,
  Mail,
  Search,
  X,
  User as UserIcon,
  ShieldCheck,
  Calendar as CalendarIcon,
  Lock,
  List,
  CalendarCheck,
  Layers,
  Sparkles
} from 'lucide-react';
import { 
  crmCalendarService, 
  CalendarEvent, 
  CreateCalendarEventPayload 
} from '../../../services/crmCalendarService';
import { crmEmailService } from '../../../services/crmEmailService';
import { crmService, CRMLead } from '../../../services/crmService';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];
const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export const CRMCalendarPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Estados de navegación del calendario
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [deletingUid, setDeletingUid] = useState<string | null>(null);

  // Formulario Crear Cita
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newStartTime, setNewStartTime] = useState('10:00');
  const [newEndTime, setNewEndTime] = useState('11:00');
  const [newLocation, setNewLocation] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>(undefined);
  const [newLeadId, setNewLeadId] = useState<number | undefined>(undefined);
  const [savingEvent, setSavingEvent] = useState(false);

  // Sincronización cPanel
  const [syncPassword, setSyncPassword] = useState('');
  const [savePasswordCheck, setSavePasswordCheck] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Filtro / búsqueda de eventos en el panel lateral
  const [searchFilter, setSearchFilter] = useState('');

  // 1. Query: Saber si el usuario tiene contraseña guardada
  const { data: emailSettings, refetch: refetchSettings } = useQuery({
    queryKey: ['crm_email_settings'],
    queryFn: () => crmEmailService.getEmailSettings(),
    staleTime: 0
  });
  const hasSavedPassword = emailSettings?.has_saved_password ?? false;

  // 2. Query: Eventos del calendario cPanel (CalDAV)
  const { 
    data: calendarData, 
    isLoading: loadingEvents, 
    isFetching: fetchingEvents, 
    refetch: refetchEvents 
  } = useQuery({
    queryKey: ['crm_calendar_events'],
    queryFn: () => crmCalendarService.getEvents(),
    staleTime: 1000 * 60 * 3
  });

  const events: CalendarEvent[] = useMemo(() => calendarData?.events || [], [calendarData]);
  const needsPassword = calendarData?.needs_password && !hasSavedPassword;

  // 3. Query: Proyectos y Leads del CRM
  const { data: projects = [] } = useQuery({
    queryKey: ['crm_projects_for_calendar'],
    queryFn: () => crmService.getProjects(),
    staleTime: 1000 * 60 * 5
  });

  const { data: projectLeads = [] } = useQuery<CRMLead[]>({
    queryKey: ['crm_project_leads_for_calendar', selectedProjectId],
    queryFn: () => selectedProjectId ? crmService.getProjectLeads(selectedProjectId) : Promise.resolve([]),
    enabled: !!selectedProjectId,
    staleTime: 1000 * 60 * 5
  });

  // Notificación toast temporal
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Acción: Sincronizar calendario con cPanel
  const handleSync = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSyncing(true);
    try {
      const res = await crmCalendarService.syncCalendar({
        imap_password: syncPassword || undefined,
        save_password: savePasswordCheck
      });

      if (res.success) {
        showToast('¡Calendario de cPanel sincronizado correctamente!', 'success');
        setIsSyncModalOpen(false);
        setSyncPassword('');
        refetchSettings();
        queryClient.invalidateQueries({ queryKey: ['crm_calendar_events'] });
      } else {
        showToast(res.data?.message || 'Error al conectar con el servidor cPanel.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Error de conexión con cPanel CalDAV.', 'error');
    } finally {
      setSyncing(false);
    }
  };

  // Acción: Crear nueva cita en cPanel CalDAV
  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      showToast('Por favor ingresa un título para la cita.', 'error');
      return;
    }

    const startIso = `${newDate}T${newStartTime}:00`;
    const endIso = `${newDate}T${newEndTime}:00`;

    if (newEndTime <= newStartTime) {
      showToast('La hora de fin debe ser posterior a la hora de inicio.', 'error');
      return;
    }

    setSavingEvent(true);
    try {
      const payload: CreateCalendarEventPayload = {
        title: newTitle.trim(),
        start_datetime: startIso,
        end_datetime: endIso,
        location: newLocation.trim() || undefined,
        description: newDescription.trim() || undefined,
        lead_id: newLeadId || undefined,
        imap_password: syncPassword || undefined
      };

      const res = await crmCalendarService.createEvent(payload);
      if (res.success) {
        showToast('¡Cita agendada y sincronizada en cPanel con éxito!', 'success');
        setIsCreateModalOpen(false);
        setNewTitle('');
        setNewLocation('');
        setNewDescription('');
        setNewLeadId(undefined);
        queryClient.invalidateQueries({ queryKey: ['crm_calendar_events'] });
      } else {
        showToast(res.message || 'Error al crear la cita.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Error comunicándose con cPanel CalDAV.', 'error');
    } finally {
      setSavingEvent(false);
    }
  };

  // Acción: Eliminar / Cancelar cita
  const handleDeleteEvent = async (event: CalendarEvent) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar la cita "${event.title}" de tu calendario de cPanel?`)) {
      return;
    }

    setDeletingUid(event.uid);
    try {
      const res = await crmCalendarService.deleteEvent(event.uid, {
        calendarUrl: event.calendar_url,
        imapPassword: syncPassword || undefined
      });
      if (res.success) {
        showToast('Cita eliminada de cPanel.', 'success');
        setSelectedEvent(null);
        queryClient.invalidateQueries({ queryKey: ['crm_calendar_events'] });
      } else {
        showToast(res.message || 'No se pudo eliminar la cita.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Error al eliminar el evento.', 'error');
    } finally {
      setDeletingUid(null);
    }
  };

  // Cálculos de fecha para la cuadrícula
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Lunes = 0

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const handleToday = () => setCurrentDate(new Date());

  // Filtrado de eventos
  const filteredEvents = useMemo(() => {
    if (!searchFilter.trim()) return events;
    const q = searchFilter.toLowerCase();
    return events.filter(e => 
      e.title.toLowerCase().includes(q) ||
      (e.location && e.location.toLowerCase().includes(q)) ||
      (e.description && e.description.toLowerCase().includes(q))
    );
  }, [events, searchFilter]);

  // Mapa de eventos por día para la vista mensual
  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    filteredEvents.forEach(e => {
      if (!e.start) return;
      const dayKey = e.start.split('T')[0];
      if (!map[dayKey]) map[dayKey] = [];
      map[dayKey].push(e);
    });
    return map;
  }, [filteredEvents]);

  // Formateadores
  const formatTimeRange = (startIso: string, endIso?: string) => {
    try {
      const s = new Date(startIso);
      const sStr = s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (!endIso) return sStr;
      const e = new Date(endIso);
      const eStr = e.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `${sStr} - ${eStr}`;
    } catch {
      return '';
    }
  };

  const formatFullDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('es-CO', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="w-full h-full flex rounded-2xl border border-slate-200/80 overflow-hidden bg-white shadow-xs font-inter text-slate-800">
      
      {/* 🟢 TOAST NOTIFICATION */}
      {toast && (
        <div 
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border text-xs font-semibold animate-in fade-in slide-in-from-top-4 duration-200 ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-rose-50 border-rose-300 text-rose-800'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ⬅️ PANEL LATERAL IZQUIERDO: LISTA DE CITAS & ACCESOS RÁPIDOS (Estilo Chat ConversationList) */}
      <div className="w-full md:w-80 lg:w-96 flex-shrink-0 bg-slate-50/70 border-r border-slate-200/80 flex flex-col h-full overflow-hidden">
        
        {/* Header del Panel Lateral */}
        <div className="p-4 border-b border-slate-200/80 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-slate-900 font-bold font-outfit text-base">
            <CalendarDays className="w-5 h-5 text-brand-500" />
            <span>Agenda & Citas</span>
          </div>
          <button
            onClick={() => {
              setNewDate(new Date().toISOString().split('T')[0]);
              setIsCreateModalOpen(true);
            }}
            className="px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold shadow-xs shadow-brand-500/20 active:scale-95 cursor-pointer"
            title="Agendar nueva cita en cPanel"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Cita</span>
          </button>
        </div>

        {/* Barra de Estado y Sincronización con cPanel */}
        <div className="px-3.5 py-2.5 bg-white border-b border-slate-200/60 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 overflow-hidden">
            {hasSavedPassword ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 animate-ping" />
            )}
            <span className="text-[11px] font-semibold text-slate-600 truncate">
              {hasSavedPassword ? 'cPanel CalDAV Activo' : 'Clave cPanel requerida'}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setIsSyncModalOpen(true)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Configurar conexión cPanel"
            >
              <Key className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => refetchEvents()}
              disabled={fetchingEvents || syncing}
              className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-40"
              title="Sincronizar eventos"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${fetchingEvents ? 'animate-spin text-brand-500' : ''}`} />
            </button>
          </div>
        </div>

        {/* Buscador de Citas */}
        <div className="p-3 bg-white/50 border-b border-slate-200/60 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar cita o cliente..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-white text-slate-900 text-xs pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all placeholder:text-slate-400 font-sans"
            />
            {searchFilter && (
              <button
                onClick={() => setSearchFilter('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Lista de Citas en el Panel Lateral */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
          {loadingEvents ? (
            <div className="h-40 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
              <RefreshCw className="w-5 h-5 text-brand-500 animate-spin" />
              <span>Cargando eventos...</span>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center p-4 text-center text-slate-400 space-y-2">
              <CalendarIcon className="w-8 h-8 text-slate-300" />
              <p className="text-xs font-semibold text-slate-600">No hay citas registradas</p>
              <p className="text-[11px] text-slate-400">
                Toca "+ Nueva Cita" para programar una reunión en cPanel.
              </p>
            </div>
          ) : (
            filteredEvents.map((ev) => {
              const isSelected = selectedEvent?.uid === ev.uid;
              return (
                <div
                  key={ev.uid}
                  onClick={() => setSelectedEvent(ev)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer text-left space-y-1 group ${
                    isSelected
                      ? 'bg-white border-brand-500 shadow-sm ring-1 ring-brand-500/20'
                      : 'bg-white hover:bg-slate-100/80 border-slate-200/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-brand-50 text-brand-700">
                      {formatFullDate(ev.start)}
                    </span>
                    <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5 text-slate-400" />
                      {formatTimeRange(ev.start, ev.end)}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-brand-600 transition-colors truncate font-montserrat">
                    {ev.title}
                  </h4>

                  {ev.location && (
                    <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                      <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                      <span className="truncate">{ev.location}</span>
                    </p>
                  )}

                  {ev.url && (
                    <div className="pt-0.5">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                        <Video className="w-2.5 h-2.5" />
                        Videollamada lista
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer del Panel Lateral */}
        <div className="p-3 border-t border-slate-200/80 bg-white flex items-center justify-between text-xs text-slate-500 shrink-0">
          <button
            onClick={() => navigate('/dashboard/crm/inbox')}
            className="flex items-center gap-1.5 text-slate-600 hover:text-brand-600 font-medium transition-colors cursor-pointer text-[11px]"
          >
            <Mail className="w-3.5 h-3.5 text-brand-500" />
            <span>Ir a Bandeja de Correos</span>
          </button>
          <span className="text-[10px] font-bold text-slate-400">
            {events.length} {events.length === 1 ? 'cita' : 'citas'}
          </span>
        </div>

      </div>

      {/* ➡️ PANEL PRINCIPAL: VISTA DE MES O LISTA (Ajustado a la altura de pantalla) */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
        
        {/* Barra Superior del Calendario Principal */}
        <div className="px-5 py-3 border-b border-slate-200/80 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          
          {/* Selector de Mes */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200">
              <button
                onClick={handlePrevMonth}
                className="p-1 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                title="Mes anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-xs font-bold text-slate-900 min-w-[130px] text-center font-montserrat">
                {MONTH_NAMES[month]} {year}
              </span>
              <button
                onClick={handleNextMonth}
                className="p-1 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                title="Mes siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleToday}
              className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              Hoy
            </button>
          </div>

          {/* Toggle de Vistas: Mes vs Lista */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
              <button
                onClick={() => setViewMode('month')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'month'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5 text-brand-500" />
                <span>Mes</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <List className="w-3.5 h-3.5 text-brand-500" />
                <span>Agenda</span>
              </button>
            </div>
          </div>

        </div>

        {/* Cuerpo del Calendario (Totalmente adaptado a la altura restante) */}
        <div className="flex-1 overflow-hidden p-3 sm:p-4 flex flex-col bg-slate-50/50">
          {viewMode === 'month' ? (
            
            /* 🗓️ VISTA DE MES: Cuadrícula con altura 100% */
            <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              
              {/* Encabezado de los Días */}
              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 text-center text-xs font-bold text-slate-500 py-2 shrink-0">
                {DAY_NAMES.map((d, i) => (
                  <div key={i} className="font-montserrat uppercase tracking-wider text-[11px]">
                    {d}
                  </div>
                ))}
              </div>

              {/* Días en Cuadrícula Flex-1 */}
              <div className="grid grid-cols-7 grid-rows-5 md:grid-rows-6 flex-1 bg-slate-200/50 gap-[1px] overflow-hidden">
                {/* Días vacíos previos */}
                {Array.from({ length: firstDayIndex }).map((_, i) => (
                  <div key={`empty-${i}`} className="bg-slate-50/50 p-1.5 opacity-40 min-h-0" />
                ))}

                {/* Días del mes */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNumber = i + 1;
                  const dayMonthStr = String(month + 1).padStart(2, '0');
                  const dayNumberStr = String(dayNumber).padStart(2, '0');
                  const dateKey = `${year}-${dayMonthStr}-${dayNumberStr}`;
                  const dayEvents = eventsByDay[dateKey] || [];

                  const today = new Date();
                  const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === dayNumber;

                  return (
                    <div
                      key={dateKey}
                      onClick={() => {
                        setNewDate(dateKey);
                        setIsCreateModalOpen(true);
                      }}
                      className={`bg-white p-1.5 flex flex-col min-h-0 overflow-hidden transition-colors group cursor-pointer hover:bg-brand-50/20 ${
                        isToday ? 'bg-amber-50/30 ring-1 ring-inset ring-amber-400/40' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between shrink-0 mb-1">
                        <span
                          className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center ${
                            isToday
                              ? 'bg-brand-500 text-white font-black shadow-xs'
                              : 'text-slate-600 group-hover:text-brand-600'
                          }`}
                        >
                          {dayNumber}
                        </span>

                        {dayEvents.length > 0 && (
                          <span className="text-[10px] font-bold text-brand-600 bg-brand-50 px-1 rounded">
                            {dayEvents.length}
                          </span>
                        )}
                      </div>

                      {/* Eventos dentro de la celda */}
                      <div className="flex-1 overflow-y-auto space-y-1 no-scrollbar min-h-0">
                        {dayEvents.slice(0, 2).map((ev) => (
                          <div
                            key={ev.uid}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvent(ev);
                            }}
                            className="px-1.5 py-0.5 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-medium truncate flex items-center gap-1 shadow-2xs"
                            title={`${ev.title} (${formatTimeRange(ev.start, ev.end)})`}
                          >
                            {ev.url ? (
                              <Video className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                            ) : (
                              <Clock className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                            )}
                            <span className="truncate">{ev.title}</span>
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <p className="text-[9px] text-slate-400 font-bold pl-1">
                            +{dayEvents.length - 2} más
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          ) : (

            /* 📋 VISTA DE AGENDA / LISTA */
            <div className="flex-1 overflow-y-auto space-y-3 max-w-3xl mx-auto w-full p-2">
              {filteredEvents.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
                  <CalendarCheck className="w-10 h-10 text-slate-300" />
                  <h3 className="text-sm font-bold text-slate-800 font-montserrat">
                    No tienes reuniones programadas
                  </h3>
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                  >
                    Agendar Cita en cPanel
                  </button>
                </div>
              ) : (
                filteredEvents.map((ev) => (
                  <div
                    key={ev.uid}
                    className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs hover:shadow-sm transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 border border-brand-200/50">
                          {formatFullDate(ev.start)}
                        </span>
                        <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {formatTimeRange(ev.start, ev.end)}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-brand-600 transition-colors font-montserrat">
                        {ev.title}
                      </h4>

                      {ev.description && (
                        <p className="text-xs text-slate-500 line-clamp-2">
                          {ev.description}
                        </p>
                      )}

                      {ev.location && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <MapPin className="w-3 h-3 text-amber-500 shrink-0" />
                          <span>{ev.location}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {ev.url && (
                        <a
                          href={ev.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Unirse</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}

                      <button
                        onClick={() => setSelectedEvent(ev)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                      >
                        Ver Detalle
                      </button>

                      <button
                        onClick={() => handleDeleteEvent(ev)}
                        disabled={deletingUid === ev.uid}
                        className="p-1.5 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Eliminar de cPanel"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

          )}
        </div>

      </div>

      {/* 🟢 MODAL: AGENDAR NUEVA CITA */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200 text-slate-900">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-montserrat">
                    Agendar Cita en cPanel CalDAV
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Sincronización en vivo con tu cuenta corporativa
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAppointment} className="space-y-3.5 text-xs">
              
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Título o Asunto de la Reunión *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Presentación de Inversión con Carlos"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:bg-white transition-all font-sans"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Fecha *
                  </label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-brand-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Hora Inicio *
                  </label>
                  <input
                    type="time"
                    required
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-brand-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Hora Fin *
                  </label>
                  <input
                    type="time"
                    required
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-brand-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-700">
                    Ubicación o Enlace Virtual
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setNewLocation('Google Meet')}
                      className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[10px] text-slate-600 font-medium"
                    >
                      + Meet
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewLocation('Oficinas Gloint')}
                      className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[10px] text-slate-600 font-medium"
                    >
                      + Oficina
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="https://meet.google.com/... o Dirección física"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:bg-white transition-all"
                />
              </div>

              {/* Selector de Proyecto y Lead */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Proyecto CRM (Opcional)
                  </label>
                  <select
                    value={selectedProjectId || ''}
                    onChange={(e) => {
                      const pId = e.target.value ? Number(e.target.value) : undefined;
                      setSelectedProjectId(pId);
                      setNewLeadId(undefined);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-brand-500 focus:bg-white"
                  >
                    <option value="">-- Sin proyecto --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Prospecto / Lead
                  </label>
                  <select
                    value={newLeadId || ''}
                    disabled={!selectedProjectId}
                    onChange={(e) => setNewLeadId(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-brand-500 focus:bg-white disabled:opacity-40"
                  >
                    <option value="">{selectedProjectId ? '-- Seleccionar prospecto --' : '-- Elige proyecto primero --'}</option>
                    {projectLeads.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Notas o Temas a Tratar
                </label>
                <textarea
                  rows={2}
                  placeholder="Temas de la reunión, compromisos previos..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:bg-white resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEvent}
                  className="px-5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold shadow-sm shadow-brand-500/20 cursor-pointer disabled:opacity-50 transition-all flex items-center gap-1.5"
                >
                  {savingEvent ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <CalendarCheck className="w-4 h-4" />
                      <span>Agendar Cita</span>
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* 🔍 MODAL: DETALLE DE EVENTO */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 text-slate-900">
            
            <div className="flex items-start justify-between">
              <div>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-brand-50 text-brand-700 border border-brand-200/60">
                  {formatFullDate(selectedEvent.start)}
                </span>
                <h3 className="text-base font-bold text-slate-900 font-montserrat mt-2">
                  {selectedEvent.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-500 shrink-0" />
                <span className="font-semibold text-slate-800">
                  {formatTimeRange(selectedEvent.start, selectedEvent.end)}
                </span>
              </div>

              {selectedEvent.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>{selectedEvent.location}</span>
                </div>
              )}

              {selectedEvent.organizer && (
                <div className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-purple-500 shrink-0" />
                  <span>Organizador: {selectedEvent.organizer.name}</span>
                </div>
              )}

              {selectedEvent.description && (
                <div className="pt-2 border-t border-slate-200/80">
                  <p className="text-[11px] font-bold text-slate-500 mb-1">Notas:</p>
                  <p className="whitespace-pre-wrap text-slate-700 text-xs">
                    {selectedEvent.description}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => handleDeleteEvent(selectedEvent)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Cancelar Cita</span>
              </button>

              <div className="flex items-center gap-2">
                {selectedEvent.url && (
                  <a
                    href={selectedEvent.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-all cursor-pointer"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Unirse a llamada</span>
                  </a>
                )}
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 🔐 MODAL: CONFIGURACIÓN / CONEXIÓN CPANEL CALDAV */}
      {isSyncModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 text-slate-900">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-montserrat">
                    Conexión cPanel CalDAV
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Puerto 2080 HTTPS • Sincronización de Webmail
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsSyncModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSync} className="space-y-3.5 text-xs">
              
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 space-y-1 text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400">Servidor CalDAV:</span>
                  <span className="font-mono text-slate-800 font-medium">host81.latinoamericahosting.com:2080</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Estado de clave:</span>
                  <span className={hasSavedPassword ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                    {hasSavedPassword ? 'Guardada de forma segura' : 'Pendiente de configurar'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Contraseña de la cuenta de correo cPanel {hasSavedPassword ? '(Opcional para actualizar)' : '*'}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    placeholder={hasSavedPassword ? '••••••••••••••••' : 'Ingresa tu contraseña de cPanel'}
                    value={syncPassword}
                    onChange={(e) => setSyncPassword(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:bg-white"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={savePasswordCheck}
                  onChange={(e) => setSavePasswordCheck(e.target.checked)}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span>Recordar contraseña para sincronizaciones automáticas</span>
              </label>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSyncModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  disabled={syncing}
                  className="px-5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold shadow-xs cursor-pointer disabled:opacity-50 transition-all flex items-center gap-1.5"
                >
                  {syncing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Verificando...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verificar y Guardar</span>
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};

export default CRMCalendarPage;
