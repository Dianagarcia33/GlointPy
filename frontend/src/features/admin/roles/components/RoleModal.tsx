import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Role, RoleCreate, RoleUpdate, Permission } from '../../../../services/roles';
import { X, Shield, Info } from 'lucide-react';

interface RoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (roleData: RoleCreate | RoleUpdate) => Promise<void>;
  role?: Role;
  allPermissions: Permission[];
}

export const RoleModal: React.FC<RoleModalProps> = ({
  isOpen,
  onClose,
  onSave,
  role,
  allPermissions
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (role) {
        setName(role.name);
        setDescription(role.description || '');
        setSelectedPermissions(role.permissions.map((p: Permission) => p.id));
      } else {
        setName('');
        setDescription('');
        setSelectedPermissions([]);
      }
      setError(null);
    }
  }, [isOpen, role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('El nombre del rol es obligatorio');
      return;
    }
    setError(null);
    setIsSubmitting(true);

    try {
      const data = {
        name: name.trim(),
        description: description.trim(),
        permission_ids: selectedPermissions,
        is_active: true
      };

      await onSave(data);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el rol');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePermission = (permissionId: number) => {
    setSelectedPermissions(prev => 
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleToggleModule = (modulePermissions: Permission[]) => {
    const moduleIds = modulePermissions.map(p => p.id);
    const allSelected = moduleIds.every(id => selectedPermissions.includes(id));

    if (allSelected) {
      // Desmarcar todo el módulo
      setSelectedPermissions(prev => prev.filter(id => !moduleIds.includes(id)));
    } else {
      // Marcar todo el módulo
      setSelectedPermissions(prev => Array.from(new Set([...prev, ...moduleIds])));
    }
  };

  const handleSelectAllGlobally = () => {
    if (selectedPermissions.length === allPermissions.length) {
      setSelectedPermissions([]);
    } else {
      setSelectedPermissions(allPermissions.map(p => p.id));
    }
  };

  // Agrupar permisos por módulo
  const groupedPermissions = allPermissions.reduce((acc, curr) => {
    const mod = (curr.module || 'General').toUpperCase();
    if (!acc[mod]) acc[mod] = [];
    acc[mod].push(curr);
    return acc;
  }, {} as Record<string, Permission[]>);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
        
        {/* Header Fijo */}
        <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-500/20 text-emerald-400 rounded-2xl border border-white/10">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold font-montserrat tracking-tight">
                {role ? 'Editar Rol y Permisos' : 'Crear Nuevo Rol'}
              </h2>
              <p className="text-xs text-slate-400">
                Define el nombre del rol y asigna los permisos por módulo
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido Scrolleable */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
            
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-semibold flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Datos Básicos del Rol */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200/80">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 font-montserrat">
                  Nombre Interno del Rol <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 shadow-2xs font-mono"
                  placeholder="ej: super_admin"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 font-montserrat">
                  Descripción
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 shadow-2xs"
                  placeholder="Descripción de responsabilidades..."
                />
              </div>
            </div>

            {/* Sección de Asignación de Permisos */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-montserrat uppercase tracking-wider">
                    Matriz de Permisos ({selectedPermissions.length} / {allPermissions.length} seleccionados)
                  </h3>
                  <p className="text-xs text-slate-500">Selecciona o desmarca los accesos permitidos para este rol</p>
                </div>

                <button
                  type="button"
                  onClick={handleSelectAllGlobally}
                  className="text-xs font-bold text-brand-600 hover:text-brand-700 bg-brand-50 px-3 py-1.5 rounded-xl border border-brand-200 transition-all cursor-pointer shrink-0"
                >
                  {selectedPermissions.length === allPermissions.length ? 'Desmarcar Todos' : 'Seleccionar Todos'}
                </button>
              </div>

              {allPermissions.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-medium bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
                  No hay permisos registrados en el sistema.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(Object.entries(groupedPermissions) as [string, Permission[]][]).map(([module, perms]) => {
                    const isModuleFullySelected = perms.every(p => selectedPermissions.includes(p.id));

                    return (
                      <div key={module} className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                        <div className="flex justify-between items-center border-b border-slate-200/60 pb-2.5">
                          <span className="font-extrabold text-slate-800 text-xs uppercase tracking-wider font-montserrat flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-brand-500"></span>
                            Módulo: {module}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleModule(perms)}
                            className="text-[11px] font-bold text-slate-600 hover:text-brand-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200 transition-all cursor-pointer"
                          >
                            {isModuleFullySelected ? 'Desmarcar Módulo' : 'Marcar Módulo'}
                          </button>
                        </div>

                        <div className="space-y-2">
                          {perms.map((perm: Permission) => {
                            const isChecked = selectedPermissions.includes(perm.id);
                            return (
                              <label
                                key={perm.id}
                                className={`flex items-start gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                                  isChecked
                                    ? 'bg-brand-50/80 border-brand-300 ring-1 ring-brand-500/20'
                                    : 'bg-white border-slate-200/80 hover:bg-slate-100/60'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleTogglePermission(perm.id)}
                                  className="mt-0.5 w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300 cursor-pointer shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-bold text-slate-900 truncate">
                                    {perm.action || perm.name}
                                  </div>
                                  {perm.description && (
                                    <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">{perm.description}</p>
                                  )}
                                  <span className="inline-block mt-1 font-mono text-[10px] text-brand-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                    {perm.name}
                                  </span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* Footer Fijo */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0 rounded-b-3xl">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-white text-slate-700 border border-slate-300 rounded-2xl hover:bg-slate-100 transition-all text-xs font-bold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-brand-500 text-white rounded-2xl hover:bg-brand-600 transition-all shadow-md shadow-brand-500/30 text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar Rol'}
            </button>
          </div>
        </form>

      </div>
    </div>,
    document.body
  );
};
