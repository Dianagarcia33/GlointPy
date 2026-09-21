import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ShieldAlert, User, IdCard, Phone, Calendar, Mail, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
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

      // Actualizar estado global del usuario (pone must_update_profile = false y cierra el modal)
      setUser(updatedUser);
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'Error al guardar los datos de perfil. Por favor verifica los campos.');
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-amber-200/80 overflow-hidden font-inter">
        {/* Banner Superior de Advertencia Obligatoria */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-orange-500 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="mx-auto w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-3 shadow-inner ring-4 ring-white/10">
            <ShieldAlert className="w-8 h-8 text-white drop-shadow-sm" />
          </div>
          <h2 className="text-xl font-black font-montserrat tracking-tight">
            Actualización Obligatoria de Datos
          </h2>
          <p className="text-amber-100 text-xs sm:text-sm mt-1 max-w-md mx-auto">
            Por políticas de seguridad y validación de identidad de Gloint, debes confirmar y actualizar tu información antes de continuar.
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-4">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-700 text-xs sm:text-sm animate-in shake duration-200">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs sm:text-sm">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
              <span>¡Datos actualizados correctamente! Desbloqueando...</span>
            </div>
          )}

          <div className="space-y-4">
            {/* Nombre Completo */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-600" />
                <span>Nombre Completo *</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Juan Pérez"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all font-medium"
              />
            </div>

            {/* Correo Electrónico */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-amber-600" />
                <span>Correo Electrónico *</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all font-medium"
              />
            </div>

            {/* Fila: Cédula / Documento y Teléfono */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <IdCard className="w-3.5 h-3.5 text-amber-600" />
                  <span>Documento de Identidad *</span>
                </label>
                <input
                  type="text"
                  required
                  value={documentId}
                  onChange={(e) => setDocumentId(e.target.value)}
                  placeholder="Ej. 1020304050"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-amber-600" />
                  <span>Teléfono / WhatsApp *</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Ej. +57 300 123 4567"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all font-medium"
                />
              </div>
            </div>

            {/* Fecha de Nacimiento */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                <span>Fecha de Nacimiento *</span>
              </label>
              <input
                type="date"
                required
                max={new Date().toISOString().split('T')[0]}
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all font-medium"
              />
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-3 px-6 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold rounded-2xl shadow-lg shadow-amber-500/25 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 text-sm font-montserrat"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Validando y guardando datos...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Guardar y Continuar</span>
                </>
              )}
            </button>
            <p className="text-center text-[11px] text-slate-400 mt-2">
              Esta ventana desaparecerá de inmediato una vez guardes tu información.
            </p>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
