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
  FolderPlus,
  ArrowUpRight
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
import { ProductDispatchModal } from '../components/ProductDispatchModal';
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

  const [productDispatchModalOpen, setProductDispatchModalOpen] = useState(false);
  const [preselectedProductItem, setPreselectedProductItem] = useState<InventoryItem | null>(null);

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

  const handleProductDispatch = async (itemId: number, payload: CreateMovementPayload) => {
    await inventoryService.createMovement(itemId, payload);
    const isSale = payload.movement_type === 'SALE';
    showToast(isSale ? 'Venta comercial registrada y descontada de stock.' : 'Baja / merma de producto registrada en Kardex.');
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-montserrat flex items-center gap-2.5">
            <span className="p-2 bg-brand-50 text-brand-600 border border-brand-200 rounded-2xl inline-flex shadow-xs shrink-0">
              <Package className="w-6 h-6" />
            </span>
            <span className="whitespace-nowrap sm:whitespace-normal">Control de Inventario e Insumos</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Trazabilidad completa de productos comerciales, consumo interno de insumos y control de gastos.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
          <button
            type="button"
            onClick={fetchData}
            title="Actualizar datos"
            className="p-2 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-2xl transition-all shadow-xs cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-600' : ''}`} />
          </button>

          <Can permission="inventory:kardex">
            <button
              type="button"
              onClick={() => {
                setKardexFilterItem(null);
                setKardexDrawerOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl transition-all text-xs font-semibold shadow-xs cursor-pointer font-montserrat shrink-0"
            >
              <History className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Bitácora Kardex</span>
            </button>
          </Can>

          <Can permission="inventory:dispatch">
            <button
              type="button"
              onClick={() => {
                setPreselectedSupplyItem(null);
                setDispatchModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-50/80 border border-amber-200/90 hover:bg-amber-100/70 text-amber-800 rounded-2xl transition-all text-xs font-semibold shadow-xs cursor-pointer font-montserrat shrink-0"
            >
              <Send className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Consumo Insumo</span>
            </button>
          </Can>

          <Can permission="inventory:dispatch">
            <button
              type="button"
              onClick={() => {
                setPreselectedProductItem(null);
                setProductDispatchModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50/80 border border-blue-200/90 hover:bg-blue-100/70 text-blue-800 rounded-2xl transition-all text-xs font-semibold shadow-xs cursor-pointer font-montserrat shrink-0"
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Venta / Salida</span>
            </button>
          </Can>

          <Can permission="inventory:create">
            <button
              type="button"
              onClick={() => {
                setItemToEdit(null);
                setDefaultItemType('PRODUCT');
                setItemModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-600 to-amber-600 hover:from-brand-700 hover:to-amber-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-brand-500/20 font-montserrat transition-all active:scale-95 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Nuevo Artículo</span>
            </button>
          </Can>
        </div>
      </div>

      {/* Tarjetas KPI de Resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Total Productos */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block font-montserrat">
              Productos Venta
            </span>
            <div className="p-2 bg-brand-50 text-brand-600 rounded-xl shrink-0">
              <Tag className="w-4 h-4" />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-black text-slate-900 block tracking-tight font-mono">
            {stats?.total_products ?? 0}
          </span>
          <span className="text-[11px] text-slate-500 font-medium block truncate">
            Catálogo comercial
          </span>
        </div>

        {/* Total Insumos */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block font-montserrat">
              Insumos Oficina
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl shrink-0">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-black text-slate-900 block tracking-tight font-mono">
            {stats?.total_supplies ?? 0}
          </span>
          <span className="text-[11px] text-slate-500 font-medium block truncate">
            Papelería y cafetería
          </span>
        </div>

        {/* Stock Crítico (Alerta Interactiva) */}
        <div
          onClick={() => setActiveTab('LOW_STOCK')}
          className={`border rounded-2xl p-4 sm:p-5 shadow-xs space-y-2 cursor-pointer transition-all ${
            (stats?.low_stock_count ?? 0) > 0
              ? 'bg-rose-50/60 border-rose-200 hover:border-rose-300'
              : 'bg-white border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider block font-montserrat ${
              (stats?.low_stock_count ?? 0) > 0 ? 'text-rose-700' : 'text-slate-400'
            }`}>
              Stock Crítico
            </span>
            <div className={`p-2 rounded-xl shrink-0 ${
              (stats?.low_stock_count ?? 0) > 0 ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-400'
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <span className={`text-xl sm:text-2xl font-black block tracking-tight font-mono ${
            (stats?.low_stock_count ?? 0) > 0 ? 'text-rose-700' : 'text-slate-900'
          }`}>
            {stats?.low_stock_count ?? 0}
          </span>
          <span className="text-[11px] text-rose-600/80 font-medium block truncate">
            Por agotar / Reorden
          </span>
        </div>

        {/* Valuación Total del Inventario */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block font-montserrat">
              Valuación Stock
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-black text-slate-900 block tracking-tight font-mono truncate" title={`$${Number(stats?.total_inventory_valuation ?? 0).toLocaleString('es-CO')}`}>
            ${Number(stats?.total_inventory_valuation ?? 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
          </span>
          <span className="text-[11px] text-slate-500 font-medium block truncate">
            Costo total almacenado
          </span>
        </div>

        {/* Gastos de Oficina del Mes */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-amber-700 font-bold uppercase tracking-wider block font-montserrat">
              Gastos del Mes
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl shrink-0">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-black text-slate-900 block tracking-tight font-mono truncate" title={`$${Number(stats?.monthly_office_expenses ?? 0).toLocaleString('es-CO')}`}>
            ${Number(stats?.monthly_office_expenses ?? 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
          </span>
          <span className="text-[11px] text-slate-500 font-medium block truncate">
            Consumo interno insumos
          </span>
        </div>
      </div>

      {/* Desglose de Gastos por Departamento (Si existen) */}
      {stats?.expenses_by_department && stats.expenses_by_department.length > 0 && (
        <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-brand-500 shrink-0" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-montserrat">
                Distribución de Gastos de Oficina por Departamento
              </h4>
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium">Mes en curso</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {stats.expenses_by_department.map((dept) => (
              <div key={dept.department} className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100 flex items-center justify-between min-w-0">
                <div className="min-w-0 pr-2">
                  <span className="block text-xs font-semibold text-slate-700 truncate">{dept.department}</span>
                  <span className="text-[10px] text-slate-400">{dept.movements_count} requisiciones</span>
                </div>
                <span className="text-xs font-mono font-bold text-slate-900 shrink-0">
                  ${Number(dept.total_amount).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pestañas y Filtros */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3.5">
        
        {/* Pestañas de Vista */}
        <div className="flex items-center gap-1.5 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/80 overflow-x-auto max-w-full scrollbar-none shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0 font-montserrat ${
              activeTab === 'ALL'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Todos ({items.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PRODUCT')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 font-montserrat ${
              activeTab === 'PRODUCT'
                ? 'bg-white text-brand-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Tag className="w-3.5 h-3.5 shrink-0" />
            <span>Productos Venta</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('OFFICE_SUPPLY')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 font-montserrat ${
              activeTab === 'OFFICE_SUPPLY'
                ? 'bg-white text-amber-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span>Insumos Oficina</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('LOW_STOCK')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 font-montserrat ${
              activeTab === 'LOW_STOCK'
                ? 'bg-white text-rose-600 shadow-xs'
                : 'text-rose-600 hover:text-rose-700'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>Stock Crítico</span>
          </button>
        </div>

        {/* Buscador y Filtro por Categoría */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full xl:w-auto">
          <div className="relative flex-1 min-w-[200px] sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o SKU..."
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-brand-500 font-sans"
            />
          </div>

          <div className="flex items-center gap-2 flex-1 sm:flex-initial">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value ? Number(e.target.value) : '')}
              className="w-full sm:w-auto px-3.5 py-2 text-xs font-bold font-montserrat text-slate-700 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-brand-500 cursor-pointer"
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
                className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-brand-600 hover:text-brand-800 transition-colors cursor-pointer shrink-0 shadow-xs"
                title="Administrar / Crear Categorías"
              >
                <FolderPlus className="w-4 h-4" />
              </button>
            </Can>
          </div>
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
        onProductDispatch={(item) => {
          setPreselectedProductItem(item);
          setProductDispatchModalOpen(true);
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

      <ProductDispatchModal
        isOpen={productDispatchModalOpen}
        onClose={() => setProductDispatchModalOpen(false)}
        onDispatch={handleProductDispatch}
        items={items}
        preselectedItem={preselectedProductItem}
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
