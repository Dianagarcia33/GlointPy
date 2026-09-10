import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  MapPin, 
  Video, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Calendar, 
  Clock, 
  ShieldCheck 
} from 'lucide-react';
import { 
  getActiveEvent, 
  getMyEventRegistration, 
  registerInvestorAttendee, 
  EventData, 
  AttendeeData 
} from '../../../services/events';
import { useAuthStore } from '../../../store/authStore';

interface InvestorEventRsvpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (attendee: AttendeeData) => void;
}

export const InvestorEventRsvpModal: React.FC<InvestorEventRsvpModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const user = useAuthStore((state) => state.user);
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [existingAttendee, setExistingAttendee] = useState<AttendeeData | null>(null);
  const [attendanceMode, setAttendanceMode] = useState<'in_person' | 'virtual'>('in_person');
  const [hasCompanion, setHasCompanion] = useState(false);
  const [companionName, setCompanionName] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [ev, myReg] = await Promise.all([
        getActiveEvent(),
        getMyEventRegistration()
      ]);
      setEventData(ev);
      setExistingAttendee(myReg);
      if (myReg) {
        setAttendanceMode(myReg.attendance_mode);
        setHasCompanion(myReg.has_companion);
        setCompanionName(myReg.companion_name || '');
      } else if (ev?.is_full_in_person) {
        setAttendanceMode('virtual');
      }
    } catch (err: any) {
      console.error('Error cargando evento:', err);
      setError('No se pudo cargar la información del evento.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validación de cupos si es presencial
    if (attendanceMode === 'in_person' && eventData) {
      const seatsNeeded = hasCompanion ? 2 : 1;
      const alreadyReserved = (existingAttendee?.attendance_mode === 'in_person') 
        ? existingAttendee.seats_reserved 
        : 0;
      const netNeeded = seatsNeeded - alreadyReserved;

      if (eventData.available_in_person < netNeeded) {
        setError(`Lo sentimos, solo quedan ${eventData.available_in_person} cupos presenciales disponibles. Te invitamos a participar en modalidad Virtual.`);
        return;
      }
    }

    try {
      setSubmitting(true);
      const res = await registerInvestorAttendee({
        attendance_mode: attendanceMode,
        has_companion: attendanceMode === 'in_person' ? hasCompanion : false,
        companion_name: (attendanceMode === 'in_person' && hasCompanion) ? companionName.trim() : undefined,
      });

      setSuccess(true);
      setExistingAttendee(res);
      if (onSuccess) onSuccess(res);

      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2500);
    } catch (err: any) {
      console.error('Error al confirmar asistencia:', err);
      setError(err.message || 'Ocurrió un error al registrar tu asistencia.');
    } finally {
      setSubmitting(false);
    }
  };

  const formattedDate = eventData?.event_date 
    ? new Date(eventData.event_date).toLocaleDateString('es-CO', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    : 'Próximamente';

  const formattedTime = eventData?.event_date
    ? new Date(eventData.event_date).toLocaleTimeString('es-CO', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    : '18:00 COT';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative max-h-[92vh] overflow-y-auto font-inter">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {loading ? (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500 mx-auto" />
            <p className="text-xs font-semibold text-slate-500">Cargando detalles de Gloint Power Tech...</p>
          </div>
        ) : success ? (
          <div className="py-10 text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 font-montserrat">
              ¡Asistencia Confirmada!
            </h3>
            <p className="text-sm text-slate-600 max-w-sm mx-auto">
              {attendanceMode === 'in_person' 
                ? `¡Te esperamos presencialmente${hasCompanion ? ' junto a tu acompañante' : ''}! Tu cupo ha sido reservado con éxito.`
                : '¡Registrado en modalidad Virtual! Te compartiremos el enlace de transmisión oficial.'}
            </p>
            <div className="pt-2 text-xs font-bold text-brand-600 font-montserrat">
              Gloint Power Tech • Presentación de Nuevos Productos
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Header del Evento */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-200/60 text-brand-700 text-xs font-bold mb-3 font-montserrat">
                <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                <span>Evento Exclusivo para Inversionistas</span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 font-montserrat tracking-tight">
                {eventData?.title || 'Gloint Power Tech'}
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Hola <strong>{user?.name}</strong>, como inversionista de Gloint tienes acceso prioritario a la presentación oficial de los nuevos productos del ecosistema.
              </p>
            </div>

            {/* Ficha Rápida del Evento */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <Calendar className="w-4 h-4 text-brand-600 shrink-0" />
                <span className="font-semibold capitalize">{formattedDate}</span>
                <span className="text-slate-300">•</span>
                <Clock className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                <span className="font-semibold">{formattedTime}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <MapPin className="w-4 h-4 text-brand-600 shrink-0" />
                <span className="truncate">{eventData?.location || 'Auditorio Principal Gloint • Bogotá'}</span>
              </div>
            </div>

            {/* Cupos Presenciales Disponibles Badge */}
            {eventData && (
              <div className={`p-3 rounded-2xl border flex items-center justify-between text-xs ${
                eventData.is_full_in_person 
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}>
                <div className="flex items-center gap-2 font-medium">
                  <Users className="w-4 h-4 shrink-0" />
                  <span>
                    {eventData.is_full_in_person 
                      ? 'Cupos presenciales agotados' 
                      : `Aforo presencial: ${eventData.available_in_person} cupos disponibles de ${eventData.capacity_in_person}`}
                  </span>
                </div>
                {!eventData.is_full_in_person && (
                  <span className="font-bold text-emerald-700 font-mono text-[11px] bg-white px-2 py-0.5 rounded-full border border-emerald-300 shadow-2xs">
                    {eventData.available_in_person} libres
                  </span>
                )}
              </div>
            )}

            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Selector de Modalidad */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Selecciona tu Modalidad de Asistencia <span className="text-rose-500">*</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Opción Presencial */}
                <button
                  type="button"
                  disabled={eventData?.is_full_in_person && existingAttendee?.attendance_mode !== 'in_person'}
                  onClick={() => setAttendanceMode('in_person')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                    attendanceMode === 'in_person'
                      ? 'bg-brand-50/50 border-brand-500 ring-2 ring-brand-500/20 shadow-xs'
                      : eventData?.is_full_in_person
                        ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-xl bg-brand-100/70 text-brand-700 flex items-center justify-center">
                      <MapPin className="w-4 h-4" />
                    </div>
                    {eventData?.is_full_in_person && (
                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                        Agotado
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 font-montserrat">Presencial</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Asiste al auditorio, interactúa con el equipo y vive la experiencia en vivo.</p>
                  </div>
                </button>

                {/* Opción Virtual */}
                <button
                  type="button"
                  onClick={() => {
                    setAttendanceMode('virtual');
                    setHasCompanion(false);
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                    attendanceMode === 'virtual'
                      ? 'bg-brand-50/50 border-brand-500 ring-2 ring-brand-500/20 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                      <Video className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Online
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 font-montserrat">Virtual</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Conéctate desde cualquier lugar mediante transmisión en alta definición.</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Opción de Acompañante (solo si es presencial) */}
            {attendanceMode === 'in_person' && (
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3 animate-in fade-in duration-150">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasCompanion}
                    onChange={(e) => setHasCompanion(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-brand-600 rounded-md border-slate-300 focus:ring-brand-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block font-montserrat">
                      ¿Llevarás un acompañante al evento?
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Al marcar esta casilla, se descontarán <strong>2 cupos</strong> del aforo presencial disponible.
                    </span>
                  </div>
                </label>

                {hasCompanion && (
                  <div className="pt-2 border-t border-slate-200/70">
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Nombre del Acompañante (Opcional)
                    </label>
                    <input
                      type="text"
                      value={companionName}
                      onChange={(e) => setCompanionName(e.target.value)}
                      placeholder="Ej. María Pérez"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Aviso de confirmación rápida */}
            <div className="p-3 bg-brand-50/40 border border-brand-100 rounded-xl flex items-start gap-2.5 text-[11px] text-slate-600">
              <ShieldCheck className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
              <span>
                Al confirmar, se reservará tu asistencia con los datos de tu cuenta (<strong>{user?.email}</strong>). No necesitas diligenciar formularios adicionales.
              </span>
            </div>

            {/* Botones de Acción */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="submit"
                disabled={submitting || (attendanceMode === 'in_person' && Boolean(eventData?.is_full_in_person) && existingAttendee?.attendance_mode !== 'in_person')}
                className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95 font-montserrat"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Confirmando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{existingAttendee ? 'Actualizar mi Asistencia' : 'Confirmar mi Asistencia'}</span>
                  </>
                )}
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
