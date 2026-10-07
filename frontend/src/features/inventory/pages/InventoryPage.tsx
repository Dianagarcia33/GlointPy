import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Layers, 
  Tag, 
  AlertTriangle, 
  Send, 
  Plus, 
  History, 
  Search, 
  RefreshCw, 
  DollarSign, 
  TrendingDown, 
  Building2, 
  CheckCircle2,
  Filter,
  FolderPlus
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { 
  InventoryItem, 
  InventoryCategory, 
  InventoryDashboardStats, 
  inventoryService,
  CreateItemPayload,
  UpdateItemPayload,
  CreateMovementPayload,
  AdjustStockPayload
} from '../../../services/inventoryService';
import { InventoryTable } from '../components/InventoryTable';
import { ItemModal } from '../components/ItemModal';
import { SupplyDispatchModal } from '../components/SupplyDispatchModal';
import { StockAdjustmentModal } from '../components/StockAdjustmentModal';
import { QuickEntryModal } from '../components/QuickEntryModal';
import { KardexDrawer } from '../components/KardexDrawer';
import { CategoryManagementModal } from '../components/CategoryManagementModal';
import { Can } from '../../../components/security/Can';

export const InventoryPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  // Estados principales
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [stats, setStats] = useState<InventoryDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState<number | ''>('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'PRODUCT' | 'OFFICE_SUPPLY' | 'LOW_STOCK'>('ALL');

  // Modales
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<InventoryItem | null>(null);
  const [defaultItemType, setDefaultItemType] = useState<'PRODUCT' | 'OFFICE_SUPPLY'>('PRODUCT');

  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [preselectedSupplyItem, setPreselectedSupplyItem] = useState<InventoryItem | null>(null);

  const [quickEntryModalOpen, setQuickEntryModalOpen] = useState(false);
  const [entryItem, setEntryItem] = useState<InventoryItem | null>(null);

  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);

  const [kardexDrawerOpen, setKardexDrawerOpen] = useState(false);
  const [kardexFilterItem, setKardexFilterItem] = useState<InventoryItem | null>(null);

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  // Alerta de acción exitosa (Toast)
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Cargar datos
  const fetchData = async () => {
    setLoading(true);
    try {
      const [itemsData, categoriesData, statsData] = await Promise.all([
        inventoryService.getItems({
          item_type: activeTab === 'PRODUCT' || activeTab === 'OFFICE_SUPPLY' ? activeTab : undefined,
          category_id: selectedCategory ? Number(selectedCategory) : undefined,
          search: search.trim() || undefined,
          only_low_stock: activeTab === 'LOW_STOCK',
        }),
        inventoryService.getCategories(),
        inventoryService.getStats(),
      ]);

      setItems(itemsData);
      setCategories(categoriesData);
      setStats(statsData);
    } catch (err) {
      console.error('Error cargando inventario:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, selectedCategory]);

  // Manejar búsqueda con debounce simple
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Handlers
  const handleSaveItem = async (payload: CreateItemPayload | UpdateItemPayload, isEdit: boolean) => {
    if (isEdit && itemToEdit) {
      await inventoryService.updateItem(itemToEdit.id, payload as UpdateItemPayload);
      showToast('Artículo actualizado correctamente.');
    } else {
      await inventoryService.createItem(payload as CreateItemPayload);
      showToast('Artículo dado de alta en inventario con éxito.');
    }
    await fetchData();
  };

  const handleDeleteItem = async (item: InventoryItem) => {
    if (window.confirm(`¿Estás seguro de que deseas desactivar el artículo "${item.name}"?`)) {
      try {
        await inventoryService.deleteItem(item.id);
        showToast(`Artículo "${item.name}" desactivado del inventario.`);
        await fetchData();
      } catch (err: any) {
        alert(err?.message || 'Error al desactivar artículo');
      }
    }
  };

  const handleDispatchSupply = async (itemId: number, payload: CreateMovementPayload) => {
    await inventoryService.createMovement(itemId, payload);
    showToast(`Salida registrada. Se imputó el gasto al departamento de ${payload.destination_department}.`);
    await fetchData();
  };

  const handleQuickEntry = async (itemId: number, payload: CreateMovementPayload) => {
    await inventoryService.createMovement(itemId, payload);
    showToast('Entrada de inventario registrada con éxito.');
    await fetchData();
  };

  const handleAdjustStock = async (itemId: number, payload: AdjustStockPayload) => {
    await inventoryService.adjustStock(itemId, payload);
    showToast('Ajuste físico de stock aplicado en Kardex.');
    await fetchData();
  };

  return (
    <div className="space-y-6">
      
      {/* Toast Notification Flotante */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-slate-900 text-white text-xs font-semibold rounded-2xl shadow-2xl border border-slate-700 animate-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header con Título y Acciones Globales */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-montserrat text-slate-900">
              Control de Inventario e Insumos
            </h1>
            <span className="px-2.5 py-0.5 text-[11px] font-bold bg-brand-50 text-brand-600 border border-brand-200 rounded-full">
              Kardex en Tiempo Real
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Trazabilidad completa de productos comerciales, consumo interno de insumos de oficina y control de gastos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Botón Ver Kardex */}
          <Can permission="inventory:kardex">
            <button
              type="button"
              onClick={() => {
                setKardexFilterItem(null);
                setKardexDrawerOpen(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-xs hover:border-slate-300 transition-all cursor-pointer"
            >
              <History className="w-4 h-4 text-slate-500" />
              <span>Bitácora Kardex</span>
            </button>
          </Can>

          {/* Botón Gestionar Categorías */}
          <Can permission="inventory:create">
            <button
              type="button"
              onClick={() => setCategoryModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-xs hover:border-slate-300 transition-all cursor-pointer font-montserrat"
            >
              <FolderPlus className="w-4 h-4 text-brand-500" />
              <span>Categorías</span>
            </button>
          </Can>

          {/* Botón Salida Insumo de Oficina */}
          <Can permission="inventory:dispatch">
            <button
              type="button"
              onClick={() => {
                setPreselectedSupplyItem(null);
                setDispatchModalOpen(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100/80 border border-amber-200 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Send className="w-4 h-4 text-amber-600" />
              <span>Consumo de Insumo</span>
            </button>
          </Can>

          {/* Botón Nuevo Registro */}
          <Can permission="inventory:create">
            <button
              type="button"
              onClick={() => {
                setItemToEdit(null);
                setDefaultItemType('PRODUCT');
                setItemModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-brand-500 to-amber-600 hover:from-brand-600 hover:to-amber-700 rounded-xl shadow-md shadow-brand-500/20 hover:scale-[1.01] active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Artículo</span>
            </button>
          </Can>
        </div>
      </div>

      {/* Tarjetas KPI de Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        
        {/* Total Productos */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Productos Venta</span>
            <Tag className="w-4 h-4 text-brand-500" />
          </div>
          <div>
            <span className="text-2xl font-bold font-mono text-slate-900">
              {stats?.total_products ?? 0}
            </span>
            <span className="block text-[10px] text-slate-400 mt-0.5">Catálogo comercial</span>
          </div>
        </div>

        {/* Total Insumos */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Insumos Oficina</span>
            <Layers className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <span className="text-2xl font-bold font-mono text-slate-900">
              {stats?.total_supplies ?? 0}
            </span>
            <span className="block text-[10px] text-slate-400 mt-0.5">Papelería, aseo y cafetería</span>
          </div>
        </div>

        {/* Stock Crítico (Alerta Interactiva) */}
        <div 
          onClick={() => setActiveTab('LOW_STOCK')}
          className={`p-4 rounded-3xl border shadow-xs flex flex-col justify-between cursor-pointer transition-all ${
            (stats?.low_stock_count ?? 0) > 0
              ? 'bg-red-50/60 border-red-200 hover:border-red-300'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${
              (stats?.low_stock_count ?? 0) > 0 ? 'text-red-700' : 'text-slate-400'
            }`}>
              Stock Crítico
            </span>
            <AlertTriangle className={`w-4 h-4 ${
              (stats?.low_stock_count ?? 0) > 0 ? 'text-red-500' : 'text-slate-300'
            }`} />
          </div>
          <div>
            <span className={`text-2xl font-bold font-mono ${
              (stats?.low_stock_count ?? 0) > 0 ? 'text-red-700' : 'text-slate-900'
            }`}>
              {stats?.low_stock_count ?? 0}
            </span>
            <span className="block text-[10px] text-red-600/80 mt-0.5">Por agotar / Reorden</span>
          </div>
        </div>

        {/* Valuación Total del Inventario */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Valuación Stock</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <span className="text-xl font-bold font-mono text-slate-900">
              ${Number(stats?.total_inventory_valuation ?? 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
            </span>
            <span className="block text-[10px] text-slate-400 mt-0.5">Costo total almacenado</span>
          </div>
        </div>

        {/* Gastos de Oficina del Mes */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-3xl border border-amber-200 shadow-xs flex flex-col justify-between col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-amber-700 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Gastos Insumos Mes</span>
            <TrendingDown className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <span className="text-xl font-bold font-mono text-amber-900">
              ${Number(stats?.monthly_office_expenses ?? 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
            </span>
            <span className="block text-[10px] text-amber-700/80 mt-0.5">Consumo interno imputado</span>
          </div>
        </div>

      </div>

      {/* Desglose de Gastos por Departamento (Si existen) */}
      {stats?.expenses_by_department && stats.expenses_by_department.length > 0 && (
        <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-brand-500" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Distribución de Gastos de Oficina por Departamento
              </h4>
            </div>
            <span className="text-[11px] text-slate-400">Mes en curso</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.expenses_by_department.map((dept) => (
              <div key={dept.department} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="block text-xs font-semibold text-slate-700 truncate max-w-[140px]">{dept.department}</span>
                  <span className="text-[10px] text-slate-400">{dept.movements_count} requisiciones</span>
                </div>
                <span className="text-xs font-mono font-bold text-slate-900">
                  ${Number(dept.total_amount).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pestañas y Filtros */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Pestañas de Vista */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-2xl w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'ALL'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Todos ({items.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PRODUCT')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'PRODUCT'
                ? 'bg-white text-brand-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            Productos Venta
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('OFFICE_SUPPLY')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'OFFICE_SUPPLY'
                ? 'bg-white text-amber-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Insumos Oficina
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('LOW_STOCK')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'LOW_STOCK'
                ? 'bg-red-500 text-white shadow-xs'
                : 'text-red-600 hover:bg-red-50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Stock Crítico
          </button>
        </div>

        {/* Buscador y Filtro por Categoría */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o SKU..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          <div className="relative flex items-center gap-1.5">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value ? Number(e.target.value) : '')}
              className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium"
            >
              <option value="">Todas las categorías</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <Can permission="inventory:create">
              <button
                type="button"
                onClick={() => setCategoryModalOpen(true)}
                className="p-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-brand-600 hover:text-brand-800 transition-colors cursor-pointer"
                title="Administrar / Crear Categorías"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
            </Can>
          </div>

          <button
            type="button"
            onClick={fetchData}
            className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            title="Actualizar tabla"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-brand-500' : ''}`} />
          </button>
        </div>

      </div>

      {/* Tabla Principal */}
      <InventoryTable
        items={items}
        loading={loading}
        onEdit={(item) => {
          setItemToEdit(item);
          setItemModalOpen(true);
        }}
        onDelete={handleDeleteItem}
        onDispatch={(item) => {
          setPreselectedSupplyItem(item);
          setDispatchModalOpen(true);
        }}
        onQuickEntry={(item) => {
          setEntryItem(item);
          setQuickEntryModalOpen(true);
        }}
        onAdjust={(item) => {
          setAdjustItem(item);
          setAdjustModalOpen(true);
        }}
        onViewKardex={(item) => {
          setKardexFilterItem(item);
          setKardexDrawerOpen(true);
        }}
      />

      {/* Modales */}
      <ItemModal
        isOpen={itemModalOpen}
        onClose={() => setItemModalOpen(false)}
        onSave={handleSaveItem}
        itemToEdit={itemToEdit}
        categories={categories}
        defaultType={defaultItemType}
        onOpenCategoryModal={() => setCategoryModalOpen(true)}
      />

      <SupplyDispatchModal
        isOpen={dispatchModalOpen}
        onClose={() => setDispatchModalOpen(false)}
        onDispatch={handleDispatchSupply}
        items={items}
        preselectedItem={preselectedSupplyItem}
      />

      <QuickEntryModal
        isOpen={quickEntryModalOpen}
        onClose={() => setQuickEntryModalOpen(false)}
        onEntry={handleQuickEntry}
        item={entryItem}
      />

      <StockAdjustmentModal
        isOpen={adjustModalOpen}
        onClose={() => setAdjustModalOpen(false)}
        onAdjust={handleAdjustStock}
        item={adjustItem}
      />

      <KardexDrawer
        isOpen={kardexDrawerOpen}
        onClose={() => setKardexDrawerOpen(false)}
        filterItemId={kardexFilterItem?.id}
        filterItemName={kardexFilterItem?.name}
      />

      <CategoryManagementModal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        categories={categories}
        onCategoryCreated={(newCat) => {
          setCategories((prev) => [...prev, newCat]);
          setSelectedCategory(newCat.id);
          showToast(`Categoría "${newCat.name}" agregada.`);
        }}
      />

    </div>
  );
};
