import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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

  const assignableRoles = roles.filter(r => r.name !== 'inversionista' && r.name !== 'cliente');

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

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" style={{ margin: 0 }}>
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
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          <form id="user-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="font-semibold text-slate-700 text-xs uppercase tracking-wider border-b pb-2">Información Personal</div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Correo Electrónico *</label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Documento de Identidad</label>
                <input
                  type="text"
                  name="document_id"
                  value={formData.document_id || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Teléfono</label>
                <input
                  type="text"
                  name="phone_number"
                  value={formData.phone_number || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Fecha de Nacimiento</label>
                <input
                  type="date"
                  name="date_of_birth"
                  value={formData.date_of_birth || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>
            </div>

            <div className="font-semibold text-slate-700 text-xs uppercase tracking-wider border-b pb-2 pt-2">Roles y Accesos</div>

            <div className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold text-slate-700 block">Usuario Activo</span>
                  <span className="text-xs text-slate-500">Si se desmarca, el usuario no podrá iniciar sesión.</span>
                </div>
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active ?? true}
                  onChange={handleChange}
                  className="w-4 h-4 text-orange-500 border-slate-300 rounded focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Roles Asignados</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border border-slate-200 rounded-lg">
                  {roles.map((role) => (
                    <label key={role.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg cursor-pointer text-xs border border-transparent hover:border-slate-200">
                      <input
                        type="checkbox"
                        checked={(formData.role_ids || []).includes(role.id)}
                        onChange={() => handleRoleToggle(role.id)}
                        className="w-4 h-4 text-orange-500 border-slate-300 rounded focus:ring-orange-500"
                      />
                      <div>
                        <div className="font-semibold text-slate-700">{role.display_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{role.name}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="p-4 border-t bg-slate-50 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-all"
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
    </div>,
    document.body
  );
};
