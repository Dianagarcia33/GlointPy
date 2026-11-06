import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Calendar, 
  MapPin, 
  Users, 
  ArrowRight, 
  UserCheck, 
  Flame, 
  Clock 
} from 'lucide-react';
import { getActiveEvent, EventData } from '../../../services/events';
import { PublicEventRsvpModal } from '../../events/components/PublicEventRsvpModal';

interface LoginEventBannerProps {
  onInvestorClick?: () => void;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

export const LoginEventBanner: React.FC<LoginEventBannerProps> = ({ onInvestorClick }) => {
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [isPublicModalOpen, setIsPublicModalOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false
  });

  useEffect(() => {
    getActiveEvent()
      .then((data) => setEventData(data))
      .catch((err) => console.warn('Banner evento no disponible:', err));
  }, []);

  useEffect(() => {
    const targetDateStr = eventData?.event_date || '2026-11-28T18:00:00-05:00';
    let targetDate = new Date(targetDateStr);
    if (isNaN(targetDate.getTime())) {
      targetDate = new Date('2026-11-28T18:00:00-05:00');
    }

    const updateCountdown = () => {
      const now = Date.now();
      const diff = targetDate.getTime() - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
        return;
      }

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
        isExpired: false
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [eventData?.event_date]);

  if (!eventData || !eventData.banner_active || !eventData.is_active) {
    return null;
  }

  const formattedDate = eventData.event_date 
    ? new Date(eventData.event_date).toLocaleDateString('es-CO', { 
        day: 'numeric', 
        month: 'short' 
      })
    : '28 Nov';

  const padZero = (n: number) => n.toString().padStart(2, '0');

  return (
    <>
      <div className="w-full mb-3 rounded-3xl p-[1.5px] bg-gradient-to-r from-amber-500/70 via-amber-300 to-amber-500/70 shadow-[0_0_30px_rgba(245,158,11,0.22)] hover:shadow-[0_0_40px_rgba(245,158,11,0.32)] transition-all duration-300 overflow-hidden font-inter">
        
        {/* Interior Oscuro con Resplandor */}
        <div className="relative bg-gradient-to-br from-slate-950 via-[#0c1220] to-slate-950 rounded-[22px] p-4 sm:p-5 text-white overflow-hidden backdrop-blur-2xl">
          
          {/* Luces de Fondo */}
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-amber-500/20 rounded-full blur-2xl pointer-events-none animate-pulse" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-80" />

          {/* Fila 1: Badges y Mini Contador */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10">
            
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[10px] font-black font-montserrat uppercase tracking-wider">
                <Flame className="w-3 h-3 text-amber-400 animate-bounce" />
                Evento Anual 2026
              </span>

              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                eventData.is_full_in_person 
                  ? 'bg-rose-500/20 border-rose-400/30 text-rose-300'
                  : 'bg-emerald-500/20 border-emerald-400/30 text-emerald-300'
              }`}>
                <Users className="w-3 h-3" />
                {eventData.is_full_in_person 
                  ? 'Presencial Lleno' 
                  : `${eventData.available_in_person} cupos libres`}
              </span>
            </div>

            {/* Contador Compacto */}
            <div className="flex items-center gap-1">
              <div className="bg-slate-900/90 border border-amber-500/30 rounded-lg px-1.5 py-0.5 text-center min-w-[32px]">
                <span className="block text-xs font-black font-mono text-white leading-tight">
                  {padZero(timeLeft.days)}
                </span>
                <span className="text-[8px] font-bold text-amber-400 uppercase tracking-tighter block">
                  Días
                </span>
              </div>
              <span className="text-amber-500/60 font-bold text-[10px]">:</span>
              <div className="bg-slate-900/90 border border-amber-500/30 rounded-lg px-1.5 py-0.5 text-center min-w-[32px]">
                <span className="block text-xs font-black font-mono text-amber-400 leading-tight">
                  {padZero(timeLeft.hours)}
                </span>
                <span className="text-[8px] font-bold text-amber-400 uppercase tracking-tighter block">
                  Horas
                </span>
              </div>
              <span className="text-amber-500/60 font-bold text-[10px]">:</span>
              <div className="bg-slate-900/90 border border-amber-500/30 rounded-lg px-1.5 py-0.5 text-center min-w-[32px]">
                <span className="block text-xs font-black font-mono text-white leading-tight">
                  {padZero(timeLeft.minutes)}
                </span>
                <span className="text-[8px] font-bold text-amber-400 uppercase tracking-tighter block">
                  Min
                </span>
              </div>
            </div>

          </div>

          {/* Fila 2: Título y Detalles */}
          <div className="relative z-10 pt-3">
            <h3 className="text-base sm:text-lg font-black font-montserrat tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-100 to-amber-400">
              {eventData.title || "Gloint Power Tech 2026"}
            </h3>

            <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-slate-300 mt-1 mb-3">
              <span className="flex items-center gap-1 font-medium">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span className="capitalize">{formattedDate}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 truncate max-w-[200px]">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>{eventData.location?.split('•')[0] || 'Bogotá, Colombia'}</span>
              </span>
            </div>

            {/* Botones de Acción */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full pt-1">
              {/* Si es inversionista */}
              <button
                type="button"
                onClick={onInvestorClick}
                className="flex-1 py-2.5 px-3 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-black shadow-md shadow-amber-500/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 font-montserrat group"
              >
                <UserCheck className="w-3.5 h-3.5 text-slate-950" />
                <span>Inversionista (1 Clic)</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Si no es inversionista */}
              <button
                type="button"
                onClick={() => setIsPublicModalOpen(true)}
                className="py-2.5 px-3.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
              >
                <span>Soy Invitado</span>
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* Modal de Registro para No Inversionistas */}
      <PublicEventRsvpModal
        isOpen={isPublicModalOpen}
        onClose={() => setIsPublicModalOpen(false)}
      />
    </>
  );
};

