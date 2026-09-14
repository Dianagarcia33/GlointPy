import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Inbox, 
  Send, 
  Search, 
  Mail, 
  MailOpen,
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
  ChevronLeft,
  PanelLeftClose,
  PanelLeftOpen,
  Filter,
  ArrowLeft,
  List,
  Paperclip,
  Download,
  Image as ImageIcon,
  FileArchive,
  FileSpreadsheet,
  FileCode,
  Eye,
  Calendar
} from 'lucide-react';
import { crmEmailService, CRMEmail, CRMEmailTemplate, EmailAttachment } from '../../../services/crmEmailService';
import { useAuthStore } from '../../../store/authStore';
import { getMediaUrl } from '../../../services/api';

// Utilidad para formatear tamaños de archivo
const formatFileSize = (bytes?: number) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Utilidad para verificar si un archivo es imagen
const isImageAttachment = (att: EmailAttachment) => {
  if (att.content_type?.startsWith('image/')) return true;
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(att.filename);
};

// Icono por tipo de archivo
const getFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
    return <ImageIcon className="w-4 h-4 text-purple-600" />;
  }
  if (['xls', 'xlsx', 'csv'].includes(ext)) {
    return <FileSpreadsheet className="w-4 h-4 text-emerald-600" />;
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return <FileArchive className="w-4 h-4 text-amber-600" />;
  }
  if (['pdf', 'doc', 'docx', 'txt'].includes(ext)) {
    return <FileText className="w-4 h-4 text-rose-600" />;
  }
  return <FileCode className="w-4 h-4 text-slate-500" />;
};

// Utilidad para extraer snippet de texto plano desde HTML
const getEmailSnippet = (html: string) => {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 95);
};

// Utilidad para normalizar y parsear fechas ISO a hora local del navegador
const parseEmailDate = (dateStr: string) => {
  if (!dateStr) return new Date();
  // Si la cadena no especifica zona horaria (sin 'Z' ni '+/-HH:mm'), añadir 'Z' para tratarla como UTC
  const hasTimezone = dateStr.endsWith('Z') || dateStr.includes('+') || (dateStr.length > 19 && dateStr.slice(19).includes('-'));
  const normalizedStr = hasTimezone ? dateStr : `${dateStr}Z`;
  return new Date(normalizedStr);
};

