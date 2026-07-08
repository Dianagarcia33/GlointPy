import React, { useState, useEffect } from 'react';
import { User, usersService, UserCreate, UserUpdate } from '../../../../services/users';
import { Role } from '../../../../services/roles';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  user: User | null;
  roles: Role[];
}

export const UserModal: React.FC<UserModalProps> = ({ isOpen, onClose, onSaved, user, roles }) => {
  const [formData, setFormData] = useState<UserCreate | UserUpdate>({
    name: '',
    email: '',
    document_id: '',
    phone_number: '',
    date_of_birth: '',
    is_active: true,
    role_ids: []
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        document_id: user.document_id || '',
        phone_number: user.phone_number || '',
        date_of_birth: user.date_of_birth ? user.date_of_birth.split('T')[0] : '',
        is_active: user.is_active,
        role_ids: user.roles.map(r => r.id)
      });
    } else {
      setFormData({
        name: '',
        email: '',
        document_id: '',
        phone_number: '',
        date_of_birth: '',
        is_active: true,
        role_ids: []
      });
    }
    setError(null);
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleRoleToggle = (roleId: number) => {
    setFormData(prev => {
      const currentRoles = prev.role_ids || [];
      if (currentRoles.includes(roleId)) {
        return { ...prev, role_ids: currentRoles.filter(id => id !== roleId) };
      } else {
        return { ...prev, role_ids: [...currentRoles, roleId] };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      if (user) {
        await usersService.updateUser(user.id, formData as UserUpdate);
      } else {
        await usersService.createUser(formData as UserCreate);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el usuario');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-500">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">{user ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</h2>
            {!user && <p className="text-sm text-slate-500">La contraseña por defecto será Temp123!</p>}
          </div>
        </div>

        <div className="overflow-y-auto p-6 flex-1">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
              {error}
            </div>
          )}

          <form id="user-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Información Personal */}
            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-3 uppercase tracking-wider">Información Personal</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all text-slate-800"
                    placeholder="Ej. Juan Pérez"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all text-slate-800"
                    placeholder="correo@ejemplo.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Documento de Identidad</label>
                  <input
                    type="text"
                    name="document_id"
                    value={formData.document_id || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all text-slate-800"
                    placeholder="Cédula, Pasaporte..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                  <input
                    type="text"
                    name="phone_number"
                    value={formData.phone_number || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all text-slate-800"
                    placeholder="+57 300..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de Nacimiento</label>
                  <input
                    type="date"
                    name="date_of_birth"
                    value={formData.date_of_birth || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all text-slate-800"
                  />
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Roles y Accesos */}
            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-3 uppercase tracking-wider">Roles y Accesos</h3>
              
              <div className="mb-4">
                <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleChange}
                    className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-slate-800 block">Usuario Activo</span>
                    <span className="text-xs text-slate-500">Si se desmarca, el usuario no podrá iniciar sesión.</span>
                  </div>
                </label>
              </div>

              <div className="bg-slate-50 border rounded-lg p-4">
                <label className="block text-sm font-medium text-slate-700 mb-3">Roles Asignados</label>
                {roles.length === 0 ? (
                  <p className="text-sm text-slate-500 italic bg-white p-3 rounded border border-dashed">No hay roles configurados en el sistema.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {roles.map(role => (
                      <label key={role.id} className={`flex items-start gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${formData.role_ids?.includes(role.id) ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                        <input
                          type="checkbox"
                          checked={formData.role_ids?.includes(role.id)}
                          onChange={() => handleRoleToggle(role.id)}
                          className="mt-1 w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                        />
                        <div>
                          <span className="text-sm font-medium text-slate-800 block">{role.display_name}</span>
                          <span className="text-xs text-slate-500">{role.description}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
          </form>
        </div>

        <div className="p-4 border-t bg-slate-50 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
            disabled={isSaving}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="user-form"
            disabled={isSaving}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg shadow-lg shadow-orange-500/30 transition-all disabled:opacity-50"
          >
            {isSaving ? 'Guardando...' : 'Guardar Usuario'}
          </button>
        </div>
      </div>
    </div>
  );
};
