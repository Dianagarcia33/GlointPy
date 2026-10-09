import React, { useState, useEffect } from 'react';
import { 
  Laptop, 
  Plus, 
  Search, 
  RefreshCw, 
  Filter, 
  CheckCircle2, 
  Clock, 
  UserCheck, 
  CornerDownLeft, 
  History, 
  Edit3, 
  Trash2, 
  MapPin, 
  ShieldCheck, 
  Wrench, 
  AlertTriangle,
  DollarSign,
  Tag
} from 'lucide-react';
import { 
  CompanyAsset, 
  companyAssetService, 
  AssetStats, 
  CreateAssetPayload, 
  UpdateAssetPayload,
  AssignAssetPayload,
  ReturnAssetPayload
} from '../../../services/companyAssetService';
import { AssetModal } from '../components/AssetModal';
import { AssetAssignmentModal } from '../components/AssetAssignmentModal';
import { AssetReturnModal } from '../components/AssetReturnModal';
import { AssetHistoryModal } from '../components/AssetHistoryModal';
import { CorporateResourceNav } from '../../inventory/components/CorporateResourceNav';
import { Can } from '../../../components/security/Can';

export const AssetsPage: React.FC = () => {
  const [assets, setAssets] = useState<CompanyAsset[]>([]);
  const [stats, setStats] = useState<AssetStats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isReturnOpen, setIsReturnOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<CompanyAsset | null>(null);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const [assetsRes, statsRes] = await Promise.all([
        companyAssetService.getAssets({
          search: search.trim() || undefined,
          category: categoryFilter,
          status: statusFilter,
          limit: 100,
        }),
        companyAssetService.getStats(),
      ]);

      setAssets(assetsRes.items);
      setTotal(assetsRes.total);
      setStats(statsRes);
    } catch (err) {
      console.error('Error fetching assets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [categoryFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAssets();
  };

  const handleSaveAsset = async (data: CreateAssetPayload | UpdateAssetPayload) => {
    if (selectedAsset) {
      await companyAssetService.updateAsset(selectedAsset.id, data);
    } else {
      await companyAssetService.createAsset(data as CreateAssetPayload);
    }
    await fetchAssets();
  };

  const handleAssignConfirm = async (data: AssignAssetPayload) => {
    if (!selectedAsset) return;
    await companyAssetService.assignAsset(selectedAsset.id, data);
    await fetchAssets();
  };

  const handleReturnConfirm = async (data: ReturnAssetPayload) => {
    if (!selectedAsset) return;
    await companyAssetService.returnAsset(selectedAsset.id, data);
    await fetchAssets();
  };

  const handleDeleteAsset = async (asset: CompanyAsset) => {
    if (!window.confirm(`¿Estás seguro de dar de baja el activo "${asset.asset_code} - ${asset.name}"? Quedará marcado como Desincorporado.`)) {
      return;
    }

    try {
      const res = await companyAssetService.deleteAsset(asset.id);
      alert(res.message);
      await fetchAssets();
    } catch (err: any) {
      alert(err.message || 'Error al desincorporar el activo.');
    }
  };

  const formatCurrency = (val?: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            <CheckCircle2 className="w-3 h-3" /> Disponible
          </span>
        );
      case 'ASSIGNED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
            <UserCheck className="w-3 h-3" /> Asignado
          </span>
        );
      case 'IN_MAINTENANCE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
            <Wrench className="w-3 h-3" /> Mantenimiento
          </span>
        );
      case 'DAMAGED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
            <AlertTriangle className="w-3 h-3" /> Dañado
          </span>
        );
      case 'DECOMMISSIONED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            Dado de Baja
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  const getConditionBadge = (condition: string) => {
    switch (condition) {
      case 'EXCELLENT':
        return <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[10.5px]">Excelente</span>;
      case 'GOOD':
        return <span className="text-blue-600 dark:text-blue-400 font-semibold text-[10.5px]">Bueno</span>;
      case 'FAIR':
        return <span className="text-amber-600 dark:text-amber-400 font-semibold text-[10.5px]">Aceptable</span>;
      case 'POOR':
        return <span className="text-rose-600 dark:text-rose-400 font-semibold text-[10.5px]">Malo</span>;
      default:
        return <span>{condition}</span>;
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 🧭 Navegación cruzada de recursos corporativos */}
      <CorporateResourceNav activeTab="assets" />

      {/* Header Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white font-montserrat tracking-tight flex items-center gap-2.5">
            <Laptop className="w-7 h-7 text-brand-500" />
            Control de Activos Fijos
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Placas de inventario, equipos de cómputo, mobiliario y trazabilidad de custodia asignada a colaboradores.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchAssets}
            disabled={loading}
            className="p-2.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs"
            title="Recargar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <Can permissions={['assets:create', 'assets.create']}>
            <button
              onClick={() => {
                setSelectedAsset(null);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-xl shadow-xs shadow-brand-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Dar de Alta Activo
            </button>
          </Can>
        </div>
      </div>

      {/* KPIs Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Activos Fijos</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center">
              <Laptop className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2 font-montserrat">{stats?.total_assets || 0}</p>
          <span className="text-[10px] text-slate-400 mt-1 block">Inventariados en plataforma</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">En Custodia / Asignados</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-2 font-montserrat">
            {stats?.assigned_assets || 0}
          </p>
          <span className="text-[10px] text-indigo-500 mt-1 block">En posesión de colaboradores</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Disponibles en Bodega</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2 font-montserrat">
            {stats?.available_assets || 0}
          </p>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 block">Listos para asignar</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Valorización de Activos</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-2 font-montserrat truncate">
            {formatCurrency(stats?.total_asset_value)}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">Valor contable activo</span>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por placa (ej. TEC-0001), nombre, serial, marca o ubicación..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-hidden dark:text-white"
            />
          </form>

          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Todas las Categorías</option>
              <option value="TECNOLOGIA">Tecnología y Cómputo</option>
              <option value="MOBILIARIO">Mobiliario y Enseres</option>
              <option value="EQUIPOS_OFICINA">Equipos de Oficina</option>
              <option value="VEHICULOS">Vehículos</option>
              <option value="HERRAMIENTAS">Herramientas</option>
              <option value="OTROS">Otros</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="AVAILABLE">Disponible en Bodega</option>
              <option value="ASSIGNED">Asignado a Colaborador</option>
              <option value="IN_MAINTENANCE">En Mantenimiento</option>
              <option value="DAMAGED">Dañado</option>
              <option value="DECOMMISSIONED">Dado de Baja</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de Activos */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-brand-500" />
            <span className="text-xs">Cargando inventario de activos fijos...</span>
          </div>
        ) : assets.length === 0 ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
            <Laptop className="w-10 h-10 text-slate-300 dark:text-slate-700" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              No se encontraron activos fijos
            </p>
            <p className="text-xs text-slate-400 max-w-sm">
              Registra los equipos, computadores y mobiliario corporativo para controlar su entrega y ubicación.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Placa / Código</th>
                  <th className="px-4 py-3.5">Activo / Especificaciones</th>
                  <th className="px-4 py-3.5">Custodio Actual</th>
                  <th className="px-4 py-3.5">Ubicación</th>
                  <th className="px-4 py-3.5">Condición</th>
                  <th className="px-4 py-3.5 text-center">Estado</th>
                  <th className="px-5 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {assets.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex flex-col">
                        <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">
                          {a.asset_code}
                        </span>
                        <span className="text-[10px] text-slate-400">{a.category}</span>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900 dark:text-white">{a.name}</span>
                        {(a.brand || a.model) && (
                          <span className="text-[10.5px] text-slate-400">
                            {a.brand} {a.model} {a.serial_number ? `• S/N: ${a.serial_number}` : ''}
                          </span>
                        )}
                        {a.purchase_cost > 0 && (
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Costo: {formatCurrency(a.purchase_cost)}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      {a.current_holder_name ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-brand-500/10 text-brand-500 flex items-center justify-center font-bold text-[10px]">
                            {a.current_holder_name.charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {a.current_holder_name}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate max-w-[130px]">
                              {a.current_holder_email}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">En bodega (Sin asignar)</span>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      {a.location ? (
                        <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" /> {a.location}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      {getConditionBadge(a.current_condition)}
                    </td>

                    <td className="px-4 py-4 text-center">
                      {getStatusBadge(a.status)}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Historial de Custodia */}
                        <button
                          onClick={() => {
                            setSelectedAsset(a);
                            setIsHistoryOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-950/30 rounded-lg transition-colors cursor-pointer"
                          title="Ver bitácora de asignaciones"
                        >
                          <History className="w-4 h-4" />
                        </button>

                        {/* Botón Asignar Custodia */}
                        {a.status !== 'DECOMMISSIONED' && (
                          <Can permissions={['assets:assign', 'assets.assign']}>
                            <button
                              onClick={() => {
                                setSelectedAsset(a);
                                setIsAssignOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors cursor-pointer"
                              title={a.current_holder_id ? 'Reasignar a otro usuario' : 'Asignar custodia a colaborador'}
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                          </Can>
                        )}

                        {/* Botón Devolución */}
                        {a.current_holder_id && (
                          <Can permissions={['assets:assign', 'assets.assign']}>
                            <button
                              onClick={() => {
                                setSelectedAsset(a);
                                setIsReturnOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-lg transition-colors cursor-pointer"
                              title="Registrar devolución a bodega"
                            >
                              <CornerDownLeft className="w-4 h-4" />
                            </button>
                          </Can>
                        )}

                        {/* Botón Editar */}
                        <Can permissions={['assets:edit', 'assets.edit']}>
                          <button
                            onClick={() => {
                              setSelectedAsset(a);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-950/30 rounded-lg transition-colors cursor-pointer"
                            title="Editar ficha del activo"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </Can>

                        {/* Botón Baja */}
                        {a.status !== 'DECOMMISSIONED' && (
                          <Can permissions={['assets:delete', 'assets.delete']}>
                            <button
                              onClick={() => handleDeleteAsset(a)}
                              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                              title="Dar de baja activo"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </Can>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modales */}
      <AssetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveAsset}
        asset={selectedAsset}
      />

      <AssetAssignmentModal
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        asset={selectedAsset}
        onAssign={handleAssignConfirm}
      />

      <AssetReturnModal
        isOpen={isReturnOpen}
        onClose={() => setIsReturnOpen(false)}
        asset={selectedAsset}
        onReturn={handleReturnConfirm}
      />

      <AssetHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        asset={selectedAsset}
      />
    </div>
  );
};
