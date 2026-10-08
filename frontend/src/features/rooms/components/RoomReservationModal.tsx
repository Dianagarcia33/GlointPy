import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Calendar, 
  Clock, 
  Users, 
  FileText, 
  Loader2, 
  DoorClosed, 
  AlertCircle, 
  CheckCircle2,
  AlertTriangle,
  Info,
  MapPin
} from 'lucide-react';
import { roomsService, MeetingRoom, RoomReservation } from '../../../services/rooms';
import { getColombiaToday } from '../../../utils/format';

interface RoomReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReserved: (reservation: RoomReservation) => void;
  rooms: MeetingRoom[];
  initialRoomId?: number;
  initialDate?: string;
  initialStartTime?: string;
  existingReservations?: RoomReservation[];
}

// Generate standard 30-min time slots from 07:00 to 20:00
const TIME_OPTIONS: string[] = [];
for (let h = 7; h <= 20; h++) {
  const hh = h.toString().padStart(2, '0');
  TIME_OPTIONS.push(`${hh}:00`);
  if (h < 20) {
    TIME_OPTIONS.push(`${hh}:30`);
  }
}

export const RoomReservationModal: React.FC<RoomReservationModalProps> = ({
  isOpen,
  onClose,
  onReserved,
  rooms,
  initialRoomId,
  initialDate,
  initialStartTime,
  existingReservations = [],
}) => {
  const [roomId, setRoomId] = useState<number>(0);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [attendeesCount, setAttendeesCount] = useState(2);
  const [description, setDescription] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const activeRooms = rooms.filter((r) => r.is_active);
      const defaultRoomId = initialRoomId && activeRooms.some((r) => r.id === initialRoomId)
        ? initialRoomId
        : activeRooms[0]?.id || 0;

      const defaultStart = initialStartTime || '09:00';
      // Compute default end time 1 hour after start
      const startIndex = TIME_OPTIONS.indexOf(defaultStart);
      const defaultEnd = startIndex >= 0 && startIndex + 2 < TIME_OPTIONS.length
        ? TIME_OPTIONS[startIndex + 2]
        : '10:00';

      setRoomId(defaultRoomId);
      setTitle('');
      setDate(initialDate || getColombiaToday());
      setStartTime(defaultStart);
      setEndTime(defaultEnd);
      setAttendeesCount(2);
      setDescription('');
      setError(null);
    }
  }, [isOpen, rooms, initialRoomId, initialDate, initialStartTime]);

  const selectedRoom = rooms.find((r) => r.id === roomId);

  // Check in real-time if the selected time range collides with existing reservations on the same date and room
  const conflictReservation = useMemo(() => {
    if (!roomId || !date || !startTime || !endTime || !existingReservations.length) return null;

    return existingReservations.find((r) => {
      if (r.room_id !== roomId) return false;
      if (r.status === 'cancelled') return false;

      // Extract date part from start_time (ISO: YYYY-MM-DDTHH:mm:ss)
      const resDate = r.start_time.split('T')[0];
      if (resDate !== date) return false;

      const resStart = r.start_time.includes('T')
        ? r.start_time.split('T')[1].substring(0, 5)
        : '';
      const resEnd = r.end_time.includes('T')
        ? r.end_time.split('T')[1].substring(0, 5)
        : '';

      if (!resStart || !resEnd) return false;

      // Interval overlap logic: startA < endB && endA > startB
      return startTime < resEnd && endTime > resStart;
    });
  }, [roomId, date, startTime, endTime, existingReservations]);

  // Check if attendees exceed capacity
  const isOverCapacity = selectedRoom && attendeesCount > selectedRoom.capacity;

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId) {
      setError('Por favor selecciona una sala de reuniones.');
      return;
    }
    if (!title.trim()) {
      setError('Por favor escribe el asunto o motivo de la reunión.');
      return;
    }
    if (!date) {
      setError('Por favor selecciona la fecha de la reserva.');
      return;
    }
    if (startTime >= endTime) {
      setError('La hora de fin debe ser posterior a la hora de inicio.');
      return;
    }
    if (conflictReservation) {
      setError(`Horario no disponible: ya existe la reunión "${conflictReservation.title}" en ese lapso.`);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const startIso = `${date}T${startTime}:00`;
      const endIso = `${date}T${endTime}:00`;

      const payload = {
        room_id: Number(roomId),
        title: title.trim(),
        description: description.trim() || undefined,
        start_time: startIso,
        end_time: endIso,
        attendees_count: Number(attendeesCount) || 1,
      };

      const reserved = await roomsService.createReservation(payload);
      onReserved(reserved);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al procesar la reserva. Por favor verifica los horarios.');
    } finally {
      setIsLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0"
              style={{ backgroundColor: selectedRoom?.color || '#f59e0b' }}
            >
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 font-montserrat tracking-tight">
                  Nueva Reserva de Sala
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-100 text-amber-800 uppercase tracking-wider font-montserrat">
                  Gloint Hub
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Programa tu sesión o reunión de trabajo corporativa
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-semibold flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Alerta de Conflicto en Tiempo Real */}
          {conflictReservation && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl text-amber-900 text-xs font-medium flex items-start gap-2.5 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <strong className="font-bold">Horario no disponible:</strong> Ya existe la reunión{' '}
                <span className="font-bold">"{conflictReservation.title}"</span> agendada para ese espacio.
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Por favor selecciona otro horario o cambia de sala.
                </p>
              </div>
            </div>
          )}

          {/* Selección de Sala */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <DoorClosed className="w-3.5 h-3.5 text-slate-400" />
                Sala de Reuniones *
              </span>
              {selectedRoom && (
                <span className="text-[10px] text-slate-500 normal-case font-medium flex items-center gap-1">
                  <Users className="w-3 h-3 text-slate-400" />
                  Máx. {selectedRoom.capacity} pers.
                </span>
              )}
            </label>
            <div className="relative">
              <select
                value={roomId}
                onChange={(e) => setRoomId(Number(e.target.value))}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all cursor-pointer"
              >
                {rooms
                  .filter((r) => r.is_active)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} (Capacidad: {r.capacity} pers.{r.location ? ` • ${r.location}` : ''})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Asunto o Título */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Asunto / Título de la Reunión *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Reunión con inversionista, Comité de estructuración"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Fecha y Asistentes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Fecha *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                N° de Asistentes
              </label>
              <input
                type="number"
                min="1"
                max={selectedRoom ? selectedRoom.capacity * 2 : 50}
                required
                value={attendeesCount}
                onChange={(e) => setAttendeesCount(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
              />
              {isOverCapacity && (
                <p className="text-[10px] text-amber-700 font-bold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-amber-600" />
                  Atención: Excede la capacidad recomendada ({selectedRoom?.capacity} pers.)
                </p>
              )}
            </div>
          </div>

          {/* Horario Inicio y Fin */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Hora Inicio *
              </label>
              <select
                value={startTime}
                onChange={(e) => {
                  const newStart = e.target.value;
                  setStartTime(newStart);
                  if (newStart >= endTime) {
                    const idx = TIME_OPTIONS.indexOf(newStart);
                    if (idx >= 0 && idx + 1 < TIME_OPTIONS.length) {
                      setEndTime(TIME_OPTIONS[idx + 1]);
                    }
                  }
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all cursor-pointer"
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Hora Fin *
              </label>
              <select
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all cursor-pointer"
              >
                {TIME_OPTIONS.filter((t) => t > startTime).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Información del espacio seleccionado */}
          {selectedRoom && (
            <div className="p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-2xl space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 font-montserrat flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedRoom.color }} />
                  {selectedRoom.name}
                </span>
                {selectedRoom.location && (
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    {selectedRoom.location}
                  </span>
                )}
              </div>
              {selectedRoom.equipment && (
                <p className="text-[11px] text-slate-500 line-clamp-2">
                  <strong className="text-slate-700">Equipamiento:</strong> {selectedRoom.equipment}
                </p>
              )}
            </div>
          )}

          {/* Notas o Descripción */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat">
              Notas adicionales (Opcional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalles sobre proyector, refrigerios, enlaces virtuales, etc."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all resize-none placeholder:text-slate-400"
            />
          </div>

          {/* Botones de acción estandarizados Gloint */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-2xl transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || Boolean(conflictReservation)}
              className="py-2.5 px-5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs font-montserrat uppercase tracking-wider shadow-md shadow-amber-500/20 active:scale-95 transition-all inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Confirmar Reserva</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
