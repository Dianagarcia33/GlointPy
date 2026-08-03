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
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);

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

  const handleCreateWalletInModal = async () => {
    if (!user) return;
    setIsCreatingWallet(true);
    try {
      await usersService.createWallet(user.id);
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al crear la billetera');
    } finally {
      setIsCreatingWallet(false);
    }
  };

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
      const payload = {
        ...formData,
        date_of_birth: formData.date_of_birth ? formData.date_of_birth : null
      };
      if (user) {
        await usersService.updateUser(user.id, payload as UserUpdate);
      } else {
        await usersService.createUser(payload as UserCreate);
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
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200" style={{ margin: 0 }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header Estandarizado */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-100 text-brand-700 rounded-xl">
              <svg className="w-5 h-5 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">{user ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</h3>
              {!user ? (
                <p className="text-xs text-slate-500">La contraseña por defecto será: <strong className="font-mono text-brand-700 font-bold">Temp123!</strong></p>
              ) : (
                <p className="text-xs text-slate-500">Actualiza la información personal y asignación de roles</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto p-6 flex-1 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-600 flex items-center gap-2">
              <span>{error}</span>
            </div>
          )}

          {/* Sección Estado de Billetera (Al editar) */}
          {user && (
            <div className="space-y-2">
              {user.wallet ? (
                <div className="bg-emerald-50/80 p-4 rounded-xl border border-emerald-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-emerald-900 block font-montserrat">Billetera Activa</span>
                    <span className="text-xs text-emerald-800">
                      Saldo disponible: <strong className="font-montserrat font-extrabold">{Number(user.wallet.balance).toLocaleString('es-CO', { style: 'currency', currency: user.wallet.currency || 'COP', minimumFractionDigits: 0 })}</strong>
                    </span>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-200/60 text-emerald-900 rounded-full text-[10px] font-bold uppercase border border-emerald-300">
                    {user.wallet.status}
                  </span>
                </div>
              ) : (
                <div className="bg-amber-50/80 p-4 rounded-xl border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-amber-950 block font-montserrat">Este usuario no posee Billetera</span>
                    <span className="text-xs text-amber-800">Puedes asignarle una billetera inmediatamente para permitir transacciones y rendimientos.</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateWalletInModal}
                    disabled={isCreatingWallet}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shrink-0 shadow-md shadow-emerald-600/20"
                  >
                    {isCreatingWallet ? 'Creando...' : '+ Crear Billetera'}
                  </button>
                </div>
              )}
            </div>
          )}

          <form id="user-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="font-bold text-slate-800 text-xs uppercase tracking-wider border-b border-slate-100 pb-2 font-montserrat">Información Personal</div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Nombre Completo <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none text-sm font-semibold text-slate-900"
                    placeholder="Nombre completo"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Correo Electrónico <span className="text-red-500">*</span></label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none text-sm font-mono text-slate-900"
                    placeholder="correo@ejemplo.com"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Documento de Identidad</label>
                  <input
                    type="text"
                    name="document_id"
                    value={formData.document_id || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none text-sm font-mono text-slate-900"
                    placeholder="Número de cédula o nit"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Teléfono de Contacto</label>
                  <input
                    type="text"
                    name="phone_number"
                    value={formData.phone_number || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none text-sm text-slate-900"
                    placeholder="+57 300 000 0000"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Fecha de Nacimiento</label>
                  <input
                    type="date"
                    name="date_of_birth"
                    value={formData.date_of_birth || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none text-sm text-slate-900"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div className="font-bold text-slate-800 text-xs uppercase tracking-wider border-b border-slate-100 pb-2 font-montserrat">Roles y Control de Acceso</div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Estado del Usuario</span>
                  <span className="text-xs text-slate-500">Si está inactivo, el usuario no podrá acceder al portal.</span>
                </div>
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active ?? true}
                  onChange={handleChange}
                  className="w-4 h-4 text-brand-600 border-slate-300 rounded focus:ring-brand-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Roles Asignados</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 border border-slate-200 rounded-xl bg-slate-50/50">
                  {roles.map((role) => (
                    <label key={role.id} className="flex items-center gap-2.5 p-2.5 bg-white hover:bg-slate-100/80 rounded-xl cursor-pointer text-xs border border-slate-200 transition-all">
                      <input
                        type="checkbox"
                        checked={(formData.role_ids || []).includes(role.id)}
                        onChange={() => handleRoleToggle(role.id)}
                        className="w-4 h-4 text-brand-600 border-slate-300 rounded focus:ring-brand-500 cursor-pointer"
                      />
                      <div>
                        <div className="font-bold text-slate-800">{role.display_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{role.name}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-200 transition-all text-sm cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="user-form"
            disabled={isSaving}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-xl shadow-md shadow-brand-500/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? 'Guardando...' : 'Guardar Usuario'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
