import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, Plus, Trash2, AlertCircle, Building, Check, DollarSign } from 'lucide-react';
import { Supplier, supplierService } from '../../../services/supplierService';
import { InventoryItem, inventoryService } from '../../../services/inventoryService';
import { CreatePurchaseOrderPayload, CreateOrderItemPayload } from '../../../services/purchaseOrderService';

interface PurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreatePurchaseOrderPayload) => Promise<void>;
}

export const PurchaseOrderModal: React.FC<PurchaseOrderModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [catalogItems, setCatalogItems] = useState<InventoryItem[]>([]);
  
  const [supplierId, setSupplierId] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState('TRANSFERENCIA');
  const [expectedDate, setExpectedDate] = useState('');
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  
  const [items, setItems] = useState<CreateOrderItemPayload[]>([
    { item_id: null, item_name: '', item_sku: '', quantity_ordered: 1, unit_cost: 0 },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Cargar proveedores activos y catálogo
      supplierService.getSuppliers({ active_only: true, limit: 100 })
        .then((res) => setSuppliers(res.items))
        .catch(console.error);

      inventoryService.getItems({ active_only: true })
        .then((res) => setCatalogItems(res))
        .catch(console.error);

      // Reset form
      setSupplierId('');
      setPaymentMethod('TRANSFERENCIA');
      setExpectedDate('');
      setTaxAmount(0);
      setNotes('');
      setItems([{ item_id: null, item_name: '', item_sku: '', quantity_ordered: 1, unit_cost: 0 }]);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems([
      ...items,
      { item_id: null, item_name: '', item_sku: '', quantity_ordered: 1, unit_cost: 0 },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemSelectCatalog = (index: number, itemIdStr: string) => {
    const updated = [...items];
    if (!itemIdStr) {
      updated[index] = { ...updated[index], item_id: null };
    } else {
      const selectedInv = catalogItems.find((ci) => ci.id === Number(itemIdStr));
      if (selectedInv) {
        updated[index] = {
          ...updated[index],
          item_id: selectedInv.id,
          item_name: selectedInv.name,
          item_sku: selectedInv.sku,
          unit_cost: Number(selectedInv.unit_cost) || 0,
        };
      }
    }
    setItems(updated);
  };

  const handleItemFieldChange = (index: number, field: keyof CreateOrderItemPayload, val: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: val };
    setItems(updated);
  };

  // Calcular subtotal
  const subtotal = items.reduce((acc, it) => acc + (Number(it.unit_cost) || 0) * (Number(it.quantity_ordered) || 0), 0);
  const total = subtotal + Number(taxAmount || 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      setError('Por favor selecciona un proveedor.');
      return;
    }

    if (items.length === 0) {
      setError('Debes agregar al menos un artículo a la orden de compra.');
      return;
    }

    for (let i = 0; i < items.length; i++) {
      if (!items[i].item_name.trim()) {
        setError(`El artículo en la fila ${i + 1} no tiene nombre asignado.`);
        return;
      }
      if (items[i].quantity_ordered <= 0) {
        setError(`La cantidad en la fila ${i + 1} debe ser mayor a cero.`);
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);
      await onSave({
        supplier_id: Number(supplierId),
        payment_method: paymentMethod,
        expected_delivery_date: expectedDate ? new Date(expectedDate).toISOString() : null,
        tax_amount: Number(taxAmount) || 0,
        notes: notes.trim() || null,
        items: items.map((it) => ({
          item_id: it.item_id ? Number(it.item_id) : null,
          item_name: it.item_name.trim(),
          item_sku: it.item_sku?.trim() || null,
          quantity_ordered: Number(it.quantity_ordered),
          unit_cost: Number(it.unit_cost),
        })),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al crear la orden de compra.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-500/10 dark:bg-brand-500/20 text-brand-500 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white font-montserrat">
                Nueva Orden de Compra
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Selecciona proveedor, artículos a cotizar o comprar y condiciones comerciales
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl flex items-center gap-2.5 text-xs text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Datos Cabecera de la Orden */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Proveedor *
              </label>
              <select
                required
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:outline-hidden dark:text-white cursor-pointer"
              >
                <option value="">-- Seleccionar Proveedor --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.nit_rut ? `(NIT: ${s.nit_rut})` : ''} - {s.category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Forma de Pago
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:outline-hidden dark:text-white cursor-pointer"
              >
                <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                <option value="EFECTIVO">Efectivo / Caja Menor</option>
                <option value="TARJETA_CREDITO">Tarjeta de Crédito Corporativa</option>
                <option value="CREDITO_PROVEEDOR">Crédito Directo Proveedor</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Fecha Estimada de Entrega
              </label>
              <input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:outline-hidden dark:text-white"
              />
            </div>
          </div>

          {/* Tabla de Artículos */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Artículos de la Orden
              </span>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1.5 text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Agregar Línea
              </button>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold text-[10.5px]">
                    <tr>
                      <th className="px-3.5 py-2.5">Vincular Catálogo (Opcional)</th>
                      <th className="px-3.5 py-2.5">Descripción / Artículo *</th>
                      <th className="px-3.5 py-2.5 w-24">Cantidad</th>
                      <th className="px-3.5 py-2.5 w-32">Costo Unitario ($)</th>
                      <th className="px-3.5 py-2.5 w-32 text-right">Subtotal</th>
                      <th className="px-2 py-2.5 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {items.map((it, idx) => {
                      const lineTotal = (Number(it.unit_cost) || 0) * (Number(it.quantity_ordered) || 0);

                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="px-3 py-2">
                            <select
                              value={it.item_id || ''}
                              onChange={(e) => handleItemSelectCatalog(idx, e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs dark:text-white"
                            >
                              <option value="">-- Personalizado / Fuera de Catálogo --</option>
                              {catalogItems.map((ci) => (
                                <option key={ci.id} value={ci.id}>
                                  [{ci.sku}] {ci.name} (Stock actual: {ci.current_stock})
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="px-3 py-2">
                            <input
                              type="text"
                              required
                              value={it.item_name}
                              onChange={(e) => handleItemFieldChange(idx, 'item_name', e.target.value)}
                              placeholder="Nombre del artículo"
                              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs dark:text-white"
                            />
                          </td>

                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="1"
                              value={it.quantity_ordered}
                              onChange={(e) =>
                                handleItemFieldChange(idx, 'quantity_ordered', Math.max(1, parseInt(e.target.value) || 1))
                              }
                              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-center dark:text-white"
                            />
                          </td>

                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={it.unit_cost}
                              onChange={(e) =>
                                handleItemFieldChange(idx, 'unit_cost', Math.max(0, parseFloat(e.target.value) || 0))
                              }
                              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-right font-mono dark:text-white"
                            />
                          </td>

                          <td className="px-3 py-2 text-right font-bold text-slate-900 dark:text-white font-mono">
                            {formatCurrency(lineTotal)}
                          </td>

                          <td className="px-2 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              disabled={items.length <= 1}
                              className="p-1 text-slate-400 hover:text-rose-500 disabled:opacity-30 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Fila de Totales y Notas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Observaciones / Justificación de Compra
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Indica centro de costos, persona que solicita o condiciones acordadas..."
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white resize-none"
              />
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                <span>Subtotal Bruto:</span>
                <span className="font-mono font-semibold">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                <span>Impuesto / IVA ($):</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={taxAmount}
                  onChange={(e) => setTaxAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-28 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-right font-mono text-xs dark:text-white"
                />
              </div>
              <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />
              <div className="flex items-center justify-between text-sm font-extrabold text-slate-900 dark:text-white font-montserrat">
                <span>Total de la Orden:</span>
                <span className="text-brand-600 dark:text-brand-400 font-mono text-base">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 rounded-xl shadow-xs shadow-brand-500/20 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" />
              {loading ? 'Generando Orden...' : 'Crear Orden de Compra'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
