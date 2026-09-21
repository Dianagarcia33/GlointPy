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
import { useAuthStore } from '../../../store/authStore';
import { Can } from '../../../components/security/Can';
import { formatColombiaDate } from '../../../utils/format';

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

  // Selected date for calendar view (default today YYYY-MM-DD)
  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());

  // Modals state
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<MeetingRoom | null>(null);

  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [preselectedRoomId, setPreselectedRoomId] = useState<number | undefined>(undefined);

  const [cancellingId, setCancellingId] = useState<number | null>(null);

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
      // Construct date window for the selected day (from 00:00 to 23:59 local)
      const startIso = new Date(`${dateStr}T00:00:00`).toISOString();
      const endIso = new Date(`${dateStr}T23:59:59`).toISOString();

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
    const d = new Date(`${selectedDate}T12:00:00`);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(`${selectedDate}T12:00:00`);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
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

  const handleCancelReservation = async (reservation: RoomReservation) => {
    if (!window.confirm(`¿Estás seguro de que deseas cancelar la reserva "${reservation.title}"?`)) {
      return;
    }

    try {
      setCancellingId(reservation.id);
      setError(null);
      await roomsService.cancelReservation(reservation.id, 'Cancelada por el usuario');
      setSuccess('Reserva cancelada exitosamente.');
      setTimeout(() => setSuccess(null), 4000);

      // Refresh both
      fetchCalendarReservations(selectedDate);
      fetchMyReservations();
    } catch (err: any) {
      setError(err.message || 'Error al cancelar la reserva.');
    } finally {
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

  // Format time helper (e.g. 09:30 AM)
  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight font-montserrat flex items-center gap-2.5">
            <span className="p-2 bg-brand-50 text-brand-600 border border-brand-200 rounded-2xl inline-flex">
              <DoorClosed className="w-6 h-6" />
            </span>
            Salas de Reuniones
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Consulta disponibilidad en tiempo real y gestiona las reservas de los espacios de trabajo
          </p>
        </div>

        {/* Acciones principales */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Can permissions={['rooms:reserve', 'admin.rooms.manage']}>
            <button
              onClick={() => handleOpenReservation()}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-600 to-amber-600 hover:from-brand-700 hover:to-amber-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-brand-500/20 transition-all cursor-pointer"
            >
              <CalendarCheck className="w-4 h-4" />
              <span>Nueva Reserva</span>
            </button>
          </Can>

          <Can permission="admin.rooms.manage">
            <button
              onClick={handleOpenNewRoom}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-xs shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Sala</span>
            </button>
          </Can>
        </div>
      </div>

      {/* Alertas */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="p-1 text-rose-500 hover:text-rose-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="p-1 text-emerald-500 hover:text-emerald-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-px overflow-x-auto">
        <button
          onClick={() => setActiveTab('calendar')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === 'calendar'
              ? 'border-brand-600 text-brand-600 bg-brand-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <CalendarIcon className="w-4 h-4" />
          <span>Agenda & Disponibilidad</span>
        </button>

        <button
          onClick={() => setActiveTab('rooms')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === 'rooms'
              ? 'border-brand-600 text-brand-600 bg-brand-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <DoorClosed className="w-4 h-4" />
          <span>Salas de Reuniones ({rooms.length})</span>
        </button>

        <Can permissions={['rooms:reserve', 'admin.rooms.manage']}>
          <button
            onClick={() => setActiveTab('my-reservations')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-b-2 whitespace-nowrap ${
              activeTab === 'my-reservations'
                ? 'border-brand-600 text-brand-600 bg-brand-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <BookmarkCheck className="w-4 h-4" />
            <span>Mis Reservas</span>
          </button>
        </Can>
      </div>

      {/* CONTENIDO DE TABS */}

      {/* TAB 1: CALENDARIO & DISPONIBILIDAD */}
      {activeTab === 'calendar' && (
        <div className="space-y-5">
          {/* Barra de control de fecha */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevDay}
                className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-all cursor-pointer"
                title="Día anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleToday}
                className="px-3.5 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
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
              <span className="text-sm font-extrabold text-slate-900 font-montserrat ml-2 capitalize">
                {new Date(`${selectedDate}T12:00:00`).toLocaleDateString('es-CO', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="calendar-date-picker" className="text-xs text-slate-500 font-semibold">Ir a fecha:</label>
              <input
                id="calendar-date-picker"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>

          {/* Estado de carga */}
          {isLoading ? (
            <div className="p-16 flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-200">
              <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-2" />
              <p className="text-xs font-semibold text-slate-500">Cargando disponibilidad de salas...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Columna Izquierda: Salas y su estado actual */}
              <div className="lg:col-span-1 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider font-montserrat">
                    Espacios Disponibles
                  </h3>
                  <span className="text-xs font-bold text-slate-500">
                    {rooms.filter(r => r.is_active).length} activas
                  </span>
                </div>

                {rooms.filter(r => r.is_active).length === 0 ? (
                  <div className="p-6 bg-white rounded-3xl border border-slate-200 text-center text-slate-400 text-xs">
                    No hay salas activas configuradas.
                  </div>
                ) : (
                  rooms.filter(r => r.is_active).map((room) => {
                    const roomResToday = reservations.filter((r) => r.room_id === room.id);
                    return (
                      <div
                        key={room.id}
                        className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between gap-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: room.color }}
                            />
                            <div>
                              <h4 className="text-sm font-extrabold text-slate-900 font-montserrat">
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
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold">
                            <Users className="w-3 h-3 text-slate-500" />
                            {room.capacity}
                          </span>
                        </div>

                        {room.equipment && (
                          <p className="text-[11px] text-slate-500 line-clamp-1">
                            <span className="font-semibold text-slate-700">Equip:</span> {room.equipment}
                          </p>
                        )}

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                          <span className="text-[11px] font-medium text-slate-500">
                            {roomResToday.length === 0
                              ? 'Sin reservas hoy'
                              : `${roomResToday.length} reserva(s) hoy`}
                          </span>
                          <Can permissions={['rooms:reserve', 'admin.rooms.manage']}>
                            <button
                              onClick={() => handleOpenReservation(room.id)}
                              className="px-2.5 py-1 text-[11px] font-bold text-brand-700 hover:text-brand-800 hover:bg-brand-50 rounded-lg transition-all cursor-pointer"
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
                  <div className="p-12 bg-white rounded-3xl border border-slate-200 text-center flex flex-col items-center justify-center">
                    <div className="w-12 h-12 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center mb-3">
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
                        className="mt-4 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
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
                          className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="flex items-start gap-4">
                            {/* Barra vertical de color de la sala */}
                            <div
                              className="w-1.5 self-stretch rounded-full shrink-0"
                              style={{ backgroundColor: res.room?.color || '#10b981' }}
                            />

                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className="text-[10px] font-bold px-2.5 py-0.5 rounded-full text-white"
                                  style={{ backgroundColor: res.room?.color || '#10b981' }}
                                >
                                  {res.room?.name || 'Sala'}
                                </span>
                                <h4 className="text-sm font-extrabold text-slate-900 font-montserrat">
                                  {res.title}
                                </h4>
                              </div>

                              <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                                <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                                  <Clock className="w-3.5 h-3.5 text-brand-600" />
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
                                onClick={() => handleCancelReservation(res)}
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

      {/* TAB 2: SALAS (GESTIÓN & LISTADO) */}
      {activeTab === 'rooms' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Listado general de espacios de juntas, conferencias y salas de trabajo.
            </p>
            <Can permission="admin.rooms.manage">
              <button
                onClick={handleOpenNewRoom}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition-all cursor-pointer"
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
                className="bg-white rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
              >
                {/* Cabecera de la tarjeta con franja de color */}
                <div>
                  <div
                    className="h-2.5 w-full"
                    style={{ backgroundColor: room.color }}
                  />
                  <div className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-9 h-9 rounded-2xl flex items-center justify-center text-white shrink-0"
                          style={{ backgroundColor: room.color }}
                        >
                          <DoorClosed className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-slate-900 text-sm font-montserrat">
                            {room.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                                room.is_active
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}
                            >
                              {room.is_active ? 'Habilitada' : 'Inactiva'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-xs font-bold">
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
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-montserrat flex items-center gap-1">
                          <Monitor className="w-3 h-3" />
                          Equipamiento
                        </span>
                        <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
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
                <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Can permissions={['rooms:reserve', 'admin.rooms.manage']}>
                    <button
                      onClick={() => handleOpenReservation(room.id)}
                      disabled={!room.is_active}
                      className="px-3.5 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded-xl transition-all cursor-pointer shadow-xs"
                    >
                      Reservar Sala
                    </button>
                  </Can>

                  <Can permission="admin.rooms.manage">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEditRoom(room)}
                        className="p-1.5 text-slate-600 hover:text-brand-600 hover:bg-white rounded-xl border border-slate-200 transition-all cursor-pointer"
                        title="Editar sala"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteRoom(room)}
                        className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-white rounded-xl border border-slate-200 transition-all cursor-pointer"
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
              className="px-3.5 py-1.5 text-xs font-bold text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-xl border border-brand-200 transition-all cursor-pointer"
            >
              + Nueva Reserva
            </button>
          </div>

          {myReservations.length === 0 ? (
            <div className="p-12 bg-white rounded-3xl border border-slate-200 text-center text-slate-400 text-xs">
              Aún no has realizado reservas de salas de reuniones.
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider font-montserrat">
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
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: res.room?.color || '#10b981' }}
                            />
                            <span className="font-extrabold text-slate-900 font-montserrat">
                              {res.room?.name || 'Sala'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800">{res.title}</div>
                          {res.description && (
                            <div className="text-[11px] text-slate-400 italic line-clamp-1">
                              {res.description}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-800">
                            {formatColombiaDate(res.start_time)}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {formatTime(res.start_time)} - {formatTime(res.end_time)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-slate-700">{res.attendees_count}</span>
                        </td>
                        <td className="px-6 py-4">
                          {res.status === 'confirmed' ? (
                            <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full text-[10px] font-bold uppercase">
                              Confirmada
                            </span>
                          ) : res.status === 'cancelled' ? (
                            <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 border border-rose-200 rounded-full text-[10px] font-bold uppercase">
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
                              onClick={() => handleCancelReservation(res)}
                              disabled={cancellingId === res.id}
                              className="px-2.5 py-1 text-rose-700 hover:text-rose-800 hover:bg-rose-50 border border-rose-200 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
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
    </div>
  );
};
