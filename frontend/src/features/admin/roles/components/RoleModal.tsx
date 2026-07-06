import React, { useState, useEffect } from 'react';
import { Role, RoleCreate, RoleUpdate, Permission } from '../../../../services/roles';
import { X, Check, Shield } from 'lucide-react';

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
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (role) {
        setName(role.name);
        setDisplayName(role.display_name);
        setDescription(role.description || '');
        setSelectedPermissions(role.permissions.map((p: Permission) => p.id));
      } else {
        setName('');
        setDisplayName('');
        setDescription('');
        setSelectedPermissions([]);
      }
      setError(null);
    }
  }, [isOpen, role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const data = {
        name,
        display_name: displayName,
        description,
        permissions: selectedPermissions,
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

  // Agrupar permisos por módulo
  const groupedPermissions = allPermissions.reduce((acc, curr) => {
    const mod = curr.module || 'General';
    if (!acc[mod]) acc[mod] = [];
    acc[mod].push(curr);
    return acc;
  }, {} as Record<string, Permission[]>);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={onClose}>
          <div className="absolute inset-0 bg-slate-900/75 backdrop-blur-sm"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-slate-200">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-brand-100 sm:mx-0 sm:h-10 sm:w-10">
                  <Shield className="h-6 w-6 text-brand-600" aria-hidden="true" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-grow">
                  <h3 className="text-lg leading-6 font-semibold text-slate-900">
                    {role ? 'Editar Rol' : 'Crear Nuevo Rol'}
                  </h3>
                  
                  {error && (
                    <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                      {error}
                    </div>
                  )}

                  <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Nombre Interno <span className="text-slate-400 font-normal">(ej. super_admin)</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        placeholder="nombre_rol"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Nombre a Mostrar <span className="text-slate-400 font-normal">(ej. Super Administrador)</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        placeholder="Nombre a mostrar"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        placeholder="Breve descripción del rol..."
                      />
                    </div>
                  </div>

                  <div className="mt-8">
                    <h4 className="text-md font-semibold text-slate-800 mb-4 border-b border-slate-200 pb-2">
                      Asignación de Permisos
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-96 overflow-y-auto pr-2">
                      {(Object.entries(groupedPermissions) as [string, Permission[]][]).map(([module, perms]) => (
                        <div key={module} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <h5 className="font-semibold text-brand-700 mb-3 capitalize text-sm">{module}</h5>
                          <div className="space-y-3">
                            {perms.map((perm: Permission) => (
                              <label key={perm.id} className="flex items-start gap-3 cursor-pointer group">
                                <div className="relative flex items-center justify-center mt-0.5">
                                  <input
                                    type="checkbox"
                                    className="peer sr-only"
                                    checked={selectedPermissions.includes(perm.id)}
                                    onChange={() => handleTogglePermission(perm.id)}
                                  />
                                  <div className="w-5 h-5 border-2 border-slate-300 rounded peer-checked:bg-brand-500 peer-checked:border-brand-500 transition-colors"></div>
                                  <Check className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" strokeWidth={3} />
                                </div>
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-slate-700 group-hover:text-brand-600 transition-colors">
                                    {perm.action || perm.name}
                                  </div>
                                  {perm.description && (
                                    <div className="text-xs text-slate-500 mt-0.5">{perm.description}</div>
                                  )}
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            </div>
            <div className="bg-slate-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-2xl border-t border-slate-200">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-brand-600 text-base font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
              >
                {isSubmitting ? 'Guardando...' : 'Guardar Rol'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 w-full inline-flex justify-center rounded-lg border border-slate-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
