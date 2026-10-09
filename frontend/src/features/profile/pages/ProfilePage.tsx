import React, { useState, useEffect } from 'react';
import { 
  User as UserIcon, 
  Mail, 
  Phone, 
  IdCard, 
  Calendar, 
  Lock, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Eye, 
  EyeOff, 
  KeyRound, 
  Shield
} from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { usersService } from '../../../services/users';

export const ProfilePage: React.FC = () => {
  const { user, setUser } = useAuthStore();

  // Active tab: 'personal' | 'security'
  const [activeTab, setActiveTab] = useState<'personal' | 'security'>('personal');

  // Personal Info Form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Security Form (Change Password)
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Load user data on mount
  useEffect(() => {
    let isMounted = true;

    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setDocumentId(user.document_id || '');
      setPhoneNumber(user.phone_number || '');
      if (user.date_of_birth) {
        try {
          setDateOfBirth(String(user.date_of_birth).split('T')[0]);
        } catch {
          setDateOfBirth('');
        }
      }
    }

    usersService.getMyProfile()
      .then((freshUser) => {
        if (!isMounted || !freshUser) return;
        setUser(freshUser as any);
        setName(freshUser.name || '');
        setEmail(freshUser.email || '');
        setDocumentId(freshUser.document_id || '');
        setPhoneNumber(freshUser.phone_number || '');
        if (freshUser.date_of_birth) {
          try {
            setDateOfBirth(String(freshUser.date_of_birth).split('T')[0]);
          } catch {
            setDateOfBirth('');
          }
        }
      })
      .catch((err) => {
        console.warn('No se pudo refrescar el perfil completo desde la API:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Handle personal profile submit
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    if (!name.trim()) {
      setProfileError('El nombre completo es requerido.');
      return;
    }
    if (!email.trim()) {
      setProfileError('El correo electrónico es requerido.');
      return;
    }

    try {
      setIsSavingProfile(true);
      const updatedUser = await usersService.updateMyProfile({
        name: name.trim(),
        email: email.trim(),
        document_id: documentId.trim() || undefined,
        phone_number: phoneNumber.trim() || undefined,
        date_of_birth: dateOfBirth || undefined,
      });

      setUser(updatedUser);
      setProfileSuccess('¡Tu información de perfil se ha actualizado correctamente!');
      setTimeout(() => setProfileSuccess(null), 5000);
    } catch (err: any) {
      setProfileError(err?.message || 'Error al actualizar el perfil.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle change password submit
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError('Por favor ingresa tu contraseña actual.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPasswordError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('La confirmación de la contraseña no coincide.');
      return;
    }

    try {
      setIsSavingPassword(true);
      await usersService.changeMyPassword({
        current_password: currentPassword,
        new_password: newPassword,
      });

      setPasswordSuccess('¡Tu contraseña ha sido actualizada con éxito!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(null), 5000);
    } catch (err: any) {
      setPasswordError(err?.message || 'Error al cambiar la contraseña. Verifica tu clave actual.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const roles = user?.roles_list || (user?.roles?.map((r: any) => typeof r === 'string' ? r : r.name) || []);

  return (
    <div className="w-full max-w-7xl mx-auto min-w-0 pb-20 space-y-6 animate-in fade-in duration-300">
      
      {/* 🏛️ 1. Encabezado de Página (Estándar Soporte en Tickets) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight font-montserrat flex items-center gap-2.5">
            <span className="p-2 bg-brand-50 text-brand-600 border border-brand-200 rounded-2xl inline-flex shadow-xs">
              <UserIcon className="w-6 h-6" />
            </span>
            Mi Perfil de Usuario
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Gestiona tu información personal y credenciales de acceso de forma segura en la plataforma
          </p>
        </div>

        {/* Roles y Badges (Alineados a la derecha del Header) */}
        <div className="flex flex-wrap items-center gap-2">
          {user?.is_active ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-2xl border border-emerald-200 font-montserrat">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Cuenta Verificada
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-2xl border border-slate-200 font-montserrat">
              Inactiva
            </span>
          )}
          {user?.is_superuser && (
            <span className="px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-2xl text-xs font-bold font-montserrat flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-rose-600" />
              Super Admin
            </span>
          )}
          {roles.map((roleName: string, idx: number) => (
            <span 
              key={idx} 
              className="px-3 py-1.5 bg-brand-50 text-brand-700 border border-brand-200 rounded-2xl text-xs font-bold font-montserrat uppercase tracking-wider"
            >
              {roleName}
            </span>
          ))}
        </div>
      </div>

      {/* 📊 2. Cuadrícula de Métricas KPI (4-Stat Cards exactas al Mercado de Acciones) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Nombre del Titular */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Titular de la Cuenta</span>
            <UserIcon className="w-4 h-4 text-brand-600" />
          </div>
          <span className="text-xl font-black text-slate-900 font-montserrat block truncate">
            {user?.name || 'Usuario'}
          </span>
          <span className="text-[11px] text-slate-500 font-medium block">
            ID de usuario: #{user?.id}
          </span>
        </div>

        {/* Card 2: Documento de Identidad */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Documento de Identidad</span>
            <IdCard className="w-4 h-4 text-indigo-600" />
          </div>
          <span className="text-xl font-black text-slate-900 font-mono block">
            {user?.document_id || 'Sin registrar'}
          </span>
          <span className="text-[11px] text-slate-500 font-medium block">
            {user?.document_id ? 'Identificación registrada' : 'Pendiente por registrar'}
          </span>
        </div>

        {/* Card 3: Teléfono / WhatsApp */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Teléfono / WhatsApp</span>
            <Phone className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-xl font-black text-emerald-600 font-mono block truncate">
            {user?.phone_number || 'Sin registrar'}
          </span>
          <span className="text-[11px] text-slate-500 font-medium block">
            Canal oficial de contacto
          </span>
        </div>

        {/* Card 4: Correo Electrónico */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Correo Electrónico</span>
            <Mail className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-base sm:text-lg font-black text-slate-900 font-mono block truncate" title={user?.email}>
            {user?.email || 'Sin correo'}
          </span>
          <span className="text-[11px] text-slate-500 font-medium block">
            Acceso principal al sistema
          </span>
        </div>
      </div>

      {/* 🎛️ 3. Pestañas de Navegación Segmentadas (Pill Controls) */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100/80 rounded-2xl w-fit border border-slate-200/80">
        <button
          type="button"
          onClick={() => setActiveTab('personal')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer font-montserrat ${
            activeTab === 'personal'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Datos Personales
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer font-montserrat ${
            activeTab === 'security'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Seguridad & Contraseña
        </button>
      </div>

      {/* 📝 4. TAB CONTENT: DATOS PERSONALES */}
      {activeTab === 'personal' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base sm:text-lg font-black text-slate-900 font-montserrat">
              Información Personal del Titular
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Actualiza tus datos para mantener al día tus contratos y cuentas bancarias asociadas
            </p>
          </div>

          {profileSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs font-semibold animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{profileSuccess}</span>
            </div>
          )}

          {profileError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-700 text-xs font-semibold animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleProfileSubmit} className="space-y-4 max-w-3xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Nombre Completo <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre completo"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-brand-500 focus:bg-white outline-hidden transition-all text-sm font-sans"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Correo Electrónico <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-brand-500 focus:bg-white outline-hidden transition-all text-sm font-sans"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Cédula o Documento de Identidad
                </label>
                <input
                  type="text"
                  value={documentId}
                  onChange={(e) => setDocumentId(e.target.value)}
                  placeholder="Ej. 1020304050"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-brand-500 focus:bg-white outline-hidden transition-all text-sm font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Teléfono / WhatsApp
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Ej. +57 300 123 4567"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-brand-500 focus:bg-white outline-hidden transition-all text-sm font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Fecha de Nacimiento
              </label>
              <input
                type="date"
                max={new Date().toISOString().split('T')[0]}
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full sm:w-1/2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-brand-500 focus:bg-white outline-hidden transition-all text-sm font-mono"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">
                Los campos con <span className="text-rose-500 font-bold">*</span> son requeridos.
              </span>

              <button
                type="submit"
                disabled={isSavingProfile}
                className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-2xl text-xs font-bold transition-all shadow-sm shadow-brand-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50 font-montserrat"
              >
                {isSavingProfile ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Guardar Información</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 🔐 5. TAB CONTENT: SEGURIDAD Y CONTRASEÑA */}
      {activeTab === 'security' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base sm:text-lg font-black text-slate-900 font-montserrat">
              Cambiar Contraseña de Acceso
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Te recomendamos utilizar una contraseña de al menos 6 caracteres con letras, números y símbolos
            </p>
          </div>

          {passwordSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs font-semibold animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-700 text-xs font-semibold animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-2xl">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Contraseña Actual <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-brand-500 focus:bg-white outline-hidden transition-all text-sm font-mono pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Nueva Contraseña <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-brand-500 focus:bg-white outline-hidden transition-all text-sm font-mono pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Confirmar Nueva Contraseña <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite la contraseña"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-brand-500 focus:bg-white outline-hidden transition-all text-sm font-mono pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
              <button
                type="submit"
                disabled={isSavingPassword}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50 font-montserrat"
              >
                {isSavingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Actualizando...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Actualizar Contraseña</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
