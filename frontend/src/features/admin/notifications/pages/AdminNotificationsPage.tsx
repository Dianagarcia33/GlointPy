import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Send, 
  Bell, 
  Users, 
  ShieldCheck, 
  AlertTriangle, 
  Rocket, 
  Megaphone, 
  CheckCircle2, 
  Loader2, 
  History, 
  ExternalLink, 
  Search, 
  Smartphone, 
  Sparkles,
  Info,
  Radio
} from 'lucide-react';
import { 
  notificationAdminService, 
  AdminBroadcastLogItem, 
  TargetOptionsResponse 
} from '../../../../services/notificationAdmin';

export const AdminNotificationsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'send' | 'history'>('send');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'sistema' | 'anuncio' | 'mantenimiento' | 'alerta'>('sistema');
  const [targetAudience, setTargetAudience] = useState<'all' | 'role' | 'specific_users'>('all');
  const [targetRoleId, setTargetRoleId] = useState<number | undefined>(undefined);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [link, setLink] = useState('');
  const [sendPush, setSendPush] = useState(true);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // History Search
  const [historySearch, setHistorySearch] = useState('');

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Query Options (Roles & Users list)
  const { data: targetOptions, isLoading: isLoadingOptions } = useQuery<TargetOptionsResponse>({
    queryKey: ['admin_notification_target_options'],
    queryFn: () => notificationAdminService.getTargetOptions()
  });

  // Query History
  const { data: historyList, isLoading: isLoadingHistory, refetch: refetchHistory } = useQuery<AdminBroadcastLogItem[]>({
    queryKey: ['admin_notification_history'],
    queryFn: () => notificationAdminService.getBroadcastHistory(50),
    enabled: activeTab === 'history'
  });

  useEffect(() => {
    if (targetOptions?.roles && targetOptions.roles.length > 0 && !targetRoleId) {
      setTargetRoleId(targetOptions.roles[0].id);
    }
  }, [targetOptions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      showToast('Por favor completa el título y mensaje de la notificación', 'error');
      return;
    }
    if (targetAudience === 'specific_users' && selectedUserIds.length === 0) {
      showToast('Por favor selecciona al menos un usuario destinatario', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        message: message.trim(),
        type,
        target_audience: targetAudience,
        target_role_id: targetAudience === 'role' ? targetRoleId : undefined,
        target_user_ids: targetAudience === 'specific_users' ? selectedUserIds : undefined,
        link: link.trim() || undefined,
        send_push: sendPush
      };

      const res = await notificationAdminService.sendBroadcast(payload);
      showToast(`¡Notificación enviada exitosamente a ${res.recipients_count} usuarios!`, 'success');

      // Reset form
      setTitle('');
      setMessage('');
      setLink('');
      setSelectedUserIds([]);

      refetchHistory();
    } catch (err: any) {
      showToast(err.message || 'Error al enviar la notificación masiva', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleUserSelection = (userId: number) => {
    if (selectedUserIds.includes(userId)) {
      setSelectedUserIds(selectedUserIds.filter(id => id !== userId));
    } else {
      setSelectedUserIds([...selectedUserIds, userId]);
    }
  };

  const filteredUsers = targetOptions?.users.filter(u => 
    u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    (u.document_id && u.document_id.includes(userSearchTerm))
  ) || [];

  const filteredHistory = historyList?.filter(item => 
    item.title.toLowerCase().includes(historySearch.toLowerCase()) ||
    item.message.toLowerCase().includes(historySearch.toLowerCase()) ||
    (item.sender_name && item.sender_name.toLowerCase().includes(historySearch.toLowerCase()))
  ) || [];

  const getTypeBadge = (t: string) => {
    switch (t) {
      case 'sistema':
        return <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-bold rounded-lg text-xs flex items-center gap-1 border border-blue-200"><Rocket className="w-3.5 h-3.5" /> Actualización</span>;
      case 'anuncio':
        return <span className="px-2.5 py-1 bg-purple-50 text-purple-700 font-bold rounded-lg text-xs flex items-center gap-1 border border-purple-200"><Megaphone className="w-3.5 h-3.5" /> Anuncio Oficial</span>;
      case 'mantenimiento':
      case 'alerta':
        return <span className="px-2.5 py-1 bg-amber-50 text-amber-700 font-bold rounded-lg text-xs flex items-center gap-1 border border-amber-200"><AlertTriangle className="w-3.5 h-3.5" /> Mantenimiento</span>;
      default:
        return <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-1 border border-slate-200"><Bell className="w-3.5 h-3.5" /> General</span>;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in duration-300">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl shadow-2xl border flex items-center gap-3 text-sm font-semibold animate-in slide-in-from-bottom-5 duration-300 ${
          toast.type === 'success' ? 'bg-slate-900 text-emerald-400 border-emerald-500/30' : 'bg-red-950 text-red-300 border-red-500/30'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Main Executive Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute right-0 top-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-brand-500/20 text-brand-300 rounded-full text-xs font-bold border border-brand-500/30 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 animate-pulse text-brand-400" />
              Módulo de Difusión Masiva
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight font-montserrat">
            Notificaciones Administrativas
          </h1>
          <p className="text-slate-300 text-sm max-w-xl">
            Envío de comunicados oficiales, avisos de mantenimiento, actualizaciones del sistema y alertas push masivas o segmentadas.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="relative z-10 flex bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700/80 backdrop-blur-sm shrink-0">
          <button
            onClick={() => setActiveTab('send')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'send' 
                ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30' 
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Send className="w-4 h-4" />
            Redactar Comunicado
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'history' 
                ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30' 
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <History className="w-4 h-4" />
            Historial de Envíos
          </button>
        </div>
      </div>

      {/* Tab 1: Redactar y Enviar Comunicado */}
      {activeTab === 'send' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Formulario Principal (8 columnas) */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-6">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-brand-50 text-brand-700 rounded-2xl">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Nueva Notificación</h3>
                  <p className="text-xs text-slate-500">Configura la audiencia y el contenido del comunicado</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Tipo de Notificación */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  1. Tipo de Notificación / Comunicado *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setType('sistema')}
                    className={`p-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center gap-2 cursor-pointer ${
                      type === 'sistema'
                        ? 'bg-blue-50 border-blue-500 text-blue-800 shadow-sm ring-2 ring-blue-500/20'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Rocket className="w-5 h-5 text-blue-600" />
                    <span>🚀 Actualización</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setType('anuncio')}
                    className={`p-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center gap-2 cursor-pointer ${
                      type === 'anuncio'
                        ? 'bg-purple-50 border-purple-500 text-purple-800 shadow-sm ring-2 ring-purple-500/20'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Megaphone className="w-5 h-5 text-purple-600" />
                    <span>📢 Anuncio</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setType('mantenimiento')}
                    className={`p-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center gap-2 cursor-pointer ${
                      type === 'mantenimiento'
                        ? 'bg-amber-50 border-amber-500 text-amber-800 shadow-sm ring-2 ring-amber-500/20'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <span>⚠️ Mantenimiento</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setType('alerta')}
                    className={`p-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center gap-2 cursor-pointer ${
                      type === 'alerta'
                        ? 'bg-red-50 border-red-500 text-red-800 shadow-sm ring-2 ring-red-500/20'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Bell className="w-5 h-5 text-red-600" />
                    <span>🔔 Alerta Urente</span>
                  </button>
                </div>
              </div>

              {/* Seleccionar Audiencia Destino */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  2. Audiencia Destino (¿A quién va dirigido?) *
                </label>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setTargetAudience('all')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      targetAudience === 'all'
                        ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    🌐 Todos los Usuarios
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetAudience('role')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      targetAudience === 'role'
                        ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    👥 Por Rol Específico
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetAudience('specific_users')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      targetAudience === 'specific_users'
                        ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    👤 Usuarios Seleccionados
                  </button>
                </div>

                {/* Selector de Rol */}
                {targetAudience === 'role' && (
                  <div className="bg-slate-50 p-4 border border-slate-200 rounded-2xl space-y-2 animate-in fade-in duration-200">
                    <label className="block text-xs font-bold text-slate-800">
                      Selecciona el Rol Destinatario *
                    </label>
                    <select
                      value={targetRoleId || ''}
                      onChange={(e) => setTargetRoleId(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    >
                      {targetOptions?.roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} {r.description ? `(${r.description})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Selector de Usuarios Específicos */}
                {targetAudience === 'specific_users' && (
                  <div className="bg-slate-50 p-4 border border-slate-200 rounded-2xl space-y-3 animate-in fade-in duration-200">
                    <div className="flex justify-between items-center">
                      <label className="block text-xs font-bold text-slate-800">
                        Buscar y Seleccionar Usuarios ({selectedUserIds.length} seleccionados)
                      </label>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        value={userSearchTerm}
                        onChange={(e) => setUserSearchTerm(e.target.value)}
                        placeholder="Filtrar por nombre, email o cédula..."
                        className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      />
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-1 bg-white p-2 border border-slate-200 rounded-xl divide-y divide-slate-100">
                      {filteredUsers.map((u) => {
                        const isChecked = selectedUserIds.includes(u.id);
                        return (
                          <label
                            key={u.id}
                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-xs ${
                              isChecked ? 'bg-brand-50/80 text-brand-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="space-y-0.5">
                              <span className="block">{u.name}</span>
                              <span className="text-[11px] text-slate-400 font-normal">{u.email} {u.document_id ? `• Doc: ${u.document_id}` : ''}</span>
                            </div>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleUserSelection(u.id)}
                              className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300 cursor-pointer"
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Título de la Notificación */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  3. Título del Comunicado *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej. 🚀 Actualización del Sistema v2.4 disponible..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  required
                />
              </div>

              {/* Mensaje de la Notificación */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  4. Mensaje / Contenido Completo *
                </label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Escribe el mensaje detallado que recibirán los usuarios en su centro de notificaciones y alerta push..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  required
                />
              </div>

              {/* Enlace Opcional */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  5. Enlace o Ruta Interna <span className="text-slate-400 font-normal">(Opcional)</span>
                </label>
                <input
                  type="text"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="Ej. /dashboard, /investments o https://..."
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              {/* Checkbox Notificación Push FCM */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendPush}
                    onChange={(e) => setSendPush(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-brand-600" />
                      Enviar Alerta Push a Dispositivos Móviles / Web (FCM)
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Despacha una notificación emergente a los navegadores o teléfonos con sesión activa.
                    </span>
                  </div>
                </label>
              </div>

              {/* Botón de Envío */}
              <button
                type="submit"
                disabled={isSubmitting || !title.trim() || !message.trim()}
                className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-brand-600/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Procesando Envío Masivo...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Transmitir Notificación Ahora
                  </>
                )}
              </button>

            </form>

          </div>

          {/* Previsualización en Vivo (5 columnas) */}
          <div className="lg:col-span-5 space-y-6 sticky top-6">
            <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand-400 animate-spin" style={{ animationDuration: '4s' }} />
                  <span className="text-xs font-bold text-slate-200">Previsualización en Vivo</span>
                </div>
                <span className="px-2 py-0.5 bg-brand-500/20 text-brand-300 text-[10px] font-bold rounded-md">
                  VISTA PREVIA
                </span>
              </div>

              {/* Simulation 1: In-App Notification Card */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  1. En Tarjeta de Notificaciones (In-App):
                </span>
                <div className="bg-white text-slate-800 p-4 rounded-2xl shadow-lg border border-slate-200 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {getTypeBadge(type)}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">Hace 1 min</span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 leading-snug">
                    {title || 'Título de la Notificación'}
                  </h4>
                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {message || 'Aquí se mostrará el mensaje completo redactado por el administrador.'}
                  </p>
                  {link && (
                    <div className="pt-2 border-t border-slate-100 flex items-center gap-1 text-[11px] text-brand-600 font-bold">
                      <ExternalLink className="w-3 h-3" />
                      <span>Ir a {link}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Simulation 2: Mobile Push Notification Banner */}
              {sendPush && (
                <div className="space-y-1.5 pt-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                    <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                    2. En Pantalla del Dispositivo (Notificación Push):
                  </span>
                  <div className="bg-slate-800/90 backdrop-blur-md text-white p-3.5 rounded-2xl border border-slate-700/80 shadow-xl space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="font-bold text-brand-400 flex items-center gap-1">
                        <Radio className="w-3 h-3 text-brand-400" /> GLOINT APP
                      </span>
                      <span>Ahora</span>
                    </div>
                    <p className="font-bold text-xs text-white truncate">
                      {title || 'Título del Comunicado Push'}
                    </p>
                    <p className="text-[11px] text-slate-300 line-clamp-2">
                      {message || 'Vista previa de la alerta emergente Push...'}
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-800/80 flex items-center gap-2 text-xs text-slate-400">
                <Info className="w-4 h-4 text-brand-400 shrink-0" />
                <span>Los cambios redactados a la izquierda se reflejan automáticamente en esta vista.</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Tab 2: Historial de Comunicados Masivos */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Historial de Comunicaciones Enviadas</h3>
              <p className="text-xs text-slate-500">Registro completo y auditoría de notificaciones masivas</p>
            </div>

            <div className="relative w-full sm:w-72">
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Buscar en historial..."
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

          {isLoadingHistory ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
              <span className="text-xs font-semibold">Cargando historial de envíos...</span>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
              <History className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">No hay comunicaciones registradas</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Las notificaciones masivas o avisos de sistema que transmitas aparecerán registradas aquí.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Título & Mensaje</th>
                    <th className="py-3 px-4">Audiencia Destino</th>
                    <th className="py-3 px-4 text-center">Destinatarios</th>
                    <th className="py-3 px-4">Emitido Por</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-4 font-mono whitespace-nowrap text-slate-500">
                        {item.created_at ? new Date(item.created_at).toLocaleString('es-CO') : 'N/A'}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        {getTypeBadge(item.type)}
                      </td>
                      <td className="py-4 px-4 space-y-1 max-w-md">
                        <span className="font-bold text-slate-900 block text-xs">{item.title}</span>
                        <p className="text-slate-500 text-[11px] line-clamp-2 leading-relaxed">{item.message}</p>
                        {item.link && (
                          <span className="text-[10px] font-mono text-brand-600 block">Link: {item.link}</span>
                        )}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap font-semibold">
                        {item.target_audience === 'all' && <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-bold">🌐 Todos</span>}
                        {item.target_audience === 'role' && <span className="px-2 py-0.5 bg-brand-50 text-brand-800 rounded font-bold">👥 Rol: {item.target_role_name || 'N/A'}</span>}
                        {item.target_audience === 'specific_users' && <span className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded font-bold">👤 Específicos</span>}
                      </td>
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 font-extrabold rounded-lg text-xs border border-emerald-200">
                          {item.recipients_count} usuarios
                        </span>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap text-slate-600 font-bold">
                        {item.sender_name || 'Administrador'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
