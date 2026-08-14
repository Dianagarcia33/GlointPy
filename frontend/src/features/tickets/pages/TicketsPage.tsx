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

    const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
    const [tickets, setTickets] = useState<any[]>([]);
    const [isLoadingList, setIsLoadingList] = useState(true);

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
                                        <tr key={index} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="px-6 py-4">
                                                <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                                                    #{ticket.id || ticket.ticket_number || index + 1}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-800 text-sm">{ticket.title || 'Sin Título'}</div>
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
