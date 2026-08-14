import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Ticket, Send, CheckCircle2, AlertCircle } from 'lucide-react';
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

    const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');
    const [tickets, setTickets] = useState<any[]>([]);
    const [isLoadingList, setIsLoadingList] = useState(false);

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
        } catch (error: any) {
            setErrorMsg(error.message || 'Ocurrió un error al enviar el ticket.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-3xl mx-auto">
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Ticket className="w-8 h-8 text-brand-500" />
                    <h1 className="text-2xl font-bold text-slate-800 font-outfit">Soporte y Tickets</h1>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setActiveTab('create')}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'create' ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                        Nuevo Ticket
                    </button>
                    <button 
                        onClick={() => setActiveTab('list')}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'list' ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                        Mis Tickets
                    </button>
                </div>
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100"
            >
                {activeTab === 'create' ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                    {successMsg && (
                        <div className="p-4 bg-green-50 text-green-700 rounded-xl flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5" />
                            {successMsg}
                        </div>
                    )}
                    {errorMsg && (
                        <div className="p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" />
                            {errorMsg}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Título del Ticket</label>
                        <input
                            type="text"
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                            placeholder="Ej. Problema con mi inversión"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
                            <select 
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all bg-white"
                            >
                                <option value="general">General</option>
                                <option value="investments">Inversiones</option>
                                <option value="payments">Pagos / Retiros</option>
                                <option value="technical">Problema Técnico</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Prioridad</label>
                            <select 
                                value={priority}
                                onChange={(e) => setPriority(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all bg-white"
                            >
                                <option value="low">Baja</option>
                                <option value="normal">Normal</option>
                                <option value="urgent">Urgente</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                        <textarea
                            required
                            rows={4}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all resize-none"
                            placeholder="Detalla tu problema o solicitud..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Imagen / Evidencia (Opcional)</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all bg-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
                        />
                    </div>

                    <div className="pt-2">
                        <button 
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white py-3 rounded-xl font-medium transition-all disabled:opacity-50"
                        >
                            {isLoading ? 'Enviando...' : (
                                <>
                                    <Send className="w-5 h-5" />
                                    Enviar Ticket
                                </>
                            )}
                        </button>
                    </div>
                </form>
                ) : (
                <div className="space-y-4">
                    {isLoadingList ? (
                        <div className="text-center py-10 text-slate-500">Cargando tickets...</div>
                    ) : tickets.length === 0 ? (
                        <div className="text-center py-10 text-slate-500">No tienes tickets creados.</div>
                    ) : (
                        <div className="space-y-3">
                            {tickets.map((ticket, index) => (
                                <div key={index} className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 flex flex-col gap-2">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-semibold text-slate-800">{ticket.title || `Ticket #${ticket.id || ticket.ticket_number}`}</h3>
                                        <span className="px-3 py-1 bg-brand-100 text-brand-700 text-xs rounded-full font-medium">
                                            {ticket.status || 'abierto'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-600 line-clamp-2">{ticket.description}</p>
                                    <div className="flex gap-4 text-xs text-slate-500 mt-2">
                                        {ticket.category && <span>Categoría: <span className="font-medium text-slate-700 capitalize">{ticket.category}</span></span>}
                                        {ticket.priority && <span>Prioridad: <span className="font-medium text-slate-700 capitalize">{ticket.priority}</span></span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                )}
            </motion.div>
        </div>
    );
};
