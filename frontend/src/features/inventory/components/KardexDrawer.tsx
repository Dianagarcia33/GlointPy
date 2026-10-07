import React, { useState, useEffect } from 'react';
import { X, History, Filter, ArrowDownRight, ArrowUpRight, SlidersHorizontal, AlertCircle, Building2, User, RefreshCw } from 'lucide-react';
import { InventoryMovement, inventoryService } from '../../../services/inventoryService';

interface KardexDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filterItemId?: number | null;
  filterItemName?: string | null;
}

export const KardexDrawer: React.FC<KardexDrawerProps> = ({
  isOpen,
  onClose,
  filterItemId,
  filterItemName,
}) => {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [movementType, setMovementType] = useState('ALL');
  const [department, setDepartment] = useState('');

  const fetchKardex = async () => {
    setLoading(true);
    try {
      const data = await inventoryService.getMovements({
        item_id: filterItemId || undefined,
        movement_type: movementType !== 'ALL' ? movementType : undefined,
        department: department || undefined,
        limit: 150,
      });
      setMovements(data);
    } catch (err) {
      console.error('Error fetching kardex movements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchKardex();
    }
  }, [isOpen, filterItemId, movementType, department]);

  if (!isOpen) return null;

  const renderMovementBadge = (type: string) => {
    switch (type) {
      case 'ENTRY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ArrowDownRight className="w-3.5 h-3.5" />
            Entrada / Compra
          </span>
        );
      case 'DISPATCH_OFFICE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
            <ArrowUpRight className="w-3.5 h-3.5" />
            Consumo Oficina (Gasto)
          </span>
        );
      case 'SALE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
            <ArrowUpRight className="w-3.5 h-3.5" />
            Venta Comercial
          </span>
        );
      case 'ADJUSTMENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-purple-50 text-purple-700 border border-purple-200">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Ajuste Auditoría
          </span>
        );
      case 'WASTE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-red-50 text-red-700 border border-red-200">
            <AlertCircle className="w-3.5 h-3.5" />
            Merma / Deterioro
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-xs rounded bg-slate-100 text-slate-700">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-500/20 text-brand-400 rounded-xl border border-brand-500/30">
              <History className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <h3 className="font-bold text-base font-montserrat">
                Bitácora de Movimientos (Kardex)
              </h3>
              <p className="text-xs text-slate-400">
                {filterItemName ? `Filtrando por artículo: ${filterItemName}` : 'Historial general de entradas, salidas y gastos de oficina'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchKardex}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Recargar bitácora"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-400' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filtros Rápidos */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-600">Tipo de Movimiento:</span>
            <select
              value={movementType}
              onChange={(e) => setMovementType(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium"
            >
              <option value="ALL">Todos los tipos</option>
              <option value="ENTRY">Solo Entradas / Compras</option>
              <option value="DISPATCH_OFFICE">Solo Consumos de Oficina (Gastos)</option>
              <option value="SALE">Solo Ventas Comerciales</option>
              <option value="ADJUSTMENT">Solo Ajustes Físicos</option>
              <option value="WASTE">Solo Mermas / Deterioro</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Área Destino:</span>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium"
            >
              <option value="">Todas las áreas</option>
              <option value="Administración y Gerencia">Administración y Gerencia</option>
              <option value="Comercial y Ventas">Comercial y Ventas</option>
              <option value="Operaciones y Logística">Operaciones y Logística</option>
              <option value="Sistemas y Tecnología">Sistemas y Tecnología</option>
              <option value="Contabilidad y Finanzas">Contabilidad y Finanzas</option>
              <option value="Cafetería y Servicios Generales">Cafetería y Servicios Generales</option>
            </select>
          </div>
        </div>

        {/* Tabla Kardex */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mr-2 text-brand-500" />
              <span>Cargando movimientos...</span>
            </div>
          ) : movements.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 p-6 text-center">
              <History className="w-10 h-10 mb-2 stroke-1 text-slate-300" />
              <p className="text-sm font-semibold">No se encontraron movimientos registrados</p>
              <p className="text-xs text-slate-500 mt-1">
                Los movimientos se registrarán automáticamente al ingresar productos, consumos de oficina o ajustes.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100 text-slate-500 uppercase tracking-wider sticky top-0 z-10 border-b border-slate-200 text-[10px] font-bold">
                <tr>
                  <th className="py-3 px-4">Fecha / Hora</th>
                  <th className="py-3 px-4">Artículo</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4 text-center">Cant.</th>
                  <th className="py-3 px-4 text-center">Stock</th>
                  <th className="py-3 px-4 text-right">Costo / Gasto</th>
                  <th className="py-3 px-4">Responsable / Destino</th>
                  <th className="py-3 px-4">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                      {new Date(m.created_at).toLocaleString('es-CO', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{m.item_name}</div>
                      <div className="font-mono text-[10px] text-slate-400">{m.item_sku}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">{renderMovementBadge(m.movement_type)}</td>
                    <td className="py-3 px-4 text-center font-bold font-mono text-slate-800">
                      {m.movement_type === 'ENTRY' ? `+${m.quantity}` : `-${m.quantity}`}
                    </td>
                    <td className="py-3 px-4 text-center font-mono whitespace-nowrap">
                      <span className="text-slate-400">{m.previous_stock}</span>
                      <span className="mx-1 text-slate-300">→</span>
                      <span className="font-bold text-slate-800">{m.new_stock}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                      ${Number(m.total_cost).toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 font-medium text-slate-700">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>{m.user_name || 'Sistema'}</span>
                      </div>
                      {m.destination_department && (
                        <div className="flex items-center gap-1 text-[10px] text-amber-700 font-semibold mt-0.5">
                          <Building2 className="w-3 h-3 text-amber-500" />
                          <span>{m.destination_department}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 max-w-xs text-slate-500 truncate" title={m.notes || m.reference || ''}>
                      {m.reference && <span className="font-mono text-brand-600 mr-1 font-bold">[{m.reference}]</span>}
                      {m.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
