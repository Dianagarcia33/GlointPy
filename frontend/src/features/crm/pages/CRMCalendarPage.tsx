import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  Clock,
  Video,
  MapPin,
  Users,
  Plus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Lock,
  Key,
  Mail,
  Search,
  X,
  Phone,
  Building2,
  CalendarCheck,
  Sparkles,
  User as UserIcon,
  ShieldCheck,
  CalendarDays,
  ListFilter
} from 'lucide-react';
import { 
  crmCalendarService, 
  CalendarEvent, 
  CreateCalendarEventPayload 
} from '../../../services/crmCalendarService';
import { crmEmailService } from '../../../services/crmEmailService';
import { crmService, CRMLead } from '../../../services/crmService';

// Nombres de meses y días en español
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];
const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export const CRMCalendarPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Estados de navegación de calendario
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
  const [newLeadId, setNewLeadId] = useState<number | undefined>(undefined);
  const [savingEvent, setSavingEvent] = useState(false);

  // Sincronización cPanel
  const [syncPassword, setSyncPassword] = useState('');
  const [savePasswordCheck, setSavePasswordCheck] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Filtro / búsqueda de eventos
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
    staleTime: 1000 * 60 * 3 // 3 minutos
  });

  const events: CalendarEvent[] = useMemo(() => calendarData?.events || [], [calendarData]);
  const needsPassword = calendarData?.needs_password && !hasSavedPassword;

  // 3. Query: Proyectos y Leads del CRM
  const { data: projects = [] } = useQuery({
    queryKey: ['crm_projects_for_calendar'],
    queryFn: () => crmService.getProjects(),
    staleTime: 1000 * 60 * 5
  });

  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>(undefined);

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
        // Reset form
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

  // Cálculos para la cuadrícula del mes
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Lunes = 0

  // Navegación de mes
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

  // Formateador de hora amigable
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

  // Formateador de fecha completa
  const formatFullDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('es-CO', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-slate-950 font-sans text-slate-100">
      
      {/* 🟢 TOAST NOTIFICATION */}
      {toast && (
        <div 
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border text-sm animate-in fade-in slide-in-from-top-4 duration-200 ${
            toast.type === 'success'
              ? 'bg-emerald-950/95 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/95 border-rose-500/40 text-rose-200'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* 顶部 HEADER DE LA AGENDA */}
      <header className="h-16 px-6 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20 text-white font-bold">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white font-montserrat tracking-tight">
                Agenda & Calendario cPanel
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                CalDAV 2080
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Sincronizado bidireccionalmente con tu Webmail corporativo
            </p>
          </div>
        </div>

        {/* Acciones principales del header */}
        <div className="flex items-center gap-2.5">
          {/* Ir a la Bandeja de correos */}
          <button
            onClick={() => navigate('/dashboard/crm/inbox')}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs transition-colors border border-slate-700/60 cursor-pointer"
            title="Ir a la Bandeja de Correos"
          >
            <Mail className="w-3.5 h-3.5 text-brand-400" />
            <span>Bandeja de Correos</span>
          </button>

          {/* Estado / Conexión cPanel */}
          <button
            onClick={() => setIsSyncModalOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
              hasSavedPassword
                ? 'bg-slate-800/80 hover:bg-slate-700/90 text-slate-300 border-slate-700'
                : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
            }`}
          >
            {hasSavedPassword ? <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Key className="w-3.5 h-3.5 text-amber-400" />}
            <span>{hasSavedPassword ? 'cPanel Conectado' : 'Configurar cPanel'}</span>
          </button>

          {/* Botón Sincronizar Ahora */}
          <button
            onClick={() => refetchEvents()}
            disabled={fetchingEvents || syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 cursor-pointer disabled:opacity-50 transition-all"
            title="Recargar eventos desde cPanel"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${fetchingEvents ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Sincronizar</span>
          </button>

          {/* Botón Nueva Cita */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 text-xs font-black shadow-md shadow-amber-500/20 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 text-slate-950" />
            <span>Agendar Cita</span>
          </button>
        </div>
      </header>

      {/* 🟡 AVISO SI REQUIERE CONTRASEÑA */}
      {needsPassword && (
        <div className="bg-amber-950/60 border-b border-amber-500/30 px-6 py-2.5 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Ingresa la contraseña de tu cuenta de correo de cPanel para activar la sincronización automática de tu calendario.
            </span>
          </div>
          <button
            onClick={() => setIsSyncModalOpen(true)}
            className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer shrink-0 ml-4"
          >
            Configurar Ahora
          </button>
        </div>
      )}

      {/* 🧭 BARRA DE NAVEGACIÓN Y VISTAS */}
      <div className="px-6 py-3 border-b border-slate-800/80 bg-slate-900/40 flex flex-wrap items-center justify-between gap-3 shrink-0">
        
        {/* Controles de Mes y Año */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-800/80 rounded-xl p-1 border border-slate-700/60">
            <button
              onClick={handlePrevMonth}
              className="p-1 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Mes anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-bold text-white min-w-[140px] text-center font-montserrat">
              {MONTH_NAMES[month]} {year}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Mes siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleToday}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700/60 transition-colors cursor-pointer"
          >
            Hoy
          </button>

          <span className="text-xs text-slate-500 font-medium ml-2">
            {filteredEvents.length} {filteredEvents.length === 1 ? 'evento registrado' : 'eventos registrados'}
          </span>
        </div>

        {/* Buscador y Selector de Vista (Mes / Lista) */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar citas o clientes..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-48 sm:w-60 pl-8 pr-3 py-1.5 bg-slate-800/70 border border-slate-700/70 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/60 transition-colors"
            />
            {searchFilter && (
              <button 
                onClick={() => setSearchFilter('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center bg-slate-800/80 rounded-xl p-1 border border-slate-700/60">
            <button
              onClick={() => setViewMode('month')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                viewMode === 'month'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Mes</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Lista</span>
            </button>
          </div>
        </div>

      </div>

      {/* 📅 CONTENIDO PRINCIPAL DEL CALENDARIO */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950/80">
        {loadingEvents ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400">
            <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
            <p className="text-sm font-medium">Cargando eventos desde cPanel CalDAV...</p>
          </div>
        ) : viewMode === 'month' ? (
          
          /* 🗓️ VISTA DE MES */
          <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 overflow-hidden shadow-2xl flex flex-col">
            
            {/* Encabezado de los días de la semana */}
            <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-900/90 text-center text-xs font-bold text-slate-400 py-2.5">
              {DAY_NAMES.map((d, i) => (
                <div key={i} className="font-montserrat uppercase tracking-wider text-[11px]">
                  {d}
                </div>
              ))}
            </div>

            {/* Días del mes */}
            <div className="grid grid-cols-7 auto-rows-fr bg-slate-950/40">
              {/* Celdas vacías del mes anterior */}
              {Array.from({ length: firstDayIndex }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[110px] p-2 border-r border-b border-slate-800/40 bg-slate-900/20 opacity-30" />
              ))}

              {/* Días reales del mes */}
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
                    className={`min-h-[110px] p-2 border-r border-b border-slate-800/60 transition-colors group cursor-pointer hover:bg-slate-800/30 flex flex-col ${
                      isToday ? 'bg-amber-500/5' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                          isToday
                            ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 font-black'
                            : 'text-slate-300 group-hover:text-amber-400'
                        }`}
                      >
                        {dayNumber}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="text-[10px] font-bold text-amber-400/80">
                          {dayEvents.length} {dayEvents.length === 1 ? 'cita' : 'citas'}
                        </span>
                      )}
                    </div>

                    {/* Lista de citas de este día */}
                    <div className="space-y-1 overflow-y-auto max-h-[80px] no-scrollbar">
                      {dayEvents.slice(0, 3).map((ev) => (
                        <div
                          key={ev.uid}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvent(ev);
                          }}
                          className="px-2 py-1 rounded-lg bg-slate-800/90 hover:bg-amber-500/20 text-slate-200 hover:text-amber-300 border border-slate-700/60 hover:border-amber-500/40 text-[11px] truncate transition-all flex items-center gap-1"
                        >
                          {ev.url ? (
                            <Video className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                          ) : (
                            <Clock className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                          )}
                          <span className="truncate font-medium">{ev.title}</span>
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <p className="text-[10px] text-slate-400 font-semibold pl-1">
                          +{dayEvents.length - 3} más
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        ) : (

          /* 📋 VISTA DE LISTA DE CITAS */
          <div className="max-w-4xl mx-auto space-y-4">
            {filteredEvents.length === 0 ? (
              <div className="bg-slate-900/60 rounded-3xl border border-slate-800 p-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  <CalendarDays className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white font-montserrat">
                    No hay citas ni reuniones programadas
                  </h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Tu calendario de cPanel no contiene eventos para los filtros seleccionados o aún no has creado ninguna reunión.
                  </p>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 cursor-pointer transition-all"
                >
                  Agendar Primera Cita
                </button>
              </div>
            ) : (
              filteredEvents.map((ev) => (
                <div
                  key={ev.uid}
                  className="bg-slate-900/70 hover:bg-slate-900 rounded-2xl border border-slate-800 hover:border-amber-500/30 p-4 transition-all shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        {formatFullDate(ev.start)}
                      </span>
                      <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {formatTimeRange(ev.start, ev.end)}
                      </span>
                      {ev.status && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-slate-400 uppercase">
                          {ev.status}
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors font-montserrat">
                      {ev.title}
                    </h4>

                    {ev.description && (
                      <p className="text-xs text-slate-400 line-clamp-2 max-w-xl">
                        {ev.description}
                      </p>
                    )}

                    {ev.location && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-300 pt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">{ev.location}</span>
                      </div>
                    )}
                  </div>

                  {/* Acciones de la cita */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {ev.url && (
                      <a
                        href={ev.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                      >
                        <Video className="w-3.5 h-3.5 text-slate-950" />
                        <span>Unirse a llamada</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}

                    <button
                      onClick={() => setSelectedEvent(ev)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 cursor-pointer transition-colors"
                    >
                      Ver Detalle
                    </button>

                    <button
                      onClick={() => handleDeleteEvent(ev)}
                      disabled={deletingUid === ev.uid}
                      className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 transition-colors cursor-pointer"
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

      {/* 🟢 MODAL: AGENDAR NUEVA CITA */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <CalendarCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white font-montserrat">
                    Agendar Cita en cPanel CalDAV
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Se guardará en tu calendario corporativo y se sincronizará en tiempo real
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAppointment} className="space-y-4 text-xs">
              
              {/* Título de la Cita */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Título o Asunto de la Reunión *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Presentación Modelo Inversión con Carlos"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Fecha y Horas */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Fecha *
                  </label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Hora Inicio *
                  </label>
                  <input
                    type="time"
                    required
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Hora Fin *
                  </label>
                  <input
                    type="time"
                    required
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Ubicación / Enlace de reunión */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-300">
                    Ubicación o Enlace Virtual
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setNewLocation('Google Meet')}
                      className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300"
                    >
                      + Meet
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewLocation('Oficinas Gloint')}
                      className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300"
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
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Vincular con Prospecto / Lead del CRM */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Proyecto CRM (Opcional)
                  </label>
                  <select
                    value={selectedProjectId || ''}
                    onChange={(e) => {
                      const pId = e.target.value ? Number(e.target.value) : undefined;
                      setSelectedProjectId(pId);
                      setNewLeadId(undefined);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- Selecciona proyecto --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Prospecto / Lead
                  </label>
                  <select
                    value={newLeadId || ''}
                    disabled={!selectedProjectId}
                    onChange={(e) => setNewLeadId(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 focus:outline-none focus:border-amber-500 disabled:opacity-40"
                  >
                    <option value="">{selectedProjectId ? '-- Selecciona prospecto --' : '-- Elige proyecto primero --'}</option>
                    {projectLeads.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} {l.email ? `(${l.email})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notas / Descripción */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Descripción o Notas de la Reunión
                </label>
                <textarea
                  rows={2}
                  placeholder="Objetivos de la llamada, temas a tratar..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEvent}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-50 transition-all flex items-center gap-1.5"
                >
                  {savingEvent ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando en cPanel...</span>
                    </>
                  ) : (
                    <>
                      <CalendarCheck className="w-4 h-4" />
                      <span>Agendar y Sincronizar</span>
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
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-start justify-between">
              <div>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {formatFullDate(selectedEvent.start)}
                </span>
                <h3 className="text-base font-bold text-white font-montserrat mt-2">
                  {selectedEvent.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
              
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{formatTimeRange(selectedEvent.start, selectedEvent.end)}</span>
              </div>

              {selectedEvent.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{selectedEvent.location}</span>
                </div>
              )}

              {selectedEvent.organizer && (
                <div className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Organizador: {selectedEvent.organizer.name} ({selectedEvent.organizer.email})</span>
                </div>
              )}

              {selectedEvent.description && (
                <div className="pt-2 border-t border-slate-800/80">
                  <p className="text-[11px] font-semibold text-slate-400 mb-1">Descripción / Notas:</p>
                  <p className="whitespace-pre-wrap text-slate-300 text-xs">
                    {selectedEvent.description}
                  </p>
                </div>
              )}

            </div>

            {/* Acciones */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => handleDeleteEvent(selectedEvent)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold border border-rose-500/30 transition-colors cursor-pointer"
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
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                  >
                    <Video className="w-3.5 h-3.5 text-slate-950" />
                    <span>Unirse a videollamada</span>
                  </a>
                )}
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white font-montserrat">
                    Conexión cPanel CalDAV
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Puerto seguro 2080 HTTPS • Calendarios de Webmail
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsSyncModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSync} className="space-y-4 text-xs">
              
              <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800 space-y-1.5 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Servidor CalDAV:</span>
                  <span className="font-mono text-slate-300">host81.latinoamericahosting.com:2080</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Protocolo:</span>
                  <span className="text-emerald-400 font-semibold">HTTPS / CalDAV (RFC 4791)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Estado de contraseña:</span>
                  <span className={hasSavedPassword ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                    {hasSavedPassword ? 'Guardada de forma segura' : 'No configurada'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Contraseña de la cuenta de correo cPanel {hasSavedPassword ? '(Opcional para actualizar)' : '*'}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    placeholder={hasSavedPassword ? '••••••••••••••••' : 'Ingresa tu contraseña de cPanel'}
                    value={syncPassword}
                    onChange={(e) => setSyncPassword(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-slate-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={savePasswordCheck}
                  onChange={(e) => setSavePasswordCheck(e.target.checked)}
                  className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 bg-slate-800"
                />
                <span>Recordar contraseña para sincronizaciones automáticas</span>
              </label>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSyncModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  disabled={syncing}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-50 transition-all flex items-center gap-1.5"
                >
                  {syncing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Probando conexión...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verificar y Sincronizar</span>
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
