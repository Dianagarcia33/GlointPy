import React, { useState, useEffect } from 'react';
import { X, Laptop, AlertCircle, Building, Check, DollarSign, Calendar, MapPin, UserCheck } from 'lucide-react';
import { CompanyAsset, CreateAssetPayload, UpdateAssetPayload } from '../../../services/companyAssetService';
import { Supplier, supplierService } from '../../../services/supplierService';
import { usersService, User } from '../../../services/users';

interface AssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateAssetPayload | UpdateAssetPayload) => Promise<void>;
  asset?: CompanyAsset | null;
}

export const AssetModal: React.FC<AssetModalProps> = ({
  isOpen,
  onClose,
  onSave,
  asset,
}) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);

  const [formData, setFormData] = useState<CreateAssetPayload>({
    asset_code: '',
    name: '',
    category: 'TECNOLOGIA',
    serial_number: '',
    brand: '',
    model: '',
    supplier_id: undefined,
    purchase_date: '',
    purchase_cost: 0,
    warranty_expiration: '',
    status: 'AVAILABLE',
    current_condition: 'EXCELLENT',
    location: '',
    photo_url: '',
    invoice_reference: '',
    notes: '',
    initial_holder_id: undefined,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      supplierService.getSuppliers({ active_only: true, limit: 100 })
        .then((res) => setSuppliers(res.items))
        .catch(console.error);

      usersService.getUsers({ limit: 150 })
        .then((res: any) => {
          const list = Array.isArray(res) ? res : res.items || [];
          setUsersList(list);
        })
        .catch(console.error);

      if (asset) {
        setFormData({
          asset_code: asset.asset_code,
          name: asset.name,
          category: asset.category,
          serial_number: asset.serial_number || '',
          brand: asset.brand || '',
          model: asset.model || '',
          supplier_id: asset.supplier_id || undefined,
          purchase_date: asset.purchase_date ? asset.purchase_date.substring(0, 10) : '',
          purchase_cost: Number(asset.purchase_cost) || 0,
          warranty_expiration: asset.warranty_expiration ? asset.warranty_expiration.substring(0, 10) : '',
          status: asset.status,
          current_condition: asset.current_condition,
          location: asset.location || '',
          photo_url: asset.photo_url || '',
          invoice_reference: asset.invoice_reference || '',
          notes: asset.notes || '',
        });
      } else {
        setFormData({
          asset_code: '',
          name: '',
          category: 'TECNOLOGIA',
          serial_number: '',
          brand: '',
          model: '',
          supplier_id: undefined,
          purchase_date: '',
          purchase_cost: 0,
          warranty_expiration: '',
          status: 'AVAILABLE',
          current_condition: 'EXCELLENT',
          location: '',
          photo_url: '',
          invoice_reference: '',
          notes: '',
          initial_holder_id: undefined,
        });
      }
      setError(null);
    }
  }, [asset, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('El nombre o descripción del activo es obligatorio.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onSave({
        ...formData,
        purchase_date: formData.purchase_date ? new Date(formData.purchase_date).toISOString() : undefined,
        warranty_expiration: formData.warranty_expiration ? new Date(formData.warranty_expiration).toISOString() : undefined,
        supplier_id: formData.supplier_id ? Number(formData.supplier_id) : undefined,
        purchase_cost: Number(formData.purchase_cost) || 0,
        initial_holder_id: formData.initial_holder_id ? Number(formData.initial_holder_id) : undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el activo fijo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-500/10 dark:bg-brand-500/20 text-brand-500 flex items-center justify-center">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white font-montserrat">
                {asset ? `Editar Activo: ${asset.asset_code}` : 'Dar de Alta Activo Fijo'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ficha técnica, placas de inventario, ubicación y asignación de custodia
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Fila 1: Placa/Código & Nombre */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Placa / Código Interno
              </label>
              <input
                type="text"
                value={formData.asset_code || ''}
                onChange={(e) => setFormData({ ...formData, asset_code: e.target.value })}
                placeholder="Dejar vacío para auto (ej. TEC-0001)"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono focus:ring-2 focus:ring-brand-500 focus:outline-hidden dark:text-white"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Nombre / Descripción del Activo *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej. MacBook Pro M3 Max 36GB - Gris Espacial"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:outline-hidden dark:text-white"
              />
            </div>
          </div>

          {/* Fila 2: Categoría, Marca, Modelo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Categoría *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:outline-hidden dark:text-white cursor-pointer"
              >
                <option value="TECNOLOGIA">Tecnología y Cómputo</option>
                <option value="MOBILIARIO">Mobiliario y Enseres</option>
                <option value="EQUIPOS_OFICINA">Equipos de Oficina</option>
                <option value="VEHICULOS">Vehículos</option>
                <option value="HERRAMIENTAS">Herramientas</option>
                <option value="OTROS">Otros Activos</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Marca
              </label>
              <input
                type="text"
                value={formData.brand || ''}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                placeholder="Ej. Apple, Dell, Herman Miller"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:outline-hidden dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Modelo
              </label>
              <input
                type="text"
                value={formData.model || ''}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="Ej. A2992 / Latitude 5440"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:outline-hidden dark:text-white"
              />
            </div>
          </div>

          {/* Fila 3: Serial & Proveedor */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Número de Serie de Fábrica
              </label>
              <input
                type="text"
                value={formData.serial_number || ''}
                onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                placeholder="Ej. C02G90XXMD6M"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono focus:ring-2 focus:ring-brand-500 focus:outline-hidden dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Proveedor de Compra
              </label>
              <select
                value={formData.supplier_id || ''}
                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:outline-hidden dark:text-white cursor-pointer"
              >
                <option value="">-- Sin Proveedor Asociado --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.category})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Fila 4: Costo de Compra, Fecha Compra & Garantía */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Costo de Compra ($)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={formData.purchase_cost}
                onChange={(e) => setFormData({ ...formData, purchase_cost: parseFloat(e.target.value) || 0 })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono focus:ring-2 focus:ring-brand-500 focus:outline-hidden dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Fecha de Compra
              </label>
              <input
                type="date"
                value={formData.purchase_date || ''}
                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:outline-hidden dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Vencimiento de Garantía
              </label>
              <input
                type="date"
                value={formData.warranty_expiration || ''}
                onChange={(e) => setFormData({ ...formData, warranty_expiration: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:outline-hidden dark:text-white"
              />
            </div>
          </div>

          {/* Fila 5: Estado, Condición Física & Ubicación */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Estado Operativo
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:outline-hidden dark:text-white cursor-pointer"
              >
                <option value="AVAILABLE">Disponible en Bodega</option>
                <option value="ASSIGNED">Asignado a Colaborador</option>
                <option value="IN_MAINTENANCE">En Mantenimiento</option>
                <option value="DAMAGED">Dañado / Con Fallas</option>
                <option value="DECOMMISSIONED">Dado de Baja</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Condición Física
              </label>
              <select
                value={formData.current_condition}
                onChange={(e) => setFormData({ ...formData, current_condition: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:outline-hidden dark:text-white cursor-pointer"
              >
                <option value="EXCELLENT">Excelente / Nuevo</option>
                <option value="GOOD">Bueno / Funcional</option>
                <option value="FAIR">Aceptable / Desgaste Normal</option>
                <option value="POOR">Malo / Deteriorado</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Ubicación / Sede
              </label>
              <input
                type="text"
                value={formData.location || ''}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Ej. Sede Medellín - Piso 3"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:outline-hidden dark:text-white"
              />
            </div>
          </div>

          {/* Asignación inicial (solo en creación) */}
          {!asset && (
            <div className="p-4 bg-brand-50/60 dark:bg-brand-950/20 border border-brand-200 dark:border-brand-900/40 rounded-2xl">
              <label className="block text-xs font-bold text-brand-900 dark:text-brand-300 mb-1.5 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                Custodia Inmediata (Opcional)
              </label>
              <select
                value={formData.initial_holder_id || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    initial_holder_id: e.target.value ? Number(e.target.value) : undefined,
                    status: e.target.value ? 'ASSIGNED' : 'AVAILABLE',
                  })
                }
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-brand-200 dark:border-slate-700 rounded-xl text-xs dark:text-white cursor-pointer"
              >
                <option value="">-- Sin asignar (Permanece en Bodega Disponible) --</option>
                {usersList.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Notas */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Observaciones / Accesorios Incluidos
            </label>
            <textarea
              rows={2}
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Ej. Entregado con cargador original de 140W, cable MagSafe y estuche de protección..."
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white resize-none"
            />
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
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 rounded-xl shadow-xs shadow-brand-500/20 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" />
              {loading ? 'Guardando...' : asset ? 'Actualizar Activo' : 'Registrar Activo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
