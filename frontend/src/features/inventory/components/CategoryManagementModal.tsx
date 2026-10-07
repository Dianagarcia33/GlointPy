import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, FolderPlus, Tag, Layers, Loader2, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { InventoryCategory, inventoryService } from '../../../services/inventoryService';

interface CategoryManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: InventoryCategory[];
  onCategoryCreated: (newCat: InventoryCategory) => void;
}

export const CategoryManagementModal: React.FC<CategoryManagementModalProps> = ({
  isOpen,
  onClose,
  categories,
  onCategoryCreated,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [itemType, setItemType] = useState<'PRODUCT' | 'OFFICE_SUPPLY' | 'GENERAL'>('GENERAL');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim()) {
      setError('Por favor ingresa el nombre de la categoría.');
      return;
    }

    try {
      setIsLoading(true);
      const newCat = await inventoryService.createCategory({
        name: name.trim(),
        description: description.trim() || undefined,
        item_type: itemType,
      });

      setName('');
      setDescription('');
      setItemType('GENERAL');
      setSuccess(`Categoría "${newCat.name}" creada con éxito.`);
      onCategoryCreated(newCat);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.message || 'Error al crear la categoría.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderTypeBadge = (type: string) => {
    switch (type) {
      case 'PRODUCT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md bg-brand-50 text-brand-700 border border-brand-200">
            <Tag className="w-3 h-3" />
            Productos Venta
          </span>
        );
      case 'OFFICE_SUPPLY':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-50 text-amber-700 border border-amber-200">
            <Layers className="w-3 h-3" />
            Insumos Oficina
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 text-slate-700">
            General
          </span>
        );
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center text-white bg-brand-500 shadow-sm shrink-0">
              <FolderPlus className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 font-montserrat">
                Gestión de Categorías de Inventario
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Clasifica tus productos comerciales e insumos de oficina
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {/* Mensajes de feedback */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>{success}</span>
            </div>
          )}

          {/* Formulario de Creación Rápida */}
          <form onSubmit={handleSubmit} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-montserrat flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-brand-500" />
              Nueva Categoría
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 font-montserrat">
                  Nombre de Categoría *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Papelería y Útiles, Accesorios"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 font-montserrat">
                  Aplica para *
                </label>
                <select
                  value={itemType}
                  onChange={(e) => setItemType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                >
                  <option value="GENERAL">General (Aplica para ambos)</option>
                  <option value="OFFICE_SUPPLY">Insumos de Oficina</option>
                  <option value="PRODUCT">Productos Comerciales</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 font-montserrat">
                Descripción (Opcional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Breve detalle sobre los artículos de esta categoría..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Crear Categoría</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Listado de Categorías Existentes */}
          <div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 font-montserrat flex items-center justify-between">
              <span>Categorías Registradas ({categories.length})</span>
            </h3>

            {categories.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
                No hay categorías creadas aún. Puedes crear la primera arriba.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto p-0.5">
                {categories.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-xs text-slate-900 font-montserrat">
                        {c.name}
                      </span>
                      {renderTypeBadge(c.item_type)}
                    </div>
                    {c.description && (
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                        {c.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
          >
            Listo
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
