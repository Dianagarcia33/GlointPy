import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Ticket, Send, CheckCircle2, AlertCircle, Plus, List, Loader2 } from 'lucide-react';
import { fetchApi } from '../../../services/api';

export const TicketsPage: React.FC = () => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('general');
    const [priority, setPriority] = useState('normal');
    const [file, setFile] = useState<File | null>(null);
    
    const [isLoading, setIsLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const [activeTab, setActiveTab] = useState<'list' | 'create' | 'view'>('list');
    const [tickets, setTickets] = useState<any[]>([]);
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
                formData.append('file', commentFile);
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
                formData.append('file', file);
            }

            await fetchApi('/tickets/', {
                method: 'POST',
                body: formData
            });
            setSuccessMsg('¡Ticket enviado correctamente! Nuestro equipo lo revisará pronto.');
            setTitle('');
            setDescription('');
            setFile(null);
            setTimeout(() => {
                setActiveTab('list');
                setSuccessMsg('');
            }, 2000);
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
                        onClick={() => setActiveTab(activeTab === 'create' ? 'list' : 'create')}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-2xl transition-all shadow-lg shadow-brand-500/30 text-sm font-bold cursor-pointer shrink-0"
                    >
                        {activeTab === 'create' ? <List className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        <span>{activeTab === 'create' ? 'Ver mis Tickets' : 'Nuevo Ticket'}</span>
                    </button>
                </div>
            </div>

            {activeTab === 'create' ? (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200 max-w-3xl mx-auto"
                >
                    <h2 className="text-xl font-bold text-slate-800 mb-6 font-montserrat">Crear Nueva Solicitud</h2>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {successMsg && (
                            <div className="p-4 bg-emerald-50 text-emerald-700 rounded-xl flex items-center gap-3 border border-emerald-100">
                                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                                <span className="font-bold text-sm">{successMsg}</span>
                            </div>
                        )}
                        {errorMsg && (
                            <div className="p-4 bg-rose-50 text-rose-700 rounded-xl flex items-center gap-3 border border-rose-100">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <span className="font-bold text-sm">{errorMsg}</span>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Título del Ticket</label>
                            <input
                                type="text"
                                required
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none text-sm font-semibold text-slate-800"
                                placeholder="Ej: Error al procesar pago"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Categoría</label>
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none text-sm font-semibold text-slate-800 cursor-pointer"
                                >
                                    <option value="general">General</option>
                                    <option value="billing">Pagos / Facturación</option>
                                    <option value="technical">Soporte Técnico</option>
                                    <option value="deliveries">Envíos / Pedidos</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Prioridad</label>
                                <select
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value)}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none text-sm font-semibold text-slate-800 cursor-pointer"
                                >
                                    <option value="low">Baja</option>
                                    <option value="normal">Normal</option>
                                    <option value="urgent">Urgente</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Descripción</label>
                            <textarea
                                required
                                rows={5}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none resize-none text-sm font-semibold text-slate-800"
                                placeholder="Detalla tu problema o solicitud de forma clara..."
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Imagen / Evidencia (Opcional)</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                className="w-full px-4 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-brand-100 file:text-brand-700 hover:file:bg-brand-200 cursor-pointer"
                            />
                        </div>

                        <div className="pt-4 border-t border-slate-100">
                            <button 
                                type="submit"
                                disabled={isLoading}
                                className="w-full sm:w-auto px-8 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                <span>{isLoading ? 'Enviando...' : 'Enviar Ticket'}</span>
                            </button>
                        </div>
                    </form>
                </motion.div>
            ) : activeTab === 'view' && selectedTicket ? (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200 max-w-4xl mx-auto flex flex-col min-h-[600px] max-h-[800px]"
                >
                    <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-4">
                        <div>
                            <button onClick={() => setActiveTab('list')} className="text-sm font-bold text-slate-500 hover:text-slate-800 flex items-center gap-2 mb-3 cursor-pointer">
                                &larr; Volver a la lista
                            </button>
                            <h2 className="text-xl font-bold text-slate-800 font-montserrat">
                                {ticketDetails?.title || selectedTicket.title} 
                                <span className="ml-3 text-sm font-mono text-slate-400">#{selectedTicket.ticket_number || selectedTicket.id}</span>
                            </h2>
                        </div>
                        {getStatusBadge(ticketDetails?.status || selectedTicket.status)}
                    </div>
                    
                    <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar pb-4">
                        {isLoadingDetails ? (
                            <div className="text-center py-10 text-slate-400 flex flex-col items-center">
                                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-brand-400" />
                                <span className="font-medium text-sm">Cargando conversación...</span>
                            </div>
                        ) : (
                            <>
                                {/* Original Ticket as first message */}
                                <div className="flex justify-end mb-6">
                                    <div className="bg-brand-50 rounded-2xl rounded-tr-none p-4 max-w-[85%] sm:max-w-[70%] border border-brand-100 shadow-sm">
                                        <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{ticketDetails?.description || selectedTicket.description}</p>
                                        {ticketDetails?.attachment_url && (
                                            <a href={ticketDetails.attachment_url} target="_blank" rel="noreferrer" className="block mt-3 border border-brand-200 rounded-lg overflow-hidden hover:opacity-90 transition-opacity">
                                                <img src={ticketDetails.attachment_url} alt="Evidencia" className="max-h-48 object-cover w-full" />
                                            </a>
                                        )}
                                        <div className="text-[10px] text-brand-600/70 font-bold mt-2 text-right uppercase tracking-wider">Ticket Original</div>
                                    </div>
                                </div>
                                
                                {/* Comments */}
                                {ticketDetails?.comments?.map((c: any, i: number) => {
                                    // Determinar si el mensaje es del staff o del cliente
                                    // La API dice: "El external_user_name es opcional" pero usualmente el staff es is_internal
                                    // o no tiene external_user_id. Asumiremos que si viene de GlointPy es del cliente (Tú).
                                    const isStaff = !c.external_user_name;
                                    return (
                                        <div key={i} className={`flex ${isStaff ? 'justify-start' : 'justify-end'}`}>
                                            <div className={`p-4 rounded-2xl max-w-[85%] sm:max-w-[70%] shadow-sm ${
                                                isStaff
                                                    ? 'bg-slate-50 border border-slate-200 rounded-tl-none' 
                                                    : 'bg-brand-50 border border-brand-100 rounded-tr-none'
                                            }`}>
                                                <div className="text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                                                    {c.external_user_name || 'Agente de Soporte'}
                                                </div>
                                                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{c.content}</p>
                                                {c.attachment_url && (
                                                    <a href={c.attachment_url} target="_blank" rel="noreferrer" className="block mt-3 border border-slate-200 rounded-lg overflow-hidden hover:opacity-90 transition-opacity">
                                                        <img src={c.attachment_url} alt="Evidencia adjunta" className="max-h-48 object-cover w-full" />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </>
                        )}
                    </div>
                    
                    {/* Reply Form */}
                    <div className="pt-4 mt-auto border-t border-slate-100 bg-white">
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
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <Ticket className="w-8 h-8 text-slate-300" />
                                                <p>No tienes tickets creados.</p>
                                                <button onClick={() => setActiveTab('create')} className="text-brand-600 font-bold hover:underline text-xs mt-1 cursor-pointer">
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
