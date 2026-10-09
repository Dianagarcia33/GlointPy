import React, { useState, useEffect } from 'react';
import { 
  Building, 
  Plus, 
  Search, 
  RefreshCw, 
  Phone, 
  Mail, 
  MapPin, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  ShoppingBag,
  DollarSign
} from 'lucide-react';
import { 
  Supplier, 
  supplierService, 
  CreateSupplierPayload, 
  UpdateSupplierPayload 
} from '../../../services/supplierService';
import { SupplierModal } from '../components/SupplierModal';
import { Can } from '../../../components/security/Can';

export const SuppliersPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [activeOnly, setActiveOnly] = useState(false);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const res = await supplierService.getSuppliers({
        search: search.trim() || undefined,
        category: categoryFilter,
        active_only: activeOnly,
        limit: 100,
      });
      setSuppliers(res.items);
      setTotal(res.total);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [categoryFilter, activeOnly]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSuppliers();
  };

  const handleSaveSupplier = async (data: CreateSupplierPayload | UpdateSupplierPayload) => {
    if (selectedSupplier) {
      await supplierService.updateSupplier(selectedSupplier.id, data);
    } else {
      await supplierService.createSupplier(data as CreateSupplierPayload);
    }
    await fetchSuppliers();
  };

  const handleDeleteSupplier = async (supplier: Supplier) => {
    if (!window.confirm(`¿Estás seguro de que deseas desactivar o eliminar al proveedor "${supplier.name}"?`)) {
      return;
    }

    try {
      const res = await supplierService.deleteSupplier(supplier.id);
      alert(res.message);
      await fetchSuppliers();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar el proveedor.');
    }
  };

  const formatCurrency = (val?: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const totalSpentAll = suppliers.reduce((acc, s) => acc + (s.total_spent || 0), 0);
  const totalOrdersAll = suppliers.reduce((acc, s) => acc + (s.total_purchase_orders || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header Principal */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black font-montserrat text-slate-900 tracking-tight flex items-center gap-2.5">
              <span className="p-2 bg-brand-50 text-brand-600 border border-brand-200 rounded-2xl inline-flex shadow-2xs">
                <Building className="w-5 h-5 sm:w-6 sm:h-6" />
              </span>
              Gestión de Proveedores
            </h1>
            <span className="px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold bg-brand-50 text-brand-600 border border-brand-200 rounded-full font-montserrat">
              Directorio Corporativo
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Directorio corporativo, condiciones de facturación, cuentas de pago y órdenes vinculadas.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={fetchSuppliers}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-3 sm:px-3.5 py-2 sm:py-2.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl shadow-xs hover:border-slate-300 transition-all cursor-pointer font-montserrat"
            title="Recargar"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <Can permissions={['suppliers:create', 'suppliers.create']}>
            <button
              type="button"
              onClick={() => {
                setSelectedSupplier(null);
                setIsModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-bold text-white bg-gradient-to-r from-brand-500 to-amber-600 hover:from-brand-600 hover:to-amber-700 rounded-xl sm:rounded-2xl shadow-md shadow-brand-500/20 hover:scale-[1.01] active:scale-95 transition-all cursor-pointer font-montserrat"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Nuevo Proveedor</span>
            </button>
          </Can>
        </div>
      </div>

      {/* Tarjetas KPI de Resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider font-montserrat truncate">Total Proveedores</span>
            <Building className="w-4 h-4 text-brand-500 shrink-0" />
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900 block truncate">
              {total}
            </span>
            <span className="block text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">Registrados en directorio</span>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider font-montserrat truncate">Proveedores Activos</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 block truncate">
              {suppliers.filter((s) => s.is_active).length}
            </span>
            <span className="block text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">Habilitados para compras</span>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider font-montserrat truncate">Órdenes Generadas</span>
            <ShoppingBag className="w-4 h-4 text-violet-500 shrink-0" />
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-bold font-mono text-violet-600 block truncate">
              {totalOrdersAll}
            </span>
            <span className="block text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">Órdenes recibidas/aprobadas</span>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider font-montserrat truncate">Volumen de Compras</span>
            <DollarSign className="w-4 h-4 text-amber-500 shrink-0" />
          </div>
          <div>
            <span className="text-lg sm:text-xl font-bold font-mono text-slate-900 block truncate">
              {formatCurrency(totalSpentAll)}
            </span>
            <span className="block text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">Facturado acumulado</span>
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
            placeholder="Buscar por razón social, NIT, persona de contacto, teléfono o ciudad..."
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
            <option value="PAPELERIA_INSUMOS">Papelería e Insumos</option>
            <option value="MOBILIARIO">Mobiliario</option>
            <option value="SERVICIOS">Servicios</option>
            <option value="CAFETERIA_ASEO">Cafetería y Aseo</option>
            <option value="GENERAL">General</option>
          </select>

          <button
            type="button"
            onClick={() => setActiveOnly(!activeOnly)}
            className={`px-3 sm:px-3.5 py-2 rounded-xl sm:rounded-2xl text-xs font-bold border transition-all cursor-pointer shrink-0 font-montserrat ${
              activeOnly
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {activeOnly ? 'Solo Activos' : 'Todos'}
          </button>
        </div>
      </div>

      {/* Tabla de Proveedores */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 bg-white p-8">
            <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mb-2" />
            <span className="text-xs font-semibold text-slate-400">Cargando directorio de proveedores...</span>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 bg-white p-8 text-center">
            <Building className="w-12 h-12 text-slate-300 stroke-1 mb-2" />
            <h4 className="text-sm font-bold text-slate-700 font-montserrat">No se encontraron proveedores</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              No hay proveedores que coincidan con los filtros o aún no se han registrado en el sistema.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[850px] text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200 select-none font-montserrat">
                <tr>
                  <th className="py-3.5 px-4 sm:px-5">Proveedor / Razón Social</th>
                  <th className="py-3.5 px-4">Categoría</th>
                  <th className="py-3.5 px-4">Contacto</th>
                  <th className="py-3.5 px-4">Términos Pago</th>
                  <th className="py-3.5 px-4">Historial Compras</th>
                  <th className="py-3.5 px-4 text-center">Estado</th>
                  <th className="py-3.5 px-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-inter">
                {suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors group">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-2xl bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center font-bold text-xs font-montserrat shrink-0">
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 group-hover:text-brand-600 transition-colors">
                            {s.name}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            {s.nit_rut && (
                              <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">
                                NIT: {s.nit_rut}
                              </span>
                            )}
                            {s.city && (
                              <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                                <MapPin className="w-3 h-3 text-slate-400" /> {s.city}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10.5px] font-medium font-mono">
                        {s.category}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-0.5">
                        {s.contact_name && (
                          <span className="font-semibold text-slate-800 text-xs">{s.contact_name}</span>
                        )}
                        <div className="flex items-center gap-2 text-[10.5px] text-slate-500">
                          {s.phone && (
                            <a
                              href={`tel:${s.phone}`}
                              className="hover:text-brand-600 flex items-center gap-1 transition-colors"
                            >
                              <Phone className="w-3 h-3 text-slate-400" /> {s.phone}
                            </a>
                          )}
                          {s.email && (
                            <a
                              href={`mailto:${s.email}`}
                              className="hover:text-brand-600 flex items-center gap-1 transition-colors"
                            >
                              <Mail className="w-3 h-3 text-slate-400" /> {s.email}
                            </a>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-medium text-slate-700">
                        {s.payment_terms.replace('_', ' ')}
                      </span>
                      {s.bank_info && (
                        <span
                          className="text-[10px] text-brand-600 block truncate max-w-[150px] mt-0.5 cursor-help"
                          title={s.bank_info}
                        >
                          🏦 {s.bank_info}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="font-mono font-bold text-slate-900">
                          {formatCurrency(s.total_spent)}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {s.total_purchase_orders || 0} órdenes aprobadas
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-montserrat ${
                          s.is_active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {s.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>

                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Can permissions={['suppliers:edit', 'suppliers.edit']}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSupplier(s);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-colors cursor-pointer"
                            title="Editar proveedor"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </Can>

                        <Can permissions={['suppliers:delete', 'suppliers.delete']}>
                          <button
                            type="button"
                            onClick={() => handleDeleteSupplier(s)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                            title="Desactivar o eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </Can>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Proveedor */}
      <SupplierModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveSupplier}
        supplier={selectedSupplier}
      />
    </div>
  );
};
