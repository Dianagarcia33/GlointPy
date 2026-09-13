import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Inbox, 
  Send, 
  Search, 
  Mail, 
  FileText, 
  Plus, 
  User, 
  FolderKanban, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Sparkles,
  RefreshCw,
  Lock,
  Key,
  ShieldCheck,
  Trash2
} from 'lucide-react';
import { crmEmailService, CRMEmail, CRMEmailTemplate } from '../../../services/crmEmailService';
import { useAuthStore } from '../../../store/authStore';

export const CRMInboxPage: React.FC = () => {
  const { user } = useAuthStore();
  const [folder, setFolder] = useState<'inbox' | 'sent'>('sent');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<CRMEmail | null>(null);

  // Formulario de Componer Correo
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [sending, setSending] = useState(false);

  // Sincronización IMAP cPanel & Auto-Sync
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [imapPass, setImapPass] = useState('');
  const [savePasswordCheck, setSavePasswordCheck] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [clearingPassword, setClearingPassword] = useState(false);
  const autoSyncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Query: Ajustes de Correo (saber si el usuario tiene contraseña guardada)
  const { data: emailSettings, refetch: refetchSettings } = useQuery({
    queryKey: ['crm_email_settings'],
    queryFn: () => crmEmailService.getEmailSettings()
  });

  const hasSavedPassword = emailSettings?.has_saved_password ?? false;

  // Query: Correos con refresco automático en tiempo real cada 10 segundos
  const { data: emails = [], isLoading: loadingEmails, refetch: refetchEmails } = useQuery<CRMEmail[]>({
    queryKey: ['crm_emails', folder, searchTerm],
    queryFn: () => crmEmailService.getEmails({ folder, search: searchTerm }),
    refetchInterval: 10000,
    refetchIntervalInBackground: true
  });

  // Escuchar eventos en tiempo real desde el WebSocket global para actualizar la bandeja de inmediato
  useEffect(() => {
    const handleEmailReceived = (e: any) => {
      refetchEmails();
      const count = e.detail?.synced_count || 1;
      showToast(`📩 ¡${count === 1 ? 'Nuevo correo entrante recibido' : `${count} nuevos correos recibidos`}!`, 'success');
    };

    window.addEventListener('gloint:email_received', handleEmailReceived);
    return () => {
      window.removeEventListener('gloint:email_received', handleEmailReceived);
    };
  }, [refetchEmails]);

  // Query: Plantillas
  const { data: templates = [] } = useQuery<CRMEmailTemplate[]>({
    queryKey: ['crm_email_templates'],
    queryFn: () => crmEmailService.getTemplates()
  });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Función principal de sincronización (manual o automática en segundo plano)
  const runSync = async (passToSend?: string, shouldSave: boolean = true, isSilent: boolean = false) => {
    try {
      if (!isSilent) setSyncing(true);
      const res = await crmEmailService.syncEmails(passToSend, shouldSave);
      
      if (res.needs_password) {
        if (!isSilent) {
          setIsSyncModalOpen(true);
          if (res.error) {
            showToast(`Contraseña requerida o incorrecta: ${res.error}`, 'error');
          }
        }
      } else if (res.error) {
        if (!isSilent) {
          showToast(`Error al sincronizar: ${res.error}`, 'error');
        }
      } else {
        if (!isSilent) {
          if (res.synced_count > 0) {
            showToast(`¡${res.synced_count} nuevos correos importados!`, 'success');
          } else {
            showToast(res.message || 'Bandeja sincronizada. No hay nuevos correos.', 'success');
          }
        }
        refetchEmails();
        refetchSettings();
      }
    } catch (err: any) {
      if (!isSilent) {
        showToast(err.message || 'Error al conectar con el servidor de correo', 'error');
      }
    } finally {
      if (!isSilent) setSyncing(false);
    }
  };

  // Sincronización automática periódica en segundo plano cuando la contraseña ya está guardada
  useEffect(() => {
    if (hasSavedPassword) {
      // Sincronización inicial inmediata al entrar a la bandeja
      runSync(undefined, true, true);

      // Chequeo periódico con el servidor IMAP cada 25 segundos
      autoSyncIntervalRef.current = setInterval(() => {
        runSync(undefined, true, true);
      }, 25000);
    }

    return () => {
      if (autoSyncIntervalRef.current) {
        clearInterval(autoSyncIntervalRef.current);
      }
    };
  }, [hasSavedPassword]);

  const handleApplyTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const tmpl = templates.find((t) => t.id === templateId);
    if (tmpl) {
      setSubject(tmpl.subject);
      setBodyHtml(tmpl.body_html.trim());
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient.trim() || !subject.trim() || !bodyHtml.trim()) {
      showToast('Por favor completa el destinatario, asunto y cuerpo del mensaje', 'error');
      return;
    }

    try {
      setSending(true);
      await crmEmailService.sendEmail({
        recipient_email: recipient.trim(),
        subject: subject.trim(),
        body_html: bodyHtml
      });
      showToast('¡Correo comercial enviado exitosamente!', 'success');
      setIsComposerOpen(false);
      setRecipient('');
      setSubject('');
      setBodyHtml('');
      refetchEmails();
    } catch (err: any) {
      showToast(err.message || 'Error al enviar el correo', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleSyncIMAPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imapPass.trim() && !hasSavedPassword) {
      showToast('Ingresa la contraseña de tu cuenta institucional para sincronizar', 'error');
      return;
    }
    
    await runSync(imapPass.trim() || undefined, savePasswordCheck, false);
    setIsSyncModalOpen(false);
    setImapPass('');
  };

  const handleClearSavedPassword = async () => {
    try {
      setClearingPassword(true);
      await crmEmailService.updateEmailSettings('');
      showToast('Contraseña de correo eliminada. Ya no se sincronizará automáticamente.', 'success');
      refetchSettings();
      setIsSyncModalOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar la contraseña', 'error');
    } finally {
      setClearingPassword(false);
    }
  };

  const handleSyncButtonClick = () => {
    if (hasSavedPassword) {
      // Sincronización instantánea con 1 clic usando la clave recordada
      runSync(undefined, true, false);
    } else {
      // Abre el modal para configurar la clave por primera vez
      setIsSyncModalOpen(true);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in duration-300">
      
      {/* Header Principal */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute right-0 top-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="relative z-10 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 bg-brand-500/20 text-brand-300 text-xs font-bold rounded-full border border-brand-500/30 uppercase tracking-wider font-montserrat">
              Bandeja Corporativa • Conexión Segura SSL
            </span>
            {hasSavedPassword ? (
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded-full border border-emerald-500/30 flex items-center gap-1.5 font-montserrat">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Auto-Sincronización Activa
              </span>
            ) : (
              <span className="px-3 py-1 bg-amber-500/20 text-amber-300 text-xs font-bold rounded-full border border-amber-500/30 font-montserrat">
                Configuración de clave pendiente
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight font-montserrat">
            Bandeja de Correos Comercial
          </h1>
          <p className="text-slate-300 text-sm max-w-xl">
            Envía propuestas comerciales y sincroniza automáticamente las respuestas de tus prospectos de forma segura y centralizada.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleSyncButtonClick}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all text-xs font-bold border border-white/10 backdrop-blur-sm cursor-pointer font-montserrat disabled:opacity-50"
              title={hasSavedPassword ? "Sincronizar ahora con tu clave guardada" : "Configurar contraseña institucional"}
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin text-brand-300' : ''}`} />
              <span>{syncing ? 'Sincronizando...' : (hasSavedPassword ? 'Sincronizar Ahora' : 'Configurar Sincronización')}</span>
            </button>

            <button
              onClick={() => setIsSyncModalOpen(true)}
              className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all border border-white/10 backdrop-blur-sm cursor-pointer"
              title="Configuración de contraseña de correo"
            >
              <Key className="w-4 h-4" />
            </button>
          </div>
          
          <button
            onClick={() => setIsComposerOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-brand-500 text-white rounded-2xl hover:bg-brand-600 transition-all shadow-lg shadow-brand-500/30 text-sm font-bold cursor-pointer font-montserrat shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Redactar Correo</span>
          </button>
        </div>
      </div>

      {/* Toast Notificación */}
      {toast && (
        <div className={`p-3 text-xs font-bold text-center rounded-2xl font-montserrat ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
          {toast.message}
        </div>
      )}

      {/* Layout de la Bandeja de Entrada */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden grid grid-cols-1 md:grid-cols-4 min-h-[600px]">
        
        {/* Panel Lateral de Carpetas (1 col) */}
        <div className="p-4 bg-slate-50/70 border-b md:border-b-0 md:border-r border-slate-200 space-y-3">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block px-3 font-montserrat">
            Carpetas
          </span>

          <nav className="space-y-1">
            <button
              onClick={() => { setFolder('sent'); setSelectedEmail(null); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all font-montserrat ${
                folder === 'sent' ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20' : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Send className="w-4 h-4" />
                <span>Enviados</span>
              </div>
            </button>

            <button
              onClick={() => { setFolder('inbox'); setSelectedEmail(null); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all font-montserrat ${
                folder === 'inbox' ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20' : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Inbox className="w-4 h-4" />
                <span>Recibidos</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Lista de Correos (1.5 cols en MD) */}
        <div className="md:col-span-1 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col h-full bg-white">
          <div className="p-3.5 border-b border-slate-100">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por asunto o correo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-brand-500 font-sans"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[550px]">
            {loadingEmails ? (
              <div className="p-8 text-center text-xs text-slate-400 font-sans">Cargando correos...</div>
            ) : emails.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 font-sans">No hay correos en esta bandeja.</div>
            ) : (
              emails.map((e) => (
                <div
                  key={e.id}
                  onClick={() => setSelectedEmail(e)}
                  className={`p-4 transition-all cursor-pointer space-y-1.5 ${
                    selectedEmail?.id === e.id ? 'bg-brand-50/70 border-l-4 border-brand-500' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900 truncate font-montserrat">
                      {folder === 'sent' ? e.recipient_email : e.sender_email}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      {new Date(e.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-800 line-clamp-1 font-montserrat leading-tight">{e.subject}</h4>
                  
                  {e.lead_name && (
                    <div className="inline-block px-2 py-0.5 bg-amber-50 text-amber-800 font-bold text-[10px] rounded-md font-montserrat">
                      👤 {e.lead_name}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Visor de Lectura del Correo Seleccionado (1.5 cols en MD) */}
        <div className="md:col-span-2 p-6 flex flex-col h-full bg-slate-50/30">
          {selectedEmail ? (
            <div className="space-y-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs h-full overflow-y-auto">
              <div className="pb-4 border-b border-slate-100 space-y-2">
                <h2 className="text-lg font-extrabold text-slate-900 font-montserrat leading-snug">{selectedEmail.subject}</h2>
                <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
                  <div>
                    <span>De: <strong className="text-slate-800 font-montserrat">{selectedEmail.sender_email}</strong></span>
                    <br />
                    <span>Para: <strong className="text-slate-800 font-montserrat">{selectedEmail.recipient_email}</strong></span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    {new Date(selectedEmail.created_at).toLocaleString()}
                  </span>
                </div>

                {selectedEmail.lead_name && (
                  <div className="pt-1">
                    <span className="px-3 py-1 bg-brand-50 text-brand-700 font-bold text-xs rounded-xl font-montserrat">
                      Prospecto CRM: {selectedEmail.lead_name}
                    </span>
                  </div>
                )}
              </div>

              {/* Cuerpo del Mensaje en HTML */}
              <div
                className="prose prose-sm max-w-none text-slate-800 text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: selectedEmail.body_html }}
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400 space-y-2">
              <Mail className="w-12 h-12 stroke-1 opacity-50 text-slate-300" />
              <p className="text-xs font-semibold font-montserrat">Selecciona un correo para visualizar su contenido.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Redactar Correo Comercial */}
      {isComposerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 font-montserrat">Redactar Correo Comercial</h2>
                  <p className="text-xs text-slate-500">Envía propuestas o seguimiento a través de Resend API</p>
                </div>
              </div>
              <button onClick={() => setIsComposerOpen(false)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-2xl transition-all cursor-pointer">
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleSend} className="space-y-4">
              {/* Selector de Plantilla */}
              {templates.length > 0 && (
                <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-2xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900 font-montserrat">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>Usar Plantilla Prediseñada:</span>
                  </div>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => handleApplyTemplate(e.target.value)}
                    className="bg-white border border-amber-200 text-slate-900 text-xs font-bold py-1.5 px-3 rounded-xl focus:outline-none font-montserrat"
                  >
                    <option value="">Seleccionar plantilla...</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 font-montserrat">Correo Destinatario *</label>
                <input
                  type="email"
                  placeholder="cliente@ejemplo.com"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-brand-500 font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 font-montserrat">Asunto del Mensaje *</label>
                <input
                  type="text"
                  placeholder="Propuesta de Inversión - Gloint International Partners"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-brand-500 font-montserrat font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 font-montserrat">Cuerpo del Mensaje (HTML / Texto) *</label>
                <textarea
                  rows={8}
                  placeholder="Escribe el mensaje comercial..."
                  value={bodyHtml}
                  onChange={(e) => setBodyHtml(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-900 focus:outline-none focus:border-brand-500 font-mono resize-none leading-relaxed"
                />
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsComposerOpen(false)}
                  className="px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-2xl transition-all font-montserrat cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="px-6 py-3 text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 rounded-2xl transition-all shadow-md shadow-brand-500/20 flex items-center gap-2 disabled:opacity-50 font-montserrat cursor-pointer"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Enviar Correo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Sincronizar cPanel IMAP & Configuración */}
      {isSyncModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 font-montserrat">
                    {hasSavedPassword ? 'Configuración de Correo' : 'Activar Sincronización Automática'}
                  </h2>
                  <p className="text-xs text-slate-500">Servicio de Correo IMAP SSL • host81.latinoamericahosting.com</p>
                </div>
              </div>
              <button onClick={() => setIsSyncModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-2xl transition-all cursor-pointer">
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleSyncIMAPSubmit} className="space-y-4">
              {hasSavedPassword ? (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold font-montserrat">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Contraseña guardada y encriptada</span>
                  </div>
                  <p className="text-[11px] text-emerald-700 leading-relaxed font-sans">
                    Tu casilla <strong className="font-montserrat">{user?.email}</strong> se sincroniza automáticamente cada 60 segundos en segundo plano. Si cambiaste tu clave institucional en cPanel, ingrésala abajo para actualizarla.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-2xl text-xs text-blue-900 font-sans leading-relaxed">
                  Ingresa la contraseña de tu cuenta institucional <strong className="font-montserrat">{user?.email}</strong> una sola vez. Se guardará de forma encriptada para sincronizar las respuestas de tus prospectos en segundo plano sin volvértela a pedir.
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 font-montserrat">
                  {hasSavedPassword ? 'Nueva Contraseña (opcional)' : 'Contraseña de la Casilla Corporativa *'}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    value={imapPass}
                    onChange={(e) => setImapPass(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-9 pr-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-brand-500 font-mono"
                  />
                </div>
              </div>

              {!hasSavedPassword && (
                <label className="flex items-start gap-2 text-xs text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={savePasswordCheck}
                    onChange={(e) => setSavePasswordCheck(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                  />
                  <span>Recordar contraseña de forma segura para sincronizar automáticamente</span>
                </label>
              )}

              <div className="pt-3 flex items-center justify-between gap-2 border-t border-slate-100">
                {hasSavedPassword ? (
                  <button
                    type="button"
                    disabled={clearingPassword}
                    onClick={handleClearSavedPassword}
                    className="px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-all flex items-center gap-1 font-montserrat cursor-pointer disabled:opacity-50"
                    title="Eliminar la contraseña guardada"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Desvincular clave</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsSyncModalOpen(false)}
                    className="px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-2xl transition-all font-montserrat cursor-pointer"
                  >
                    Cancelar
                  </button>
                )}

                <button
                  type="submit"
                  disabled={syncing || (!hasSavedPassword && !imapPass.trim())}
                  className="px-6 py-3 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-2xl transition-all shadow-md shadow-blue-600/20 flex items-center gap-2 disabled:opacity-50 font-montserrat cursor-pointer ml-auto"
                >
                  {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  <span>{hasSavedPassword && !imapPass.trim() ? 'Sincronizar Ahora' : 'Guardar & Sincronizar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
