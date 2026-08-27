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
  Sparkle
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
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(val || 0);
  };

  const currentRankOrder = details?.current_rank?.order || 1;
  const CurrentIcon = details?.current_rank?.icon ? (ICON_MAP[details.current_rank.icon] || Trophy) : Trophy;

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[9999] flex items-center justify-center p-3 sm:p-4" style={{ margin: 0 }}>
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col border border-slate-200 animate-in fade-in duration-200">
        
        {/* Header Hero */}
        <div className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-brand-950 p-6 sm:p-8 text-white overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Club de Inversionistas Gloint
                </span>
              </div>
              <h2 className="text-xl sm:text-3xl font-black font-montserrat tracking-tight text-white">
                Escalafón de Niveles & Beneficios
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
                Aumenta tu capital invertido para desbloquear bonos mensuales adicionales, prioridad en retiros ACH y atención VIP personalizada.
              </p>
            </div>

            <button 
              onClick={onClose}
              className="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-2xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Current Status Card */}
          {details && details.current_rank && (
            <div className="mt-6 p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div 
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0"
                  style={{ backgroundColor: details.current_rank.color }}
                >
                  <CurrentIcon className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Tu Nivel Actual</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <h3 className="text-xl font-black font-montserrat text-white">
                      {details.current_rank.name}
                    </h3>
                    {details.current_rank.bonus_percentage > 0 && (
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 font-mono">
                        +{details.current_rank.bonus_percentage}% Bono
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-300 font-medium">
                    Capital activo: <strong className="text-white font-mono">{formatCurrency(details.total_active_capital)}</strong> ({details.active_contracts_count} contratos)
                  </span>
                </div>
              </div>

              {details.next_rank ? (
                <div className="sm:text-right space-y-1.5">
                  <span className="text-[11px] text-slate-400 block font-medium">
                    Siguiente Nivel: <strong className="text-amber-400 font-bold">{details.next_rank.name}</strong>
                  </span>
                  <div className="w-full sm:w-48 bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${details.progress_percentage}%`,
                        backgroundColor: details.next_rank.color || '#EAB308'
                      }}
                    />
                  </div>
                  <span className="text-[11px] text-slate-300 block font-mono">
                    Faltan <strong className="text-white font-bold">{formatCurrency(details.amount_needed)}</strong> ({details.progress_percentage}%)
                  </span>
                </div>
              ) : (
                <div className="sm:text-right">
                  <span className="text-xs font-bold text-amber-400 bg-amber-400/10 px-3 py-1.5 rounded-xl border border-amber-400/20 inline-flex items-center gap-1.5">
                    <Crown className="w-4 h-4" /> ¡Has alcanzado el Nivel Máximo!
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Content Roadmap */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
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
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Escalafón Completo de Niveles
                </h4>
                <span className="text-xs text-slate-500 font-medium">
                  {details.all_ranks.length} categorías disponibles
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {details.all_ranks.map((r) => {
                  const RankIcon = ICON_MAP[r.icon] || Trophy;
                  const isCurrent = details.current_rank?.id === r.id;
                  const isUnlocked = r.order <= currentRankOrder;

                  return (
                    <div 
                      key={r.id}
                      className={`p-5 rounded-3xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                        isCurrent 
                          ? 'border-brand-500 ring-2 ring-brand-500/20 bg-gradient-to-br from-brand-50/40 via-white to-amber-50/30 shadow-md' 
                          : isUnlocked
                            ? 'border-emerald-200 bg-emerald-50/20 shadow-2xs'
                            : 'border-slate-200 bg-white/70 opacity-90'
                      }`}
                    >
                      <div className="space-y-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0"
                              style={{ backgroundColor: r.color }}
                            >
                              <RankIcon className="w-6 h-6" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono font-bold uppercase text-slate-400">
                                  Nivel #{r.order}
                                </span>
                                {isCurrent && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-brand-600 text-white shadow-2xs">
                                    Tu Rango Actual
                                  </span>
                                )}
                              </div>
                              <h4 className="text-base font-black text-slate-900 font-montserrat mt-0.5">
                                {r.name}
                              </h4>
                            </div>
                          </div>

                          {r.bonus_percentage > 0 && (
                            <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono shadow-2xs">
                              +{r.bonus_percentage}% Bono
                            </span>
                          )}
                        </div>

                        {/* Threshold */}
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-medium">Requisito de Capital:</span>
                          <span className="font-extrabold text-slate-900 font-mono">
                            {formatCurrency(r.min_investment)} {r.max_investment ? `a ${formatCurrency(r.max_investment)}` : '+'}
                          </span>
                        </div>

                        {/* Priority Badge */}
                        {r.priority_withdrawal && (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200/80">
                            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>Fila Prioritaria en Retiros ACH</span>
                          </div>
                        )}

                        {/* Benefits list */}
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                            Beneficios Incluidos:
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
                                  <span className={isUnlocked ? 'text-slate-800' : 'text-slate-500'}>{b}</span>
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

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">
            Los rangos se actualizan automáticamente según tu capital activo en contratos vigentes.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shadow-md"
          >
            Entendido
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};
