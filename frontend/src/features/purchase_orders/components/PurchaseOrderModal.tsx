import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, Plus, Trash2, AlertCircle, Check, Loader2 } from 'lucide-react';
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
      supplierService.getSuppliers({ active_only: true, limit: 100 })
        .then((res) => setSuppliers(res.items))
        .catch(console.error);

      inventoryService.getItems({ active_only: true })
        .then((res) => setCatalogItems(res))
        .catch(console.error);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0 bg-brand-500">
              <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 font-montserrat">
                Nueva Orden de Compra
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Selecciona proveedor, artículos a cotizar o comprar y condiciones comerciales
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-4 sm:mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* Datos Cabecera de la Orden */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat">
                Proveedor *
              </label>
              <select
                required
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 cursor-pointer"
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
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat">
                Forma de Pago
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 cursor-pointer"
              >
                <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                <option value="EFECTIVO">Efectivo / Caja Menor</option>
                <option value="TARJETA_CREDITO">Tarjeta de Crédito Corporativa</option>
                <option value="CREDITO_PROVEEDOR">Crédito Directo Proveedor</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat">
                Fecha Estimada Entrega
              </label>
              <input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              />
            </div>
          </div>

          {/* Tabla de Artículos */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider font-montserrat">
                Artículos de la Orden
              </span>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:text-brand-700 transition-colors cursor-pointer font-montserrat"
              >
                <Plus className="w-4 h-4" /> Agregar Línea
              </button>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[650px]">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px] font-montserrat">
                    <tr>
                      <th className="px-3.5 py-3">Vincular Catálogo (Opcional)</th>
                      <th className="px-3.5 py-3">Descripción / Artículo *</th>
                      <th className="px-3.5 py-3 w-24">Cantidad</th>
                      <th className="px-3.5 py-3 w-32">Costo Unitario ($)</th>
                      <th className="px-3.5 py-3 w-32 text-right">Subtotal</th>
                      <th className="px-2 py-3 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-inter">
                    {items.map((it, idx) => {
                      const lineTotal = (Number(it.unit_cost) || 0) * (Number(it.quantity_ordered) || 0);

                      return (
                        <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-3 py-2">
                            <select
                              value={it.item_id || ''}
                              onChange={(e) => handleItemSelectCatalog(idx, e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-hidden focus:border-brand-500"
                            >
                              <option value="">-- Personalizado / Fuera de Catálogo --</option>
                              {catalogItems.map((ci) => (
                                <option key={ci.id} value={ci.id}>
                                  [{ci.sku}] {ci.name} (Stock: {ci.current_stock})
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
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:border-brand-500"
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
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-center text-slate-900 font-mono focus:bg-white focus:outline-hidden focus:border-brand-500"
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
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-right font-mono font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:border-brand-500"
                            />
                          </td>

                          <td className="px-3 py-2 text-right font-bold text-slate-900 font-mono">
                            {formatCurrency(lineTotal)}
                          </td>

                          <td className="px-2 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              disabled={items.length <= 1}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg disabled:opacity-20 transition-colors cursor-pointer"
                              title="Eliminar fila"
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat">
                Observaciones / Justificación de Compra
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Indica centro de costos, persona que solicita o condiciones acordadas..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all resize-none"
              />
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="font-medium">Subtotal Bruto:</span>
                <span className="font-mono font-bold text-slate-900">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="font-medium">Impuesto / IVA ($):</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={taxAmount}
                  onChange={(e) => setTaxAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-32 px-2.5 py-1 bg-white border border-slate-200 rounded-xl text-right font-mono font-bold text-xs text-slate-900 focus:border-brand-500 focus:outline-hidden"
                />
              </div>
              <div className="h-px bg-slate-200 my-1" />
              <div className="flex items-center justify-between text-sm font-extrabold text-slate-900 font-montserrat">
                <span>Total de la Orden:</span>
                <span className="text-brand-600 font-mono text-base font-bold">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl sm:rounded-2xl transition-colors cursor-pointer font-montserrat"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-brand-500 to-amber-600 hover:from-brand-600 hover:to-amber-700 rounded-xl sm:rounded-2xl shadow-md shadow-brand-500/20 hover:scale-[1.01] active:scale-95 transition-all cursor-pointer font-montserrat disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>{loading ? 'Generando Orden...' : 'Crear Orden de Compra'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
