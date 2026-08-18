import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Ticket, Send, CheckCircle2, AlertCircle, Plus, List, Loader2, MessageSquare } from 'lucide-react';
import { fetchApi } from '../../../services/api';
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

    useEffect(() => {
        if (activeTab === 'list') {
            fetchTickets();
        }
    }, [activeTab]);

    const fetchTickets = async () => {
        setIsLoadingList(true);
        try {
            const data = await fetchApi('/tickets/my-tickets');
            setTickets(Array.isArray(data) ? data : data?.data || []);
        } catch (error: any) {
            console.error('Error fetching tickets', error);
        } finally {
            setIsLoadingList(false);
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
        } catch (error: any) {
            console.error('Error fetching ticket details', error);
        } finally {
            setIsLoadingDetails(false);
        }
    };

    const handleSendComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentContent.trim() && !commentFile) return;
        
        setIsSendingComment(true);
        try {
            const formData = new FormData();
            formData.append('content', commentContent);
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
            const data = await fetchApi(`/tickets/${num}`);
            setTicketDetails(data);
        } catch (error: any) {
            alert(error.message || 'Error al enviar respuesta');
        } finally {
            setIsSendingComment(false);
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

    const getStatusBadge = (status: string) => {
        const s = (status || 'abierto').toLowerCase();
        if (s === 'abierto' || s === 'open') {
            return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">Abierto</span>;
        }
        if (s === 'cerrado' || s === 'closed') {
            return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Cerrado</span>;
        }
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200 capitalize">{s}</span>;
    };

    return (
        <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in duration-300">
            <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="absolute right-0 top-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div className="relative z-10 space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-bold text-brand-300 backdrop-blur-sm">
                        <Ticket className="w-4 h-4 text-brand-400" /> Centro de Ayuda
                    </div>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight font-montserrat">
                        Soporte y Tickets
                    </h1>
                    <p className="text-slate-300 text-sm max-w-xl">
                        Crea solicitudes de soporte, reporta problemas y haz seguimiento del estado de tus consultas.
                    </p>
                </div>
                
                <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                    <button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-2xl transition-all shadow-lg shadow-brand-500/30 text-sm font-bold cursor-pointer shrink-0 hover:-translate-y-0.5"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Nuevo Ticket</span>
                    </button>
                </div>
            </div>

            {createPortal(
                <AnimatePresence>
                    {isCreateModalOpen && (
                        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }} 
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm cursor-pointer"
                            onClick={() => setIsCreateModalOpen(false)}
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-2xl bg-white rounded-[2rem] p-6 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 max-h-[90vh] overflow-y-auto custom-scrollbar"
                        >
                            <button 
                                onClick={() => setIsCreateModalOpen(false)}
                                className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 transition-colors cursor-pointer text-slate-400 hover:text-slate-600"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                            
                            <div className="mb-8 pr-10">
                                <h2 className="text-2xl font-black text-slate-800 font-montserrat tracking-tight">Nueva Solicitud de Soporte</h2>
                                <p className="text-slate-500 text-sm font-medium mt-2">Por favor, detalla tu inconveniente para que nuestro equipo pueda ayudarte rápidamente.</p>
                            </div>
                            
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {successMsg && (
                                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center gap-3 border border-emerald-100/50">
                                        <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                                        <span className="font-bold text-sm">{successMsg}</span>
                                    </motion.div>
                                )}
                                {errorMsg && (
                                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-rose-50 text-rose-700 rounded-2xl flex items-center gap-3 border border-rose-100/50">
                                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                        <span className="font-bold text-sm">{errorMsg}</span>
                                    </motion.div>
                                )}

                                <div className="group">
                                    <label className="block text-[11px] font-black text-slate-400 mb-2 uppercase tracking-widest group-focus-within:text-brand-500 transition-colors">Asunto del Ticket</label>
                                    <input
                                        type="text"
                                        required
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="w-full px-5 py-4 border-2 border-slate-100 rounded-2xl bg-slate-50/50 focus:bg-white focus:border-brand-500 transition-all outline-none text-sm font-bold text-slate-800 shadow-sm"
                                        placeholder="Ej: Problemas al procesar mi pago..."
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="group">
                                        <label className="block text-[11px] font-black text-slate-400 mb-2 uppercase tracking-widest group-focus-within:text-brand-500 transition-colors">Categoría</label>
                                        <div className="relative">
                                            <select
                                                value={category}
                                                onChange={(e) => setCategory(e.target.value)}
                                                className="w-full px-5 py-4 border-2 border-slate-100 rounded-2xl bg-slate-50/50 focus:bg-white focus:border-brand-500 transition-all outline-none text-sm font-bold text-slate-800 cursor-pointer appearance-none shadow-sm"
                                            >
                                                <option value="general">Consulta General</option>
                                                <option value="billing">Pagos / Facturación</option>
                                                <option value="technical">Soporte Técnico</option>
                                                <option value="deliveries">Envíos / Pedidos</option>
                                            </select>
                                            <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none text-slate-400">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="group">
                                        <label className="block text-[11px] font-black text-slate-400 mb-2 uppercase tracking-widest group-focus-within:text-brand-500 transition-colors">Prioridad</label>
                                        <div className="relative">
                                            <select
                                                value={priority}
                                                onChange={(e) => setPriority(e.target.value)}
                                                className="w-full px-5 py-4 border-2 border-slate-100 rounded-2xl bg-slate-50/50 focus:bg-white focus:border-brand-500 transition-all outline-none text-sm font-bold text-slate-800 cursor-pointer appearance-none shadow-sm"
                                            >
                                                <option value="low">Baja (Sin urgencia)</option>
                                                <option value="normal">Normal</option>
                                                <option value="urgent">Urgente (Bloqueante)</option>
                                            </select>
                                            <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none text-slate-400">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="group">
                                    <label className="block text-[11px] font-black text-slate-400 mb-2 uppercase tracking-widest group-focus-within:text-brand-500 transition-colors">Descripción del Problema</label>
                                    <textarea
                                        required
                                        rows={4}
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="w-full px-5 py-4 border-2 border-slate-100 rounded-2xl bg-slate-50/50 focus:bg-white focus:border-brand-500 transition-all outline-none resize-none text-sm font-medium text-slate-700 shadow-sm leading-relaxed"
                                        placeholder="Describe detalladamente lo que sucede..."
                                    />
                                </div>

                                <div className="group">
                                    <label className="block text-[11px] font-black text-slate-400 mb-2 uppercase tracking-widest group-focus-within:text-brand-500 transition-colors">Evidencia / Captura (Opcional)</label>
                                    <div className="relative border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 hover:bg-slate-50 hover:border-brand-300 transition-all group-focus-within:border-brand-500 group-focus-within:bg-white">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        />
                                        <div className="p-5 flex flex-col items-center justify-center text-center">
                                            <div className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center mb-2">
                                                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                            </div>
                                            <p className="text-sm font-bold text-slate-700">{file ? file.name : "Haz clic o arrastra una imagen aquí"}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 mt-2">
                                    <button 
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full py-4 bg-brand-500 hover:bg-brand-600 text-white rounded-2xl font-black text-sm tracking-wide transition-all shadow-[0_8px_20px_rgba(var(--brand-500-rgb),0.3)] hover:shadow-[0_12px_25px_rgba(var(--brand-500-rgb),0.4)] flex items-center justify-center gap-3 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed hover:-translate-y-0.5"
                                    >
                                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                        {isLoading ? 'ENVIANDO TICKET...' : 'CREAR TICKET AHORA'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
                </AnimatePresence>,
                document.body
            )}

            {activeTab === 'view' && selectedTicket ? (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-7xl mx-auto flex flex-col md:flex-row gap-6 items-stretch h-auto md:h-[700px]"
                >
                    {/* Panel Izquierdo: Detalles */}
                    <div className="w-full md:w-1/3 bg-white rounded-3xl p-6 shadow-xs border border-slate-200 flex flex-col overflow-y-auto custom-scrollbar">
                        <button onClick={() => setActiveTab('list')} className="text-sm font-bold text-slate-500 hover:text-slate-800 flex items-center gap-2 mb-6 cursor-pointer w-fit">
                            &larr; Volver a la lista
                        </button>
                        
                        <div className="mb-6">
                            <h2 className="text-xl font-bold text-slate-800 font-montserrat leading-tight">
                                {ticketDetails?.title || selectedTicket.title} 
                            </h2>
                            <div className="mt-3 font-mono text-xs font-bold text-brand-700 bg-brand-50 px-3 py-1.5 rounded-lg inline-block border border-brand-200">
                                #{selectedTicket.ticket_number || selectedTicket.id}
                            </div>
                        </div>

                        <div className="space-y-5 mb-6 flex-1">
                            <div>
                                <span className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2">Estado Actual</span>
                                {getStatusBadge(ticketDetails?.status || selectedTicket.status)}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                    <span className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Categoría</span>
                                    <span className="text-sm font-semibold text-slate-700 capitalize">{ticketDetails?.category || selectedTicket.category || 'General'}</span>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                    <span className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Prioridad</span>
                                    <span className="text-sm font-semibold text-slate-700 capitalize">{ticketDetails?.priority || selectedTicket.priority || 'Normal'}</span>
                                </div>
                            </div>

                            <div className="pt-5 border-t border-slate-100">
                                <span className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2">Mensaje Original</span>
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{ticketDetails?.description || selectedTicket.description}</p>
                                    {ticketDetails?.attachment_url && (
                                        <a href={ticketDetails.attachment_url} target="_blank" rel="noreferrer" className="block mt-4 border border-slate-200 rounded-xl overflow-hidden hover:opacity-90 transition-opacity bg-white">
                                            <img src={ticketDetails.attachment_url} alt="Evidencia inicial" className="max-h-40 object-cover w-full" />
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Panel Derecho: Chat */}
                    <div className="w-full md:w-2/3 bg-white rounded-3xl flex flex-col shadow-xs border border-slate-200 overflow-hidden">
                        <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 font-montserrat flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-brand-500" />
                                Historial de Conversación
                            </h3>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar bg-slate-50/30">
                            {isLoadingDetails ? (
                                <div className="text-center py-10 text-slate-400 flex flex-col items-center h-full justify-center">
                                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-brand-400" />
                                    <span className="font-medium text-sm">Cargando mensajes...</span>
                                </div>
                            ) : (!ticketDetails?.comments || ticketDetails.comments.length === 0) ? (
                                <div className="text-center py-10 text-slate-400 flex flex-col items-center h-full justify-center">
                                    <MessageSquare className="w-12 h-12 mb-3 text-slate-200" />
                                    <span className="font-medium text-sm">Aún no hay respuestas en este ticket.</span>
                                </div>
                            ) : (
                                ticketDetails.comments.map((c: any, i: number) => {
                                    const isStaff = c.author_type === 'agent';
                                    return (
                                        <div key={i} className={`flex ${isStaff ? 'justify-start' : 'justify-end'}`}>
                                            <div className={`p-4 rounded-2xl max-w-[90%] sm:max-w-[75%] shadow-sm ${
                                                isStaff
                                                    ? 'bg-white border border-slate-200 rounded-tl-none' 
                                                    : 'bg-brand-50 border border-brand-100 rounded-tr-none'
                                            }`}>
                                                <div className="text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wide">
                                                    {c.author_name || (isStaff ? 'Agente de Soporte' : 'Usuario')}
                                                </div>
                                                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{c.content}</p>
                                                {c.attachment_url && (
                                                    <a href={c.attachment_url} target="_blank" rel="noreferrer" className="block mt-3 border border-slate-200 rounded-lg overflow-hidden hover:opacity-90 transition-opacity bg-white">
                                                        <img src={c.attachment_url} alt="Evidencia adjunta" className="max-h-48 object-cover min-w-[150px]" />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Reply Form */}
                        <div className="p-4 sm:p-5 border-t border-slate-100 bg-white shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)] relative z-10">
                            <form onSubmit={handleSendComment} className="flex flex-col sm:flex-row gap-3 items-end">
                                <div className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500 transition-all">
                                    <textarea
                                        required={!commentFile}
                                        value={commentContent}
                                        onChange={(e) => setCommentContent(e.target.value)}
                                        placeholder="Escribe una respuesta al soporte..."
                                        className="w-full bg-transparent resize-none outline-none text-sm font-semibold text-slate-700 p-2 max-h-32 min-h-[50px]"
                                        rows={2}
                                    />
                                    <div className="flex justify-between items-center px-2 pb-1 border-t border-slate-200/50 pt-2 mt-1">
                                        <input
                                            type="file"
                                            id="comment-file"
                                            className="hidden"
                                            onChange={(e) => setCommentFile(e.target.files?.[0] || null)}
                                        />
                                        <label htmlFor="comment-file" className="text-[11px] font-bold uppercase tracking-wide text-slate-500 hover:text-brand-600 cursor-pointer flex items-center gap-1 transition-colors">
                                            + Adjuntar Archivo
                                            {commentFile && <span className="text-brand-600 ml-2 max-w-[150px] truncate normal-case font-medium">{commentFile.name}</span>}
                                        </label>
                                    </div>
                                </div>
                                <button 
                                    type="submit" 
                                    disabled={isSendingComment || (!commentContent.trim() && !commentFile)}
                                    className="h-14 w-full sm:w-14 flex-shrink-0 bg-brand-500 hover:bg-brand-600 text-white rounded-2xl flex items-center justify-center transition-all disabled:opacity-50 shadow-md shadow-brand-500/20 cursor-pointer"
                                    title="Enviar respuesta"
                                >
                                    {isSendingComment ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-1" />}
                                </button>
                            </form>
                        </div>
                    </div>
                </motion.div>
            ) : (
                <div className="bg-white rounded-3xl shadow-xs border border-slate-200 overflow-hidden">
                    <div className="p-4 sm:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h2 className="text-lg font-bold text-slate-800 font-montserrat">Tus Tickets Recientes</h2>
                    </div>
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
                            <tbody className="divide-y divide-slate-100 font-semibold text-xs">
                                {isLoadingList ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-brand-400" />
                                            Cargando tus tickets...
                                        </td>
                                    </tr>
                                ) : tickets.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <Ticket className="w-8 h-8 text-slate-300" />
                                                <p>No tienes tickets creados.</p>
                                                <button onClick={() => setIsCreateModalOpen(true)} className="text-brand-600 font-bold hover:underline text-xs mt-1 cursor-pointer">
                                                    Crea tu primer ticket aquí
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    tickets.map((ticket, index) => (
                                        <tr 
                                            key={index} 
                                            onClick={() => handleViewTicket(ticket)}
                                            className="hover:bg-brand-50/50 transition-colors cursor-pointer group"
                                        >
                                            <td className="px-6 py-4">
                                                <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 group-hover:bg-brand-100 group-hover:text-brand-700 transition-colors px-2.5 py-1 rounded-lg border border-slate-200 group-hover:border-brand-200">
                                                    #{ticket.id || ticket.ticket_number || index + 1}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-800 text-sm group-hover:text-brand-700 transition-colors">{ticket.title || 'Sin Título'}</div>
                                                <div className="text-slate-500 font-normal mt-1 line-clamp-1 max-w-xs">{ticket.description}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-slate-600 capitalize">{ticket.category || 'N/A'}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-slate-600 capitalize">{ticket.priority || 'N/A'}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {getStatusBadge(ticket.status)}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button 
                                                    className="px-3 py-1.5 bg-brand-50 text-brand-700 border border-brand-200 rounded-xl text-xs font-bold hover:bg-brand-100 transition-colors shadow-sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleViewTicket(ticket);
                                                    }}
                                                >
                                                    Ver Detalle
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};
