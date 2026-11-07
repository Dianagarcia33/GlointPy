import React from 'react';
import { ArrowRight, ShoppingBag } from 'lucide-react';
import { EventData } from '../../../services/events';

const DEFAULT_URL = 'https://www.glointplace.com.co';

/** ¿Hay que mostrar el banner alterno? Solo cuando el del evento está oculto y el equipo activó este. */
export const shouldShowGlointPlaceBanner = (event?: Pick<EventData, 'banner_active' | 'promo_banner_active'> | null): boolean =>
  !!event && !event.banner_active && !!event.promo_banner_active;

interface GlointPlaceBannerProps {
  event: EventData;
  className?: string;
}

/** Banner alterno que lleva a Gloint Place. Reemplaza al del evento cuando este se apaga. */
export const GlointPlaceBanner: React.FC<GlointPlaceBannerProps> = ({ event, className = '' }) => {
  const url = event.promo_banner_url || DEFAULT_URL;
  const title = event.promo_banner_title || 'Descubre Gloint Place';
  const text = event.promo_banner_text || 'Conoce la tienda de Gloint y encuentra lo que necesitas.';

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`group block w-full rounded-3xl p-[1.5px] bg-gradient-to-r from-amber-500/70 via-amber-300 to-amber-500/70 shadow-[0_0_30px_rgba(245,158,11,0.22)] hover:shadow-[0_0_40px_rgba(245,158,11,0.32)] transition-all duration-300 font-inter ${className}`}
    >
      <div className="relative bg-gradient-to-br from-slate-950 via-[#0c1220] to-slate-950 rounded-[22px] p-4 sm:p-5 text-white overflow-hidden flex items-center gap-4">
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center shrink-0">
          <ShoppingBag className="w-5 h-5" />
        </div>
        <div className="relative z-10 min-w-0 flex-1">
          <p className="text-sm sm:text-base font-black font-montserrat text-white truncate">{title}</p>
          <p className="text-xs text-slate-300 leading-snug">{text}</p>
        </div>
        <span className="relative z-10 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-black shrink-0 group-hover:bg-amber-400 transition-colors">
          Visitar tienda
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </span>
      </div>
    </a>
  );
};
