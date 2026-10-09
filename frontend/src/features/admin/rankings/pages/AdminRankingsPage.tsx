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
  CheckCircle, 
  X,
  Users, 
  Percent, 
  Layers,
  RefreshCw,
  CheckCircle2
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRank, setEditingRank] = useState<InvestmentRank | null>(null);

  const [deletingRank, setDeletingRank] = useState<InvestmentRank | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const data = await rankingsService.getRankings();
      const sorted = Array.isArray(data) 
        ? [...data].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || (Number(a.min_investment) || 0) - (Number(b.min_investment) || 0)) 
        : [];
      setRanks(sorted);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los rangos de inversión');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = () => {
    setEditingRank(null);
    setIsModalOpen(true);
  };

  const handleEdit = (rank: InvestmentRank) => {
    setEditingRank(rank);
    setIsModalOpen(true);
  };

  const handleSyncAll = async () => {
    try {
      setIsSyncing(true);
      setError(null);
      const res = await rankingsService.syncAllRanks();
      setSuccess(res.message || 'Rangos sincronizados y asignados automáticamente a los usuarios.');
      setTimeout(() => setSuccess(null), 5000);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Error al sincronizar rangos');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSeedDefaults = async () => {
    try {
      setIsSeeding(true);
      setError(null);
      await rankingsService.seedDefaultRanks();
      setSuccess('Rangos base recomendados inicializados correctamente.');
      setTimeout(() => setSuccess(null), 5000);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Error al inicializar rangos');
    } finally {
      setIsSeeding(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingRank) return;
    try {
      setIsDeleting(true);
      setError(null);
      await rankingsService.deleteRank(deletingRank.id);
      setSuccess(`Rango "${deletingRank.name}" eliminado correctamente.`);
      setTimeout(() => setSuccess(null), 5000);
      setDeletingRank(null);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar el rango');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingRank(null);
  };

  const handleSaved = () => {
    setSuccess(editingRank ? 'Rango actualizado con éxito.' : 'Nuevo rango creado con éxito.');
    setTimeout(() => setSuccess(null), 5000);
    fetchData();
  };

  const formatCurrency = (val: number) => {
    return `$${Number(val || 0).toLocaleString('es-CO')} COP`;
  };

  const totalInvestorsInClub = ranks.reduce((acc, r) => acc + (r.users_count || 0), 0);
  const maxBonus = ranks.length > 0 ? Math.max(...ranks.map(r => r.bonus_percentage || 0)) : 0;
  const activeRanks = ranks.filter(r => r.is_active);
  const summitRank = (activeRanks.length > 0 ? activeRanks : ranks).reduce<InvestmentRank | null>((max, r) => {
    if (!max) return r;
    const rMin = Number(r.min_investment) || 0;
    const maxMin = Number(max.min_investment) || 0;
    if (rMin > maxMin) return r;
    if (rMin === maxMin && (Number(r.order) || 0) > (Number(max.order) || 0)) return r;
    return max;
  }, null);

  if (isLoading) {
    return (
      <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 animate-pulse">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-slate-200 rounded-2xl"></div>
            <div className="h-4 w-96 bg-slate-100 rounded-xl"></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 bg-slate-200 rounded-2xl"></div>
            <div className="h-9 w-36 bg-slate-200 rounded-2xl"></div>
            <div className="h-9 w-32 bg-slate-200 rounded-2xl"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200/90 p-5 h-28 space-y-3 shadow-xs">
              <div className="flex justify-between">
                <div className="h-3 w-20 bg-slate-200 rounded"></div>
                <div className="h-6 w-6 bg-slate-100 rounded-lg"></div>
              </div>
              <div className="h-7 w-24 bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 h-96 space-y-4 shadow-xs">
          <div className="h-5 w-40 bg-slate-200 rounded"></div>
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-12 bg-slate-100 rounded-xl w-full"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-7xl mx-auto p-6 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-4 text-red-700 shadow-xs">
        <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-bold font-montserrat text-base">Error al cargar datos</h3>
          <p className="text-sm mt-1">{error}</p>
          <button onClick={fetchData} className="mt-3 px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 transition-all cursor-pointer">Reintentar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in duration-300">
      
      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-emerald-800 shadow-xs font-medium text-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="p-1 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer">
            <X className="w-4 h-4 text-emerald-700" />
          </button>
        </div>
      )}

      {/* Header Ejecutivo Principal (Estándar Soporte en Tickets) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-montserrat flex items-center gap-2.5">
            <span className="p-2 bg-brand-50 text-brand-600 border border-brand-200 rounded-2xl inline-flex shadow-xs shrink-0">
              <Trophy className="w-6 h-6" />
            </span>
            <span className="whitespace-nowrap sm:whitespace-normal">Gestión de Rankings & Niveles</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Administra niveles de inversionistas, porcentajes de bonos adicionales y beneficios exclusivos asignados automáticamente por capital activo.
          </p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
          <button 
            type="button"
            onClick={fetchData}
            title="Actualizar datos"
            className="p-2 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-2xl transition-all shadow-xs cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-brand-600' : ''}`} />
          </button>

          <button 
            type="button"
            onClick={handleSyncAll}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-50/80 border border-amber-200/90 hover:bg-amber-100/70 text-amber-800 rounded-2xl transition-all text-xs font-semibold shadow-xs cursor-pointer font-montserrat shrink-0 disabled:opacity-50"
            title="Sincroniza y asigna el rango correspondiente a todos los usuarios según su capital activo"
          >
            {isSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600 shrink-0" /> : <RefreshCw className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
            <span>Sincronizar Rangos</span>
          </button>

          {ranks.length === 0 && (
            <button 
              type="button"
              onClick={handleSeedDefaults}
              disabled={isSeeding}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50/80 border border-emerald-200/90 hover:bg-emerald-100/70 text-emerald-800 rounded-2xl transition-all text-xs font-semibold shadow-xs cursor-pointer font-montserrat shrink-0 disabled:opacity-50"
            >
              {isSeeding ? <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600 shrink-0" /> : <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
              <span>Cargar Rangos Base</span>
            </button>
          )}

          <button 
            type="button"
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-600 to-amber-600 hover:from-brand-700 hover:to-amber-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-brand-500/20 font-montserrat transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Crear Rango</span>
          </button>
        </div>
      </div>

      {/* Tarjetas KPI de Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Rangos */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block font-montserrat">
              Total Rangos
            </span>
            <div className="p-2 bg-brand-50 text-brand-600 rounded-xl shrink-0">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-black text-slate-900 block tracking-tight font-mono">
            {ranks.length}
          </span>
          <span className="text-[11px] text-slate-500 font-medium block truncate">
            {activeRanks.length} rangos activos
          </span>
        </div>

        {/* Inversionistas Asignados */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block font-montserrat">
              Inversionistas Asignados
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-black text-slate-900 block tracking-tight font-mono">
            {totalInvestorsInClub}
          </span>
          <span className="text-[11px] text-slate-500 font-medium block truncate">
            Usuarios clasificados en club
          </span>
        </div>

        {/* Bono Máximo */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block font-montserrat">
              Bono Máximo
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl shrink-0">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-black text-slate-900 block tracking-tight font-mono">
            +{maxBonus}%
          </span>
          <span className="text-[11px] text-amber-600 font-medium block truncate">
            Rendimiento extra top
          </span>
        </div>

        {/* Nivel Cumbre */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block font-montserrat">
              Nivel Cumbre
            </span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl shrink-0">
              <Crown className="w-4 h-4" />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-black text-purple-700 block tracking-tight font-montserrat truncate">
            {summitRank?.name || 'N/A'}
          </span>
          <span className="text-[11px] text-slate-500 font-medium block truncate">
            {summitRank?.min_investment ? `Desde ${formatCurrency(summitRank.min_investment)}` : 'Categoría máxima'}
          </span>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-slate-400 font-bold border-b border-slate-200/80 uppercase text-[10px] tracking-wider font-montserrat">
              <tr>
                <th className="px-6 py-4">Nivel & Rango</th>
                <th className="px-6 py-4">Capital Requerido</th>
                <th className="px-6 py-4">Bono Rendimiento</th>
                <th className="px-6 py-4">Prioridad Retiros</th>
                <th className="px-6 py-4">Inversionistas</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {ranks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Trophy className="w-8 h-8 text-slate-300" />
                      <p className="font-semibold text-slate-700">No hay rangos de inversión configurados.</p>
                      <button onClick={handleCreate} className="text-brand-600 font-bold hover:underline text-xs mt-1 cursor-pointer">
                        + Crea tu primer rango
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                ranks.map((r) => {
                  const IconComponent = ICON_MAP[r.icon] || Trophy;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Nivel & Rango */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-xs shrink-0"
                            style={{ backgroundColor: r.color || '#EAB308' }}
                          >
                            <IconComponent className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-mono font-bold uppercase text-slate-500 bg-slate-100 border border-slate-200/60 px-1.5 py-0.5 rounded">
                                #{r.order}
                              </span>
                              <span className="font-extrabold text-slate-900 text-base font-montserrat">
                                {r.name}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 block mt-0.5 line-clamp-1">
                              {r.benefits?.[0] || 'Beneficios configurados'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Capital Requerido */}
                      <td className="px-6 py-4">
                        <div className="font-extrabold text-slate-900 text-sm font-montserrat">
                          {formatCurrency(r.min_investment)}
                        </div>
                        <span className="text-xs text-slate-400">
                          {r.max_investment ? `Hasta ${formatCurrency(r.max_investment)}` : 'En adelante'}
                        </span>
                      </td>

                      {/* Bono Rendimiento */}
                      <td className="px-6 py-4">
                        {r.bonus_percentage > 0 ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                            +{r.bonus_percentage}% Bono
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">Estándar (0%)</span>
                        )}
                      </td>

                      {/* Prioridad Retiros */}
                      <td className="px-6 py-4">
                        {r.priority_withdrawal ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                            <span>Prioridad ACH</span>
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">Estándar</span>
                        )}
                      </td>

                      {/* Inversionistas Asignados */}
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 text-slate-800 font-mono">
                          <Users className="w-3.5 h-3.5 text-slate-500" />
                          <span>{r.users_count || 0}</span>
                        </span>
                      </td>

                      {/* Estado */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${
                          r.is_active 
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${r.is_active ? 'bg-emerald-600' : 'bg-slate-400'}`}></span>
                          {r.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => handleEdit(r)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:text-brand-800 hover:bg-brand-100/70 bg-brand-50/70 rounded-xl transition-all border border-brand-200/80 shadow-2xs cursor-pointer font-montserrat"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>
                          <button 
                            onClick={() => setDeletingRank(r)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:text-rose-800 hover:bg-rose-100/70 bg-rose-50/70 rounded-xl transition-all border border-rose-200/80 shadow-2xs cursor-pointer font-montserrat"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Eliminar</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Confirmación Eliminar */}
      {deletingRank && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200" style={{ margin: 0 }}>
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-100 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold font-montserrat text-slate-900">Eliminar Rango</h3>
            </div>
            <p className="text-slate-600 text-sm">
              ¿Estás seguro de que deseas eliminar el rango <strong className="text-slate-800">"{deletingRank.name}"</strong>? Los usuarios asignados pasarán a su nivel inmediato correspondiente.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={() => setDeletingRank(null)}
                disabled={isDeleting}
                className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-rose-600/20 flex items-center gap-2 cursor-pointer"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar Eliminación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear / Editar */}
      <RankModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSaved={handleSaved}
        rank={editingRank}
        allRanks={ranks}
      />
    </div>
  );
};
