import React, { useState, useEffect } from 'react';
import { X, Laptop, Check, AlertCircle, UserCheck, Loader2 } from 'lucide-react';
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

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      supplierService.getSuppliers({ limit: 100 })
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
          purchase_date: asset.purchase_date ? asset.purchase_date.split('T')[0] : '',
          purchase_cost: asset.purchase_cost || 0,
          warranty_expiration: asset.warranty_expiration ? asset.warranty_expiration.split('T')[0] : '',
          status: asset.status,
          current_condition: asset.current_condition,
          location: asset.location || '',
          photo_url: asset.photo_url || '',
          invoice_reference: asset.invoice_reference || '',
          notes: asset.notes || '',
          initial_holder_id: undefined,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0 bg-brand-500">
              <Laptop className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 font-montserrat">
                {asset ? `Editar Activo: ${asset.asset_code}` : 'Dar de Alta Activo Fijo'}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Ficha técnica, placas de inventario, ubicación y asignación de custodia
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

        {error && (
          <div className="mx-4 sm:mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* Fila 1: Placa/Código & Nombre */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat">
                Placa / Código Interno
              </label>
              <input
                type="text"
                value={formData.asset_code || ''}
                onChange={(e) => setFormData({ ...formData, asset_code: e.target.value })}
                placeholder="Auto: ej. TEC-0001"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat">
                Nombre / Descripción del Activo *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej. MacBook Pro M3 Max 36GB - Gris Espacial"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              />
            </div>
          </div>

          {/* Fila 2: Categoría, Marca, Modelo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat">
                Categoría *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 cursor-pointer"
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
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat">
                Marca
              </label>
              <input
                type="text"
                value={formData.brand || ''}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                placeholder="Ej. Apple, Dell, Herman Miller"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat">
                Modelo
              </label>
              <input
                type="text"
                value={formData.model || ''}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="Ej. A2992 / Latitude 5440"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              />
            </div>
          </div>

          {/* Fila 3: Serial & Proveedor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat">
                Número de Serie de Fábrica
              </label>
              <input
                type="text"
                value={formData.serial_number || ''}
                onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                placeholder="Ej. C02G90XXMD6M"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl text-xs font-mono text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat">
                Proveedor de Compra
              </label>
              <select
                value={formData.supplier_id || ''}
                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 cursor-pointer"
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat">
                Costo de Compra ($)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={formData.purchase_cost}
                onChange={(e) => setFormData({ ...formData, purchase_cost: parseFloat(e.target.value) || 0 })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat">
                Fecha de Compra
              </label>
              <input
                type="date"
                value={formData.purchase_date || ''}
                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat">
                Vencimiento Garantía
              </label>
              <input
                type="date"
                value={formData.warranty_expiration || ''}
                onChange={(e) => setFormData({ ...formData, warranty_expiration: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              />
            </div>
          </div>

          {/* Fila 5: Estado, Condición Física & Ubicación */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat">
                Estado Operativo
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 cursor-pointer"
              >
                <option value="AVAILABLE">Disponible en Bodega</option>
                <option value="ASSIGNED">Asignado a Colaborador</option>
                <option value="IN_MAINTENANCE">En Mantenimiento</option>
                <option value="DAMAGED">Dañado / Con Fallas</option>
                <option value="DECOMMISSIONED">Dado de Baja</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat">
                Condición Física
              </label>
              <select
                value={formData.current_condition}
                onChange={(e) => setFormData({ ...formData, current_condition: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 cursor-pointer"
              >
                <option value="EXCELLENT">Excelente / Nuevo</option>
                <option value="GOOD">Bueno / Funcional</option>
                <option value="FAIR">Aceptable / Desgaste Normal</option>
                <option value="POOR">Malo / Deteriorado</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat">
                Ubicación / Sede
              </label>
              <input
                type="text"
                value={formData.location || ''}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Ej. Sede Medellín - Piso 3"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              />
            </div>
          </div>

          {/* Asignación inicial (solo en creación) */}
          {!asset && (
            <div className="p-4 bg-brand-50/60 border border-brand-200 rounded-2xl">
              <label className="block text-xs font-bold text-brand-900 mb-1.5 flex items-center gap-1.5 font-montserrat">
                <UserCheck className="w-4 h-4 text-brand-600" />
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
                className="w-full px-3.5 py-2 bg-white border border-brand-200 rounded-xl text-xs text-slate-800 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-brand-500/20"
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
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat">
              Observaciones / Accesorios Incluidos
            </label>
            <textarea
              rows={2}
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Ej. Entregado con cargador original de 140W, cable MagSafe y estuche de protección..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all resize-none"
            />
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
              <span>{loading ? 'Guardando...' : asset ? 'Actualizar Activo' : 'Registrar Activo'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
