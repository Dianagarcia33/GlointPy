import React, { useState, useEffect } from 'react';
import { X, Package, Tag, DollarSign, Layers, AlertCircle, Save } from 'lucide-react';
import { InventoryItem, InventoryCategory, CreateItemPayload, UpdateItemPayload } from '../../../services/inventoryService';

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: CreateItemPayload | UpdateItemPayload, isEdit: boolean) => Promise<void>;
  itemToEdit?: InventoryItem | null;
  categories: InventoryCategory[];
  defaultType?: 'PRODUCT' | 'OFFICE_SUPPLY';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }, [itemToEdit, defaultType, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('El nombre del artículo es obligatorio.');
      return;
    }

    if (!isEdit && !sku.trim()) {
      setError('El código SKU es obligatorio.');
      return;
    }

    setLoading(true);
    try {
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
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-500/20 text-brand-400 rounded-xl border border-brand-500/30">
              <Package className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <h3 className="font-bold text-base font-montserrat">
                {isEdit ? 'Editar Artículo' : 'Nuevo Registro en Inventario'}
              </h3>
              <p className="text-xs text-slate-400">
                {itemType === 'OFFICE_SUPPLY' ? 'Insumo de oficina / Consumo interno' : 'Producto comercial para venta'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Selector de Tipo (Solo si es nuevo) */}
          {!isEdit && (
            <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => setItemType('PRODUCT')}
                className={`py-2 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  itemType === 'PRODUCT'
                    ? 'bg-white text-brand-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Tag className="w-4 h-4" />
                Producto Comercial
              </button>
              <button
                type="button"
                onClick={() => setItemType('OFFICE_SUPPLY')}
                className={`py-2 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  itemType === 'OFFICE_SUPPLY'
                    ? 'bg-white text-amber-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Layers className="w-4 h-4" />
                Insumo de Oficina
              </button>
            </div>
          )}

          {/* SKU y Nombre */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Código / SKU *</label>
              <input
                type="text"
                disabled={isEdit}
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                placeholder="EJ: RESMA-A4"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 disabled:opacity-60"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre del Artículo *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Resma Papel Carta Reprograf 75g"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                required
              />
            </div>
          </div>

          {/* Categoría y Unidad de Medida */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Categoría</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
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
              <label className="block text-xs font-semibold text-slate-600 mb-1">Unidad de Medida</label>
              <select
                value={unitMeasure}
                onChange={(e) => setUnitMeasure(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                {UNIT_MEASURES.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Stock Actual y Stock Mínimo (Alerta) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                {isEdit ? 'Stock Actual (Solo lectura)' : 'Stock Inicial'}
              </label>
              <input
                type="number"
                disabled={isEdit}
                min="0"
                value={currentStock}
                onChange={(e) => setCurrentStock(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 disabled:opacity-60"
              />
              {isEdit && (
                <span className="text-[10px] text-slate-400">Para modificar el stock usa 'Ajuste' o 'Movimiento'</span>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-amber-700 mb-1 flex items-center gap-1">
                <span>Stock Mínimo (Alerta de Reabastecimiento)</span>
              </label>
              <input
                type="number"
                min="0"
                value={minStock}
                onChange={(e) => setMinStock(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 text-sm bg-amber-50/50 border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-semibold"
                required
              />
            </div>
          </div>

          {/* Costos y Precios */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-slate-50/80 rounded-2xl border border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                <span>Costo Unitario de Adquisición ($) *</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={unitCost}
                onChange={(e) => setUnitCost(Math.max(0, parseFloat(e.target.value) || 0))}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-mono"
                required
              />
              {itemType === 'OFFICE_SUPPLY' && (
                <span className="text-[10px] text-slate-400">Este valor se computará como gasto de oficina al ser despachado</span>
              )}
            </div>

            {itemType === 'PRODUCT' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-brand-500" />
                  <span>Precio de Venta al Público ($)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value)))}
                  placeholder="0.00"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-mono"
                />
              </div>
            ) : (
              <div className="flex items-center text-xs text-slate-500 bg-white p-3 rounded-xl border border-dashed border-slate-200">
                <span>ℹ️ Los insumos de oficina no tienen precio de venta al público. Su salida se carga al centro de costos del negocio.</span>
              </div>
            )}
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Notas / Descripción (Opcional)</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalles sobre marca, especificaciones o almacenamiento..."
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-brand-500 to-amber-600 hover:from-brand-600 hover:to-amber-700 rounded-xl shadow-md shadow-brand-500/20 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Registrar Artículo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
