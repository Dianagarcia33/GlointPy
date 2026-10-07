import { 
  Package, 
  Layers, 
  Tag, 
  AlertTriangle, 
  Send, 
  PlusCircle, 
  SlidersHorizontal, 
  Pencil, 
  Trash2, 
  History, 
  ArrowDownRight,
  ArrowUpRight
} from 'lucide-react';
import { InventoryItem } from '../../../services/inventoryService';
import { Can } from '../../../components/security/Can';

interface InventoryTableProps {
  items: InventoryItem[];
  loading: boolean;
  onEdit: (item: InventoryItem) => void;
  onDelete: (item: InventoryItem) => void;
  onDispatch: (item: InventoryItem) => void;
  onProductDispatch: (item: InventoryItem) => void;
  onQuickEntry: (item: InventoryItem) => void;
  onAdjust: (item: InventoryItem) => void;
  onViewKardex: (item: InventoryItem) => void;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({
  items,
  loading,
  onEdit,
  onDelete,
  onDispatch,
  onProductDispatch,
  onQuickEntry,
  onAdjust,
  onViewKardex,
}) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-white rounded-3xl border border-slate-100 shadow-sm">
        <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mb-2" />
        <span className="text-xs font-semibold text-slate-400">Cargando inventario...</span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-white rounded-3xl border border-slate-100 shadow-sm p-8 text-center">
        <Package className="w-12 h-12 text-slate-300 stroke-1 mb-2" />
        <h4 className="text-sm font-bold text-slate-700 font-montserrat">No se encontraron artículos</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          Ajusta los filtros de búsqueda o da de alta nuevos productos e insumos usando el botón superior.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Indicador de scroll horizontal en móviles */}
      <div className="sm:hidden px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
        <span>Artículos ({items.length})</span>
        <span className="text-[10px] text-brand-600 font-bold flex items-center gap-1 font-montserrat">
          Desliza para ver más columnas →
        </span>
      </div>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[850px] text-left border-collapse text-xs">
          <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200 select-none font-montserrat">
            <tr>
              <th className="py-3.5 px-4 sm:px-5">Artículo / SKU</th>
              <th className="py-3.5 px-3 sm:px-4">Tipo</th>
              <th className="py-3.5 px-3 sm:px-4">Categoría</th>
              <th className="py-3.5 px-3 sm:px-4 text-center">Stock Actual</th>
              <th className="py-3.5 px-3 sm:px-4 text-right">Costo Unit.</th>
              <th className="py-3.5 px-3 sm:px-4 text-right">Precio Venta</th>
              <th className="py-3.5 px-3 sm:px-4 text-right">Valuación Total</th>
              <th className="py-3.5 px-4 sm:px-5 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-inter">
            {items.map((item) => {
              const totalValuation = item.current_stock * item.unit_cost;
              const isLow = item.is_low_stock;

              return (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors group">
                  {/* Nombre y SKU */}
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-xl border ${
                          item.item_type === 'OFFICE_SUPPLY'
                            ? 'bg-amber-50 text-amber-600 border-amber-200'
                            : 'bg-brand-50 text-brand-600 border-brand-200'
                        }`}
                      >
                        {item.item_type === 'OFFICE_SUPPLY' ? (
                          <Layers className="w-4 h-4" />
                        ) : (
                          <Tag className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 group-hover:text-brand-600 transition-colors">
                          {item.name}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">
                            {item.sku}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {item.unit_measure}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Tipo */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {item.item_type === 'OFFICE_SUPPLY' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                        Insumo Oficina
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-brand-50 text-brand-700 border border-brand-200">
                        Producto Venta
                      </span>
                    )}
                  </td>

                  {/* Categoría */}
                  <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 font-medium">
                    {item.category_name || <span className="text-slate-400 italic">General</span>}
                  </td>

                  {/* Stock con Badge de Alerta */}
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <div className="inline-flex flex-col items-center">
                      <div
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl font-bold font-mono text-xs border ${
                          isLow
                            ? 'bg-red-50 text-red-700 border-red-200 animate-pulse'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {isLow && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                        <span>{item.current_stock}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        Mín: {item.min_stock}
                      </span>
                    </div>
                  </td>

                  {/* Costo Unitario */}
                  <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-700 whitespace-nowrap">
                    ${Number(item.unit_cost).toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                  </td>

                  {/* Precio de Venta */}
                  <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-700 whitespace-nowrap">
                    {item.item_type === 'PRODUCT' && item.sale_price !== null && item.sale_price !== undefined ? (
                      <span className="font-bold text-slate-900">
                        ${Number(item.sale_price).toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px] italic">N/A (Insumo)</span>
                    )}
                  </td>

                  {/* Valuación Total en Stock */}
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                    ${Number(totalValuation).toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                  </td>

                  {/* Acciones Protegidas por Permisos */}
                  <td className="py-3.5 px-5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      
                      {/* Botón rápido Salida de Insumo (solo insumos) */}
                      {item.item_type === 'OFFICE_SUPPLY' && (
                        <Can permission="inventory:dispatch">
                          <button
                            type="button"
                            onClick={() => onDispatch(item)}
                            className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title="Despachar insumo para oficina (Registrar Gasto)"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </Can>
                      )}

                      {/* Botón rápido Salida / Venta de Producto (solo productos) */}
                      {item.item_type === 'PRODUCT' && (
                        <Can permission="inventory:dispatch">
                          <button
                            type="button"
                            onClick={() => onProductDispatch(item)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Registrar salida o venta del producto"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </button>
                        </Can>
                      )}

                      {/* Botón rápido Entrada / Abastecimiento */}
                      <Can permission="inventory:create">
                        <button
                          type="button"
                          onClick={() => onQuickEntry(item)}
                          className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="Registrar entrada de mercancía / compra"
                        >
                          <ArrowDownRight className="w-4 h-4" />
                        </button>
                      </Can>

                      {/* Botón Ajuste Físico */}
                      <Can permission="inventory:adjust">
                        <button
                          type="button"
                          onClick={() => onAdjust(item)}
                          className="p-1.5 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                          title="Ajuste de auditoría física"
                        >
                          <SlidersHorizontal className="w-4 h-4" />
                        </button>
                      </Can>

                      {/* Botón Kardex del artículo */}
                      <Can permission="inventory:kardex">
                        <button
                          type="button"
                          onClick={() => onViewKardex(item)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Ver historial de movimientos (Kardex)"
                        >
                          <History className="w-4 h-4" />
                        </button>
                      </Can>

                      {/* Botón Editar */}
                      <Can permission="inventory:edit">
                        <button
                          type="button"
                          onClick={() => onEdit(item)}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Editar artículo"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </Can>

                      {/* Botón Eliminar */}
                      <Can permission="inventory:delete">
                        <button
                          type="button"
                          onClick={() => onDelete(item)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Desactivar artículo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </Can>

                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
