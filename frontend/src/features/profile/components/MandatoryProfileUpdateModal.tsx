import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ShieldAlert, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { usersService } from '../../../services/users';

export const MandatoryProfileUpdateModal: React.FC = () => {
  const { user, setUser } = useAuthStore();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [documentId, setDocumentId] = useState(user?.document_id || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number || '');
  const [dateOfBirth, setDateOfBirth] = useState(() => {
    if (!user?.date_of_birth) return '';
    try {
      return String(user.date_of_birth).split('T')[0];
    } catch {
      return '';
    }
  });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Por favor ingresa tu nombre completo.');
      return;
    }
    if (!documentId.trim()) {
      setError('El documento de identidad es obligatorio.');
      return;
    }
    if (!phoneNumber.trim()) {
      setError('El número de teléfono o celular es obligatorio.');
      return;
    }
    if (!dateOfBirth) {
      setError('Por favor indica tu fecha de nacimiento.');
      return;
    }

    try {
      setIsSaving(true);
      const updatedUser = await usersService.updateMyProfile({
        name: name.trim(),
        email: email.trim(),
        document_id: documentId.trim(),
        phone_number: phoneNumber.trim(),
        date_of_birth: dateOfBirth,
      });

      // Asegurar que must_update_profile sea explícitamente falso
      const finalUser = {
        ...updatedUser,
        must_update_profile: false,
      };

      // Actualizar estado global del usuario
      setUser(finalUser);
      setSuccess(true);
      
      // Cerrar modal de inmediato
      setTimeout(() => {
        setIsDismissed(true);
      }, 400);
    } catch (err: any) {
      setError(err?.message || 'Error al guardar los datos de perfil. Por favor verifica los campos.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isDismissed) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 font-inter">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Estandarizado de la App */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-100 text-brand-700 rounded-xl">
              <ShieldAlert className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Actualización Obligatoria de Datos</h3>
              <p className="text-xs text-slate-500">Completa tu información personal antes de continuar</p>
            </div>
          </div>
        </div>

        {/* Formulario y Contenido */}
        <div className="overflow-y-auto p-6 flex-1 space-y-5">
          {/* Banner Informativo */}
          <div className="bg-amber-50/80 p-4 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
            <span className="font-bold text-amber-950 block font-montserrat">Validación de Perfil Requerida</span>
            <p className="text-amber-800">
              Por políticas de seguridad y cumplimiento de la plataforma, debes validar y actualizar tu información de contacto e identidad.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-700 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>¡Datos actualizados correctamente! Desbloqueando plataforma...</span>
            </div>
          )}

          <form id="mandatory-profile-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="font-bold text-slate-800 text-xs uppercase tracking-wider border-b border-slate-100 pb-2 font-montserrat">
              Información Personal
            </div>

            {/* Nombre Completo */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Nombre Completo <span className="text-red-500 font-bold">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Juan Pérez"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white transition-all font-medium"
              />
            </div>

            {/* Correo Electrónico */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Correo Electrónico <span className="text-red-500 font-bold">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white transition-all font-medium"
              />
            </div>

            {/* Fila: Documento y Teléfono */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Documento de Identidad <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={documentId}
                  onChange={(e) => setDocumentId(e.target.value)}
                  placeholder="Ej. 1020304050"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white transition-all font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Teléfono / WhatsApp <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Ej. +57 300 123 4567"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white transition-all font-medium"
                />
              </div>
            </div>

            {/* Fecha de Nacimiento */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Fecha de Nacimiento <span className="text-red-500 font-bold">*</span>
              </label>
              <input
                type="date"
                required
                max={new Date().toISOString().split('T')[0]}
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white transition-all font-medium"
              />
            </div>
          </form>
        </div>

        {/* Footer Estandarizado de la App */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-slate-400">
            Los datos se guardan de forma encriptada y segura.
          </p>
          <button
            type="submit"
            form="mandatory-profile-form"
            disabled={isSaving}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-xl shadow-md shadow-brand-500/20 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <span>Guardar y Continuar</span>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
