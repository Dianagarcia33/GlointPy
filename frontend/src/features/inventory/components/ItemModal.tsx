import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Loader2, Package, Tag, Layers, DollarSign, AlertCircle, Plus } from 'lucide-react';
import { InventoryItem, InventoryCategory, CreateItemPayload, UpdateItemPayload } from '../../../services/inventoryService';

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: CreateItemPayload | UpdateItemPayload, isEdit: boolean) => Promise<void>;
  itemToEdit?: InventoryItem | null;
  categories: InventoryCategory[];
  defaultType?: 'PRODUCT' | 'OFFICE_SUPPLY';
  onOpenCategoryModal?: () => void;
}

const UNIT_MEASURES = [
  'UNIDAD',
  'PAQUETE',
  'CAJA',
  'RESMA',
  'LITRO',
  'METRO',
  'KIT',
  'ROLLO'
];

export const ItemModal: React.FC<ItemModalProps> = ({
  isOpen,
  onClose,
  onSave,
  itemToEdit,
  categories,
  defaultType = 'PRODUCT',
  onOpenCategoryModal,
}) => {
  const isEdit = !!itemToEdit;

  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [itemType, setItemType] = useState<'PRODUCT' | 'OFFICE_SUPPLY'>(defaultType);
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [unitMeasure, setUnitMeasure] = useState('UNIDAD');
  const [currentStock, setCurrentStock] = useState(0);
  const [minStock, setMinStock] = useState(5);
  const [unitCost, setUnitCost] = useState(0);
  const [salePrice, setSalePrice] = useState<number | ''>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (itemToEdit) {
        setSku(itemToEdit.sku);
        setName(itemToEdit.name);
        setDescription(itemToEdit.description || '');
        setItemType(itemToEdit.item_type);
        setCategoryId(itemToEdit.category_id || '');
        setUnitMeasure(itemToEdit.unit_measure);
        setCurrentStock(itemToEdit.current_stock);
        setMinStock(itemToEdit.min_stock);
        setUnitCost(itemToEdit.unit_cost);
        setSalePrice(itemToEdit.sale_price !== null && itemToEdit.sale_price !== undefined ? itemToEdit.sale_price : '');
      } else {
        setSku('');
        setName('');
        setDescription('');
        setItemType(defaultType);
        setCategoryId('');
        setUnitMeasure('UNIDAD');
        setCurrentStock(0);
        setMinStock(5);
        setUnitCost(0);
        setSalePrice('');
      }
      setError(null);
    }
  }, [isOpen, itemToEdit, defaultType]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Por favor ingresa el nombre del artículo.');
      return;
    }

    if (!isEdit && !sku.trim()) {
      setError('El código SKU es obligatorio.');
      return;
    }

    try {
      setIsLoading(true);

      if (isEdit) {
        const payload: UpdateItemPayload = {
          name: name.trim(),
          description: description.trim() || undefined,
          category_id: categoryId ? Number(categoryId) : null,
          unit_measure: unitMeasure,
          min_stock: Number(minStock),
          unit_cost: Number(unitCost),
          sale_price: itemType === 'PRODUCT' && salePrice !== '' ? Number(salePrice) : null,
        };
        await onSave(payload, true);
      } else {
        const payload: CreateItemPayload = {
          sku: sku.trim().toUpperCase(),
          name: name.trim(),
          description: description.trim() || undefined,
          item_type: itemType,
          category_id: categoryId ? Number(categoryId) : null,
          unit_measure: unitMeasure,
          current_stock: Number(currentStock),
          min_stock: Number(minStock),
          unit_cost: Number(unitCost),
          sale_price: itemType === 'PRODUCT' && salePrice !== '' ? Number(salePrice) : null,
        };
        await onSave(payload, false);
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al guardar el artículo.');
    } finally {
      setIsLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera idéntica al diseño del resto de la app */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div 
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0 ${
                itemType === 'OFFICE_SUPPLY' ? 'bg-amber-500' : 'bg-brand-500'
              }`}
            >
              {itemType === 'OFFICE_SUPPLY' ? (
                <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <Package className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 font-montserrat">
                {isEdit ? 'Editar Artículo' : 'Nuevo Registro de Inventario'}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500">
                {itemType === 'OFFICE_SUPPLY' ? 'Insumo de oficina / Consumo interno' : 'Producto comercial para venta'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Selector de Tipo (Solo al crear) */}
          {!isEdit && (
            <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => setItemType('PRODUCT')}
                className={`py-2 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 font-montserrat ${
                  itemType === 'PRODUCT'
                    ? 'bg-white text-brand-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                Producto Comercial
              </button>
              <button
                type="button"
                onClick={() => setItemType('OFFICE_SUPPLY')}
                className={`py-2 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 font-montserrat ${
                  itemType === 'OFFICE_SUPPLY'
                    ? 'bg-white text-amber-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Insumo de Oficina
              </button>
            </div>
          )}

          {/* SKU y Nombre */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat">
                Código / SKU *
              </label>
              <input
                type="text"
                disabled={isEdit}
                required
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                placeholder="EJ. RESMA-A4"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all disabled:opacity-60"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat">
                Nombre del Artículo *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Resma Papel Carta Reprograf 75g"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              />
            </div>
          </div>

          {/* Categoría y Unidad de Medida */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider font-montserrat">
                  Categoría
                </label>
                {onOpenCategoryModal && (
                  <button
                    type="button"
                    onClick={onOpenCategoryModal}
                    className="text-[11px] font-bold text-brand-600 hover:text-brand-800 transition-colors flex items-center gap-1 cursor-pointer font-montserrat"
                  >
                    <Plus className="w-3 h-3" />
                    Nueva Categoría
                  </button>
                )}
              </div>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              >
                <option value="">(Sin categoría asignada)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat">
                Unidad de Medida
              </label>
              <select
                value={unitMeasure}
                onChange={(e) => setUnitMeasure(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              >
                {UNIT_MEASURES.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Stock Inicial y Stock Mínimo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat">
                {isEdit ? 'Stock Actual (En Bodega)' : 'Stock Inicial'}
              </label>
              <input
                type="number"
                min="0"
                disabled={isEdit}
                value={currentStock}
                onChange={(e) => setCurrentStock(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all disabled:opacity-60"
              />
              {isEdit && (
                <span className="text-[10px] text-slate-400 mt-0.5 block">Para cambiar stock usa 'Ajuste' o 'Movimiento'</span>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-amber-700 uppercase tracking-wider mb-1.5 font-montserrat flex items-center gap-1">
                <span>Stock Mínimo (Alerta)</span>
              </label>
              <input
                type="number"
                min="0"
                required
                value={minStock}
                onChange={(e) => setMinStock(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3.5 py-2.5 bg-amber-50/40 border border-amber-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
              />
            </div>
          </div>

          {/* Costo Unitario y Precio de Venta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                <span>Costo de Adquisición ($) *</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={unitCost}
                onChange={(e) => setUnitCost(Math.max(0, parseFloat(e.target.value) || 0))}
                placeholder="0.00"
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              />
              {itemType === 'OFFICE_SUPPLY' && (
                <span className="text-[10px] text-slate-400 mt-1 block">Se computará como gasto de oficina al ser despachado</span>
              )}
            </div>

            {itemType === 'PRODUCT' ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-brand-500" />
                  <span>Precio de Venta ($)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value)))}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                />
              </div>
            ) : (
              <div className="flex items-center text-xs text-slate-500 bg-white/70 p-3 rounded-xl border border-dashed border-slate-200">
                <span>ℹ️ Los insumos de oficina no tienen precio de venta. Su salida se carga al centro de costos de la empresa.</span>
              </div>
            )}
          </div>

          {/* Notas / Descripción */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat">
              Descripción Adicional (Opcional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Especificaciones, marca o instrucciones de almacenamiento..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all resize-none"
            />
          </div>

          {/* Botones de acción idénticos al resto de la app */}
          <div className="pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-2xl transition-all cursor-pointer font-montserrat text-center"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-brand-600 to-amber-600 hover:from-brand-700 hover:to-amber-700 rounded-2xl transition-all inline-flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-brand-500/20 disabled:opacity-50 font-montserrat text-center active:scale-95"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{isEdit ? 'Guardar Cambios' : 'Registrar Artículo'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
