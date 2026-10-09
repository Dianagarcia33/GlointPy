import React, { useState, useEffect } from 'react';
import { 
  Building, 
  Plus, 
  Search, 
  Filter, 
  RefreshCw, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard, 
  FileText, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
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
import { CorporateResourceNav } from '../../inventory/components/CorporateResourceNav';
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
    if (!window.confirm(`¿Estás seguro de que deseas desactivar/eliminar al proveedor "${supplier.name}"?`)) {
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
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 🧭 Navegación cruzada de recursos corporativos */}
      <CorporateResourceNav activeTab="suppliers" />

      {/* Header Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white font-montserrat tracking-tight flex items-center gap-2.5">
            <Building className="w-7 h-7 text-brand-500" />
            Gestión de Proveedores
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Directorio corporativo, condiciones de facturación, cuentas de pago y órdenes vinculadas.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchSuppliers}
            disabled={loading}
            className="p-2.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs"
            title="Recargar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <Can permissions={['suppliers:create', 'suppliers.create']}>
            <button
              onClick={() => {
                setSelectedSupplier(null);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-xl shadow-xs shadow-brand-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Nuevo Proveedor
            </button>
          </Can>
        </div>
      </div>

      {/* KPIs Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Proveedores</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2 font-montserrat">{total}</p>
          <span className="text-[10px] text-slate-400 mt-1 block">Registrados en directorio</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Proveedores Activos</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2 font-montserrat">
            {suppliers.filter((s) => s.is_active).length}
          </p>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 block">Habilitados para compras</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Órdenes Generadas</span>
            <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-500 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2 font-montserrat">{totalOrdersAll}</p>
          <span className="text-[10px] text-slate-400 mt-1 block">Órdenes recibidas/aprobadas</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Volumen Compras</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-2 font-montserrat truncate">
            {formatCurrency(totalSpentAll)}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">Facturado acumulado</span>
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
              placeholder="Buscar por razón social, NIT, persona de contacto, teléfono o ciudad..."
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
              <option value="PAPELERIA_INSUMOS">Papelería e Insumos</option>
              <option value="MOBILIARIO">Mobiliario</option>
              <option value="SERVICIOS">Servicios</option>
              <option value="CAFETERIA_ASEO">Cafetería y Aseo</option>
              <option value="GENERAL">General</option>
            </select>

            <button
              onClick={() => setActiveOnly(!activeOnly)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer shrink-0 ${
                activeOnly
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border-emerald-200 dark:border-emerald-800'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}
            >
              {activeOnly ? 'Solo Activos' : 'Todos'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabla de Proveedores */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-brand-500" />
            <span className="text-xs">Cargando directorio de proveedores...</span>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
            <Building className="w-10 h-10 text-slate-300 dark:text-slate-700" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              No se encontraron proveedores
            </p>
            <p className="text-xs text-slate-400 max-w-sm">
              No hay proveedores que coincidan con los filtros o aún no se han registrado.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Proveedor / Razón Social</th>
                  <th className="px-4 py-3.5">Categoría</th>
                  <th className="px-4 py-3.5">Contacto</th>
                  <th className="px-4 py-3.5">Términos Pago</th>
                  <th className="px-4 py-3.5">Historial Compras</th>
                  <th className="px-4 py-3.5 text-center">Estado</th>
                  <th className="px-5 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 dark:text-white text-xs">{s.name}</span>
                        {s.nit_rut && (
                          <span className="text-[11px] text-slate-400 font-mono mt-0.5">NIT: {s.nit_rut}</span>
                        )}
                        {s.city && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" /> {s.city}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[10.5px] font-medium">
                        {s.category}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1">
                        {s.contact_name && (
                          <span className="font-medium text-slate-800 dark:text-slate-200">{s.contact_name}</span>
                        )}
                        {s.phone && (
                          <a
                            href={`tel:${s.phone}`}
                            className="text-slate-500 hover:text-brand-500 flex items-center gap-1 text-[11px]"
                          >
                            <Phone className="w-3 h-3" /> {s.phone}
                          </a>
                        )}
                        {s.email && (
                          <a
                            href={`mailto:${s.email}`}
                            className="text-slate-500 hover:text-brand-500 flex items-center gap-1 text-[11px]"
                          >
                            <Mail className="w-3 h-3" /> {s.email}
                          </a>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {s.payment_terms.replace('_', ' ')}
                      </span>
                      {s.bank_info && (
                        <span
                          className="text-[10px] text-brand-600 dark:text-brand-400 block truncate max-w-[150px] mt-0.5 cursor-help"
                          title={s.bank_info}
                        >
                          🏦 {s.bank_info}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {formatCurrency(s.total_spent)}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {s.total_purchase_orders || 0} órdenes aprobadas
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          s.is_active
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {s.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Can permissions={['suppliers:edit', 'suppliers.edit']}>
                          <button
                            onClick={() => {
                              setSelectedSupplier(s);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-950/30 rounded-lg transition-colors cursor-pointer"
                            title="Editar proveedor"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </Can>

                        <Can permissions={['suppliers:delete', 'suppliers.delete']}>
                          <button
                            onClick={() => handleDeleteSupplier(s)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
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
