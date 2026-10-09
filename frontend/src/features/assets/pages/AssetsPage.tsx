import React, { useState, useEffect } from 'react';
import { 
  Laptop, 
  Plus, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  UserCheck, 
  CornerDownLeft, 
  History, 
  Edit3, 
  Trash2, 
  MapPin, 
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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 font-montserrat">
            <CheckCircle2 className="w-3 h-3" /> Disponible
          </span>
        );
      case 'ASSIGNED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 font-montserrat">
            <UserCheck className="w-3 h-3" /> Asignado
          </span>
        );
      case 'IN_MAINTENANCE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 font-montserrat">
            <Wrench className="w-3 h-3" /> Mantenimiento
          </span>
        );
      case 'DAMAGED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 font-montserrat">
            <AlertTriangle className="w-3 h-3" /> Dañado
          </span>
        );
      case 'DECOMMISSIONED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 font-montserrat">
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
        return <span className="text-emerald-700 font-semibold text-[11px]">Excelente</span>;
      case 'GOOD':
        return <span className="text-blue-700 font-semibold text-[11px]">Bueno</span>;
      case 'FAIR':
        return <span className="text-amber-700 font-semibold text-[11px]">Aceptable</span>;
      case 'POOR':
        return <span className="text-red-700 font-semibold text-[11px]">Malo</span>;
      default:
        return <span>{condition}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header con Título y Acciones */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black font-montserrat text-slate-900 tracking-tight flex items-center gap-2.5">
              <span className="p-2 bg-brand-50 text-brand-600 border border-brand-200 rounded-2xl inline-flex shadow-2xs">
                <Laptop className="w-5 h-5 sm:w-6 sm:h-6" />
              </span>
              Control de Activos Fijos
            </h1>
            <span className="px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold bg-brand-50 text-brand-600 border border-brand-200 rounded-full font-montserrat">
              Custodia y Equipos
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Placas de inventario, equipos de cómputo, mobiliario y trazabilidad de custodia asignada a colaboradores.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={fetchAssets}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-3 sm:px-3.5 py-2 sm:py-2.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl shadow-xs hover:border-slate-300 transition-all cursor-pointer font-montserrat"
            title="Recargar"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <Can permissions={['assets:create', 'assets.create']}>
            <button
              type="button"
              onClick={() => {
                setSelectedAsset(null);
                setIsModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-bold text-white bg-gradient-to-r from-brand-500 to-amber-600 hover:from-brand-600 hover:to-amber-700 rounded-xl sm:rounded-2xl shadow-md shadow-brand-500/20 hover:scale-[1.01] active:scale-95 transition-all cursor-pointer font-montserrat"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Dar de Alta Activo</span>
            </button>
          </Can>
        </div>
      </div>

      {/* Tarjetas KPI de Resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider font-montserrat truncate">Total Activos</span>
            <Tag className="w-4 h-4 text-brand-500 shrink-0" />
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900 block truncate">
              {stats?.total_assets || 0}
            </span>
            <span className="block text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">Inventariados en plataforma</span>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider font-montserrat truncate">En Custodia</span>
            <UserCheck className="w-4 h-4 text-blue-500 shrink-0" />
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-bold font-mono text-blue-600 block truncate">
              {stats?.assigned_assets || 0}
            </span>
            <span className="block text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">En posesión de colaboradores</span>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider font-montserrat truncate">Disponibles Bodega</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 block truncate">
              {stats?.available_assets || 0}
            </span>
            <span className="block text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">Listos para asignar</span>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider font-montserrat truncate">Valorización Activos</span>
            <DollarSign className="w-4 h-4 text-amber-500 shrink-0" />
          </div>
          <div>
            <span className="text-lg sm:text-xl font-bold font-mono text-slate-900 block truncate">
              {formatCurrency(stats?.total_asset_value)}
            </span>
            <span className="block text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">Valor contable activo</span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por placa (ej. TEC-0001), nombre, serial, marca o ubicación..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
          />
        </form>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 cursor-pointer"
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
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 cursor-pointer"
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

      {/* Tabla de Activos */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 bg-white p-8">
            <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mb-2" />
            <span className="text-xs font-semibold text-slate-400">Cargando inventario de activos fijos...</span>
          </div>
        ) : assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 bg-white p-8 text-center">
            <Laptop className="w-12 h-12 text-slate-300 stroke-1 mb-2" />
            <h4 className="text-sm font-bold text-slate-700 font-montserrat">No se encontraron activos fijos</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Registra los equipos, computadores y mobiliario corporativo para controlar su entrega y ubicación.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[850px] text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200 select-none font-montserrat">
                <tr>
                  <th className="py-3.5 px-4 sm:px-5">Placa / Código</th>
                  <th className="py-3.5 px-4">Activo / Especificaciones</th>
                  <th className="py-3.5 px-4">Custodio Actual</th>
                  <th className="py-3.5 px-4">Ubicación</th>
                  <th className="py-3.5 px-4">Condición</th>
                  <th className="py-3.5 px-4 text-center">Estado</th>
                  <th className="py-3.5 px-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-inter">
                {assets.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/70 transition-colors group">
                    <td className="py-3.5 px-5">
                      <div className="flex flex-col">
                        <span className="font-mono font-bold text-slate-900 text-xs">
                          {a.asset_code}
                        </span>
                        <span className="text-[10px] text-slate-400 font-montserrat uppercase font-semibold">{a.category}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 text-xs">{a.name}</span>
                        {(a.brand || a.model) && (
                          <span className="text-[11px] text-slate-500">
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

                    <td className="py-3.5 px-4">
                      {a.current_holder_name ? (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center font-bold text-[11px] font-montserrat">
                            {a.current_holder_name.charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-800 text-xs">
                              {a.current_holder_name}
                            </span>
                            <span className="text-[10.5px] text-slate-400 truncate max-w-[140px]">
                              {a.current_holder_email}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">En bodega (Sin asignar)</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {a.location ? (
                        <span className="text-slate-600 flex items-center gap-1 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" /> {a.location}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {getConditionBadge(a.current_condition)}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {getStatusBadge(a.status)}
                    </td>

                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Historial de Custodia */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAsset(a);
                            setIsHistoryOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-colors cursor-pointer"
                          title="Ver bitácora de asignaciones"
                        >
                          <History className="w-4 h-4" />
                        </button>

                        {/* Botón Asignar Custodia */}
                        {a.status !== 'DECOMMISSIONED' && (
                          <Can permissions={['assets:assign', 'assets.assign']}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAsset(a);
                                setIsAssignOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
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
                              type="button"
                              onClick={() => {
                                setSelectedAsset(a);
                                setIsReturnOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-colors cursor-pointer"
                              title="Registrar devolución a bodega"
                            >
                              <CornerDownLeft className="w-4 h-4" />
                            </button>
                          </Can>
                        )}

                        {/* Botón Editar */}
                        <Can permissions={['assets:edit', 'assets.edit']}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAsset(a);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-colors cursor-pointer"
                            title="Editar ficha del activo"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </Can>

                        {/* Botón Baja */}
                        {a.status !== 'DECOMMISSIONED' && (
                          <Can permissions={['assets:delete', 'assets.delete']}>
                            <button
                              type="button"
                              onClick={() => handleDeleteAsset(a)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
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
