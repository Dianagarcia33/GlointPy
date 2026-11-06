import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Ticket, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  List, 
  Loader2, 
  MessageSquare, 
  X,
  ArrowLeft,
  Paperclip,
  Clock
} from 'lucide-react';
import { fetchApi, getMediaUrl } from '../../../services/api';
import { compressImage } from '../../../utils/imageCompression';

export const TicketsPage: React.FC = () => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('general');
    const [priority, setPriority] = useState('normal');
    const [file, setFile] = useState<File | null>(null);
    
    const [isLoading, setIsLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState<string | null>('');
    const [errorMsg, setErrorMsg] = useState('');
    const [tickets, setTickets] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'list' | 'view'>('list');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isLoadingList, setIsLoadingList] = useState(true);

    const [selectedTicket, setSelectedTicket] = useState<any>(null);
    const [ticketDetails, setTicketDetails] = useState<any>(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [commentContent, setCommentContent] = useState('');
    const [commentFile, setCommentFile] = useState<File | null>(null);
    const [isSendingComment, setIsSendingComment] = useState(false);

    const chatEndRef = useRef<HTMLDivElement | null>(null);
    const previousCommentsLengthRef = useRef<number>(0);

    const scrollToBottom = useCallback((smooth = true) => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
        }
    }, []);

    // 1. Cargar tickets al abrir pestaña de lista
    useEffect(() => {
        if (activeTab === 'list') {
            fetchTickets(false);
        }
    }, [activeTab]);

    // 2. Polling periódico silencioso en segundo plano
    useEffect(() => {
        let interval: any;

        if (activeTab === 'view' && selectedTicket) {
            // Actualización en tiempo real del chat de ticket cada 3.5 segundos
            interval = setInterval(() => {
                fetchTicketDetailsSilently(selectedTicket.ticket_number || selectedTicket.id);
            }, 3500);
        } else if (activeTab === 'list') {
            // Actualización en tiempo real de la lista cada 10 segundos
            interval = setInterval(() => {
                fetchTickets(true);
            }, 10000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [activeTab, selectedTicket]);

    const fetchTickets = async (silent = false) => {
        if (!silent) setIsLoadingList(true);
        try {
            const data = await fetchApi('/tickets/my-tickets');
            setTickets(Array.isArray(data) ? data : data?.data || []);
        } catch (error: any) {
            if (!silent) console.error('Error fetching tickets', error);
        } finally {
            if (!silent) setIsLoadingList(false);
        }
    };

    const fetchTicketDetailsSilently = async (num: string | number) => {
        try {
            const data = await fetchApi(`/tickets/${num}`);
            if (data) {
                setTicketDetails(data);
                const currentCommentsLen = data?.comments?.length || 0;
                if (currentCommentsLen > previousCommentsLengthRef.current) {
                    previousCommentsLengthRef.current = currentCommentsLen;
                    setTimeout(() => scrollToBottom(true), 100);
                }
            }
        } catch (error) {
            // Error silencioso en background
        }
    };

    const handleViewTicket = async (ticket: any) => {
        setSelectedTicket(ticket);
        setActiveTab('view');
        setIsLoadingDetails(true);
        try {
            const num = ticket.ticket_number || ticket.id;
            const data = await fetchApi(`/tickets/${num}`);
            setTicketDetails(data);
            previousCommentsLengthRef.current = data?.comments?.length || 0;
            setTimeout(() => scrollToBottom(false), 150);
        } catch (error: any) {
            console.error('Error fetching ticket details', error);
        } finally {
            setIsLoadingDetails(false);
        }
    };

    const handleSendComment = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!commentContent.trim() && !commentFile) return;
        if (isSendingComment) return;
        
        setIsSendingComment(true);
        try {
            const formData = new FormData();
            formData.append('content', commentContent.trim());
            if (commentFile) {
                const compressedFile = await compressImage(commentFile);
                formData.append('file', compressedFile);
            }
            
            const num = selectedTicket.ticket_number || selectedTicket.id;
            await fetchApi(`/tickets/${num}/comments`, {
                method: 'POST',
                body: formData
            });
            
            setCommentContent('');
            setCommentFile(null);
            
            // Recargar detalles y auto-scroll inmediato
            const data = await fetchApi(`/tickets/${num}`);
            setTicketDetails(data);
            previousCommentsLengthRef.current = data?.comments?.length || 0;
            setTimeout(() => scrollToBottom(true), 100);
        } catch (error: any) {
            alert(error.message || 'Error al enviar respuesta');
        } finally {
            setIsSendingComment(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendComment();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setSuccessMsg('');
        setErrorMsg('');

        try {
            const formData = new FormData();
            formData.append('title', title);
            formData.append('description', description);
            formData.append('category', category);
            formData.append('priority', priority);
            if (file) {
                const compressedFile = await compressImage(file);
                formData.append('file', compressedFile);
            }

            await fetchApi('/tickets/', {
                method: 'POST',
                body: formData
            });
            setSuccessMsg('¡Ticket enviado correctamente! Nuestro equipo lo revisará pronto.');
            
            // Recargar los tickets para que aparezca en la lista
            fetchTickets();
            
            setTimeout(() => {
                setIsCreateModalOpen(false);
                setTitle('');
                setDescription('');
                setFile(null);
                setSuccessMsg(null);
            }, 1500);
        } catch (error: any) {
            setErrorMsg(error.message || 'Ocurrió un error al enviar el ticket.');
        } finally {
            setIsLoading(false);
        }
    };

    const translateStatus = (status: string) => {
        const s = String(status || '').toLowerCase().trim().replace(/_/g, ' ');
        switch (s) {
            case 'open':
            case 'abierto':
                return 'Abierto';
            case 'closed':
            case 'cerrado':
                return 'Cerrado';
            case 'in progress':
            case 'in_progress':
            case 'processing':
            case 'en progreso':
            case 'en proceso':
                return 'En Proceso';
            case 'pending':
            case 'pendiente':
                return 'Pendiente';
            case 'resolved':
            case 'resuelto':
                return 'Resuelto';
            case 'waiting user':
            case 'waiting_user':
            case 'waiting client':
            case 'waiting_client':
            case 'esperando respuesta':
                return 'Esperando Respuesta';
            case 'rejected':
            case 'rechazado':
                return 'Rechazado';
            case 'cancelled':
            case 'cancelado':
                return 'Cancelado';
            default:
                return status || 'Abierto';
        }
    };

    const translateCategory = (cat: string) => {
        const c = String(cat || '').toLowerCase().trim().replace(/_/g, ' ');
        switch (c) {
            case 'general':
                return 'Consulta General';
            case 'billing':
            case 'payments':
            case 'facturacion':
            case 'pagos':
                return 'Pagos / Facturación';
            case 'technical':
            case 'tech':
            case 'tecnico':
                return 'Soporte Técnico';
            case 'deliveries':
            case 'shipping':
            case 'envios':
                return 'Envíos / Pedidos';
            case 'account':
            case 'cuenta':
                return 'Cuenta y Perfil';
            case 'investments':
            case 'inversiones':
                return 'Inversiones';
            case 'withdrawals':
            case 'retiros':
                return 'Retiros de Capital';
            case 'kyc':
                return 'Verificación KYC';
            default:
                return cat || 'General';
        }
    };

    const translatePriority = (priority: string) => {
        const p = String(priority || '').toLowerCase().trim();
        switch (p) {
            case 'low':
            case 'baja':
                return 'Baja';
            case 'normal':
            case 'medium':
            case 'media':
                return 'Normal';
            case 'high':
            case 'alta':
                return 'Alta';
            case 'urgent':
            case 'urgente':
            case 'critical':
            case 'critica':
                return 'Urgente';
            default:
                return priority || 'Normal';
        }
    };

    const translateAuthorName = (authorName: string, authorType: string) => {
        const t = String(authorType || '').toLowerCase().trim();
        if (t === 'agent' || t === 'staff' || t === 'admin' || t === 'support') {
            return authorName || 'Agente de Soporte';
        }
        if (t === 'system' || t === 'bot') {
            return 'Sistema Automatizado';
        }
        if (!authorName || authorName.toLowerCase() === 'user' || authorName.toLowerCase() === 'client' || authorName.toLowerCase() === 'customer') {
            return 'Tú (Inversionista)';
        }
        return authorName;
    };

    const getStatusBadge = (status: string) => {
        const s = String(status || '').toLowerCase().trim().replace(/_/g, ' ');
        if (s === 'abierto' || s === 'open') {
            return <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 rounded-full text-[10px] font-bold uppercase">Abierto</span>;
        }
        if (s === 'cerrado' || s === 'closed') {
            return <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-full text-[10px] font-bold uppercase">Cerrado</span>;
        }
        if (s === 'resuelto' || s === 'resolved') {
            return <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full text-[10px] font-bold uppercase">Resuelto</span>;
        }
        if (s === 'en proceso' || s === 'en progreso' || s === 'in progress' || s === 'in_progress' || s === 'processing') {
            return <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 border border-blue-200 rounded-full text-[10px] font-bold uppercase">En Proceso</span>;
        }
        if (s === 'esperando respuesta' || s === 'waiting user' || s === 'waiting_user' || s === 'waiting client' || s === 'waiting_client') {
            return <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 border border-purple-200 rounded-full text-[10px] font-bold uppercase">Esperando Respuesta</span>;
        }
        return <span className="px-2.5 py-0.5 bg-sky-100 text-sky-800 border border-sky-200 rounded-full text-[10px] font-bold uppercase">{translateStatus(status)}</span>;
    };

    return (
        <div className="space-y-6">
            {/* Encabezado */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight font-montserrat flex items-center gap-2.5">
                        <span className="p-2 bg-brand-50 text-brand-600 border border-brand-200 rounded-2xl inline-flex">
                            <Ticket className="w-6 h-6" />
                        </span>
                        Soporte y Tickets
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Crea solicitudes de soporte, reporta problemas y haz seguimiento del estado de tus consultas
                    </p>
                </div>

                {/* Acciones principales */}
                <div className="flex items-center gap-2.5 flex-wrap">
                    <button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-600 to-amber-600 hover:from-brand-700 hover:to-amber-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-brand-500/20 transition-all cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Nuevo Ticket</span>
                    </button>
                </div>
            </div>

            {/* Alertas */}
            {errorMsg && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                        <span>{errorMsg}</span>
                    </div>
                    <button onClick={() => setErrorMsg('')} className="p-1 text-rose-500 hover:text-rose-700">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {successMsg && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                        <span>{successMsg}</span>
                    </div>
                    <button onClick={() => setSuccessMsg(null)} className="p-1 text-emerald-500 hover:text-emerald-700">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-px overflow-x-auto">
                <button
                    onClick={() => setActiveTab('list')}
                    className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-b-2 whitespace-nowrap ${
                        activeTab === 'list'
                            ? 'border-brand-600 text-brand-600 bg-brand-50/50'
                            : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                >
                    <List className="w-4 h-4" />
                    <span>Mis Tickets ({tickets.length})</span>
                </button>

                {selectedTicket && (
                    <button
                        onClick={() => setActiveTab('view')}
                        className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-b-2 whitespace-nowrap ${
                            activeTab === 'view'
                                ? 'border-brand-600 text-brand-600 bg-brand-50/50'
                                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                        }`}
                    >
                        <MessageSquare className="w-4 h-4" />
                        <span>Ticket #{selectedTicket.ticket_number || selectedTicket.id}</span>
                    </button>
                )}
            </div>

            {/* Modal de Creación de Ticket */}
            {createPortal(
                <AnimatePresence>
                    {isCreateModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
                            <motion.div 
                                initial={{ opacity: 0 }} 
                                animate={{ opacity: 1 }} 
                                exit={{ opacity: 0 }} 
                                className="absolute inset-0 cursor-pointer"
                                onClick={() => setIsCreateModalOpen(false)}
                            />
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                                className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] z-10 animate-in zoom-in-95 duration-200"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Cabecera de modal */}
                                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-brand-50 text-brand-600 border border-brand-200 shrink-0">
                                            <Ticket className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h2 className="text-base font-extrabold text-slate-900 font-montserrat tracking-tight">
                                                Nueva Solicitud de Soporte
                                            </h2>
                                            <p className="text-xs text-slate-500 font-medium">
                                                Describe tu requerimiento o incidencia para brindarte asistencia
                                            </p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setIsCreateModalOpen(false)}
                                        disabled={isLoading}
                                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                
                                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
                                    {/* Asunto */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat">
                                            Asunto del Ticket *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                                            placeholder="Ej: Problemas al procesar mi pago..."
                                        />
                                    </div>

                                    {/* Categoría y Prioridad en 2 columnas */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat">
                                                Categoría *
                                            </label>
                                            <select
                                                value={category}
                                                onChange={(e) => setCategory(e.target.value)}
                                                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all cursor-pointer"
                                            >
                                                <option value="general">Consulta General</option>
                                                <option value="billing">Pagos / Facturación</option>
                                                <option value="technical">Soporte Técnico</option>
                                                <option value="deliveries">Envíos / Pedidos</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat">
                                                Prioridad *
                                            </label>
                                            <select
                                                value={priority}
                                                onChange={(e) => setPriority(e.target.value)}
                                                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all cursor-pointer"
                                            >
                                                <option value="low">Baja (Sin urgencia)</option>
                                                <option value="normal">Normal</option>
                                                <option value="urgent">Urgente (Bloqueante)</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Descripción */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat">
                                            Descripción del Problema *
                                        </label>
                                        <textarea
                                            required
                                            rows={4}
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all resize-none leading-relaxed"
                                            placeholder="Describe detalladamente lo que sucede..."
                                        />
                                    </div>

                                    {/* Evidencia */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-montserrat">
                                            Evidencia / Captura <span className="text-slate-400 font-normal lowercase">(opcional)</span>
                                        </label>
                                        <div className="relative border border-dashed border-slate-200 hover:border-brand-300 rounded-2xl bg-slate-50/60 hover:bg-slate-50 transition-all cursor-pointer">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            />
                                            <div className="p-4 flex flex-col items-center justify-center text-center gap-1.5">
                                                <div className="w-8 h-8 bg-white rounded-xl shadow-2xs flex items-center justify-center text-slate-400">
                                                    <Paperclip className="w-4 h-4" />
                                                </div>
                                                <p className="text-xs font-bold text-slate-700">
                                                    {file ? file.name : "Haz clic o arrastra una imagen aquí"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Botones de acción del Modal */}
                                    <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                                        <button 
                                            type="button"
                                            onClick={() => setIsCreateModalOpen(false)}
                                            disabled={isLoading}
                                            className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-2xl transition-all cursor-pointer font-montserrat"
                                        >
                                            Cancelar
                                        </button>
                                        <button 
                                            type="submit"
                                            disabled={isLoading}
                                            className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-brand-600 to-amber-600 hover:from-brand-700 hover:to-amber-700 rounded-2xl transition-all inline-flex items-center gap-2 cursor-pointer shadow-md shadow-brand-500/20 active:scale-95 disabled:opacity-50 font-montserrat uppercase tracking-wider"
                                        >
                                            {isLoading ? (
                                                <>
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    <span>Enviando Ticket...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Send className="w-3.5 h-3.5" />
                                                    <span>Crear Ticket</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            {/* TAB: VISTA DETALLE & CHAT */}
            {activeTab === 'view' && selectedTicket ? (
                <div className="flex flex-col md:flex-row gap-6 items-stretch h-auto md:h-[700px]">
                    {/* Panel Izquierdo: Detalles del Ticket */}
                    <div className="w-full md:w-1/3 bg-white rounded-3xl p-5 sm:p-6 shadow-xs border border-slate-200 flex flex-col overflow-y-auto">
                        <button 
                            onClick={() => setActiveTab('list')} 
                            className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 mb-5 cursor-pointer w-fit font-montserrat"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>Volver a la lista</span>
                        </button>
                        
                        <div className="space-y-2 mb-5">
                            <span className="font-mono text-xs font-bold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-200 inline-block">
                                #{selectedTicket.ticket_number || selectedTicket.id}
                            </span>
                            <h2 className="text-base font-extrabold text-slate-900 font-montserrat leading-snug">
                                {ticketDetails?.title || selectedTicket.title} 
                            </h2>
                        </div>

                        <div className="space-y-4 flex-1">
                            <div>
                                <span className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1.5 font-montserrat">Estado Actual</span>
                                {getStatusBadge(ticketDetails?.status || selectedTicket.status)}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                    <span className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1 font-montserrat">Categoría</span>
                                    <span className="text-xs font-bold text-slate-700">{translateCategory(ticketDetails?.category || selectedTicket.category)}</span>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                    <span className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1 font-montserrat">Prioridad</span>
                                    <span className="text-xs font-bold text-slate-700">{translatePriority(ticketDetails?.priority || selectedTicket.priority)}</span>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100">
                                <span className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1.5 font-montserrat">Mensaje Original</span>
                                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                                    <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">{ticketDetails?.description || selectedTicket.description}</p>
                                    {ticketDetails?.attachment_url && (
                                        <a href={getMediaUrl(ticketDetails.attachment_url)} target="_blank" rel="noreferrer" className="block mt-3 border border-slate-200 rounded-xl overflow-hidden hover:opacity-90 transition-opacity bg-white">
                                            <img src={getMediaUrl(ticketDetails.attachment_url)} alt="Evidencia inicial" className="max-h-40 object-cover w-full" />
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Panel Derecho: Chat */}
                    <div className="w-full md:w-2/3 bg-white rounded-3xl flex flex-col shadow-xs border border-slate-200 overflow-hidden">
                        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <h3 className="font-extrabold text-slate-900 font-montserrat text-sm flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-brand-600" />
                                <span>Historial de Conversación</span>
                            </h3>
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-full text-[10px] font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span>En vivo</span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/30">
                            {isLoadingDetails ? (
                                <div className="text-center py-10 text-slate-400 flex flex-col items-center h-full justify-center">
                                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-brand-500" />
                                    <span className="font-semibold text-xs font-montserrat">Cargando mensajes...</span>
                                </div>
                            ) : (!ticketDetails?.comments || ticketDetails.comments.length === 0) ? (
                                <div className="text-center py-10 text-slate-400 flex flex-col items-center h-full justify-center">
                                    <MessageSquare className="w-10 h-10 mb-2 text-slate-300" />
                                    <span className="font-medium text-xs">Aún no hay respuestas en este ticket.</span>
                                </div>
                            ) : (
                                <>
                                    {ticketDetails.comments.map((c: any, i: number) => {
                                        const isStaff = c.author_type === 'agent';
                                        return (
                                             <div key={i} className={`flex ${isStaff ? 'justify-start' : 'justify-end'} animate-in fade-in slide-in-from-bottom-2 duration-200`}>
                                                <div className={`p-4 rounded-2xl max-w-[90%] sm:max-w-[75%] shadow-xs ${
                                                    isStaff
                                                        ? 'bg-white border border-slate-200 rounded-tl-none' 
                                                        : 'bg-brand-50/80 border border-brand-200/80 rounded-tr-none'
                                                }`}>
                                                    <div className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wide flex items-center justify-between gap-4 font-montserrat">
                                                        <span>{translateAuthorName(c.author_name, c.author_type)}</span>
                                                        {c.created_at && (
                                                            <span className="text-[10px] text-slate-400 font-normal lowercase">
                                                                {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">{c.content}</p>
                                                    {c.attachment_url && (
                                                        <a href={getMediaUrl(c.attachment_url)} target="_blank" rel="noreferrer" className="block mt-2 border border-slate-200 rounded-xl overflow-hidden hover:opacity-90 transition-opacity bg-white">
                                                            <img src={getMediaUrl(c.attachment_url)} alt="Evidencia adjunta" className="max-h-48 object-cover min-w-[150px]" />
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={chatEndRef} />
                                </>
                            )}
                        </div>

                        {/* Reply Form */}
                        <div className="p-4 border-t border-slate-100 bg-white">
                            <form onSubmit={handleSendComment} className="flex flex-col sm:flex-row gap-2.5 items-end">
                                <div className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500 transition-all">
                                    <textarea
                                        required={!commentFile}
                                        value={commentContent}
                                        onChange={(e) => setCommentContent(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Escribe una respuesta... (Enter para enviar)"
                                        className="w-full bg-transparent resize-none outline-none text-xs font-semibold text-slate-700 p-2 max-h-32 min-h-[46px]"
                                        rows={2}
                                    />
                                    <div className="flex justify-between items-center px-2 pb-1 border-t border-slate-200/50 pt-2 mt-1">
                                        <input
                                            type="file"
                                            id="comment-file"
                                            className="hidden"
                                            onChange={(e) => setCommentFile(e.target.files?.[0] || null)}
                                        />
                                        <label htmlFor="comment-file" className="text-[11px] font-bold uppercase tracking-wide text-slate-500 hover:text-brand-600 cursor-pointer flex items-center gap-1 transition-colors font-montserrat">
                                            <Paperclip className="w-3.5 h-3.5" />
                                            <span>Adjuntar Archivo</span>
                                            {commentFile && <span className="text-brand-600 ml-2 max-w-[150px] truncate normal-case font-medium">{commentFile.name}</span>}
                                        </label>
                                        <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">Enter para enviar • Shift+Enter nueva línea</span>
                                    </div>
                                </div>
                                <button 
                                    type="submit" 
                                    disabled={isSendingComment || (!commentContent.trim() && !commentFile)}
                                    className="h-12 w-full sm:w-12 shrink-0 bg-gradient-to-r from-brand-600 to-amber-600 hover:from-brand-700 hover:to-amber-700 text-white rounded-2xl flex items-center justify-center transition-all disabled:opacity-50 shadow-md shadow-brand-500/20 cursor-pointer active:scale-95"
                                    title="Enviar respuesta"
                                >
                                    {isSendingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            ) : (
                /* TAB: LISTADO DE TICKETS */
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider font-montserrat">
                            Historial de mis tickets ({tickets.length})
                        </h3>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="px-3.5 py-1.5 text-xs font-bold text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-xl border border-brand-200 transition-all cursor-pointer font-montserrat"
                        >
                            + Nuevo Ticket
                        </button>
                    </div>

                    {isLoadingList ? (
                        <div className="p-16 flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-200">
                            <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-2" />
                            <p className="text-xs font-semibold text-slate-500 font-montserrat">Cargando tus tickets...</p>
                        </div>
                    ) : tickets.length === 0 ? (
                        <div className="p-12 bg-white rounded-3xl border border-slate-200 text-center flex flex-col items-center justify-center">
                            <div className="w-12 h-12 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center mb-3">
                                <Ticket className="w-6 h-6" />
                            </div>
                            <h4 className="text-sm font-bold text-slate-800 font-montserrat">
                                No tienes tickets creados
                            </h4>
                            <p className="text-xs text-slate-400 mt-1 max-w-sm">
                                Si tienes alguna duda sobre tus transacciones, saldo o requieres soporte, crea una solicitud.
                            </p>
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="mt-4 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                            >
                                Crear mi Primer Ticket
                            </button>
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-600">
                                    <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider font-montserrat">
                                        <tr>
                                            <th className="px-6 py-4">Ticket</th>
                                            <th className="px-6 py-4">Asunto / Título</th>
                                            <th className="px-6 py-4">Categoría</th>
                                            <th className="px-6 py-4">Prioridad</th>
                                            <th className="px-6 py-4">Estado</th>
                                            <th className="px-6 py-4 text-center">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium text-xs">
                                        {tickets.map((ticket, index) => (
                                            <tr 
                                                key={index} 
                                                onClick={() => handleViewTicket(ticket)}
                                                className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                                            >
                                                <td className="px-6 py-4">
                                                    <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 group-hover:bg-brand-50 group-hover:text-brand-700 transition-colors px-2 py-0.5 rounded-lg border border-slate-200 group-hover:border-brand-200">
                                                        #{ticket.id || ticket.ticket_number || index + 1}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-extrabold text-slate-900 group-hover:text-brand-700 transition-colors font-montserrat">{ticket.title || 'Sin Título'}</div>
                                                    {ticket.description && (
                                                        <div className="text-slate-400 font-normal mt-0.5 text-[11px] line-clamp-1 italic max-w-xs">{ticket.description}</div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-slate-700 font-bold">{translateCategory(ticket.category)}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-slate-600 font-semibold">{translatePriority(ticket.priority)}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {getStatusBadge(ticket.status)}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <button 
                                                        className="px-2.5 py-1 text-brand-700 hover:text-brand-800 hover:bg-brand-50 border border-brand-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleViewTicket(ticket);
                                                        }}
                                                    >
                                                        Ver Detalle
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
