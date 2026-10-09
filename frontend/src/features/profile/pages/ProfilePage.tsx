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
  Shield, 
  Sparkles,
  ShieldCheck,
  Layers,
  Clock,
  Copy,
  Check,
  FileCheck2,
  LockKeyhole
} from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { usersService } from '../../../services/users';

export const ProfilePage: React.FC = () => {
  const { user, setUser } = useAuthStore();

  // Active tab: 'personal' | 'security' | 'roles'
  const [activeTab, setActiveTab] = useState<'personal' | 'security' | 'roles'>('personal');

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

  // Copy status feedback
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, field: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

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
  const permissions = user?.permissions || [];
  const primaryRole = user?.is_superuser ? 'Super Admin' : (roles[0] || 'Inversionista');

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in duration-300 font-inter">
      
      {/* 🏛️ 1. Banner de Cabecera Ejecutivo (Design System Gloint) */}
      <div className="bg-slate-950 text-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-xl relative overflow-hidden border border-slate-800/80">
        {/* Glows ambientales sutiles */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar Cuadrado con Iniciales */}
            <div className="relative">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-brand-600 via-brand-500 to-amber-500 flex items-center justify-center text-white text-3xl sm:text-4xl font-black font-montserrat shadow-lg shadow-brand-500/25 border-2 border-white/20 shrink-0">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-slate-950" />
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-brand-300 text-[10px] font-extrabold uppercase tracking-widest border border-white/10 backdrop-blur-xs flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Perfil de Usuario Oficial
                </span>

                {user?.is_active && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Cuenta Activa
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-black font-montserrat tracking-tight text-white">
                {user?.name}
              </h1>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 font-medium">
                <div className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1 rounded-xl border border-slate-800 font-mono">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{user?.email}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(user?.email || '', 'email')}
                    className="ml-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Copiar correo"
                  >
                    {copiedField === 'email' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>

                {user?.document_id && (
                  <div className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1 rounded-xl border border-slate-800 font-mono text-[11px]">
                    <IdCard className="w-3.5 h-3.5 text-slate-400" />
                    <span>ID: {user?.document_id}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Badges de Roles Ejecutivos */}
          <div className="flex flex-wrap gap-2 items-center self-stretch md:self-auto justify-start md:justify-end">
            {user?.is_superuser && (
              <span className="px-3.5 py-1.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-2xl text-xs font-bold font-montserrat flex items-center gap-1.5 shadow-xs">
                <Shield className="w-3.5 h-3.5 text-rose-400" />
                Super Administrador
              </span>
            )}

            {roles.map((roleName: string, idx: number) => (
              <span 
                key={idx} 
                className="px-3.5 py-1.5 bg-brand-500/20 text-brand-300 border border-brand-500/30 rounded-2xl text-xs font-bold font-montserrat uppercase tracking-wider shadow-xs"
              >
                {roleName}
              </span>
            ))}

            {user?.must_update_profile && (
              <span className="px-3.5 py-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-2xl text-xs font-bold flex items-center gap-1.5 animate-pulse">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                Actualización pendiente
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 📊 2. Cuadrícula de Métricas KPI (4-Stat Cards al estilo Mercado de Acciones) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Nivel de Acceso & Rol */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Nivel de Acceso</span>
            <ShieldCheck className="w-4 h-4 text-brand-600" />
          </div>
          <span className="text-xl font-black text-slate-900 font-montserrat block truncate">
            {primaryRole}
          </span>
          <span className="text-[11px] text-slate-500 font-medium block">
            {permissions.length > 0 ? `${permissions.length} permisos PBAC activos` : 'Acceso general al sistema'}
          </span>
        </div>

        {/* Card 2: Documento Oficial */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Identificación Oficial</span>
            <IdCard className="w-4 h-4 text-indigo-600" />
          </div>
          <span className="text-xl font-black text-slate-900 font-mono block">
            {user?.document_id || 'Sin Registrar'}
          </span>
          <span className="text-[11px] text-slate-500 font-medium block">
            {user?.document_id ? 'Documento verificado en custodia' : 'Pendiente de registrar'}
          </span>
        </div>

        {/* Card 3: Teléfono / WhatsApp */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Contacto Registrado</span>
            <Phone className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-xl font-black text-emerald-600 font-mono block truncate">
            {user?.phone_number || 'Sin Registrar'}
          </span>
          <span className="text-[11px] text-slate-500 font-medium block">
            Canal para avisos y notificaciones
          </span>
        </div>

        {/* Card 4: Seguridad y Custodia */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Seguridad Gloint</span>
            <LockKeyhole className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xl font-black text-slate-900 font-montserrat block">
              Protegida
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium block">
            Cifrado TLS 1.3 & Hash PBKDF2
          </span>
        </div>
      </div>

      {/* 🎛️ 3. Pestañas Segmentadas (Pill Segmented Controls) */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100/80 rounded-2xl w-fit border border-slate-200/80">
        <button
          type="button"
          onClick={() => setActiveTab('personal')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer font-montserrat flex items-center gap-2 ${
            activeTab === 'personal'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <UserIcon className="w-3.5 h-3.5" />
          <span>Datos Personales</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer font-montserrat flex items-center gap-2 ${
            activeTab === 'security'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Seguridad & Credenciales</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('roles')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer font-montserrat flex items-center gap-2 ${
            activeTab === 'roles'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Permisos & Roles ({roles.length})</span>
        </button>
      </div>

      {/* 📝 4. TAB CONTENT: DATOS PERSONALES */}
      {activeTab === 'personal' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulario Principal (2 Columnas) */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center border border-brand-200/60">
                  <IdCard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 font-montserrat">
                    Información Personal del Titular
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Actualiza tus datos verificables para la custodia de acciones, contratos y facturación
                  </p>
                </div>
              </div>
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

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-brand-500" />
                    <span>Nombre Completo <span className="text-rose-500">*</span></span>
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
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-brand-500" />
                    <span>Correo Electrónico <span className="text-rose-500">*</span></span>
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
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <IdCard className="w-3.5 h-3.5 text-brand-500" />
                    <span>Cédula o Documento de Identidad</span>
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
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-brand-500" />
                    <span>Teléfono / WhatsApp</span>
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
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-brand-500" />
                  <span>Fecha de Nacimiento</span>
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
                  Los campos marcados con <span className="text-rose-500 font-bold">*</span> son obligatorios.
                </span>

                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-2xl text-xs font-bold transition-all shadow-sm shadow-brand-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50 font-montserrat"
                >
                  {isSavingProfile ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Guardando Cambios...</span>
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

          {/* Sidebar Lateral de Seguridad & KYC (1 Columna) */}
          <div className="space-y-4">
            {/* Tarjeta de Respaldo Contable */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-3xl p-6 space-y-4 shadow-xs">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200/60">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 font-montserrat">
                  Verificación y Cumplimiento KYC
                </h3>
                <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                  Tu cédula y nombre completo deben coincidir con tus cuentas bancarias registradas en la Bóveda para poder procesar pagos de rendimientos, retiros y traspasos de acciones.
                </p>
              </div>

              <div className="p-3 bg-white rounded-2xl border border-slate-200/80 text-xs text-slate-700 space-y-1.5 font-medium">
                <div className="flex items-center gap-2 text-emerald-700 font-bold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Cifrado y Privacidad Asegurada</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Tus datos personales están protegidos conforme a la ley de Habeas Data y políticas de confidencialidad Gloint.
                </p>
              </div>
            </div>

            {/* Caja Oscura Resumen */}
            <div className="bg-slate-900 text-white rounded-3xl p-6 space-y-3 shadow-md border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">ID Interno de Cuenta:</span>
                <span className="font-mono font-bold text-amber-400">#{user?.id}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                <span className="text-slate-400">Estado de Cuenta:</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Activa
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🔐 5. TAB CONTENT: SEGURIDAD Y CONTRASEÑA */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulario de Cambio de Contraseña */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/60">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 font-montserrat">
                    Actualización de Contraseña
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Mantén tus credenciales seguras para proteger tu portafolio y billetera
                  </p>
                </div>
              </div>
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

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
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
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
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
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
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
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50 font-montserrat"
                >
                  {isSavingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Actualizando Contraseña...</span>
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

          {/* Tips de Seguridad */}
          <div className="space-y-4">
            <div className="bg-slate-900 text-white rounded-3xl p-6 space-y-4 shadow-md border border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-black font-montserrat uppercase tracking-wider text-slate-200">
                    Recomendaciones
                  </h3>
                  <span className="text-[10px] text-slate-400">Protege tu cuenta Gloint</span>
                </div>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-300 font-medium border-t border-slate-800 pt-3">
                <li className="flex items-start gap-2">
                  <span className="text-brand-400 font-bold">•</span>
                  <span>Usa una clave de al menos 8 caracteres con números y símbolos.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-brand-400 font-bold">•</span>
                  <span>Nunca compartas tu clave ni la reutilices en otras plataformas.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-brand-400 font-bold">•</span>
                  <span>Al cambiar tu contraseña, se cerrarán sesiones no autorizadas.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 🛡️ 6. TAB CONTENT: PERMISOS & ROLES ASIGNADOS */}
      {activeTab === 'roles' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 font-montserrat">
                  Roles y Políticas de Acceso (PBAC)
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Matriz de permisos asignados a tu cuenta dentro de la plataforma Gloint
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-slate-400 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl self-start sm:self-auto">
              Total Permisos: <strong className="text-slate-900">{permissions.length}</strong>
            </span>
          </div>

          {/* Roles Asignados */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Roles Vinculados
            </span>
            <div className="flex flex-wrap gap-2">
              {roles.length === 0 ? (
                <span className="text-xs text-slate-400 italic">No tienes roles específicos asignados.</span>
              ) : (
                roles.map((r: string, idx: number) => (
                  <div key={idx} className="px-3.5 py-2 rounded-2xl bg-brand-50 border border-brand-200/80 text-brand-800 text-xs font-bold font-montserrat flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-brand-600" />
                    <span>{r}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Lista de Permisos Granulares */}
          <div className="space-y-3 pt-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Permisos Granulares Activos
            </span>

            {permissions.length === 0 ? (
              <div className="p-8 bg-slate-50 rounded-2xl border border-slate-200 text-center text-xs text-slate-400 italic">
                No hay permisos granulares listados para esta cuenta.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-96 overflow-y-auto pr-1">
                {permissions.map((perm: string, idx: number) => (
                  <div 
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-700 text-xs font-mono font-medium flex items-center gap-2 hover:bg-slate-100/70 transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="truncate">{perm}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
