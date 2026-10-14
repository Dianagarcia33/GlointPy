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
  Radio,
  Zap,
  Tv
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
  const [isReminderOpen, setIsReminderOpen] = useState(false);

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

  // Modal Recordatorio automático al iniciar sesión o acceder al dashboard cuando el evento esté activo
  useEffect(() => {
    // Si venía con intención explícita desde el login banner
    const shouldOpen = sessionStorage.getItem('gloint_open_rsvp');
    if (shouldOpen === 'true') {
      sessionStorage.removeItem('gloint_open_rsvp');
      setIsReminderOpen(false);
      setIsModalOpen(true);
      return;
    }

    // Recordatorio de asistencia al iniciar sesión
    if (isInvestor && eventData?.is_active) {
      const sessionKey = `gloint_event_reminder_session_${eventData.id}_${user?.id}`;
      const alreadyShown = sessionStorage.getItem(sessionKey);

      if (!alreadyShown) {
        // Marcamos que ya se mostró en esta sesión para no ser intrusivos en cada cambio de pestaña
        sessionStorage.setItem(sessionKey, 'true');

        // Mostramos el modal de recordatorio tras 1 segundo para una transición visual impecable
        const timer = setTimeout(() => {
          setIsReminderOpen(true);
          setIsModalOpen(true);
        }, 1000);

        return () => clearTimeout(timer);
      }
    }
  }, [isInvestor, eventData?.id, eventData?.is_active, user?.id]);

  if (!isInvestor || !eventData || !eventData.is_active) {
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
      {/* Banner Principal en el Dashboard (Si banner_active está habilitado) */}
      {eventData.banner_active && (
        <div className="relative w-full mb-8 group rounded-3xl p-[2px] bg-gradient-to-r from-amber-400 via-cyan-400 via-amber-300 to-indigo-500 shadow-[0_0_40px_rgba(245,158,11,0.25),0_0_25px_rgba(6,182,212,0.18)] hover:shadow-[0_0_55px_rgba(245,158,11,0.38),0_0_35px_rgba(6,182,212,0.28)] transition-all duration-500 overflow-hidden font-inter">
          
          {/* Contenedor Interior Cósmico / Cyber-Tech */}
          <div className="relative bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.15),rgba(0,0,0,0))] bg-gradient-to-br from-[#060a17] via-[#0b1227] to-[#04060f] rounded-[22px] p-5 sm:p-7 lg:p-8 text-white overflow-hidden backdrop-blur-2xl">
            
            {/* Patrón Grid Futurista */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#38bdf80e_1px,transparent_1px),linear-gradient(to_bottom,#38bdf80e_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none opacity-70" />

            {/* Luces Ambientales Neón */}
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-500/25 rounded-full blur-[100px] pointer-events-none animate-pulse" />
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-cyan-500/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 via-amber-400 to-transparent opacity-90" />

            {/* Fila 1: Badges de Estado y HUD Countdown Digital */}
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-white/10">
              
              {/* Badges de Estado */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-400/40 text-cyan-300 text-[11px] font-black uppercase tracking-wider shadow-[0_0_15px_rgba(6,182,212,0.25)] font-mono">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-80" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
                  </span>
                  Gloint Power Tech 2026
                </span>

                {myRegistration ? (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-[11px] font-bold shadow-[0_0_15px_rgba(16,185,129,0.25)] font-montserrat">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Asistencia VIP Confirmada ({myRegistration.attendance_mode === 'in_person' ? 'Presencial' : 'Virtual'})</span>
                  </span>
                ) : (
                  <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-black border shadow-sm font-montserrat ${
                    eventData.is_full_in_person 
                      ? 'bg-rose-500/20 border-rose-400/40 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.2)]' 
                      : 'bg-amber-500/25 border-amber-400/50 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                  }`}>
                    <Flame className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                    <span>
                      {eventData.is_full_in_person 
                        ? 'Aforo Presencial Lleno (Virtual Disponible)' 
                        : `⚡ Cupo Preferencial · Últimos ${eventData.available_in_person} cupos libres`}
                    </span>
                  </span>
                )}

                <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] text-cyan-200/90 font-medium px-2.5 py-1 rounded-full bg-slate-900/60 border border-cyan-500/30">
                  <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
                  Bogotá VIP & Streaming HQ 4K
                </span>
              </div>

              {/* Temporizador Regresivo HUD Ticking */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-[10px] font-black text-cyan-300/90 uppercase tracking-widest hidden xl:inline-block mr-1 font-mono">
                  COUNTDOWN:
                </span>
                
                <div className="bg-slate-900/90 border border-cyan-500/35 rounded-xl px-2.5 py-1 text-center min-w-[44px] sm:min-w-[48px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_0_15px_rgba(6,182,212,0.12)]">
                  <span className="block text-sm sm:text-base font-black font-mono text-white leading-tight">
                    {padZero(timeLeft.days)}
                  </span>
                  <span className="text-[9px] font-extrabold text-cyan-400 uppercase tracking-wider block">
                    Días
                  </span>
                </div>

                <span className="text-cyan-400/60 font-bold text-xs">:</span>

                <div className="bg-slate-900/90 border border-amber-500/40 rounded-xl px-2.5 py-1 text-center min-w-[44px] sm:min-w-[48px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_0_15px_rgba(245,158,11,0.15)]">
                  <span className="block text-sm sm:text-base font-black font-mono text-amber-300 leading-tight">
                    {padZero(timeLeft.hours)}
                  </span>
                  <span className="text-[9px] font-extrabold text-amber-400 uppercase tracking-wider block">
                    Horas
                  </span>
                </div>

                <span className="text-cyan-400/60 font-bold text-xs">:</span>

                <div className="bg-slate-900/90 border border-cyan-500/35 rounded-xl px-2.5 py-1 text-center min-w-[44px] sm:min-w-[48px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_0_15px_rgba(6,182,212,0.12)]">
                  <span className="block text-sm sm:text-base font-black font-mono text-white leading-tight">
                    {padZero(timeLeft.minutes)}
                  </span>
                  <span className="text-[9px] font-extrabold text-cyan-400 uppercase tracking-wider block">
                    Min
                  </span>
                </div>

                <span className="text-cyan-400/60 font-bold text-xs">:</span>

                <div className="bg-slate-900/90 border border-amber-500/40 rounded-xl px-2.5 py-1 text-center min-w-[44px] sm:min-w-[48px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_0_15px_rgba(245,158,11,0.15)]">
                  <span className="block text-sm sm:text-base font-black font-mono text-amber-400 leading-tight">
                    {padZero(timeLeft.seconds)}
                  </span>
                  <span className="text-[9px] font-extrabold text-amber-400 uppercase tracking-wider block">
                    Seg
                  </span>
                </div>
              </div>

            </div>

            {/* Fila 2: Título, Metadatos y Botón de Acción Principal */}
            <div className="relative z-10 pt-5 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              
              <div className="space-y-3 flex-1">
                <div>
                  <p className="text-[11px] font-extrabold tracking-widest text-cyan-400 uppercase font-mono flex items-center gap-1.5 mb-1">
                    <Zap className="w-3.5 h-3.5 text-cyan-400" />
                    CONVENCIÓN ANUAL DE INVERSIÓN Y TECNOLOGÍA
                  </p>
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black font-montserrat tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-100 to-amber-400 drop-shadow-sm">
                    {eventData.title || "Gloint Power Tech 2026"}
                  </h2>
                </div>

                <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                  {eventData.description || "Lanzamiento oficial de nuevos productos del ecosistema, modelos de rentabilidad y oportunidades exclusivas para inversionistas."}
                </p>

                {/* Ficha de Detalles */}
                <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs text-slate-300 pt-1">
                  <span className="inline-flex items-center gap-1.5 bg-slate-900/70 border border-white/10 px-3 py-1.5 rounded-xl shadow-xs">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    <span className="capitalize font-semibold text-slate-200">{formattedDate}</span>
                  </span>
                  
                  <span className="inline-flex items-center gap-1.5 bg-slate-900/70 border border-white/10 px-3 py-1.5 rounded-xl shadow-xs">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-semibold text-slate-200">{formattedTime} COT</span>
                  </span>

                  <span className="inline-flex items-center gap-1.5 bg-slate-900/70 border border-white/10 px-3 py-1.5 rounded-xl shadow-xs">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="font-semibold text-slate-200">{eventData.location?.split('•')[0] || 'Auditorio Principal • Bogotá'}</span>
                  </span>

                  <span className="inline-flex items-center gap-1.5 bg-slate-900/70 border border-white/10 px-3 py-1.5 rounded-xl shadow-xs">
                    <Tv className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="font-semibold text-slate-200">Streaming 4K</span>
                  </span>
                </div>
              </div>

              {/* Botón de Acción CTA */}
              <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0 pt-2 lg:pt-0">
                {myRegistration ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsReminderOpen(false);
                        setIsModalOpen(true);
                      }}
                      className="px-6 py-4 bg-gradient-to-r from-emerald-500/25 via-emerald-500/20 to-teal-500/20 hover:bg-emerald-500/35 border border-emerald-400/60 text-emerald-300 font-bold text-xs sm:text-sm rounded-2xl shadow-[0_0_25px_rgba(16,185,129,0.25)] hover:shadow-[0_0_35px_rgba(16,185,129,0.4)] transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-95 group font-montserrat"
                    >
                      <Ticket className="w-4 h-4 text-emerald-400" />
                      <span>Ver mi Entrada VIP / Modificar</span>
                      <ArrowRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1.5 transition-transform" />
                    </button>
                    <span className="text-[11px] text-emerald-400/90 font-medium text-center sm:text-right">
                      ✓ Tu lugar VIP está reservado en el sistema
                    </span>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsReminderOpen(false);
                        setIsModalOpen(true);
                      }}
                      className="px-7 py-4 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm rounded-2xl shadow-[0_0_35px_rgba(245,158,11,0.5)] hover:shadow-[0_0_50px_rgba(245,158,11,0.75)] hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-2.5 cursor-pointer group active:scale-95 font-montserrat tracking-wide"
                    >
                      <Sparkles className="w-4 h-4 text-slate-950 animate-spin" style={{ animationDuration: '4s' }} />
                      <span>Confirmar mi Asistencia VIP en 1 Clic</span>
                      <ArrowRight className="w-4 h-4 text-slate-950 group-hover:translate-x-1.5 transition-transform" />
                    </button>
                    <span className="text-[11px] text-amber-300/95 font-medium text-center sm:text-right flex items-center justify-center sm:justify-end gap-1">
                      ⚡ Sin formularios largos · Confirmación instantánea
                    </span>
                  </>
                )}
              </div>

            </div>

          </div>

        </div>
      )}

      {/* Modal de Asistencia / Recordatorio al Iniciar Sesión */}
      <InvestorEventRsvpModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setIsReminderOpen(false);
        }}
        isReminder={isReminderOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['my_event_registration'] });
          queryClient.invalidateQueries({ queryKey: ['active_event'] });
        }}
      />
    </>
  );
};
