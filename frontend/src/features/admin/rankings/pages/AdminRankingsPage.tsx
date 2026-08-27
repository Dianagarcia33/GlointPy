import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Plus, 
  Crown, 
  Star, 
  Medal, 
  Gem, 
  Zap, 
  Sparkles, 
  Shield, 
  Edit2, 
  Trash2, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Users, 
  DollarSign, 
  Percent, 
  Sparkle,
  Layers,
  ArrowRight
} from 'lucide-react';
import { InvestmentRank, rankingsService } from '../../../../services/rankings';
import { RankModal } from '../components/RankModal';
import { Can } from '../../../../components/security/Can';

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

export const AdminRankingsPage: React.FC = () => {
  const [ranks, setRanks] = useState<InvestmentRank[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRank, setEditingRank] = useState<InvestmentRank | null>(null);
  const [deletingRank, setDeletingRank] = useState<InvestmentRank | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const fetchRanks = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await rankingsService.getRankings();
      setRanks(data);
    } catch (err: any) {
      console.error('Error fetching ranks:', err);
      setError(err.message || 'Error al cargar los rangos de inversión.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRanks();
  }, []);

  const handleSeedDefaults = async () => {
    try {
      setIsSeeding(true);
      const data = await rankingsService.seedDefaultRanks();
      setRanks(data);
      setToast({ message: 'Rangos por defecto inicializados exitosamente', type: 'success' });
      setTimeout(() => setToast(null), 4000);
    } catch (err: any) {
      setToast({ message: err.message || 'Error al inicializar rangos', type: 'error' });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingRank) return;
    try {
      setIsDeleting(true);
      await rankingsService.deleteRank(deletingRank.id);
      setToast({ message: `Rango "${deletingRank.name}" eliminado`, type: 'success' });
      setTimeout(() => setToast(null), 4000);
      setDeletingRank(null);
      fetchRanks();
    } catch (err: any) {
      setToast({ message: err.message || 'Error al eliminar rango', type: 'error' });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(val || 0);
  };

  const totalInvestorsInClub = ranks.reduce((acc, r) => acc + (r.users_count || 0), 0);
  const maxBonus = ranks.length > 0 ? Math.max(...ranks.map(r => r.bonus_percentage || 0)) : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-[9999] flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl border ${
          toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        } animate-in slide-in-from-bottom-2`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-rose-600" />}
          <span className="text-xs font-bold">{toast.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-amber-50 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
              Club de Beneficios Gloint
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-montserrat tracking-tight flex items-center gap-3">
            <Trophy className="w-8 h-8 text-amber-500" />
            Rankings & Niveles de Inversión
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
            Configura los rangos de capital, porcentajes de bonos adicionales y beneficios exclusivos asignados a los inversionistas según su portafolio activo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10">
          {ranks.length === 0 && (
            <button
              type="button"
              onClick={handleSeedDefaults}
              disabled={isSeeding}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border border-slate-200"
            >
              {isSeeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-500" />}
              <span>Cargar Rangos Base</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setEditingRank(null);
              setIsModalOpen(true);
            }}
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-brand-600/20 hover:shadow-lg flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Rango</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Rangos</span>
            <Layers className="w-4 h-4 text-brand-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-montserrat">
            {ranks.length}
          </p>
          <span className="text-[11px] text-slate-400 font-medium">Niveles configurados</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Inversionistas</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-montserrat">
            {totalInvestorsInClub}
          </p>
          <span className="text-[11px] text-emerald-600 font-bold">Asignados en club</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Bono Máximo</span>
            <Percent className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-600 font-montserrat">
            +{maxBonus}%
          </p>
          <span className="text-[11px] text-slate-400 font-medium">Rendimiento extra top</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Nivel Máximo</span>
            <Crown className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-base sm:text-lg font-black text-purple-700 font-montserrat truncate">
            {ranks[ranks.length - 1]?.name || 'N/A'}
          </p>
          <span className="text-[11px] text-slate-400 font-medium">Categoría cumbre</span>
        </div>
      </div>

      {/* Ranks Cards Grid */}
      {loading ? (
        <div className="py-20 text-center bg-white rounded-3xl border border-slate-200">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600 mx-auto" />
          <p className="mt-3 text-slate-600 font-bold text-sm">Cargando rankings de inversión...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-50 text-rose-700 rounded-3xl border border-rose-200 flex items-center gap-3">
          <AlertCircle className="w-6 h-6 shrink-0" />
          <span className="text-sm font-semibold">{error}</span>
        </div>
      ) : ranks.length === 0 ? (
        <div className="p-12 bg-white rounded-3xl border border-dashed border-slate-200 text-center space-y-4">
          <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-3xl flex items-center justify-center mx-auto shadow-2xs">
            <Trophy className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No hay rangos de inversión configurados</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Comienza creando tu primer rango o inicializa los niveles base recomendados (Bronce, Plata, Oro, Platino, Diamante).
            </p>
          </div>
          <button
            type="button"
            onClick={handleSeedDefaults}
            disabled={isSeeding}
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-brand-600/20 inline-flex items-center gap-2 cursor-pointer"
          >
            {isSeeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>Inicializar Niveles Recomendados</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {ranks.map((r) => {
            const IconComponent = ICON_MAP[r.icon] || Trophy;
            return (
              <div 
                key={r.id} 
                className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group relative"
              >
                {/* Top Accent Strip */}
                <div className="h-2 w-full" style={{ backgroundColor: r.color }} />

                <div className="p-6 space-y-4 flex-1">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0"
                        style={{ backgroundColor: r.color }}
                      >
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono">
                            Nivel #{r.order}
                          </span>
                          {!r.is_active && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                              Inactivo
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-black text-slate-900 font-montserrat mt-0.5">
                          {r.name}
                        </h3>
                      </div>
                    </div>

                    {r.bonus_percentage > 0 && (
                      <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono shadow-2xs">
                        +{r.bonus_percentage}% Bono
                      </span>
                    )}
                  </div>

                  {/* Criteria Box */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Capital Requerido</span>
                    <div className="text-sm font-extrabold text-slate-900 font-montserrat">
                      {formatCurrency(r.min_investment)}
                      {r.max_investment ? ` - ${formatCurrency(r.max_investment)}` : ' en adelante'}
                    </div>
                  </div>

                  {/* Priority Withdrawal Badge */}
                  {r.priority_withdrawal && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs font-bold">
                      <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Fila Prioritaria en Retiros ACH</span>
                    </div>
                  )}

                  {/* Benefits List */}
                  <div className="space-y-2 pt-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Beneficios Desbloqueados ({r.benefits?.length || 0})
                    </span>
                    <ul className="space-y-1.5 text-xs text-slate-700">
                      {r.benefits && r.benefits.length > 0 ? (
                        r.benefits.map((b, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <span className="line-clamp-2 leading-relaxed">{b}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-slate-400 italic text-xs">Sin beneficios personalizados</li>
                      )}
                    </ul>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-500 font-medium">
                    <strong className="text-slate-800 font-bold">{r.users_count || 0}</strong> {r.users_count === 1 ? 'usuario asignado' : 'usuarios asignados'}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingRank(r);
                        setIsModalOpen(true);
                      }}
                      className="p-2 text-slate-600 hover:text-brand-600 hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-200 cursor-pointer shadow-2xs"
                      title="Editar Rango"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingRank(r)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-white rounded-xl transition-all border border-transparent hover:border-rose-200 cursor-pointer shadow-2xs"
                      title="Eliminar Rango"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingRank && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" style={{ margin: 0 }}>
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in duration-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-2xl">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Eliminar Rango</h3>
                <p className="text-xs text-slate-500">¿Estás seguro de eliminar el rango <strong className="text-slate-800">"{deletingRank.name}"</strong>?</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 leading-relaxed">
              Los usuarios que actualmente tengan asignado este rango quedarán con cálculo automático según su capital activo.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingRank(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-rose-600/20 flex items-center gap-2 cursor-pointer"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar Eliminación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rank Modal */}
      <RankModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingRank(null);
        }}
        onSaved={fetchRanks}
        rank={editingRank}
      />
    </div>
  );
};
