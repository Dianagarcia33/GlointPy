import React, { useState, useEffect, useMemo } from 'react';
import { 
  DoorClosed, 
  Calendar as CalendarIcon, 
  Plus, 
  Clock, 
  Users, 
  MapPin, 
  Monitor, 
  Edit2, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  X,
  BookmarkCheck,
  CalendarCheck,
  RefreshCw,
  LayoutGrid,
  ListFilter,
  Sparkles,
  Wifi,
  Video,
  Presentation,
  CheckCircle
} from 'lucide-react';
import { roomsService, MeetingRoom, RoomReservation } from '../../../services/rooms';
import { RoomModal } from '../components/RoomModal';
import { RoomReservationModal } from '../components/RoomReservationModal';
import { ConfirmationModal } from '../../../components/common/ConfirmationModal';
import { useAuthStore } from '../../../store/authStore';
import { Can } from '../../../components/security/Can';
import { formatColombiaDate, getColombiaToday } from '../../../utils/format';

// Hours displayed in the interactive timeline: 07:00 to 20:00
const TIMELINE_HOURS: number[] = [];
for (let h = 7; h <= 20; h++) {
  TIMELINE_HOURS.push(h);
}

export const RoomsPage: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = Boolean(user?.roles?.some(r => ['admin', 'superadmin'].includes(r.name.toLowerCase())) || user?.is_superuser);

  const [activeTab, setActiveTab] = useState<'calendar' | 'rooms' | 'my-reservations'>('calendar');
  const [calendarViewMode, setCalendarViewMode] = useState<'grid' | 'cards'>('grid');

  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [reservations, setReservations] = useState<RoomReservation[]>([]);
  const [myReservations, setMyReservations] = useState<RoomReservation[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Selected date for calendar view (default today Colombia YYYY-MM-DD)
  const todayStr = getColombiaToday();
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Modals state
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<MeetingRoom | null>(null);

  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [preselectedRoomId, setPreselectedRoomId] = useState<number | undefined>(undefined);
  const [preselectedStartTime, setPreselectedStartTime] = useState<string | undefined>(undefined);

  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [reservationToCancel, setReservationToCancel] = useState<RoomReservation | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [isCancellingReservation, setIsCancellingReservation] = useState<boolean>(false);

  // Filter for Tab 3 (Mis Reservas)
  const [myReservationsFilter, setMyReservationsFilter] = useState<'all' | 'upcoming' | 'past'>('all');

  const fetchRooms = async () => {
    try {
      const data = await roomsService.getRooms(false);
      setRooms(data);
    } catch (err: any) {
      console.error('Error fetching rooms:', err);
    }
  };

  const fetchCalendarReservations = async (dateStr: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const startIso = `${dateStr}T00:00:00`;
      const endIso = `${dateStr}T23:59:59`;

      const data = await roomsService.getReservations({
        start_date: startIso,
        end_date: endIso,
        status: 'confirmed',
      });
      setReservations(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar las reservas del día.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMyReservations = async () => {
    try {
      const data = await roomsService.getMyReservations();
      setMyReservations(data);
    } catch (err: any) {
      console.error('Error fetching my reservations:', err);
    }
  };

  const loadAll = async () => {
    setIsRefreshing(true);
    await Promise.allSettled([
      fetchRooms(),
      fetchCalendarReservations(selectedDate),
      fetchMyReservations()
    ]);
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    if (activeTab === 'calendar') {
      fetchCalendarReservations(selectedDate);
    } else if (activeTab === 'my-reservations') {
      fetchMyReservations();
    }
  }, [activeTab, selectedDate]);

  // Date Navigation
  const handlePrevDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d - 1);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
  };

  const handleNextDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d + 1);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
  };

  const handleToday = () => {
    setSelectedDate(todayStr);
  };

  // Handlers
  const handleOpenNewRoom = () => {
    setEditingRoom(null);
    setIsRoomModalOpen(true);
  };

  const handleOpenEditRoom = (room: MeetingRoom) => {
    setEditingRoom(room);
    setIsRoomModalOpen(true);
  };

  const handleOpenReservation = (roomId?: number, startTime?: string) => {
    setPreselectedRoomId(roomId);
    setPreselectedStartTime(startTime);
    setIsReservationModalOpen(true);
  };

  const handleOpenCancelModal = (reservation: RoomReservation) => {
    setReservationToCancel(reservation);
    setCancelReason('');
  };

  const handleConfirmCancelReservation = async () => {
    if (!reservationToCancel) return;

    try {
      setIsCancellingReservation(true);
      setCancellingId(reservationToCancel.id);
      setError(null);
      await roomsService.cancelReservation(reservationToCancel.id, cancelReason.trim() || undefined);
      setSuccess('Reserva cancelada exitosamente.');
      setTimeout(() => setSuccess(null), 4000);

      setReservationToCancel(null);
      setCancelReason('');

      fetchCalendarReservations(selectedDate);
      fetchMyReservations();
    } catch (err: any) {
      setError(err.message || 'Error al cancelar la reserva.');
    } finally {
      setIsCancellingReservation(false);
      setCancellingId(null);
    }
  };

  const handleDeleteRoom = async (room: MeetingRoom) => {
    if (!window.confirm(`¿Estás seguro de desactivar o eliminar la sala "${room.name}"?`)) {
      return;
    }

    try {
      await roomsService.deleteRoom(room.id);
      setSuccess(`Sala "${room.name}" actualizada/eliminada exitosamente.`);
      setTimeout(() => setSuccess(null), 4000);
      fetchRooms();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar la sala.');
    }
  };

  // Format time helper (HH:MM am/pm)
  const formatTime = (isoString: string) => {
    try {
      if (!isoString) return '';
      if (isoString.includes('T')) {
        const timePart = isoString.split('T')[1].replace('Z', '').split('.')[0];
        const [hStr, mStr] = timePart.split(':');
        let h = parseInt(hStr, 10);
        const m = mStr || '00';
        const ampm = h >= 12 ? 'p. m.' : 'a. m.';
        h = h % 12 || 12;
        const hFormatted = h.toString().padStart(2, '0');
        return `${hFormatted}:${m} ${ampm}`;
      }
      const d = new Date(isoString);
      return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return isoString;
    }
  };

  // Convert ISO string to minutes from midnight
  const parseTimeToMinutes = (isoString: string): number => {
    if (!isoString || !isoString.includes('T')) return 0;
    const timePart = isoString.split('T')[1].replace('Z', '').split('.')[0];
    const [h, m] = timePart.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  // Current Colombia time in minutes
  const currentColombiaMinutes = useMemo(() => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'America/Bogota',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    };
    const parts = new Intl.DateTimeFormat('en-US', options).format(now).split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }, []);

  const isSelectedDateToday = selectedDate === todayStr;

  // Compute live presence status for each room
  const getRoomLivePresence = (room: MeetingRoom) => {
    const roomReservations = reservations.filter(
      (r) => r.room_id === room.id && r.status === 'confirmed'
    );

    if (!isSelectedDateToday) {
      return {
        isBusy: false,
        statusLabel: `${roomReservations.length} reserva(s) agendada(s)`,
        currentMeeting: null,
        nextMeeting: null,
      };
    }

    const currentMeeting = roomReservations.find((r) => {
      const startMin = parseTimeToMinutes(r.start_time);
      const endMin = parseTimeToMinutes(r.end_time);
      return currentColombiaMinutes >= startMin && currentColombiaMinutes < endMin;
    });

    if (currentMeeting) {
      return {
        isBusy: true,
        statusLabel: `En reunión hasta las ${formatTime(currentMeeting.end_time)}`,
        currentMeeting,
        nextMeeting: null,
      };
    }

    // Find next upcoming meeting today
    const upcoming = roomReservations
      .filter((r) => parseTimeToMinutes(r.start_time) > currentColombiaMinutes)
      .sort((a, b) => parseTimeToMinutes(a.start_time) - parseTimeToMinutes(b.start_time))[0];

    if (upcoming) {
      return {
        isBusy: false,
        statusLabel: `Disponible • Próxima a las ${formatTime(upcoming.start_time)}`,
        currentMeeting: null,
        nextMeeting: upcoming,
      };
    }

    return {
      isBusy: false,
      statusLabel: 'Disponible el resto del día',
      currentMeeting: null,
      nextMeeting: null,
    };
  };

  // KPIs Calculations
  const activeRooms = useMemo(() => rooms.filter((r) => r.is_active), [rooms]);
  const confirmedReservationsToday = useMemo(
    () => reservations.filter((r) => r.status === 'confirmed'),
    [reservations]
  );

  const totalHoursBookedToday = useMemo(() => {
    return confirmedReservationsToday.reduce((total, r) => {
      const start = parseTimeToMinutes(r.start_time);
      const end = parseTimeToMinutes(r.end_time);
      return total + Math.max(0, (end - start) / 60);
    }, 0);
  }, [confirmedReservationsToday]);

  const currentlyAvailableRoomsCount = useMemo(() => {
    if (!isSelectedDateToday) return activeRooms.length;
    return activeRooms.filter((r) => {
      const presence = getRoomLivePresence(r);
      return !presence.isBusy;
    }).length;
  }, [activeRooms, isSelectedDateToday, reservations, currentColombiaMinutes]);

  // Tab 3 Filtered list
  const filteredMyReservations = useMemo(() => {
    const nowIso = new Date().toISOString();
    if (myReservationsFilter === 'upcoming') {
      return myReservations.filter(
        (r) => r.status === 'confirmed' && r.end_time >= nowIso
      );
    }
    if (myReservationsFilter === 'past') {
      return myReservations.filter(
        (r) => r.status !== 'confirmed' || r.end_time < nowIso
      );
    }
    return myReservations;
  }, [myReservations, myReservationsFilter]);

  // Helper for rendering equipment badges
  const renderEquipmentChips = (equipmentStr?: string | null) => {
    if (!equipmentStr) return null;
    const items = equipmentStr.split(',').map((s) => s.trim()).filter(Boolean);
    if (!items.length) return null;

    return (
      <div className="flex flex-wrap gap-1.5 mt-2">
        {items.map((item, idx) => {
          const lower = item.toLowerCase();
          let Icon = Monitor;
          if (lower.includes('wifi') || lower.includes('red') || lower.includes('internet')) Icon = Wifi;
          else if (lower.includes('video') || lower.includes('polycom') || lower.includes('camara') || lower.includes('zoom')) Icon = Video;
          else if (lower.includes('tablero') || lower.includes('acrilico') || lower.includes('pizarra')) Icon = Presentation;

          return (
            <span
              key={idx}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-50 border border-slate-200/80 text-slate-600 text-[10px] font-semibold"
            >
              <Icon className="w-3 h-3 text-slate-400" />
              {item}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* 1. TOP BANNER / ENCABEZADO ESTANDARIZADO GLOINT */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-montserrat tracking-tight flex items-center gap-2.5">
              <span className="p-2.5 bg-amber-50 text-amber-600 border border-amber-200/80 rounded-2xl inline-flex shadow-xs">
                <DoorClosed className="w-6 h-6" />
              </span>
              Salas de Reuniones
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 uppercase tracking-wider font-montserrat">
              Gloint Hub
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Consulta disponibilidad en tiempo real y gestiona las reservas de los espacios corporativos.
          </p>
        </div>

        {/* Acciones principales estandarizadas */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={loadAll}
            disabled={isRefreshing}
            className="p-2.5 rounded-2xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-xs cursor-pointer"
            title="Refrescar disponibilidad"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          <Can permissions={['rooms:reserve', 'admin.rooms.manage']}>
            <button
              onClick={() => handleOpenReservation()}
              className="py-2.5 px-5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs font-montserrat uppercase tracking-wider shadow-md shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              <CalendarCheck className="w-4 h-4" />
              <span>Nueva Reserva</span>
            </button>
          </Can>

          <Can permission="admin.rooms.manage">
            <button
              onClick={handleOpenNewRoom}
              className="py-2.5 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs font-montserrat uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Sala</span>
            </button>
          </Can>
        </div>
      </div>

      {/* 2. ALERTAS */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-3xl text-rose-800 text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="p-1 text-rose-500 hover:text-rose-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-3xl text-emerald-800 text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="p-1 text-emerald-500 hover:text-emerald-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. KPI CARDS (ESTÁNDAR GLOINT) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Salas Habilitadas */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs relative overflow-hidden group hover:border-amber-300 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider font-montserrat text-slate-500">
              Espacios Activos
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <DoorClosed className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-montserrat">
            {activeRooms.length} <span className="text-xs font-medium text-slate-400">/ {rooms.length}</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Salas configuradas y activas
          </span>
        </div>

        {/* Reservas Hoy */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs relative overflow-hidden group hover:border-amber-300 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider font-montserrat text-slate-500">
              Reservas del Día
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-montserrat">
            {confirmedReservationsToday.length}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Sesiones agendadas para esta fecha
          </span>
        </div>

        {/* Horas Reservadas */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs relative overflow-hidden group hover:border-amber-300 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider font-montserrat text-slate-500">
              Horas Reservadas
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-montserrat">
            {totalHoursBookedToday.toFixed(1)} <span className="text-xs font-medium text-slate-400">hrs</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Tiempo total reservado hoy
          </span>
        </div>

        {/* Disponibilidad Inmediata */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs relative overflow-hidden group hover:border-amber-300 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider font-montserrat text-slate-500">
              Disponibles Ahora
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 font-montserrat flex items-center gap-2">
            {currentlyAvailableRoomsCount}
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Espacios listos para ocupar ahora
          </span>
        </div>
      </div>

      {/* 4. SEGMENTED CONTROL TABS */}
      <div className="flex items-center justify-between flex-wrap gap-4 pt-2">
        <div className="inline-flex p-1.5 bg-slate-100/90 border border-slate-200/80 rounded-2xl gap-1">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'calendar'
                ? 'bg-white shadow-xs text-slate-900 font-montserrat'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            <span>Agenda & Disponibilidad</span>
          </button>

          <button
            onClick={() => setActiveTab('rooms')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'rooms'
                ? 'bg-white shadow-xs text-slate-900 font-montserrat'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <DoorClosed className="w-4 h-4" />
            <span>Directorio de Salas ({rooms.length})</span>
          </button>

          <Can permissions={['rooms:reserve', 'admin.rooms.manage']}>
            <button
              onClick={() => setActiveTab('my-reservations')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'my-reservations'
                  ? 'bg-white shadow-xs text-slate-900 font-montserrat'
                : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <BookmarkCheck className="w-4 h-4" />
              <span>Mis Reservas ({myReservations.length})</span>
            </button>
          </Can>
        </div>

        {/* Si está en calendario, selector de vista (Grid vs Tarjetas) */}
        {activeTab === 'calendar' && (
          <div className="inline-flex p-1 bg-slate-100/90 border border-slate-200/80 rounded-xl gap-1">
            <button
              onClick={() => setCalendarViewMode('grid')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                calendarViewMode === 'grid'
                  ? 'bg-white shadow-xs text-slate-900'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Ver cuadrícula horaria interactiva"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Línea de Tiempo</span>
            </button>

            <button
              onClick={() => setCalendarViewMode('cards')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                calendarViewMode === 'cards'
                  ? 'bg-white shadow-xs text-slate-900'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Ver listado ejecutivo detallado"
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lista Ejecutiva</span>
            </button>
          </div>
        )}
      </div>

      {/* 5. BARRA DE CONTROL DE FECHA */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handlePrevDay}
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-all cursor-pointer"
            title="Día anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleToday}
            className={`px-3.5 py-1.5 border rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isSelectedDateToday
                ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            Hoy
          </button>
          <button
            onClick={handleNextDay}
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-all cursor-pointer"
            title="Día siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="text-sm sm:text-base font-extrabold text-slate-900 font-montserrat ml-2 capitalize">
            {new Date(`${selectedDate}T12:00:00`).toLocaleDateString('es-CO', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </span>
          {isSelectedDateToday && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 ml-1">
              En Vivo
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="calendar-date-picker" className="text-xs text-slate-500 font-semibold font-montserrat">
            Ir a fecha:
          </label>
          <input
            id="calendar-date-picker"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all cursor-pointer"
          />
        </div>
      </div>

      {/* 6. CONTENIDO DE TABS */}

      {/* TAB 1: CALENDARIO & DISPONIBILIDAD */}
      {activeTab === 'calendar' && (
        <div className="space-y-5">
          {isLoading ? (
            <div className="p-16 flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-200/80 shadow-xs">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-2" />
              <p className="text-xs font-semibold text-slate-500">Cargando disponibilidad de salas...</p>
            </div>
          ) : calendarViewMode === 'grid' ? (
            /* VISTA A: CUADRÍCULA HORARIA / TIME-GRID */
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2 bg-slate-50/50">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-bold text-slate-700 font-montserrat uppercase tracking-wider text-[11px]">
                    Línea de Tiempo Diaria
                  </span>
                  <span>• Haz clic en cualquier franja libre para reservar directamente</span>
                </div>
                <div className="flex items-center gap-4 text-[11px]">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Disponible
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Reservado
                  </span>
                </div>
              </div>

              {activeRooms.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  No hay salas activas configuradas en el sistema.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="min-w-[900px]">
                    {/* Header de horas */}
                    <div className="grid grid-cols-[180px_repeat(13,minmax(70px,1fr))] border-b border-slate-200 bg-slate-50/80 text-[11px] font-mono font-bold text-slate-500">
                      <div className="p-3 border-r border-slate-200 font-montserrat text-xs uppercase tracking-wider text-slate-700">
                        Espacio
                      </div>
                      {TIMELINE_HOURS.slice(0, 13).map((hour) => (
                        <div key={hour} className="p-2.5 text-center border-r border-slate-100 last:border-r-0">
                          {hour.toString().padStart(2, '0')}:00
                        </div>
                      ))}
                    </div>

                    {/* Filas por sala */}
                    <div className="divide-y divide-slate-100">
                      {activeRooms.map((room) => {
                        const presence = getRoomLivePresence(room);
                        const roomRes = reservations.filter(
                          (r) => r.room_id === room.id && r.status === 'confirmed'
                        );

                        return (
                          <div key={room.id} className="grid grid-cols-[180px_repeat(13,minmax(70px,1fr))] min-h-[72px] items-stretch hover:bg-slate-50/40 transition-colors">
                            {/* Columna de Sala */}
                            <div className="p-3 border-r border-slate-200 flex flex-col justify-center bg-white sticky left-0 z-10 shadow-xs">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: room.color }}
                                />
                                <span className="font-extrabold text-xs text-slate-900 font-montserrat truncate">
                                  {room.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                                  <Users className="w-3 h-3 text-slate-400" />
                                  {room.capacity}
                                </span>
                                {isSelectedDateToday && (
                                  <span
                                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase ${
                                      presence.isBusy
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-emerald-100 text-emerald-800'
                                    }`}
                                  >
                                    {presence.isBusy ? 'En uso' : 'Libre'}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Celdas de franjas horarias (07:00 a 19:00) */}
                            {TIMELINE_HOURS.slice(0, 13).map((hour) => {
                              const slotHourStart = hour * 60;
                              const slotHourEnd = (hour + 1) * 60;
                              const slotTimeString = `${hour.toString().padStart(2, '0')}:00`;

                              // Check if a reservation overlaps with this 1-hour slot
                              const overlappingRes = roomRes.find((r) => {
                                const rStart = parseTimeToMinutes(r.start_time);
                                const rEnd = parseTimeToMinutes(r.end_time);
                                return slotHourStart < rEnd && slotHourEnd > rStart;
                              });

                              return (
                                <div
                                  key={hour}
                                  className="border-r border-slate-100 last:border-r-0 relative p-1 flex items-center justify-center group"
                                >
                                  {overlappingRes ? (
                                    <div
                                      onClick={() => handleOpenCancelModal(overlappingRes)}
                                      className="w-full h-full rounded-xl p-1.5 flex flex-col justify-center text-white text-[10px] shadow-xs cursor-pointer transition-transform hover:scale-[1.02] overflow-hidden"
                                      style={{ backgroundColor: room.color }}
                                      title={`Reunión: "${overlappingRes.title}"\n${formatTime(overlappingRes.start_time)} - ${formatTime(overlappingRes.end_time)}\nPor: ${overlappingRes.user?.name || 'Usuario'}`}
                                    >
                                      <span className="font-bold font-montserrat truncate leading-tight">
                                        {overlappingRes.title}
                                      </span>
                                      <span className="font-mono text-[9px] opacity-90 truncate">
                                        {formatTime(overlappingRes.start_time).split(' ')[0]} - {formatTime(overlappingRes.end_time).split(' ')[0]}
                                      </span>
                                    </div>
                                  ) : (
                                    <Can permissions={['rooms:reserve', 'admin.rooms.manage']}>
                                      <button
                                        onClick={() => handleOpenReservation(room.id, slotTimeString)}
                                        className="w-full h-full rounded-xl border border-dashed border-transparent group-hover:border-amber-300 group-hover:bg-amber-50/50 flex items-center justify-center text-amber-700 opacity-0 group-hover:opacity-100 transition-all text-[10px] font-bold cursor-pointer"
                                        title={`Reservar en ${room.name} a las ${slotTimeString}`}
                                      >
                                        + Reservar
                                      </button>
                                    </Can>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* VISTA B: LISTA EJECUTIVA (TARJETAS + AGENDA DERECHA) */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Columna Izquierda: Espacios y su estado en tiempo real */}
              <div className="lg:col-span-1 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-montserrat">
                    Espacios Corporativos
                  </h3>
                  <span className="text-xs font-bold text-slate-500 font-montserrat">
                    {activeRooms.length} activos
                  </span>
                </div>

                {activeRooms.length === 0 ? (
                  <div className="p-6 bg-white rounded-3xl border border-slate-200/80 text-center text-slate-400 text-xs">
                    No hay salas activas configuradas.
                  </div>
                ) : (
                  activeRooms.map((room) => {
                    const presence = getRoomLivePresence(room);
                    const roomResToday = reservations.filter((r) => r.room_id === room.id);

                    return (
                      <div
                        key={room.id}
                        className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between gap-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: room.color }}
                            />
                            <div>
                              <h4 className="text-sm font-black text-slate-900 font-montserrat">
                                {room.name}
                              </h4>
                              {room.location && (
                                <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                  <MapPin className="w-3 h-3 text-slate-400" />
                                  {room.location}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-xl text-[10px] font-bold">
                            <Users className="w-3 h-3 text-slate-500" />
                            {room.capacity}
                          </span>
                        </div>

                        {/* Presencia en Vivo */}
                        <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between text-xs">
                          <span className="text-[11px] font-semibold text-slate-600 truncate">
                            {presence.statusLabel}
                          </span>
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              presence.isBusy ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
                            }`}
                          />
                        </div>

                        {renderEquipmentChips(room.equipment)}

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                          <span className="text-[11px] font-medium text-slate-500">
                            {roomResToday.length === 0
                              ? 'Sin reuniones hoy'
                              : `${roomResToday.length} reunión(es)`}
                          </span>
                          <Can permissions={['rooms:reserve', 'admin.rooms.manage']}>
                            <button
                              onClick={() => handleOpenReservation(room.id)}
                              className="px-3 py-1 text-xs font-bold text-amber-700 hover:text-amber-800 hover:bg-amber-50 rounded-xl transition-all cursor-pointer font-montserrat"
                            >
                              + Reservar
                            </button>
                          </Can>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Columna Derecha: Reservas Programadas */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-montserrat">
                    Reuniones Programadas ({confirmedReservationsToday.length})
                  </h3>
                </div>

                {confirmedReservationsToday.length === 0 ? (
                  <div className="p-12 bg-white rounded-3xl border border-slate-200/80 shadow-xs text-center flex flex-col items-center justify-center">
                    <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-3">
                      <CalendarIcon className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 font-montserrat">
                      No hay reuniones agendadas para esta fecha
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm">
                      Todas las salas se encuentran disponibles. Puedes agendar una nueva reserva en cualquier momento.
                    </p>
                    <Can permissions={['rooms:reserve', 'admin.rooms.manage']}>
                      <button
                        onClick={() => handleOpenReservation()}
                        className="mt-4 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold font-montserrat uppercase tracking-wider transition-all cursor-pointer shadow-xs"
                      >
                        Reservar Sala Ahora
                      </button>
                    </Can>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {confirmedReservationsToday.map((res) => {
                      const isOwner = user?.id === res.user_id;
                      const canCancel = isOwner || isAdmin;

                      return (
                        <div
                          key={res.id}
                          className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="flex items-start gap-4">
                            <div
                              className="w-1.5 self-stretch rounded-full shrink-0"
                              style={{ backgroundColor: res.room?.color || '#f59e0b' }}
                            />

                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className="text-[10px] font-bold px-2.5 py-0.5 rounded-full text-white"
                                  style={{ backgroundColor: res.room?.color || '#f59e0b' }}
                                >
                                  {res.room?.name || 'Sala'}
                                </span>
                                <h4 className="text-sm font-black text-slate-900 font-montserrat">
                                  {res.title}
                                </h4>
                              </div>

                              <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                                <span className="inline-flex items-center gap-1 font-mono font-bold text-slate-800 tabular-nums">
                                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                                  {formatTime(res.start_time)} - {formatTime(res.end_time)}
                                </span>
                                <span className="text-slate-300">•</span>
                                <span className="inline-flex items-center gap-1 text-slate-600">
                                  <Users className="w-3.5 h-3.5 text-slate-400" />
                                  {res.attendees_count} asistente(s)
                                </span>
                                <span className="text-slate-300">•</span>
                                <span className="text-slate-600">
                                  Por: <strong className="text-slate-800">{res.user?.name || 'Usuario'}</strong>
                                </span>
                              </div>

                              {res.description && (
                                <p className="text-xs text-slate-500 pt-1 italic">
                                  "{res.description}"
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Botón Cancelar */}
                          {canCancel && (
                            <div className="sm:self-center shrink-0">
                              <button
                                onClick={() => handleOpenCancelModal(res)}
                                disabled={cancellingId === res.id}
                                className="px-3 py-1.5 text-xs font-bold text-rose-700 hover:text-rose-800 hover:bg-rose-50 border border-rose-200 rounded-xl transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                                title="Cancelar esta reserva"
                              >
                                {cancellingId === res.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <X className="w-3 h-3" />
                                )}
                                <span>Cancelar</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DIRECTORIO DE SALAS (GESTIÓN) */}
      {activeTab === 'rooms' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 font-medium">
              Listado general de espacios de juntas, conferencias y salas de trabajo.
            </p>
            <Can permission="admin.rooms.manage">
              <button
                onClick={handleOpenNewRoom}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-xs font-montserrat uppercase tracking-wider transition-all cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Sala</span>
              </button>
            </Can>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {rooms.map((room) => {
              const presence = getRoomLivePresence(room);

              return (
                <div
                  key={room.id}
                  className="bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all overflow-hidden flex flex-col justify-between"
                >
                  <div className="p-6 space-y-4">
                    {/* Header de la tarjeta */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-xs"
                          style={{ backgroundColor: room.color }}
                        >
                          <DoorClosed className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-black text-slate-900 text-base font-montserrat">
                            {room.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                                room.is_active
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}
                            >
                              {room.is_active ? 'Habilitada' : 'Inactiva'}
                            </span>
                            {room.is_active && (
                              <span
                                className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                  presence.isBusy
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {presence.isBusy ? 'En uso' : 'Libre'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-xs font-bold shrink-0">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {room.capacity} pers.
                      </span>
                    </div>

                    {room.location && (
                      <p className="text-xs text-slate-600 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{room.location}</span>
                      </p>
                    )}

                    {/* Chips de Equipamiento */}
                    {renderEquipmentChips(room.equipment)}

                    {room.description && (
                      <p className="text-xs text-slate-500 italic pt-1">
                        "{room.description}"
                      </p>
                    )}
                  </div>

                  {/* Footer de acciones */}
                  <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
                    <Can permissions={['rooms:reserve', 'admin.rooms.manage']}>
                      <button
                        onClick={() => handleOpenReservation(room.id)}
                        disabled={!room.is_active}
                        className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded-xl transition-all cursor-pointer shadow-xs font-montserrat uppercase tracking-wider"
                      >
                        Reservar Sala
                      </button>
                    </Can>

                    <Can permission="admin.rooms.manage">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditRoom(room)}
                          className="p-2 text-slate-600 hover:text-amber-600 hover:bg-white rounded-xl border border-slate-200 transition-all cursor-pointer"
                          title="Editar sala"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteRoom(room)}
                          className="p-2 text-slate-600 hover:text-rose-600 hover:bg-white rounded-xl border border-slate-200 transition-all cursor-pointer"
                          title="Desactivar o eliminar sala"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </Can>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: MIS RESERVAS */}
      {activeTab === 'my-reservations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            {/* Filtros de estado */}
            <div className="inline-flex p-1 bg-slate-100/90 border border-slate-200/80 rounded-xl gap-1 text-xs">
              <button
                onClick={() => setMyReservationsFilter('all')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  myReservationsFilter === 'all'
                    ? 'bg-white shadow-xs text-slate-900'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Todas ({myReservations.length})
              </button>
              <button
                onClick={() => setMyReservationsFilter('upcoming')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  myReservationsFilter === 'upcoming'
                    ? 'bg-white shadow-xs text-slate-900'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Próximas
              </button>
              <button
                onClick={() => setMyReservationsFilter('past')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  myReservationsFilter === 'past'
                    ? 'bg-white shadow-xs text-slate-900'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Historial
              </button>
            </div>

            <button
              onClick={() => handleOpenReservation()}
              className="px-4 py-2 text-xs font-bold text-amber-700 hover:text-amber-800 hover:bg-amber-50 rounded-2xl border border-amber-200 transition-all cursor-pointer font-montserrat"
            >
              + Nueva Reserva
            </button>
          </div>

          {filteredMyReservations.length === 0 ? (
            <div className="p-12 bg-white rounded-3xl border border-slate-200/80 shadow-xs text-center text-slate-400 text-xs">
              No tienes reservas registradas en esta vista.
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider font-montserrat">
                    <tr>
                      <th className="px-6 py-4">Espacio / Sala</th>
                      <th className="px-6 py-4">Asunto</th>
                      <th className="px-6 py-4">Fecha & Horario</th>
                      <th className="px-6 py-4">Asistentes</th>
                      <th className="px-6 py-4">Estado</th>
                      <th className="px-6 py-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-xs">
                    {filteredMyReservations.map((res) => (
                      <tr key={res.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: res.room?.color || '#f59e0b' }}
                            />
                            <span className="font-black text-slate-900 font-montserrat">
                              {res.room?.name || 'Sala'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800">{res.title}</div>
                          {res.description && (
                            <div className="text-[11px] text-slate-400 italic line-clamp-1 mt-0.5">
                              {res.description}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-800">
                            {formatColombiaDate(res.start_time)}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 tabular-nums">
                            {formatTime(res.start_time)} - {formatTime(res.end_time)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-slate-700">{res.attendees_count} pers.</span>
                        </td>
                        <td className="px-6 py-4">
                          {res.status === 'confirmed' ? (
                            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold uppercase">
                              Confirmada
                            </span>
                          ) : res.status === 'cancelled' ? (
                            <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-[10px] font-bold uppercase">
                              Cancelada
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-full text-[10px] font-bold uppercase">
                              {res.status}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {res.status === 'confirmed' && (
                            <button
                              onClick={() => handleOpenCancelModal(res)}
                              disabled={cancellingId === res.id}
                              className="px-3 py-1 text-rose-700 hover:text-rose-800 hover:bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                            >
                              {cancellingId === res.id ? 'Cancelando...' : 'Cancelar'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 7. MODALES */}
      <RoomModal
        isOpen={isRoomModalOpen}
        onClose={() => setIsRoomModalOpen(false)}
        onSaved={() => {
          fetchRooms();
          fetchCalendarReservations(selectedDate);
        }}
        room={editingRoom}
      />

      <RoomReservationModal
        isOpen={isReservationModalOpen}
        onClose={() => setIsReservationModalOpen(false)}
        onReserved={() => {
          setSuccess('¡Reserva creada exitosamente!');
          setTimeout(() => setSuccess(null), 4000);
          fetchCalendarReservations(selectedDate);
          fetchMyReservations();
        }}
        rooms={rooms}
        initialRoomId={preselectedRoomId}
        initialDate={selectedDate}
        initialStartTime={preselectedStartTime}
        existingReservations={reservations}
      />

      {/* Modal de Confirmación para Cancelar Reserva */}
      <ConfirmationModal
        isOpen={!!reservationToCancel}
        onClose={() => {
          if (!isCancellingReservation) {
            setReservationToCancel(null);
            setCancelReason('');
          }
        }}
        onConfirm={handleConfirmCancelReservation}
        title="¿Cancelar Reserva de Sala?"
        description="Esta acción liberará el espacio de la sala para que otros usuarios puedan reservarlo."
        confirmText="Sí, Cancelar Reserva"
        cancelText="Mantener Reserva"
        variant="danger"
        isLoading={isCancellingReservation}
      >
        {reservationToCancel && (
          <div className="space-y-3 pt-1">
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-black text-slate-900 text-xs font-montserrat truncate">
                  {reservationToCancel.title}
                </span>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white shrink-0"
                  style={{ backgroundColor: reservationToCancel.room?.color || '#f59e0b' }}
                >
                  {reservationToCancel.room?.name || 'Sala'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-600 flex-wrap">
                <span className="inline-flex items-center gap-1 font-mono font-bold text-slate-800">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  {formatTime(reservationToCancel.start_time)} - {formatTime(reservationToCancel.end_time)}
                </span>
                <span className="text-slate-300">•</span>
                <span>{formatColombiaDate(reservationToCancel.start_time)}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat">
                Motivo de cancelación <span className="text-slate-400 font-normal lowercase">(opcional)</span>
              </label>
              <textarea
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                disabled={isCancellingReservation}
                placeholder="Ej. Cambio de horario, reunión pospuesta..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all resize-none placeholder:text-slate-400 disabled:opacity-50"
              />
            </div>
          </div>
        )}
      </ConfirmationModal>
    </div>
  );
};
