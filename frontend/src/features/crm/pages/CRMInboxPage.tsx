import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
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
  Trash2,
  Reply,
  ExternalLink,
  Minimize2,
  Maximize2,
  X,
  Clock,
  CheckCheck,
  ChevronRight,
  Filter,
  ArrowLeft
} from 'lucide-react';
import { crmEmailService, CRMEmail, CRMEmailTemplate } from '../../../services/crmEmailService';
import { useAuthStore } from '../../../store/authStore';

// Utilidad para extraer snippet de texto plano desde HTML
const getEmailSnippet = (html: string) => {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 95);
};

// Utilidad para formatear fechas relativas elegantes
const formatEmailDate = (dateStr: string) => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
};

export const CRMInboxPage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [folder, setFolder] = useState<'inbox' | 'sent'>('inbox');
  const [filterType, setFilterType] = useState<'all' | 'leads' | 'unread'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<CRMEmail | null>(null);

  // Formulario de Respuesta Rápida (Quick Reply)
  const [quickReplyText, setQuickReplyText] = useState('');
  const [quickReplySending, setQuickReplySending] = useState(false);
  const [isQuickReplyExpanded, setIsQuickReplyExpanded] = useState(false);
  const quickReplyRef = useRef<HTMLTextAreaElement>(null);

  // Formulario Flotante de Redactar Correo (Estilo Gmail)
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isComposerMinimized, setIsComposerMinimized] = useState(false);
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
      showToast(`📩 ¡${count === 1 ? 'Nuevo correo recibido' : `${count} nuevos correos recibidos`}!`, 'success');
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

  const handleApplyTemplate = (templateId: string, target: 'composer' | 'quickReply' = 'composer') => {
    const tmpl = templates.find((t) => t.id === templateId);
    if (!tmpl) return;

    if (target === 'composer') {
      setSelectedTemplateId(templateId);
      setSubject(tmpl.subject);
      setBodyHtml(tmpl.body_html.trim());
    } else {
      setQuickReplyText(tmpl.body_html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
      setIsQuickReplyExpanded(true);
      setTimeout(() => quickReplyRef.current?.focus(), 50);
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

  const handleSendQuickReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmail || !quickReplyText.trim()) return;

    const targetRecipient = selectedEmail.direction === 'inbound' 
      ? selectedEmail.sender_email 
      : selectedEmail.recipient_email;
    
    const replySubject = selectedEmail.subject.toLowerCase().startsWith('re:') 
      ? selectedEmail.subject 
      : `Re: ${selectedEmail.subject}`;

    try {
      setQuickReplySending(true);
      await crmEmailService.sendEmail({
        recipient_email: targetRecipient,
        subject: replySubject,
        body_html: quickReplyText.trim().replace(/\n/g, '<br/>'),
        lead_id: selectedEmail.lead_id || undefined,
        project_id: selectedEmail.project_id || undefined
      });
      showToast('¡Respuesta enviada exitosamente!', 'success');
      setQuickReplyText('');
      setIsQuickReplyExpanded(false);
      refetchEmails();
    } catch (err: any) {
      showToast(err.message || 'Error al enviar respuesta', 'error');
    } finally {
      setQuickReplySending(false);
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
      runSync(undefined, true, false);
    } else {
      setIsSyncModalOpen(true);
    }
  };

  // Filtrado de correos según la pestaña activa
  const filteredEmails = emails.filter((e) => {
    if (filterType === 'leads' && !e.lead_name) return false;
    if (filterType === 'unread' && e.is_read) return false;
    return true;
  });

  const unreadCount = emails.filter((e) => !e.is_read).length;
  const leadsCount = emails.filter((e) => !!e.lead_name).length;

  return (
    <div className="w-full h-[calc(100vh-5.5rem)] flex flex-col space-y-3 pb-2 animate-in fade-in duration-200">
      
      {/* Barra Superior Compacta (Reemplaza al banner gigante y ahorra ~240px de altura) */}
      <div className="bg-white border border-slate-200/80 rounded-2xl px-4 py-2.5 shadow-2xs flex flex-wrap items-center justify-between gap-3 shrink-0">
        
        {/* Título y Estado */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-600 flex items-center justify-center font-bold">
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-extrabold text-slate-900 font-montserrat tracking-tight">
                Bandeja Comercial
              </h1>
              {hasSavedPassword ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/70 text-[10px] font-bold rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Auto-Sync Activo
                </span>
              ) : (
                <button
                  onClick={() => setIsSyncModalOpen(true)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200/70 text-[10px] font-bold rounded-full hover:bg-amber-100 transition-colors cursor-pointer"
                >
                  <Key className="w-2.5 h-2.5" />
                  Configurar Clave
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-sans hidden sm:block">
              {user?.email} • IMAP SSL cPanel
            </p>
          </div>
        </div>

        {/* Buscador Global en la Barra Superior */}
        <div className="flex-1 max-w-md mx-2 hidden md:block">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por asunto, remitente o prospecto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:bg-white transition-all font-sans"
            />
          </div>
        </div>

        {/* Acciones Rápidas */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleSyncButtonClick}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold font-montserrat transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
            title={hasSavedPassword ? "Sincronizar ahora con tu clave guardada" : "Configurar contraseña"}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-brand-600' : 'text-slate-500'}`} />
            <span className="hidden sm:inline">{syncing ? 'Sincronizando...' : 'Sincronizar'}</span>
          </button>

          <button
            onClick={() => setIsSyncModalOpen(true)}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl border border-slate-200 transition-all cursor-pointer shadow-2xs"
            title="Ajustes de contraseña de correo"
          >
            <Key className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              setIsComposerOpen(true);
              setIsComposerMinimized(false);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold font-montserrat transition-all shadow-sm shadow-brand-500/25 cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Redactar</span>
          </button>
        </div>
      </div>

      {/* Toast Notificación */}
      {toast && (
        <div className={`py-1.5 px-4 text-xs font-bold text-center rounded-xl font-montserrat animate-fade-in ${toast.type === 'success' ? 'bg-emerald-500 text-white shadow-sm' : 'bg-rose-500 text-white shadow-sm'}`}>
          {toast.message}
        </div>
      )}

      {/* Workspace de 3 Columnas Proporcional (Full-Height) */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col md:flex-row min-h-0">
        
        {/* Columna 1: Carpetas y Filtros (Estrecha y Eficiente: ~200px) */}
        <div className="w-full md:w-52 shrink-0 border-b md:border-b-0 md:border-r border-slate-200/80 bg-slate-50/40 p-3 flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-2 mb-1.5 font-montserrat">
                Bandejas
              </span>
              <nav className="space-y-1">
                <button
                  onClick={() => { setFolder('inbox'); setSelectedEmail(null); }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition-all font-montserrat cursor-pointer ${
                    folder === 'inbox' 
                      ? 'bg-brand-500 text-white shadow-2xs' 
                      : 'text-slate-600 hover:bg-slate-200/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Inbox className="w-3.5 h-3.5" />
                    <span>Recibidos</span>
                  </div>
                  {folder === 'inbox' && emails.length > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${folder === 'inbox' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>
                      {emails.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => { setFolder('sent'); setSelectedEmail(null); }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition-all font-montserrat cursor-pointer ${
                    folder === 'sent' 
                      ? 'bg-brand-500 text-white shadow-2xs' 
                      : 'text-slate-600 hover:bg-slate-200/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Send className="w-3.5 h-3.5" />
                    <span>Enviados</span>
                  </div>
                  {folder === 'sent' && emails.length > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${folder === 'sent' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>
                      {emails.length}
                    </span>
                  )}
                </button>
              </nav>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-2 mb-1.5 font-montserrat">
                Filtros Rápidos
              </span>
              <div className="space-y-1">
                <button
                  onClick={() => setFilterType('all')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    filterType === 'all' ? 'bg-slate-200/80 text-slate-900 font-bold' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <span>Todos</span>
                  <span className="text-[10px] text-slate-400">{emails.length}</span>
                </button>

                <button
                  onClick={() => setFilterType('leads')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    filterType === 'leads' ? 'bg-amber-100 text-amber-900 font-bold' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Con Prospecto
                  </span>
                  <span className="text-[10px] text-slate-400">{leadsCount}</span>
                </button>

                <button
                  onClick={() => setFilterType('unread')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    filterType === 'unread' ? 'bg-blue-100 text-blue-900 font-bold' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    No leídos
                  </span>
                  <span className="text-[10px] text-slate-400">{unreadCount}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200/80 hidden md:block">
            <div className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200/60 shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-700 truncate font-montserrat">SSL Seguro</p>
                <p className="text-[9px] text-slate-400 truncate font-mono">host81:993</p>
              </div>
            </div>
          </div>
        </div>

        {/* Columna 2: Lista de Correos (~360px) */}
        <div className={`w-full md:w-80 lg:w-96 shrink-0 border-b md:border-b-0 md:border-r border-slate-200/80 flex flex-col h-full bg-white ${selectedEmail ? 'hidden md:flex' : 'flex'}`}>
          
          {/* Header de la lista con contador */}
          <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
            <span className="text-xs font-bold text-slate-700 font-montserrat flex items-center gap-1.5">
              <span>{folder === 'inbox' ? 'Bandeja de Entrada' : 'Correos Enviados'}</span>
              <span className="text-[11px] font-normal text-slate-400">({filteredEmails.length})</span>
            </span>
            {filterType !== 'all' && (
              <button 
                onClick={() => setFilterType('all')} 
                className="text-[10px] font-bold text-brand-600 hover:underline"
              >
                Limpiar filtro
              </button>
            )}
          </div>

          {/* Búsqueda en móvil si no está visible la de arriba */}
          <div className="p-2.5 border-b border-slate-100 md:hidden">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar correos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800"
              />
            </div>
          </div>

          {/* Lista scrolleable con cards estilizadas */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100/80">
            {loadingEmails ? (
              <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
                <span>Cargando correos...</span>
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                <Mail className="w-8 h-8 stroke-1 text-slate-300" />
                <span>No hay correos que coincidan con la búsqueda o filtro.</span>
              </div>
            ) : (
              filteredEmails.map((e) => {
                const targetEmail = folder === 'sent' ? e.recipient_email : e.sender_email;
                const initial = (targetEmail || 'U')[0].toUpperCase();
                const isSelected = selectedEmail?.id === e.id;
                const snippet = getEmailSnippet(e.body_html);

                return (
                  <div
                    key={e.id}
                    onClick={() => setSelectedEmail(e)}
                    className={`p-3 transition-all cursor-pointer space-y-1 relative group ${
                      isSelected 
                        ? 'bg-brand-50/80 border-l-4 border-brand-500' 
                        : !e.is_read 
                          ? 'bg-white font-semibold hover:bg-slate-50/80' 
                          : 'bg-white/60 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Avatar con inicial */}
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${
                          e.lead_name ? 'bg-amber-500' : 'bg-slate-600'
                        }`}>
                          {initial}
                        </div>
                        <span className={`text-xs truncate font-montserrat ${!e.is_read ? 'font-extrabold text-slate-900' : 'font-bold text-slate-700'}`}>
                          {targetEmail}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">
                        {formatEmailDate(e.created_at)}
                      </span>
                    </div>

                    <h4 className={`text-xs line-clamp-1 font-montserrat leading-snug pl-8 ${!e.is_read ? 'font-bold text-slate-900' : 'text-slate-800'}`}>
                      {e.subject || '(Sin asunto)'}
                    </h4>

                    {snippet && (
                      <p className="text-[11px] text-slate-400 line-clamp-2 pl-8 font-sans leading-tight">
                        {snippet}
                      </p>
                    )}
                    
                    {e.lead_name && (
                      <div className="pl-8 pt-0.5">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 bg-amber-50 text-amber-800 font-bold text-[9px] rounded-md border border-amber-200/60 font-montserrat">
                          👤 {e.lead_name}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Columna 3: Visor de Lectura & Respuesta Rápida (Ocupa todo el ancho restante) */}
        <div className={`flex-1 flex flex-col h-full bg-slate-50/20 overflow-hidden ${!selectedEmail ? 'hidden md:flex' : 'flex'}`}>
          {selectedEmail ? (
            <div className="flex flex-col h-full overflow-hidden">
              
              {/* Barra de Acciones del Correo Abierto */}
              <div className="px-5 py-3 border-b border-slate-200/80 bg-white flex items-center justify-between gap-3 shrink-0 shadow-2xs">
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    onClick={() => setSelectedEmail(null)}
                    className="md:hidden p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                    title="Volver a la lista"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <h2 className="text-sm md:text-base font-extrabold text-slate-900 font-montserrat truncate">
                    {selectedEmail.subject || '(Sin asunto)'}
                  </h2>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {selectedEmail.lead_id && (
                    <button
                      onClick={() => navigate('/dashboard/crm')}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold font-montserrat transition-all"
                      title="Ver ficha completa en el CRM"
                    >
                      <span>Prospecto: {selectedEmail.lead_name}</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setIsQuickReplyExpanded(true);
                      setTimeout(() => quickReplyRef.current?.focus(), 50);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 rounded-lg text-xs font-bold font-montserrat transition-all"
                  >
                    <Reply className="w-3.5 h-3.5" />
                    <span>Responder</span>
                  </button>
                </div>
              </div>

              {/* Contenedor scrolleable con los Detalles y Cuerpo del Mensaje */}
              <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-4">
                {/* Ficha del Remitente / Destinatario */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-sm">
                        {(selectedEmail.sender_email || 'U')[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-900 font-montserrat">
                            {selectedEmail.sender_email}
                          </p>
                          {selectedEmail.direction === 'inbound' && (
                            <span className="px-1.5 py-0.2 bg-blue-50 text-blue-700 border border-blue-200/60 rounded text-[9px] font-bold">
                              Entrante
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-sans">
                          Para: <span className="text-slate-700 font-medium">{selectedEmail.recipient_email}</span>
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400 font-mono shrink-0">
                      {new Date(selectedEmail.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Contenido HTML del Mensaje */}
                <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200/80 shadow-2xs min-h-[220px]">
                  <div
                    className="prose prose-sm max-w-none text-slate-800 text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: selectedEmail.body_html }}
                  />
                </div>
              </div>

              {/* Caja de Respuesta Rápida (Docked at Bottom) */}
              <div className="border-t border-slate-200/80 bg-white p-3.5 shrink-0 shadow-xs">
                {!isQuickReplyExpanded ? (
                  <div 
                    onClick={() => {
                      setIsQuickReplyExpanded(true);
                      setTimeout(() => quickReplyRef.current?.focus(), 50);
                    }}
                    className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer text-xs text-slate-400 transition-all font-sans"
                  >
                    <Reply className="w-4 h-4 text-slate-400" />
                    <span>Haz clic aquí para responder a <strong className="text-slate-600 font-montserrat">{selectedEmail.direction === 'inbound' ? selectedEmail.sender_email : selectedEmail.recipient_email}</strong>...</span>
                  </div>
                ) : (
                  <form onSubmit={handleSendQuickReply} className="space-y-2.5 animate-in fade-in">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 font-montserrat flex items-center gap-1.5">
                        <Reply className="w-3.5 h-3.5 text-brand-500" />
                        <span>Respuesta a: <strong className="text-brand-600">{selectedEmail.direction === 'inbound' ? selectedEmail.sender_email : selectedEmail.recipient_email}</strong></span>
                      </span>

                      {/* Selector de Plantilla Rápida */}
                      {templates.length > 0 && (
                        <select
                          onChange={(e) => {
                            if (e.target.value) handleApplyTemplate(e.target.value, 'quickReply');
                          }}
                          className="text-[11px] bg-amber-50 border border-amber-200 text-amber-900 rounded-lg px-2 py-1 font-bold font-montserrat focus:outline-none"
                        >
                          <option value="">Insertar plantilla...</option>
                          {templates.map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      )}
                    </div>

                    <textarea
                      ref={quickReplyRef}
                      rows={3}
                      placeholder="Escribe tu respuesta aquí..."
                      value={quickReplyText}
                      onChange={(e) => setQuickReplyText(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-brand-500 focus:bg-white resize-none font-sans leading-relaxed"
                    />

                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setIsQuickReplyExpanded(false);
                          setQuickReplyText('');
                        }}
                        className="text-xs text-slate-400 hover:text-slate-600 font-medium"
                      >
                        Cancelar
                      </button>

                      <button
                        type="submit"
                        disabled={quickReplySending || !quickReplyText.trim()}
                        className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold font-montserrat transition-all shadow-sm shadow-brand-500/20 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        {quickReplySending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        <span>Enviar Respuesta</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-500 shadow-2xs">
                <Mail className="w-7 h-7 stroke-1" />
              </div>
              <h3 className="text-sm font-bold text-slate-700 font-montserrat">
                Bandeja Comercial Gloint
              </h3>
              <p className="text-xs text-slate-400 max-w-sm font-sans leading-relaxed">
                Selecciona un correo de la lista para leer la conversación completa y responder al prospecto en tiempo real.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Compositor Flotante en la Esquina Inferior Derecha (Estilo Gmail) */}
      {isComposerOpen && (
        <div className={`fixed bottom-0 right-6 z-50 w-full max-w-lg bg-white rounded-t-2xl shadow-2xl border border-slate-300 transition-all duration-200 overflow-hidden flex flex-col ${
          isComposerMinimized ? 'h-11' : 'h-[520px]'
        }`}>
          {/* Header del Compositor */}
          <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between cursor-pointer select-none">
            <div className="flex items-center gap-2" onClick={() => setIsComposerMinimized(!isComposerMinimized)}>
              <Mail className="w-4 h-4 text-brand-400" />
              <span className="text-xs font-bold font-montserrat">Nuevo Mensaje Comercial</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsComposerMinimized(!isComposerMinimized)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
                title={isComposerMinimized ? "Expandir" : "Minimizar"}
              >
                {isComposerMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setIsComposerOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
                title="Cerrar redacción"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Cuerpo del Formulario */}
          {!isComposerMinimized && (
            <form onSubmit={handleSend} className="p-4 flex-1 flex flex-col justify-between space-y-3 bg-white overflow-y-auto">
              <div className="space-y-2.5 flex-1">
                {/* Selector de Plantilla */}
                {templates.length > 0 && (
                  <div className="p-2 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-amber-900 font-montserrat flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-600" />
                      Plantilla:
                    </span>
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => handleApplyTemplate(e.target.value, 'composer')}
                      className="bg-white border border-amber-200 text-slate-900 text-[11px] font-bold py-1 px-2 rounded-lg focus:outline-none font-montserrat"
                    >
                      <option value="">Seleccionar...</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <input
                    type="email"
                    placeholder="Para: cliente@ejemplo.com"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-brand-500 font-sans"
                  />
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="Asunto: Propuesta de Inversión"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-brand-500 font-montserrat font-bold"
                  />
                </div>

                <div className="flex-1">
                  <textarea
                    rows={8}
                    placeholder="Escribe el mensaje comercial aquí..."
                    value={bodyHtml}
                    onChange={(e) => setBodyHtml(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-brand-500 font-sans resize-none leading-relaxed"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsComposerOpen(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 font-montserrat"
                >
                  Descartar
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold font-montserrat transition-all shadow-sm shadow-brand-500/25 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Enviar</span>
                </button>
              </div>
            </form>
          )}
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
                    Tu casilla <strong className="font-montserrat">{user?.email}</strong> se sincroniza automáticamente cada 25 segundos en segundo plano. Si cambiaste tu clave institucional en cPanel, ingrésala abajo para actualizarla.
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
