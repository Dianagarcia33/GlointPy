import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Clock, Users, FileText, Loader2, DoorClosed, AlertCircle } from 'lucide-react';
import { roomsService, MeetingRoom, RoomReservation } from '../../../services/rooms';
import { getColombiaToday } from '../../../utils/format';

interface RoomReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReserved: (reservation: RoomReservation) => void;
  rooms: MeetingRoom[];
  initialRoomId?: number;
  initialDate?: string;
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

  // Set default date as today in local Colombia YYYY-MM-DD
  const getTodayStr = () => {
    return getColombiaToday();
  };

  useEffect(() => {
    if (isOpen) {
      const activeRooms = rooms.filter((r) => r.is_active);
      const defaultRoomId = initialRoomId && activeRooms.some((r) => r.id === initialRoomId)
        ? initialRoomId
        : activeRooms[0]?.id || 0;

      setRoomId(defaultRoomId);
      setTitle('');
      setDate(initialDate || getTodayStr());
      setStartTime('09:00');
      setEndTime('10:00');
      setAttendeesCount(2);
      setDescription('');
      setError(null);
    }
  }, [isOpen, rooms, initialRoomId, initialDate]);

  if (!isOpen) return null;

  const selectedRoom = rooms.find((r) => r.id === roomId);

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

    try {
      setIsLoading(true);
      setError(null);

      // Construct local datetime string without UTC offset conversion
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
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm"
              style={{ backgroundColor: selectedRoom?.color || '#10b981' }}
            >
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 font-montserrat">
                Nueva Reserva de Sala
              </h2>
              <p className="text-xs text-slate-500">
                Reserva un espacio para tu reunión o sesión de trabajo
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
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Selección de Sala */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat flex items-center gap-1.5">
              <DoorClosed className="w-3.5 h-3.5 text-slate-400" />
              Sala de Reuniones *
            </label>
            <select
              value={roomId}
              onChange={(e) => setRoomId(Number(e.target.value))}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
            >
              {rooms
                .filter((r) => r.is_active)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} (Capacidad: {r.capacity} personas{r.location ? ` • ${r.location}` : ''})
                  </option>
                ))}
            </select>
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
              placeholder="Ej. Reunión con inversionista, Comité comercial"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
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
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
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
                max={selectedRoom?.capacity || 50}
                required
                value={attendeesCount}
                onChange={(e) => setAttendeesCount(parseInt(e.target.value) || 1)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              />
              {selectedRoom && attendeesCount > selectedRoom.capacity && (
                <p className="text-[10px] text-rose-600 font-bold mt-1">
                  Excede la capacidad de la sala ({selectedRoom.capacity} pers.)
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
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
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
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              >
                {TIME_OPTIONS.filter((t) => t > startTime).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Equipamiento de la sala seleccionada como ayuda */}
          {selectedRoom?.equipment && (
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] text-slate-600">
              <span className="font-bold text-slate-800">Equipamiento disponible:</span> {selectedRoom.equipment}
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
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all resize-none"
            />
          </div>

          {/* Botones de acción */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all inline-flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Verificando disponibilidad...</span>
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
