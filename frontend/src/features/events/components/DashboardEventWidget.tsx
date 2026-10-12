import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Sparkles, 
  Calendar, 
  MapPin, 
  Users, 
  CheckCircle2, 
  ArrowRight, 
  Flame, 
  Clock, 
  Ticket, 
  Radio
} from 'lucide-react';
import { getActiveEvent, getMyEventRegistration, EventData, AttendeeData } from '../../../services/events';
import { InvestorEventRsvpModal } from './InvestorEventRsvpModal';
import { useAuthStore } from '../../../store/authStore';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

export const DashboardEventWidget: React.FC = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Determinar si el usuario es staff/administrativo/comercial (excluir del widget)
  const isInvestor = useMemo(() => {
    if (!user) return false;
    if (user.is_superuser) return false;

    const userRoles = [
      ...(user.roles_list || []),
      ...((user.roles || []).map((r: any) => (typeof r === 'string' ? r : r?.name || '')))
    ].map(r => String(r).toLowerCase());

    const hasStaffRole = userRoles.some(r => 
      ['admin', 'super', 'director', 'directiv', 'comercial', 'asesor', 'gerente', 'lider', 'auditor'].some(kw => r.includes(kw))
    ) || (user.permissions || []).some(p => 
      ['admin.', 'commercial:', 'director.'].some(kw => p.toLowerCase().includes(kw))
    );

    return !hasStaffRole;
  }, [user]);

  const { data: eventData } = useQuery<EventData | null>({
    queryKey: ['active_event'],
    queryFn: async () => {
      try {
        return await getActiveEvent();
      } catch {
        return null;
      }
    },
    enabled: isInvestor,
    staleTime: 5 * 60 * 1000,
  });

  const { data: myRegistration = null } = useQuery<AttendeeData | null>({
    queryKey: ['my_event_registration', user?.id],
    queryFn: async () => {
      try {
        return await getMyEventRegistration();
      } catch {
        return null;
      }
    },
    enabled: isInvestor && !!user?.id,
    staleTime: 60 * 1000,
  });

  // Temporizador regresivo en vivo
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false
  });

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

  useEffect(() => {
    // Si venía con intención desde el banner de login
    const shouldOpen = sessionStorage.getItem('gloint_open_rsvp');
    if (shouldOpen === 'true') {
      sessionStorage.removeItem('gloint_open_rsvp');
      setIsModalOpen(true);
    }
  }, []);

  if (!isInvestor || !eventData || !eventData.is_active || !eventData.banner_active) {
    return null;
  }

  const formattedDate = eventData.event_date 
    ? new Date(eventData.event_date).toLocaleDateString('es-CO', { 
        weekday: 'short',
        day: 'numeric', 
        month: 'short',
        year: 'numeric'
      })
    : '28 Nov 2026';

  const formattedTime = eventData.event_date
    ? new Date(eventData.event_date).toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit'
      })
    : '6:00 PM';

  const padZero = (n: number) => n.toString().padStart(2, '0');

  return (
    <>
      <div className="relative w-full mb-8 group rounded-3xl p-[1.5px] bg-gradient-to-r from-amber-500/70 via-amber-300 to-amber-500/70 shadow-[0_0_35px_rgba(245,158,11,0.22)] hover:shadow-[0_0_45px_rgba(245,158,11,0.32)] transition-all duration-300 overflow-hidden font-inter">
        
        {/* Contenedor Interior Oscuro con Resplandor */}
        <div className="relative bg-gradient-to-br from-slate-950 via-[#0c1220] to-slate-950 rounded-[22px] p-5 sm:p-7 text-white overflow-hidden backdrop-blur-2xl">
          
          {/* Luces de Fondo Cinemáticas */}
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-amber-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-80" />

          {/* Fila 1: Badges de Estado y Contador Regresivo */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
            
            {/* Badges de Estado */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[11px] font-black font-montserrat uppercase tracking-wider shadow-sm">
                <Flame className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                Evento Anual Exclusivo
              </span>

              {myRegistration ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-bold shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Asistencia VIP Confirmada ({myRegistration.attendance_mode === 'in_person' ? 'Presencial' : 'Virtual'})
                </span>
              ) : (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border shadow-sm ${
                  eventData.is_full_in_person 
                    ? 'bg-rose-500/20 border-rose-400/30 text-rose-300' 
                    : 'bg-emerald-500/20 border-emerald-400/30 text-emerald-300'
                }`}>
                  <Users className="w-3.5 h-3.5" />
                  {eventData.is_full_in_person ? 'Aforo Presencial Lleno (Virtual Disponible)' : `⚡ Últimos ${eventData.available_in_person} cupos disponibles`}
                </span>
              )}

              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-amber-300/80 font-medium px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                <Radio className="w-3 h-3 text-red-400 animate-pulse" />
                Bogotá + Streaming HQ
              </span>
            </div>

            {/* Temporizador Regresivo Ticking */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-[10px] font-black text-amber-400/90 uppercase tracking-widest hidden xl:inline-block mr-1 font-montserrat">
                Inicia en:
              </span>
              
              <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl px-2.5 py-1 text-center min-w-[42px] sm:min-w-[46px] shadow-inner">
                <span className="block text-sm sm:text-base font-black font-mono text-white leading-tight">
                  {padZero(timeLeft.days)}
                </span>
                <span className="text-[9px] font-bold text-amber-400/90 uppercase tracking-wider block">
                  Días
                </span>
              </div>

              <span className="text-amber-500/60 font-bold text-xs">:</span>

              <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl px-2.5 py-1 text-center min-w-[42px] sm:min-w-[46px] shadow-inner">
                <span className="block text-sm sm:text-base font-black font-mono text-amber-400 leading-tight">
                  {padZero(timeLeft.hours)}
                </span>
                <span className="text-[9px] font-bold text-amber-400/90 uppercase tracking-wider block">
                  Horas
                </span>
              </div>

              <span className="text-amber-500/60 font-bold text-xs">:</span>

              <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl px-2.5 py-1 text-center min-w-[42px] sm:min-w-[46px] shadow-inner">
                <span className="block text-sm sm:text-base font-black font-mono text-white leading-tight">
                  {padZero(timeLeft.minutes)}
                </span>
                <span className="text-[9px] font-bold text-amber-400/90 uppercase tracking-wider block">
                  Min
                </span>
              </div>

              <span className="text-amber-500/60 font-bold text-xs">:</span>

              <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl px-2.5 py-1 text-center min-w-[42px] sm:min-w-[46px] shadow-inner">
                <span className="block text-sm sm:text-base font-black font-mono text-amber-400 leading-tight">
                  {padZero(timeLeft.seconds)}
                </span>
                <span className="text-[9px] font-bold text-amber-400/90 uppercase tracking-wider block">
                  Seg
                </span>
              </div>
            </div>

          </div>

          {/* Fila 2: Título, Metadatos y Botón de Acción Principal */}
          <div className="relative z-10 pt-4 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            
            <div className="space-y-2 flex-1">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black font-montserrat tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-100 to-amber-400">
                {eventData.title || "Gloint Power Tech 2026"}
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                {eventData.description || "Convención Anual de Inversionistas: Nuevas tecnologías, proyecciones de rentabilidad y oportunidades exclusivas de expansión."}
              </p>

              {/* Ficha de Detalles */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-slate-300 pt-1">
                <span className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1 rounded-xl">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span className="capitalize font-medium">{formattedDate}</span>
                </span>
                
                <span className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1 rounded-xl">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-medium">{formattedTime} COT</span>
                </span>

                <span className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1 rounded-xl">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-medium">{eventData.location?.split('•')[0] || 'Auditorio Principal • Bogotá'}</span>
                </span>
              </div>
            </div>

            {/* Botón de Acción CTA */}
            <div className="flex flex-col items-stretch sm:items-end gap-1.5 shrink-0 pt-2 lg:pt-0">
              {myRegistration ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="px-6 py-3.5 bg-slate-800/90 hover:bg-slate-700/90 border border-emerald-400/40 text-emerald-300 font-bold text-xs sm:text-sm rounded-2xl shadow-lg shadow-emerald-500/10 transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-95 group font-montserrat"
                  >
                    <Ticket className="w-4 h-4 text-emerald-400" />
                    <span>Ver mi Entrada / Modificar</span>
                    <ArrowRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <span className="text-[11px] text-emerald-400/90 font-medium text-center sm:text-right">
                    ✓ Tu lugar VIP está reservado
                  </span>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="px-7 py-3.5 sm:py-4 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm rounded-2xl shadow-xl shadow-amber-500/35 hover:shadow-amber-500/50 transition-all duration-300 flex items-center justify-center gap-2.5 cursor-pointer group active:scale-95 font-montserrat tracking-wide"
                  >
                    <Sparkles className="w-4 h-4 text-slate-950 animate-spin" style={{ animationDuration: '4s' }} />
                    <span>Confirmar mi Asistencia en 1 Clic</span>
                    <ArrowRight className="w-4 h-4 text-slate-950 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <span className="text-[11px] text-amber-300/90 font-medium text-center sm:text-right flex items-center justify-center sm:justify-end gap-1">
                    ⚡ Sin formularios largos · Confirmación instantánea
                  </span>
                </>
              )}
            </div>

          </div>

        </div>

      </div>

      <InvestorEventRsvpModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['my_event_registration'] });
          queryClient.invalidateQueries({ queryKey: ['active_event'] });
        }}
      />
    </>
  );
};

