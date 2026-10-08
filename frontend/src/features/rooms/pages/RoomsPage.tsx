import React, { useState, useEffect } from 'react';
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
  CalendarCheck
} from 'lucide-react';
import { roomsService, MeetingRoom, RoomReservation } from '../../../services/rooms';
import { RoomModal } from '../components/RoomModal';
import { RoomReservationModal } from '../components/RoomReservationModal';
import { ConfirmationModal } from '../../../components/common/ConfirmationModal';
import { useAuthStore } from '../../../store/authStore';
import { Can } from '../../../components/security/Can';
import { formatColombiaDate, getColombiaToday } from '../../../utils/format';

export const RoomsPage: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = Boolean(user?.roles?.some(r => ['admin', 'superadmin'].includes(r.name.toLowerCase())) || user?.is_superuser);

  const [activeTab, setActiveTab] = useState<'calendar' | 'rooms' | 'my-reservations'>('calendar');
  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [reservations, setReservations] = useState<RoomReservation[]>([]);
  const [myReservations, setMyReservations] = useState<RoomReservation[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Selected date for calendar view (default today Colombia YYYY-MM-DD)
  const getTodayStr = () => getColombiaToday();

  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());

  // Modals state
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<MeetingRoom | null>(null);

  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [preselectedRoomId, setPreselectedRoomId] = useState<number | undefined>(undefined);

  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [reservationToCancel, setReservationToCancel] = useState<RoomReservation | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [isCancellingReservation, setIsCancellingReservation] = useState<boolean>(false);

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
      // Construct date window for the selected day in local time
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
    setSelectedDate(getTodayStr());
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

  const handleOpenReservation = (roomId?: number) => {
    setPreselectedRoomId(roomId);
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

      // Refresh both
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

  // Format time helper (e.g. 09:30 a. m.)
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

  return (
    <div className="relative isolate space-y-6">
      {/* Luz ambiental sutil de fondo */}
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-full max-w-7xl h-48 bg-gradient-to-r from-amber-500/5 via-orange-500/5 to-slate-900/5 blur-3xl -z-10 pointer-events-none rounded-full" />

      {/* Encabezado Ejecutivo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent text-amber-600 border border-amber-500/20 rounded-2xl inline-flex shadow-xs ring-1 ring-inset ring-white/60 shrink-0">
            <DoorClosed className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-montserrat">
                Salas de Reuniones
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100/80 text-amber-800 border border-amber-200/60 uppercase tracking-wider font-montserrat">
                Espacios
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
              Consulta disponibilidad en tiempo real y gestiona las reservas de los espacios de trabajo
            </p>
          </div>
        </div>

        {/* Acciones principales estandarizadas */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Can permissions={['rooms:reserve', 'admin.rooms.manage']}>
            <button
              onClick={() => handleOpenReservation()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white rounded-2xl font-bold text-xs font-montserrat uppercase tracking-wider shadow-md shadow-amber-500/20 hover:shadow-lg hover:shadow-amber-500/30 active:scale-95 transition-all cursor-pointer ring-1 ring-inset ring-white/30"
            >
              <CalendarCheck className="w-4 h-4" />
              <span>Nueva Reserva</span>
            </button>
          </Can>

          <Can permission="admin.rooms.manage">
            <button
              onClick={handleOpenNewRoom}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-xs font-montserrat uppercase tracking-wider shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Sala</span>
            </button>
          </Can>
        </div>
      </div>

      {/* Alertas con estilo frosted */}
      {error && (
        <div className="p-4 bg-rose-50/90 backdrop-blur-xs border border-rose-200/80 rounded-2xl text-rose-800 text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="p-1 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-100 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50/90 backdrop-blur-xs border border-emerald-200/80 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="p-1 text-emerald-500 hover:text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Segmented Control Tabs */}
      <div className="inline-flex p-1.5 bg-slate-100/90 border border-slate-200/80 rounded-2xl gap-1 shadow-xs overflow-x-auto max-w-full">
        <button
          onClick={() => setActiveTab('calendar')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap font-montserrat ${
            activeTab === 'calendar'
              ? 'bg-white shadow-xs text-slate-900'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <CalendarIcon className={`w-4 h-4 ${activeTab === 'calendar' ? 'text-amber-500' : 'text-slate-400'}`} />
          <span>Agenda & Disponibilidad</span>
        </button>

        <button
          onClick={() => setActiveTab('rooms')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap font-montserrat ${
            activeTab === 'rooms'
              ? 'bg-white shadow-xs text-slate-900'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <DoorClosed className={`w-4 h-4 ${activeTab === 'rooms' ? 'text-amber-500' : 'text-slate-400'}`} />
          <span>Salas de Reuniones ({rooms.length})</span>
        </button>

        <Can permissions={['rooms:reserve', 'admin.rooms.manage']}>
          <button
            onClick={() => setActiveTab('my-reservations')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap font-montserrat ${
              activeTab === 'my-reservations'
                ? 'bg-white shadow-xs text-slate-900'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookmarkCheck className={`w-4 h-4 ${activeTab === 'my-reservations' ? 'text-amber-500' : 'text-slate-400'}`} />
            <span>Mis Reservas</span>
          </button>
        </Can>
      </div>

      {/* CONTENIDO DE TABS */}

      {/* TAB 1: CALENDARIO & DISPONIBILIDAD */}
      {activeTab === 'calendar' && (
        <div className="space-y-5">
          {/* Barra de control de fecha */}
          <div className="bg-white/80 backdrop-blur-xl p-4 rounded-3xl border border-slate-200/80 shadow-xs ring-1 ring-inset ring-white flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handlePrevDay}
                className="p-2 border border-slate-200/80 rounded-xl hover:bg-slate-50 text-slate-600 transition-all cursor-pointer active:scale-95"
                title="Día anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleToday}
                className={`px-3.5 py-1.5 border rounded-xl text-xs font-bold font-montserrat transition-all cursor-pointer ${
                  selectedDate === getTodayStr()
                    ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                    : 'border-slate-200/80 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Hoy
              </button>
              <button
                onClick={handleNextDay}
                className="p-2 border border-slate-200/80 rounded-xl hover:bg-slate-50 text-slate-600 transition-all cursor-pointer active:scale-95"
                title="Día siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <span className="text-sm font-extrabold text-slate-900 font-montserrat ml-2 capitalize tracking-tight">
                {new Date(`${selectedDate}T12:00:00`).toLocaleDateString('es-CO', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
              {selectedDate === getTodayStr() && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 ml-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Hoy
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="calendar-date-picker" className="text-xs text-slate-500 font-bold font-montserrat">
                Ir a fecha:
              </label>
              <input
                id="calendar-date-picker"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all cursor-pointer"
              />
            </div>
          </div>

          {/* Estado de carga */}
          {isLoading ? (
            <div className="p-16 flex flex-col items-center justify-center bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-200/80 shadow-xs">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-2" />
              <p className="text-xs font-semibold text-slate-500 font-montserrat">Cargando disponibilidad de salas...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Columna Izquierda: Salas y su estado actual */}
              <div className="lg:col-span-1 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider font-montserrat">
                    Espacios Disponibles
                  </h3>
                  <span className="text-xs font-bold text-slate-500 font-montserrat">
                    {rooms.filter(r => r.is_active).length} activas
                  </span>
                </div>

                {rooms.filter(r => r.is_active).length === 0 ? (
                  <div className="p-6 bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-200/80 text-center text-slate-400 text-xs">
                    No hay salas activas configuradas.
                  </div>
                ) : (
                  rooms.filter(r => r.is_active).map((room) => {
                    const roomResToday = reservations.filter((r) => r.room_id === room.id);
                    return (
                      <div
                        key={room.id}
                        className="bg-white/90 backdrop-blur-sm p-4 rounded-3xl border border-slate-200/80 shadow-xs hover:border-slate-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-3 group relative overflow-hidden ring-1 ring-inset ring-white"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-xs ring-2 ring-white"
                              style={{ backgroundColor: room.color }}
                            >
                              <DoorClosed className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="text-sm font-extrabold text-slate-900 font-montserrat group-hover:text-amber-800 transition-colors">
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
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-200/80 text-slate-700 rounded-xl text-[10px] font-bold font-montserrat">
                            <Users className="w-3 h-3 text-slate-400" />
                            {room.capacity} pers.
                          </span>
                        </div>

                        {room.equipment && (
                          <p className="text-[11px] text-slate-500 line-clamp-1 bg-slate-50/60 p-2 rounded-xl border border-slate-100">
                            <span className="font-bold text-slate-700">Equip:</span> {room.equipment}
                          </p>
                        )}

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                          <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${roomResToday.length > 0 ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                            {roomResToday.length === 0
                              ? 'Sin reservas hoy'
                              : `${roomResToday.length} reserva(s) hoy`}
                          </span>
                          <Can permissions={['rooms:reserve', 'admin.rooms.manage']}>
                            <button
                              onClick={() => handleOpenReservation(room.id)}
                              className="px-3 py-1.5 text-xs font-bold text-amber-700 hover:text-amber-900 hover:bg-amber-50 rounded-xl transition-all cursor-pointer font-montserrat"
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

              {/* Columna Derecha: Timeline / Lista de Reservas del día */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider font-montserrat">
                    Reservas Programadas ({reservations.length})
                  </h3>
                </div>

                {reservations.length === 0 ? (
                  <div className="p-12 bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-200/80 shadow-xs text-center flex flex-col items-center justify-center ring-1 ring-inset ring-white">
                    <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-3 shadow-xs">
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
                        className="mt-4 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold font-montserrat uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-95"
                      >
                        Reservar una Sala Ahora
                      </button>
                    </Can>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reservations.map((res) => {
                      const isOwner = user?.id === res.user_id;
                      const canCancel = isOwner || isAdmin;

                      return (
                        <div
                          key={res.id}
                          className="bg-white/90 backdrop-blur-sm p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:border-slate-300 hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group ring-1 ring-inset ring-white"
                        >
                          <div className="flex items-start gap-4">
                            {/* Barra vertical de color de la sala con brillo */}
                            <div
                              className="w-1.5 self-stretch rounded-full shrink-0 shadow-xs"
                              style={{ backgroundColor: res.room?.color || '#10b981' }}
                            />

                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className="text-[10px] font-bold px-2.5 py-0.5 rounded-full text-white shadow-xs font-montserrat tracking-wider"
                                  style={{ backgroundColor: res.room?.color || '#10b981' }}
                                >
                                  {res.room?.name || 'Sala'}
                                </span>
                                <h4 className="text-sm font-black text-slate-900 font-montserrat">
                                  {res.title}
                                </h4>
                              </div>

                              <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                                <span className="inline-flex items-center gap-1.5 font-mono font-bold text-slate-800 tabular-nums px-2.5 py-0.5 rounded-lg bg-slate-50 border border-slate-200/80">
                                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                                  {formatTime(res.start_time)} - {formatTime(res.end_time)}
                                </span>
                                <span className="text-slate-300">•</span>
                                <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                                  <Users className="w-3.5 h-3.5 text-slate-400" />
                                  {res.attendees_count} asistente(s)
                                </span>
                                <span className="text-slate-300">•</span>
                                <span className="text-slate-600">
                                  Por: <strong className="text-slate-800 font-semibold">{res.user?.name || 'Usuario'}</strong>
                                </span>
                              </div>

                              {res.description && (
                                <p className="text-xs text-slate-500 pt-0.5 italic">
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
                                className="px-3.5 py-1.5 text-xs font-bold text-rose-700 hover:text-rose-800 hover:bg-rose-50 border border-rose-200/80 rounded-xl transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5 font-montserrat"
                                title="Cancelar esta reserva"
                              >
                                {cancellingId === res.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <X className="w-3.5 h-3.5" />
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

      {/* TAB 2: SALAS (GESTIÓN & LISTADO) */}
      {activeTab === 'rooms' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 font-medium">
              Listado general de espacios de juntas, conferencias y salas de trabajo corporativo.
            </p>
            <Can permission="admin.rooms.manage">
              <button
                onClick={handleOpenNewRoom}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-xs font-montserrat uppercase tracking-wider transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Sala</span>
              </button>
            </Can>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="bg-white/90 backdrop-blur-sm rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:-translate-y-1 hover:border-amber-200/80 transition-all duration-300 overflow-hidden flex flex-col justify-between group ring-1 ring-inset ring-white"
              >
                {/* Cabecera de la tarjeta con franja de color suave */}
                <div>
                  <div
                    className="h-2 w-full"
                    style={{ backgroundColor: room.color }}
                  />
                  <div className="p-6 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-md ring-4 ring-white"
                          style={{ backgroundColor: room.color }}
                        >
                          <DoorClosed className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-black text-slate-900 text-base font-montserrat group-hover:text-amber-800 transition-colors">
                            {room.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase border font-montserrat ${
                                room.is_active
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                                  : 'bg-rose-50 text-rose-700 border-rose-200/80'
                              }`}
                            >
                              {room.is_active ? 'Habilitada' : 'Inactiva'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200/80 text-slate-800 rounded-xl text-xs font-bold font-montserrat">
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

                    {room.equipment && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-montserrat flex items-center gap-1">
                          <Monitor className="w-3 h-3 text-slate-400" />
                          Equipamiento
                        </span>
                        <p className="text-xs text-slate-600 bg-slate-50/80 p-3 rounded-2xl border border-slate-100/80">
                          {room.equipment}
                        </p>
                      </div>
                    )}

                    {room.description && (
                      <p className="text-xs text-slate-500 italic">
                        "{room.description}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer de acciones */}
                <div className="p-4 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Can permissions={['rooms:reserve', 'admin.rooms.manage']}>
                    <button
                      onClick={() => handleOpenReservation(room.id)}
                      disabled={!room.is_active}
                      className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 font-montserrat uppercase tracking-wider"
                    >
                      Reservar Sala
                    </button>
                  </Can>

                  <Can permission="admin.rooms.manage">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEditRoom(room)}
                        className="p-2 text-slate-600 hover:text-amber-600 hover:bg-white rounded-xl border border-slate-200 transition-all cursor-pointer shadow-2xs"
                        title="Editar sala"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteRoom(room)}
                        className="p-2 text-slate-600 hover:text-rose-600 hover:bg-white rounded-xl border border-slate-200 transition-all cursor-pointer shadow-2xs"
                        title="Desactivar o eliminar sala"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </Can>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: MIS RESERVAS */}
      {activeTab === 'my-reservations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider font-montserrat">
              Historial de mis reservas ({myReservations.length})
            </h3>
            <button
              onClick={() => handleOpenReservation()}
              className="px-4 py-2 text-xs font-bold text-amber-700 hover:text-amber-800 hover:bg-amber-50 rounded-2xl border border-amber-200/80 transition-all cursor-pointer font-montserrat"
            >
              + Nueva Reserva
            </button>
          </div>

          {myReservations.length === 0 ? (
            <div className="p-12 bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-200/80 shadow-xs text-center text-slate-400 text-xs font-medium ring-1 ring-inset ring-white">
              Aún no has realizado reservas de salas de reuniones.
            </div>
          ) : (
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden ring-1 ring-inset ring-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50/80 text-slate-500 font-extrabold border-b border-slate-200/80 uppercase text-[10px] tracking-wider font-montserrat">
                    <tr>
                      <th className="px-6 py-4">Sala</th>
                      <th className="px-6 py-4">Asunto</th>
                      <th className="px-6 py-4">Fecha & Horario</th>
                      <th className="px-6 py-4">Asistentes</th>
                      <th className="px-6 py-4">Estado</th>
                      <th className="px-6 py-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-xs">
                    {myReservations.map((res) => (
                      <tr key={res.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shadow-xs"
                              style={{ backgroundColor: res.room?.color || '#10b981' }}
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
                          <div className="text-[11px] font-mono font-bold text-slate-600 tabular-nums">
                            {formatTime(res.start_time)} - {formatTime(res.end_time)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-slate-700">{res.attendees_count} pers.</span>
                        </td>
                        <td className="px-6 py-4">
                          {res.status === 'confirmed' ? (
                            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-full text-[10px] font-bold uppercase font-montserrat">
                              Confirmada
                            </span>
                          ) : res.status === 'cancelled' ? (
                            <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200/80 rounded-full text-[10px] font-bold uppercase font-montserrat">
                              Cancelada
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-200/80 rounded-full text-[10px] font-bold uppercase font-montserrat">
                              {res.status}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {res.status === 'confirmed' && (
                            <button
                              onClick={() => handleOpenCancelModal(res)}
                              disabled={cancellingId === res.id}
                              className="px-3 py-1.5 text-rose-700 hover:text-rose-800 hover:bg-rose-50 border border-rose-200/80 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 font-montserrat"
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

      {/* Modales */}
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
            {/* Resumen de la reserva a cancelar */}
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-extrabold text-slate-900 text-xs font-montserrat truncate">
                  {reservationToCancel.title}
                </span>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white shrink-0"
                  style={{ backgroundColor: reservationToCancel.room?.color || '#10b981' }}
                >
                  {reservationToCancel.room?.name || 'Sala'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-600 flex-wrap">
                <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                  <Clock className="w-3.5 h-3.5 text-brand-600" />
                  {formatTime(reservationToCancel.start_time)} - {formatTime(reservationToCancel.end_time)}
                </span>
                <span className="text-slate-300">•</span>
                <span>{formatColombiaDate(reservationToCancel.start_time)}</span>
              </div>
            </div>

            {/* Motivo opcional */}
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
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all resize-none placeholder:text-slate-400 disabled:opacity-50"
              />
            </div>
          </div>
        )}
      </ConfirmationModal>
    </div>
  );
};