// Utilidad para formatear fechas relativas elegantes
const formatEmailDate = (dateStr: string) => {
  if (!dateStr) return '';
  try {
    const date = parseEmailDate(dateStr);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 7 && diffDays > 0) {
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
  const queryClient = useQueryClient();

  const [folder, setFolder] = useState<'inbox' | 'sent'>('inbox');
  const [filterType, setFilterType] = useState<'all' | 'leads' | 'unread'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<CRMEmail | null>(null);

  // Estados de compactación responsiva (para pantallas medianas y optimización de espacio)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isReaderExpanded, setIsReaderExpanded] = useState(false);
  const [isDenseList, setIsDenseList] = useState(false);

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

  // Adjuntos para Redactar Correo
  const [composerAttachments, setComposerAttachments] = useState<EmailAttachment[]>([]);
  const [uploadingComposerFiles, setUploadingComposerFiles] = useState(false);
  const composerFileInputRef = useRef<HTMLInputElement>(null);

  // Adjuntos para Respuesta Rápida
  const [quickReplyAttachments, setQuickReplyAttachments] = useState<EmailAttachment[]>([]);
  const [uploadingQuickReplyFiles, setUploadingQuickReplyFiles] = useState(false);
  const quickReplyFileInputRef = useRef<HTMLInputElement>(null);

  // Vista previa lightbox para imágenes
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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
    queryFn: () => crmEmailService.getEmailSettings(),
    staleTime: 0,
    refetchOnMount: 'always'
  });

  const hasSavedPassword = emailSettings?.has_saved_password ?? false;

  // Query: Correos con refresco automático en tiempo real cada 10 segundos
  const { data: emails = [], isLoading: loadingEmails, refetch: refetchEmails } = useQuery<CRMEmail[]>({
    queryKey: ['crm_emails', folder, searchTerm],
    queryFn: () => crmEmailService.getEmails({ folder, search: searchTerm }),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: 10000,
    refetchIntervalInBackground: true
  });

  // Query: Contadores de bandeja independientes para Recibidos y Enviados
  const { data: inboxList = [], refetch: refetchInboxCount } = useQuery<CRMEmail[]>({
    queryKey: ['crm_emails_count', 'inbox'],
    queryFn: () => crmEmailService.getEmails({ folder: 'inbox' }),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: 15000,
  });

  const { data: sentList = [], refetch: refetchSentCount } = useQuery<CRMEmail[]>({
    queryKey: ['crm_emails_count', 'sent'],
    queryFn: () => crmEmailService.getEmails({ folder: 'sent' }),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: 15000,
  });

  // Refresco forzado al montar para garantizar datos 100% actualizados sin requerir F5
  useEffect(() => {
    refetchEmails();
    refetchInboxCount();
    refetchSentCount();
    refetchSettings();
  }, []);

  // Escuchar eventos en tiempo real desde el WebSocket global para actualizar la bandeja de inmediato
  useEffect(() => {
    const handleEmailReceived = (e: any) => {
      refetchEmails();
      refetchInboxCount();
      refetchSentCount();
      const count = e.detail?.synced_count || 1;
      showToast(`📩 ¡${count === 1 ? 'Nuevo correo recibido' : `${count} nuevos correos recibidos`}!`, 'success');
    };

    window.addEventListener('gloint:email_received', handleEmailReceived);
    return () => {
      window.removeEventListener('gloint:email_received', handleEmailReceived);
    };
  }, [refetchEmails, refetchInboxCount, refetchSentCount]);

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
        refetchInboxCount();
        refetchSentCount();
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

  const handleFileUpload = async (
    files: FileList | null, 
    target: 'composer' | 'quickReply'
  ) => {
    if (!files || files.length === 0) return;
    
    const isComposer = target === 'composer';
    if (isComposer) setUploadingComposerFiles(true);
    else setUploadingQuickReplyFiles(true);

    try {
      const uploadPromises = Array.from(files).map(file => crmEmailService.uploadAttachment(file));
      const newAttachments = await Promise.all(uploadPromises);

      if (isComposer) {
        setComposerAttachments(prev => [...prev, ...newAttachments]);
      } else {
        setQuickReplyAttachments(prev => [...prev, ...newAttachments]);
      }
      showToast(`${newAttachments.length} archivo(s) adjuntado(s) exitosamente`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Error al subir archivo adjunto', 'error');
    } finally {
      if (isComposer) {
        setUploadingComposerFiles(false);
        if (composerFileInputRef.current) composerFileInputRef.current.value = '';
      } else {
        setUploadingQuickReplyFiles(false);
        if (quickReplyFileInputRef.current) quickReplyFileInputRef.current.value = '';
      }
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
        body_html: bodyHtml,
        attachments: composerAttachments.length > 0 ? composerAttachments : undefined
      });
      showToast('¡Correo comercial enviado exitosamente!', 'success');
      setIsComposerOpen(false);
      setRecipient('');
      setSubject('');
      setBodyHtml('');
      setComposerAttachments([]);
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
        project_id: selectedEmail.project_id || undefined,
        attachments: quickReplyAttachments.length > 0 ? quickReplyAttachments : undefined
      });
      showToast('¡Respuesta enviada exitosamente!', 'success');
      setQuickReplyText('');
      setQuickReplyAttachments([]);
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

  // Manejo interactivo de lectura
  const handleSelectEmail = async (email: CRMEmail) => {
    setSelectedEmail(email);
    if (!email.is_read) {
      // Actualización optimista inmediata
      setSelectedEmail({ ...email, is_read: true });
      queryClient.setQueryData<CRMEmail[]>(['crm_emails', folder, searchTerm], (old) => {
        if (!old) return old;
        return old.map((item) => (item.id === email.id ? { ...item, is_read: true } : item));
      });
      queryClient.setQueryData<CRMEmail[]>(['crm_emails_count', 'inbox'], (old) => {
        if (!old) return old;
        return old.map((item) => (item.id === email.id ? { ...item, is_read: true } : item));
      });
      try {
        await crmEmailService.markAsRead(email.id);
        queryClient.invalidateQueries({ queryKey: ['crm_emails_count'] });
      } catch (err) {
        console.error('Error al marcar correo como leído:', err);
      }
    }
  };

  const handleToggleRead = async (email: CRMEmail) => {
    const nextReadState = !email.is_read;
    setSelectedEmail({ ...email, is_read: nextReadState });
    queryClient.setQueryData<CRMEmail[]>(['crm_emails', folder, searchTerm], (old) => {
      if (!old) return old;
      return old.map((item) => (item.id === email.id ? { ...item, is_read: nextReadState } : item));
    });
    queryClient.setQueryData<CRMEmail[]>(['crm_emails_count', 'inbox'], (old) => {
      if (!old) return old;
      return old.map((item) => (item.id === email.id ? { ...item, is_read: nextReadState } : item));
    });
    try {
      await crmEmailService.toggleRead(email.id);
      queryClient.invalidateQueries({ queryKey: ['crm_emails_count'] });
      showToast(nextReadState ? 'Correo marcado como leído' : 'Correo marcado como no leído', 'success');
    } catch (err) {
      console.error('Error al alternar estado de lectura:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await crmEmailService.markAllAsRead();
      queryClient.invalidateQueries({ queryKey: ['crm_emails'] });
      queryClient.invalidateQueries({ queryKey: ['crm_emails_count'] });
      showToast('Todos los correos recibidos fueron marcados como leídos', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error al marcar correos', 'error');
    }
  };

  // Filtrado de correos según la pestaña activa
  const filteredEmails = emails.filter((e) => {
    // Garantizar separación absoluta en frontend
    if (folder === 'inbox' && (e.direction === 'outbound' || e.status === 'sent' || e.status === 'delivered')) return false;
    if (folder === 'sent' && (e.direction === 'inbound' || e.status === 'received')) return false;
    if (filterType === 'leads' && !e.lead_name) return false;
    if (filterType === 'unread' && e.is_read) return false;
    return true;
  });

  const totalInboxCount = inboxList.length;
  const unreadInboxCount = inboxList.filter((e) => !e.is_read).length;
  const totalSentCount = sentList.length;

  const unreadCount = emails.filter((e) => !e.is_read).length;
  const leadsCount = emails.filter((e) => !!e.lead_name).length;

  return (
    <div className="w-full h-full flex flex-col space-y-2.5 overflow-hidden animate-in fade-in duration-200">
      
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
          {/* Botón para Compactar / Expandir panel de opciones (Ideal para pantallas medianas) */}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-bold font-montserrat transition-all cursor-pointer shadow-2xs border hidden md:flex ${
              isSidebarCollapsed
                ? 'bg-brand-50 text-brand-700 border-brand-200 hover:bg-brand-100'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
            }`}
            title={isSidebarCollapsed ? "Expandir panel de carpetas" : "Compactar panel de carpetas (ahorrar espacio)"}
          >
            {isSidebarCollapsed ? <PanelLeftOpen className="w-3.5 h-3.5 text-brand-600" /> : <PanelLeftClose className="w-3.5 h-3.5" />}
            <span className="hidden lg:inline">{isSidebarCollapsed ? 'Expandir Menú' : 'Compactar'}</span>
          </button>

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
        
        {/* Columna 1: Carpetas y Filtros (Estrecha normal ~208px o Compacta ~60px) */}
        {isSidebarCollapsed ? (
          <div className="w-full md:w-16 shrink-0 border-b md:border-b-0 md:border-r border-slate-200/80 bg-slate-50/50 py-3 px-2 flex flex-col justify-between items-center transition-all duration-200">
            <div className="space-y-4 flex flex-col items-center w-full">
              {/* Botón para expandir panel */}
              <button
                onClick={() => setIsSidebarCollapsed(false)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-brand-600 hover:border-brand-300 transition-all cursor-pointer shadow-2xs"
                title="Expandir panel lateral"
              >
                <ChevronRight className="w-4 h-4 text-brand-600" />
              </button>

              <div className="w-8 h-px bg-slate-200/80" />

              {/* Iconos de Bandejas */}
              <nav className="space-y-2 flex flex-col items-center w-full">
                <button
                  onClick={() => { setFolder('inbox'); setSelectedEmail(null); }}
                  className={`w-10 h-10 flex items-center justify-center rounded-xl relative transition-all cursor-pointer ${
                    folder === 'inbox' 
                      ? 'bg-brand-500 text-white shadow-2xs' 
                      : 'text-slate-600 hover:bg-slate-200/60'
                  }`}
                  title={`Bandeja de Recibidos (${totalInboxCount} correos${unreadInboxCount > 0 ? `, ${unreadInboxCount} no leídos` : ''})`}
                >
                  <Inbox className="w-4 h-4" />
                  {unreadInboxCount > 0 && (
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-white absolute top-1 right-1 shadow-xs animate-pulse" />
                  )}
                </button>

                <button
                  onClick={() => { setFolder('sent'); setSelectedEmail(null); }}
                  className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all cursor-pointer ${
                    folder === 'sent' 
                      ? 'bg-brand-500 text-white shadow-2xs' 
                      : 'text-slate-600 hover:bg-slate-200/60'
                  }`}
                  title={`Correos Enviados (${totalSentCount} correos)`}
                >
                  <Send className="w-4 h-4" />
                </button>

                <button
                  onClick={() => navigate('/dashboard/crm/calendar')}
                  className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-600 hover:bg-amber-100 hover:text-amber-800 transition-all cursor-pointer"
                  title="Agenda & Calendario cPanel (CalDAV)"
                >
                  <Calendar className="w-4 h-4 text-amber-600" />
                </button>
              </nav>

              <div className="w-8 h-px bg-slate-200/80" />

              {/* Iconos de Filtros */}
              <div className="space-y-2 flex flex-col items-center w-full">
                <button
                  onClick={() => setFilterType('all')}
                  className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all cursor-pointer ${
                    filterType === 'all' ? 'bg-slate-200/90 text-slate-900 font-bold' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                  title={`Todos los correos (${emails.length})`}
                >
                  <MailOpen className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setFilterType('leads')}
                  className={`w-10 h-10 flex items-center justify-center rounded-xl relative transition-all cursor-pointer ${
                    filterType === 'leads' ? 'bg-amber-100 text-amber-900 font-bold' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                  title={`Con Prospecto (${leadsCount})`}
                >
                  <User className="w-4 h-4 text-amber-600" />
                </button>

                <button
                  onClick={() => setFilterType('unread')}
                  className={`w-10 h-10 flex items-center justify-center rounded-xl relative transition-all cursor-pointer ${
                    filterType === 'unread' ? 'bg-blue-100 text-blue-900 font-bold' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                  title={`No leídos (${unreadCount})`}
                >
                  <Mail className="w-4 h-4 text-blue-600" />
                  {unreadCount > 0 && (
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-white absolute top-1 right-1" />
                  )}
                </button>
              </div>
            </div>

            <div className="hidden md:block pt-3">
              <div className="w-9 h-9 rounded-xl bg-white border border-slate-200/60 shadow-2xs flex items-center justify-center text-emerald-500" title="SSL Seguro host81:993">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full md:w-52 shrink-0 border-b md:border-b-0 md:border-r border-slate-200/80 bg-slate-50/40 p-3 flex flex-col justify-between transition-all duration-200 overflow-y-auto">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between px-2 mb-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-montserrat">
                    Bandejas
                  </span>
                  <button
                    onClick={() => setIsSidebarCollapsed(true)}
                    className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer hidden md:block"
                    title="Compactar opciones (ahorrar espacio)"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
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
                    <div className="flex items-center gap-1">
                      {unreadInboxCount > 0 && (
                        <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full shadow-xs ${
                          folder === 'inbox' ? 'bg-white text-brand-600' : 'bg-blue-600 text-white'
                        }`}>
                          {unreadInboxCount}
                        </span>
                      )}
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        folder === 'inbox' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {totalInboxCount}
                      </span>
                    </div>
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
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      folder === 'sent' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {totalSentCount}
                    </span>
                  </button>

                  <button
                    onClick={() => navigate('/dashboard/crm/calendar')}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition-all font-montserrat text-slate-600 hover:bg-amber-50 hover:text-amber-900 border border-transparent hover:border-amber-200/60 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-amber-500" />
                      <span>Calendario cPanel</span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 font-extrabold uppercase">
                      CalDAV
                    </span>
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
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded-full border border-blue-200/60">
                      {unreadCount}
                    </span>
                  </button>

                  {unreadCount > 0 && folder === 'inbox' && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="w-full text-left px-2.5 py-1.5 text-[11px] font-bold text-brand-600 hover:text-brand-800 hover:bg-brand-50 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCheck className="w-3 h-3" />
                      <span>Marcar todo como leído</span>
                    </button>
                  )}
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
        )}

        {/* Columna 2: Lista de Correos (~360px) */}
        <div className={`w-full md:w-80 lg:w-96 shrink-0 border-b md:border-b-0 md:border-r border-slate-200/80 flex flex-col h-full bg-white transition-all duration-200 ${
          selectedEmail ? (isReaderExpanded ? 'hidden' : 'hidden md:flex') : 'flex'
        }`}>
          
          {/* Header de la lista con contador y botón de compactar lista */}
          <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
            <span className="text-xs font-bold text-slate-700 font-montserrat flex items-center gap-1.5">
              <span>{folder === 'inbox' ? 'Bandeja de Entrada' : 'Correos Enviados'}</span>
              <span className="text-[11px] font-normal text-slate-400">({filteredEmails.length})</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsDenseList(!isDenseList)}
                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                  isDenseList 
                    ? 'bg-brand-50 text-brand-700 border-brand-200 shadow-2xs' 
                    : 'text-slate-400 hover:text-slate-700 border-slate-200/60 hover:bg-slate-100'
                }`}
                title={isDenseList ? "Cambiar a vista detallada" : "Compactar lista (modo denso)"}
              >
                <List className="w-3.5 h-3.5" />
              </button>
              {filterType !== 'all' && (
                <button 
                  onClick={() => setFilterType('all')} 
                  className="text-[10px] font-bold text-brand-600 hover:underline"
                >
                  Limpiar filtro
                </button>
              )}
            </div>
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
                const isUnread = !e.is_read;
                const snippet = getEmailSnippet(e.body_html);

                return (
                  <div
                    key={e.id}
                    onClick={() => handleSelectEmail(e)}
                    className={`transition-all cursor-pointer relative group border-l-4 ${
                      isDenseList ? 'p-2.5 space-y-1' : 'p-3.5 space-y-1.5'
                    } ${
                      isSelected 
                        ? 'bg-brand-50/90 border-brand-500 shadow-xs' 
                        : isUnread 
                          ? 'bg-blue-50/40 hover:bg-blue-50/70 border-blue-600 shadow-2xs' 
                          : 'bg-white hover:bg-slate-50/80 border-transparent text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Indicador de no leído: punto azul vibrante */}
                        {isUnread ? (
                          <span 
                            className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0 ring-4 ring-blue-100 shadow-xs" 
                            title="No leído"
                          />
                        ) : (
                          <span className="w-2.5 h-2.5 shrink-0 flex items-center justify-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                          </span>
                        )}

                        {/* Avatar con inicial */}
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${
                          isUnread ? 'bg-blue-600 shadow-xs' : e.lead_name ? 'bg-amber-500' : 'bg-slate-500'
                        }`}>
                          {initial}
                        </div>

                        {/* Remitente o Destinatario claramente indicado */}
                        <div className="flex items-center gap-1.5 min-w-0 truncate">
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded shrink-0 uppercase tracking-wider ${
                            folder === 'sent' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/50' : 'bg-slate-100 text-slate-500 border border-slate-200/60'
                          }`}>
                            {folder === 'sent' ? 'Para' : 'De'}
                          </span>
                          <span className={`text-xs truncate font-montserrat ${
                            isUnread ? 'font-extrabold text-slate-950' : 'font-semibold text-slate-700'
                          }`}>
                            {targetEmail}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {e.attachments && e.attachments.length > 0 && (
                          <span title={`${e.attachments.length} archivo(s) adjunto(s)`} className="text-slate-400">
                            <Paperclip className="w-3 h-3" />
                          </span>
                        )}
                        {isUnread && (
                          <span className="px-1.5 py-0.2 bg-blue-600 text-white rounded text-[9px] font-extrabold uppercase tracking-tight shadow-2xs">
                            Nuevo
                          </span>
                        )}
                        <span className={`text-[10px] font-mono ${isUnread ? 'text-blue-900 font-bold' : 'text-slate-400'}`}>
                          {formatEmailDate(e.created_at)}
                        </span>
                      </div>
                    </div>

                    <h4 className={`text-xs line-clamp-1 font-montserrat leading-snug pl-7 ${
                      isUnread ? 'font-extrabold text-slate-950' : 'font-medium text-slate-700'
                    }`}>
                      {e.subject || '(Sin asunto)'}
                    </h4>

                    {snippet && (
                      <p className={`text-[11px] ${isDenseList ? 'line-clamp-1' : 'line-clamp-2'} pl-7 font-sans leading-relaxed ${
                        isUnread ? 'text-slate-700 font-medium' : 'text-slate-400'
                      }`}>
                        {snippet}
                      </p>
                    )}
                    
                    {e.lead_name && (
                      <div className="pl-7 pt-0.5">
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
                    onClick={() => {
                      if (isReaderExpanded) {
                        setIsReaderExpanded(false);
                      } else {
                        setSelectedEmail(null);
                      }
                    }}
                    className={`${isReaderExpanded ? 'flex' : 'md:hidden'} p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer`}
                    title="Volver a la lista"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                        selectedEmail.direction === 'inbound' || selectedEmail.status === 'received'
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}>
                        {selectedEmail.direction === 'inbound' || selectedEmail.status === 'received' ? '📥 Recibido' : '📤 Enviado'}
                      </span>
                      <h2 className="text-sm md:text-base font-extrabold text-slate-900 font-montserrat truncate">
                        {selectedEmail.subject || '(Sin asunto)'}
                      </h2>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Botón para Maximizar / Dividir Vista en pantallas medianas */}
                  <button
                    onClick={() => setIsReaderExpanded(!isReaderExpanded)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold font-montserrat transition-all border cursor-pointer hidden md:flex ${
                      isReaderExpanded
                        ? 'bg-brand-500 text-white border-brand-500 shadow-2xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                    title={isReaderExpanded ? "Restaurar vista dividida (mostrar lista de correos)" : "Maximizar área de lectura (ocultar lista)"}
                  >
                    {isReaderExpanded ? (
                      <>
                        <Minimize2 className="w-3.5 h-3.5" />
                        <span className="hidden lg:inline">Dividir Vista</span>
                      </>
                    ) : (
                      <>
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span className="hidden lg:inline">Maximizar</span>
                      </>
                    )}
                  </button>

                  {/* Botón de alternar Leído / No leído */}
                  <button
                    onClick={() => handleToggleRead(selectedEmail)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold font-montserrat transition-all border cursor-pointer ${
                      selectedEmail.is_read
                        ? 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                        : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 shadow-2xs'
                    }`}
                    title={selectedEmail.is_read ? 'Marcar como no leído' : 'Marcar como leído'}
                  >
                    {selectedEmail.is_read ? (
                      <>
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        <span className="hidden sm:inline">Marcar no leído</span>
                      </>
                    ) : (
                      <>
                        <CheckCheck className="w-3.5 h-3.5 text-blue-600" />
                        <span className="hidden sm:inline">Marcar leído</span>
                      </>
                    )}
                  </button>

                  {selectedEmail.lead_id && (
                    <button
                      onClick={() => navigate('/dashboard/crm')}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold font-montserrat transition-all cursor-pointer"
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
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 rounded-lg text-xs font-bold font-montserrat transition-all cursor-pointer"
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
                        {((selectedEmail.direction === 'inbound' ? selectedEmail.sender_email : selectedEmail.recipient_email) || 'U')[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-900 font-montserrat">
                            <span className="text-xs text-slate-400 font-semibold mr-1">De:</span>
                            {selectedEmail.sender_email}
                          </p>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            selectedEmail.direction === 'inbound' || selectedEmail.status === 'received'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                          }`}>
                            {selectedEmail.direction === 'inbound' || selectedEmail.status === 'received' ? 'Recibido' : 'Enviado'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-sans mt-0.5">
                          <span className="text-slate-400 font-semibold mr-1">Para:</span>
                          <span className="text-slate-800 font-medium">{selectedEmail.recipient_email}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs text-slate-500 font-mono block">
                        {parseEmailDate(selectedEmail.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                      <span className={`text-[10px] font-bold ${selectedEmail.is_read ? 'text-slate-400' : 'text-blue-600 font-extrabold'}`}>
                        {selectedEmail.is_read ? '✓ Leído' : '● No leído'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contenido HTML del Mensaje */}
                <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200/80 shadow-2xs min-h-[220px]">
                  <div
                    className="prose prose-sm max-w-none text-slate-800 text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: selectedEmail.body_html }}
                  />
                </div>

                {/* Lista de Archivos Adjuntos e Imágenes */}
                {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                  <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-4 md:p-5 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-700 font-montserrat">
                        <Paperclip className="w-4 h-4 text-brand-500" />
                        <span>Archivos y Documentos Adjuntos ({selectedEmail.attachments.length})</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {selectedEmail.attachments.reduce((acc, a) => acc + (a.size || 0), 0) > 0 && 
                          formatFileSize(selectedEmail.attachments.reduce((acc, a) => acc + (a.size || 0), 0))}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {selectedEmail.attachments.map((att, idx) => {
                        const isImg = isImageAttachment(att);
                        const downloadUrl = getMediaUrl(att.file_url);

                        return (
                          <div 
                            key={idx}
                            className="flex items-center justify-between p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-2xs group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                              {isImg ? (
                                <div 
                                  onClick={() => setPreviewImage(downloadUrl)}
                                  className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-slate-200 bg-slate-100 cursor-pointer relative group/thumb"
                                  title="Clic para ver imagen completa"
                                >
                                  <img 
                                    src={downloadUrl} 
                                    alt={att.filename} 
                                    className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform" 
                                  />
                                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity text-white">
                                    <Eye className="w-3 h-3" />
                                  </div>
                                </div>
                              ) : (
                                <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 border border-brand-100 flex items-center justify-center shrink-0">
                                  {getFileIcon(att.filename)}
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-slate-800 truncate" title={att.filename}>
                                  {att.filename}
                                </p>
                                <p className="text-[10px] text-slate-400 font-mono">
                                  {att.size ? formatFileSize(att.size) : 'Archivo adjunto'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {isImg && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewImage(downloadUrl)}
                                  className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors cursor-pointer"
                                  title="Ver imagen"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <a
                                href={downloadUrl}
                                download={att.filename}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                title="Descargar archivo"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
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

                    {/* Chips de adjuntos de respuesta rápida */}
                    {quickReplyAttachments.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200/80 rounded-xl">
                        {quickReplyAttachments.map((att, idx) => (
                          <div 
                            key={idx} 
                            className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-[11px] text-slate-700 shadow-2xs font-sans"
                          >
                            <Paperclip className="w-3 h-3 text-brand-500 shrink-0" />
                            <span className="max-w-[150px] truncate font-medium">{att.filename}</span>
                            {att.size && <span className="text-[9px] text-slate-400">({formatFileSize(att.size)})</span>}
                            <button
                              type="button"
                              onClick={() => setQuickReplyAttachments(prev => prev.filter((_, i) => i !== idx))}
                              className="text-slate-400 hover:text-red-500 ml-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          ref={quickReplyFileInputRef}
                          type="file"
                          multiple
                          onChange={(e) => handleFileUpload(e.target.files, 'quickReply')}
                          className="hidden"
                        />
                        <button
                          type="button"
                          disabled={uploadingQuickReplyFiles}
                          onClick={() => quickReplyFileInputRef.current?.click()}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold font-montserrat transition-all cursor-pointer disabled:opacity-50"
                          title="Adjuntar archivos o imágenes"
                        >
                          {uploadingQuickReplyFiles ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-500" />
                          ) : (
                            <Paperclip className="w-3.5 h-3.5 text-brand-500" />
                          )}
                          <span>Adjuntar</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsQuickReplyExpanded(false);
                            setQuickReplyText('');
                            setQuickReplyAttachments([]);
                          }}
                          className="text-xs text-slate-400 hover:text-slate-600 font-medium"
                        >
                          Cancelar
                        </button>

                        <button
                          type="submit"
                          disabled={quickReplySending || uploadingQuickReplyFiles || !quickReplyText.trim()}
                          className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold font-montserrat transition-all shadow-sm shadow-brand-500/20 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                        >
                          {quickReplySending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                          <span>Enviar Respuesta</span>
                        </button>
                      </div>
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

                {/* Adjuntos en el Compositor */}
                {composerAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200/80 rounded-xl max-h-24 overflow-y-auto">
                    {composerAttachments.map((att, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-[11px] text-slate-700 shadow-2xs font-sans"
                      >
                        <Paperclip className="w-3 h-3 text-brand-500 shrink-0" />
                        <span className="max-w-[140px] truncate font-medium">{att.filename}</span>
                        {att.size && <span className="text-[9px] text-slate-400 font-mono">({formatFileSize(att.size)})</span>}
                        <button
                          type="button"
                          onClick={() => setComposerAttachments(prev => prev.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-red-500 ml-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <input
                    ref={composerFileInputRef}
                    type="file"
                    multiple
                    onChange={(e) => handleFileUpload(e.target.files, 'composer')}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={uploadingComposerFiles}
                    onClick={() => composerFileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold font-montserrat transition-all cursor-pointer disabled:opacity-50"
                    title="Adjuntar archivos o imágenes"
                  >
                    {uploadingComposerFiles ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-500" />
                    ) : (
                      <Paperclip className="w-3.5 h-3.5 text-brand-500" />
                    )}
                    <span>Adjuntar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsComposerOpen(false);
                      setComposerAttachments([]);
                    }}
                    className="text-xs text-slate-400 hover:text-slate-600 font-montserrat"
                  >
                    Descartar
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={sending || uploadingComposerFiles}
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

      {/* Modal Lightbox de Vista Previa de Imágenes */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col items-center p-3"
          >
            <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-white">
              <span className="text-xs font-mono text-slate-300">Vista Previa de Imagen</span>
              <div className="flex items-center gap-2">
                <a
                  href={previewImage}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors"
                  title="Descargar"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setPreviewImage(null)}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Cerrar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="overflow-auto max-h-[75vh] flex items-center justify-center">
              <img 
                src={previewImage} 
                alt="Vista previa" 
                className="max-h-[72vh] max-w-full object-contain rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
