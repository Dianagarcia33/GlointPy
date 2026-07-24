import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Role, RoleCreate, RoleUpdate, Permission } from '../../../../services/roles';
import { X, Shield, AlertTriangle, Save } from 'lucide-react';

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
      setError('Por favor ingresa el nombre interno del rol');
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
      setSelectedPermissions(prev => prev.filter(id => !moduleIds.includes(id)));
    } else {
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
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header Estandarizado */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-100 text-brand-700 rounded-xl">
              <Shield className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                {role ? 'Editar Rol' : 'Nuevo Rol'}
              </h3>
              <p className="text-xs text-slate-500">Configuración de acceso y matriz de permisos PBAC</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body Estandarizado */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                Nombre Interno <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none text-sm font-mono"
                placeholder="ej: super_admin"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Descripción</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none text-sm"
                placeholder="Descripción del nivel de acceso..."
              />
            </div>
          </div>

          {/* Permisos */}
          <div className="border-t border-slate-100 pt-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  Matriz de Permisos ({selectedPermissions.length} / {allPermissions.length})
                </h4>
                <p className="text-xs text-slate-500">Asigna los permisos individuales por módulo</p>
              </div>

              <button
                type="button"
                onClick={handleSelectAllGlobally}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 px-3 py-1.5 rounded-lg border border-brand-200 transition-colors cursor-pointer shrink-0"
              >
                {selectedPermissions.length === allPermissions.length ? 'Desmarcar Todos' : 'Seleccionar Todos'}
              </button>
            </div>

            {allPermissions.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No hay permisos disponibles para asignar.</p>
            ) : (
              <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                {(Object.entries(groupedPermissions) as [string, Permission[]][]).map(([module, perms]) => {
                  const isModuleFullySelected = perms.every(p => selectedPermissions.includes(p.id));

                  return (
                    <div key={module} className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-3">
                      <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                        <span className="font-bold text-xs text-slate-800 uppercase tracking-wide">
                          Módulo: {module}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleModule(perms)}
                          className="text-[11px] font-semibold text-slate-600 hover:text-brand-700 bg-white px-2 py-0.5 rounded border border-slate-200 transition-colors cursor-pointer"
                        >
                          {isModuleFullySelected ? 'Desmarcar Módulo' : 'Marcar Módulo'}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {perms.map((perm: Permission) => {
                          const isChecked = selectedPermissions.includes(perm.id);
                          return (
                            <label
                              key={perm.id}
                              className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer ${
                                isChecked
                                  ? 'bg-brand-50/70 border-brand-300'
                                  : 'bg-white border-slate-200 hover:bg-slate-100/50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleTogglePermission(perm.id)}
                                className="mt-0.5 w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300 cursor-pointer shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-semibold text-slate-800 truncate">
                                  {perm.action || perm.name}
                                </div>
                                {perm.description && (
                                  <p className="text-[11px] text-slate-500 mt-0.5 leading-tight line-clamp-2">{perm.description}</p>
                                )}
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

          {/* Footer Estandarizado */}
          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-100 transition-colors text-sm cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-brand-500 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-brand-600 transition-colors shadow-md text-sm cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Guardando...' : 'Guardar Rol'}
            </button>
          </div>
        </form>

      </div>
    </div>,
    document.body
  );
};
