import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  Calendar, 
  Clock, 
  MapPin, 
  Sparkles, 
  ArrowRight, 
  Video, 
  Users, 
  Flame,
  CheckCircle2
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { getActiveEvent, EventData } from "../../../services/events";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

export function EventCountdownModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false
  });

  const navigate = useNavigate();
  const location = useLocation();

  // Cargar datos del evento activo y abrir modal si no se ha descartado en la sesión
  useEffect(() => {
    // Comprobar si ya fue cerrado en esta sesión de navegación
    const isDismissed = sessionStorage.getItem("gloint_event_countdown_dismissed");
    
    getActiveEvent()
      .then((data) => {
        if (data && data.is_active) {
          setEventData(data);
          
          if (!isDismissed) {
            // Breve delay de 1.2s para que la página cargue primero con elegancia
            const timer = setTimeout(() => {
              setIsOpen(true);
            }, 1200);
            return () => clearTimeout(timer);
          }
        }
      })
      .catch((err) => console.warn("Error cargando evento para modal countdown:", err));
  }, []);

  // Calcular la fecha objetivo del evento
  const getTargetDate = (): Date => {
    if (eventData?.event_date) {
      const parsed = new Date(eventData.event_date);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    // Fecha de respaldo si aún no tiene fecha en BD (ej. 28 de Noviembre de 2026, 18:00 COT)
    return new Date("2026-11-28T18:00:00-05:00");
  };

  // Temporizador regresivo en vivo cada segundo
  useEffect(() => {
    const targetDate = getTargetDate();

    const calculateTime = () => {
      const now = new Date().getTime();
      const difference = targetDate.getTime() - now;

      if (difference <= 0) {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isExpired: true
        });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      setTimeLeft({
        days,
        hours,
        minutes,
        seconds,
        isExpired: false
      });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [eventData]);

  // Manejo de cierre y persistencia de sesión
  const handleClose = () => {
    setIsOpen(false);
    sessionStorage.setItem("gloint_event_countdown_dismissed", "true");
  };

  // Navegar o hacer scroll hacia el formulario de inscripción
  const handleGoToEvent = () => {
    handleClose();
    
    if (location.pathname === "/") {
      const element = document.getElementById("gloint-power-tech");
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      navigate("/#gloint-power-tech");
      setTimeout(() => {
        const element = document.getElementById("gloint-power-tech");
        element?.scrollIntoView({ behavior: "smooth" });
      }, 300);
    }
  };

  if (!eventData || !eventData.is_active) {
    return null;
  }

  const formattedDate = eventData.event_date
    ? new Date(eventData.event_date).toLocaleDateString("es-CO", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric"
      })
    : "Noviembre 2026";

  const formattedTime = eventData.event_date
    ? new Date(eventData.event_date).toLocaleTimeString("es-CO", {
        hour: "2-digit",
        minute: "2-digit"
      })
    : "6:00 PM COT";

  // Formateador con 2 dígitos
  const padZero = (n: number) => n.toString().padStart(2, "0");

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          
          {/* Backdrop con Blur y oscurecimiento cinemático */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border border-amber-500/30 rounded-3xl shadow-2xl p-6 sm:p-8 text-white overflow-hidden my-auto z-10"
          >
            {/* Resplandor ambiental dorado */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-600/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

            {/* Botón de Cierre */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors border border-slate-700/60 cursor-pointer z-20"
              aria-label="Cerrar modal"
            >
              <X size={18} />
            </button>

            {/* Header del Evento */}
            <div className="text-center space-y-2 relative z-10">
              
              {/* Badge superior */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold font-montserrat tracking-wide">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <Sparkles size={13} className="text-amber-400" />
                <span>LANZAMIENTO OFICIAL 2026</span>
              </div>

              {/* Título Principal */}
              <h3 className="text-2xl sm:text-3xl font-black font-montserrat tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-100 to-amber-400 pt-1">
                {eventData.title || "Gloint Power Tech 2026"}
              </h3>

              {/* Subtítulo */}
              <p className="text-xs sm:text-sm text-slate-300 max-w-sm mx-auto leading-relaxed">
                Descubre los nuevos productos del ecosistema Gloint. Reserva tu lugar antes de que se agoten los cupos.
              </p>
            </div>

            {/* Contador Regresivo en Vivo */}
            <div className="my-6 relative z-10">
              <div className="text-center mb-2.5">
                <span className="text-[11px] font-bold text-amber-400/90 tracking-wider uppercase flex items-center justify-center gap-1.5 font-montserrat">
                  <Flame size={14} className="text-amber-400 animate-bounce" />
                  <span>El evento comienza en:</span>
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 sm:gap-3 text-center">
                {/* Días */}
                <div className="bg-slate-800/80 border border-amber-500/25 rounded-2xl p-2.5 sm:p-3 shadow-inner">
                  <span className="block text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">
                    {padZero(timeLeft.days)}
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 block">
                    Días
                  </span>
                </div>

                {/* Horas */}
                <div className="bg-slate-800/80 border border-amber-500/25 rounded-2xl p-2.5 sm:p-3 shadow-inner">
                  <span className="block text-2xl sm:text-3xl font-black font-mono text-amber-400 tracking-tight">
                    {padZero(timeLeft.hours)}
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 block">
                    Horas
                  </span>
                </div>

                {/* Minutos */}
                <div className="bg-slate-800/80 border border-amber-500/25 rounded-2xl p-2.5 sm:p-3 shadow-inner">
                  <span className="block text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">
                    {padZero(timeLeft.minutes)}
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 block">
                    Min
                  </span>
                </div>

                {/* Segundos */}
                <div className="bg-slate-800/80 border border-amber-500/25 rounded-2xl p-2.5 sm:p-3 shadow-inner">
                  <span className="block text-2xl sm:text-3xl font-black font-mono text-amber-400 tracking-tight">
                    {padZero(timeLeft.seconds)}
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 block">
                    Seg
                  </span>
                </div>
              </div>
            </div>

            {/* Ficha de Detalles del Evento */}
            <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-3.5 space-y-2 text-xs relative z-10 mb-6">
              <div className="grid grid-cols-2 gap-2 text-slate-300">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-amber-400 shrink-0" />
                  <span className="truncate">{formattedDate}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-amber-400 shrink-0" />
                  <span>{formattedTime}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-700/50 text-[11px]">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <MapPin size={13} className="text-amber-400 shrink-0" />
                  <span className="truncate">{eventData.location || "Auditorio Principal • Bogotá"}</span>
                </div>

                <div className="flex items-center gap-1 text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 shrink-0">
                  <Users size={12} />
                  <span>{eventData.available_in_person} cupos libres</span>
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="space-y-2.5 relative z-10">
              <button
                type="button"
                onClick={handleGoToEvent}
                className="w-full py-3.5 px-6 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs sm:text-sm rounded-2xl shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 group cursor-pointer tracking-wide"
              >
                <span>Reservar mi Cupo Ahora</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                type="button"
                onClick={handleClose}
                className="w-full py-2 text-slate-400 hover:text-slate-200 text-xs font-semibold transition-colors cursor-pointer text-center"
              >
                Continuar navegando en el sitio
              </button>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
