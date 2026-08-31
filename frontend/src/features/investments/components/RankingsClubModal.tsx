import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Trophy, 
  Crown, 
  Star, 
  Medal, 
  Gem, 
  Zap, 
  Sparkles, 
  Shield, 
  CheckCircle2, 
  Lock, 
  ArrowRight, 
  DollarSign, 
  TrendingUp, 
  Loader2,
  Award,
  ChevronRight
} from 'lucide-react';
import { UserRankDetails, rankingsService } from '../../../services/rankings';

interface RankingsClubModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  trophy: Trophy,
  crown: Crown,
  gem: Gem,
  star: Star,
  medal: Medal,
  shield: Shield,
  zap: Zap,
  sparkles: Sparkles,
};

export const RankingsClubModal: React.FC<RankingsClubModalProps> = ({
  isOpen,
  onClose
}) => {
  const [details, setDetails] = useState<UserRankDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const load = async () => {
        try {
          setLoading(true);
          setError(null);
          const data = await rankingsService.getMyRankDetails();
          setDetails(data);
        } catch (err: any) {
          console.error('Error loading rank details:', err);
          setError(err.message || 'Error al cargar beneficios de ranking.');
        } finally {
          setLoading(false);
        }
      };
      load();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const formatCurrency = (val: number) => {
    return `$${Number(val || 0).toLocaleString('es-CO')} COP`;
  };

  const currentRankOrder = details?.current_rank?.order || 1;
  const CurrentIcon = details?.current_rank?.icon ? (ICON_MAP[details.current_rank.icon] || Trophy) : Trophy;

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4" style={{ margin: 0 }}>
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-slate-200 animate-in fade-in duration-200">
        
        {/* Header Modal Estándar Gloint */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3.5">
            <div 
              className="p-3 rounded-2xl flex items-center justify-center text-white shadow-xs"
              style={{ backgroundColor: details?.current_rank?.color || '#EAB308' }}
            >
              <CurrentIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold font-montserrat text-slate-900 tracking-tight">
                  Club de Inversionistas & Escalafón
                </h2>
                {details?.current_rank && (
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-mono">
                    Nivel #{details.current_rank.order} {details.current_rank.name}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Conoce los beneficios y bonos exclusivos según tu nivel de capital activo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hero Metric Summary Band */}
        {details && details.current_rank && (
          <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                Tu Capital Activo en Vigencia
              </span>
              <div className="flex items-baseline gap-3 mt-0.5">
                <h3 className="text-2xl sm:text-3xl font-extrabold font-montserrat tracking-tight text-white">
                  {formatCurrency(details.total_active_capital)}
                </h3>
                {details.current_rank.bonus_percentage > 0 && (
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                    +{details.current_rank.bonus_percentage}% Bono Extra
                  </span>
                )}
              </div>
            </div>

            {details.next_rank ? (
              <div className="text-xs text-slate-300 bg-white/10 px-4 py-2.5 rounded-2xl border border-white/10 space-y-1 sm:text-right">
                <div className="flex items-center justify-between sm:justify-end gap-2">
                  <span className="text-slate-400 font-medium">Siguiente Nivel:</span>
                  <strong className="text-amber-300 font-bold font-montserrat">{details.next_rank.name}</strong>
                </div>
                <div className="w-full sm:w-44 bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500 bg-brand-400"
                    style={{ width: `${details.progress_percentage}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-300 font-mono block">
                  Faltan <strong className="text-white font-bold">{formatCurrency(details.amount_needed)}</strong> ({details.progress_percentage}%)
                </span>
              </div>
            ) : (
              <div className="text-xs font-bold text-amber-300 bg-white/10 px-4 py-2.5 rounded-2xl border border-white/10 flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-400" />
                <span>¡Has alcanzado la categoría máxima!</span>
              </div>
            )}
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="py-16 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-brand-600 mx-auto" />
              <p className="mt-3 text-slate-600 font-bold text-sm">Cargando catálogo de beneficios...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 text-rose-700 rounded-2xl border border-rose-200 text-xs font-bold">
              {error}
            </div>
          ) : details ? (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Escalafón de Niveles del Club ({details.all_ranks.length} Rangos)
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {details.all_ranks.map((r) => {
                  const RankIcon = ICON_MAP[r.icon] || Trophy;
                  const isCurrent = details.current_rank?.id === r.id;
                  const isUnlocked = r.order <= currentRankOrder;

                  return (
                    <div 
                      key={r.id}
                      className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-3.5 ${
                        isCurrent 
                          ? 'border-brand-500 bg-brand-50/20 shadow-sm ring-2 ring-brand-500/20' 
                          : isUnlocked
                            ? 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs'
                            : 'border-slate-200 bg-slate-50/60 opacity-80'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-xs shrink-0"
                              style={{ backgroundColor: r.color || '#EAB308' }}
                            >
                              <RankIcon className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-mono font-bold uppercase text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                  #{r.order}
                                </span>
                                <h4 className="font-extrabold text-slate-900 text-base font-montserrat">
                                  {r.name}
                                </h4>
                              </div>
                              {isCurrent && (
                                <span className="text-[10px] font-bold uppercase text-brand-600 block mt-0.5">
                                  ✓ Tu Nivel Actual
                                </span>
                              )}
                            </div>
                          </div>

                          {r.bonus_percentage > 0 && (
                            <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                              +{r.bonus_percentage}% Bono
                            </span>
                          )}
                        </div>

                        {/* Capital Threshold */}
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-medium">Capital Requerido:</span>
                          <span className="font-bold text-slate-900 font-mono">
                            {formatCurrency(r.min_investment)} {r.max_investment ? `a ${formatCurrency(r.max_investment)}` : '+'}
                          </span>
                        </div>

                        {/* Priority ACH */}
                        {r.priority_withdrawal && (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>Prioridad en Desembolsos ACH</span>
                          </div>
                        )}

                        {/* Benefits list */}
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                            Beneficios:
                          </span>
                          <ul className="space-y-1 text-xs text-slate-700">
                            {r.benefits && r.benefits.length > 0 ? (
                              r.benefits.map((b, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  {isUnlocked ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                  ) : (
                                    <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                                  )}
                                  <span className={isUnlocked ? 'text-slate-800 font-medium' : 'text-slate-500'}>{b}</span>
                                </li>
                              ))
                            ) : (
                              <li className="text-slate-400 italic text-xs">Beneficios estándar de plataforma</li>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer Modal Estándar Gloint */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 font-medium">
            Los niveles se recalculan automáticamente con tus contratos activos.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shadow-xs"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};
