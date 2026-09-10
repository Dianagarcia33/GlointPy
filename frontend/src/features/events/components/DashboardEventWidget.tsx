import React, { useState, useEffect } from 'react';
import { Sparkles, Calendar, MapPin, Users, CheckCircle2, ArrowRight } from 'lucide-react';
import { getActiveEvent, getMyEventRegistration, EventData, AttendeeData } from '../../../services/events';
import { InvestorEventRsvpModal } from './InvestorEventRsvpModal';

export const DashboardEventWidget: React.FC = () => {
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [myRegistration, setMyRegistration] = useState<AttendeeData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();

    // Si venía con intención desde el banner de login
    const shouldOpen = sessionStorage.getItem('gloint_open_rsvp');
    if (shouldOpen === 'true') {
      sessionStorage.removeItem('gloint_open_rsvp');
      setIsModalOpen(true);
    }
  }, []);

  const loadData = async () => {
    try {
      const [ev, reg] = await Promise.all([
        getActiveEvent(),
        getMyEventRegistration().catch(() => null)
      ]);
      setEventData(ev);
      setMyRegistration(reg);
    } catch (err) {
      console.warn('Evento no disponible en dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !eventData || !eventData.is_active || !eventData.banner_active) {
    return null;
  }

  const formattedDate = eventData.event_date 
    ? new Date(eventData.event_date).toLocaleDateString('es-CO', { 
        day: 'numeric', 
        month: 'short' 
      })
    : 'Próximamente';

  return (
    <>
      <div className="w-full mb-6 bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 border border-brand-500/30 rounded-3xl p-5 text-white shadow-xl relative overflow-hidden font-inter transition-all">
        
        {/* Glow effects */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          
          <div className="space-y-1 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-brand-500/20 border border-brand-400/30 text-brand-300 text-[10px] font-bold font-montserrat uppercase">
                <Sparkles className="w-3 h-3 text-brand-300" />
                Lanzamiento Oficial
              </span>

              {myRegistration ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-bold">
                  <CheckCircle2 className="w-3 h-3" />
                  Asistencia Confirmada ({myRegistration.attendance_mode === 'in_person' ? 'Presencial' : 'Virtual'})
                </span>
              ) : (
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  eventData.is_full_in_person 
                    ? 'bg-rose-500/20 text-rose-300' 
                    : 'bg-emerald-500/20 text-emerald-300'
                }`}>
                  <Users className="w-3 h-3" />
                  {eventData.is_full_in_person ? 'Aforo Presencial Lleno' : `${eventData.available_in_person} cupos disponibles`}
                </span>
              )}
            </div>

            <h3 className="text-lg font-black text-white font-montserrat tracking-tight">
              {eventData.title}
            </h3>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
              <span className="flex items-center gap-1 capitalize">
                <Calendar className="w-3.5 h-3.5 text-brand-400" />
                <span>{formattedDate}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-brand-400" />
                <span>{eventData.location?.split('•')[0] || 'Auditorio Principal'}</span>
              </span>
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-2 cursor-pointer font-montserrat ${
                myRegistration
                  ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                  : 'bg-brand-500 hover:bg-brand-600 text-white shadow-brand-500/30'
              }`}
            >
              <span>{myRegistration ? 'Gestionar Asistencia' : 'Confirmar mi Asistencia en 1 Clic'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </div>

      <InvestorEventRsvpModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(reg) => {
          setMyRegistration(reg);
          loadData();
        }}
      />
    </>
  );
};
