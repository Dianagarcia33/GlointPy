import React, { useState, useEffect } from 'react';
import { Sparkles, Calendar, MapPin, Users, ArrowRight, UserCheck } from 'lucide-react';
import { getActiveEvent, EventData } from '../../../services/events';
import { PublicEventRsvpModal } from '../../events/components/PublicEventRsvpModal';

interface LoginEventBannerProps {
  onInvestorClick?: () => void;
}

export const LoginEventBanner: React.FC<LoginEventBannerProps> = ({ onInvestorClick }) => {
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [isPublicModalOpen, setIsPublicModalOpen] = useState(false);

  useEffect(() => {
    getActiveEvent()
      .then((data) => setEventData(data))
      .catch((err) => console.warn('Banner evento no disponible:', err));
  }, []);

  if (!eventData || !eventData.banner_active || !eventData.is_active) {
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
      <div className="mb-6 w-full bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 border border-brand-500/30 rounded-3xl p-5 text-white shadow-xl relative overflow-hidden font-inter transition-all hover:border-brand-500/50">
        
        {/* Glow ambient effects */}
        <div className="absolute -top-10 -right-10 w-36 h-36 bg-brand-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          
          {/* Info principal */}
          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-500/20 border border-brand-400/30 text-brand-300 text-[10px] font-bold font-montserrat uppercase tracking-wider">
                <Sparkles className="w-3 h-3 text-brand-300" />
                Evento Oficial
              </span>

              {/* Badge cupos */}
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                eventData.is_full_in_person 
                  ? 'bg-rose-500/20 border border-rose-400/30 text-rose-300'
                  : 'bg-emerald-500/20 border border-emerald-400/30 text-emerald-300'
              }`}>
                <Users className="w-3 h-3" />
                {eventData.is_full_in_person 
                  ? 'Cupos Presenciales Agotados' 
                  : `${eventData.available_in_person} cupos disponibles`}
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-black text-white font-montserrat tracking-tight">
              {eventData.title}
            </h3>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-brand-400" />
                <span className="capitalize">{formattedDate}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 truncate max-w-[220px]">
                <MapPin className="w-3.5 h-3.5 text-brand-400" />
                <span>{eventData.location?.split('•')[0] || 'Bogotá, Colombia'}</span>
              </span>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto shrink-0">
            {/* Si no es inversionista: registro público directo */}
            <button
              type="button"
              onClick={() => setIsPublicModalOpen(true)}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <span>Soy Invitado</span>
            </button>

            {/* Si es inversionista */}
            <button
              type="button"
              onClick={onInvestorClick}
              className="px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 font-montserrat"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Inversionista (1 Clic)</span>
            </button>
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
