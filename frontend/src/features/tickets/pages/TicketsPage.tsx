import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Ticket, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../../../services/api';

export const TicketsPage: React.FC = () => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('general');
    const [priority, setPriority] = useState('normal');
    
    const [isLoading, setIsLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setSuccessMsg('');
        setErrorMsg('');

        try {
            await api.post('/tickets/', {
                title,
                description,
                category,
                priority
            });
            setSuccessMsg('¡Ticket enviado correctamente! Nuestro equipo lo revisará pronto.');
            setTitle('');
            setDescription('');
        } catch (error: any) {
            setErrorMsg(error.response?.data?.detail || 'Ocurrió un error al enviar el ticket.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-3xl mx-auto">
            <div className="mb-6 flex items-center gap-3">
                <Ticket className="w-8 h-8 text-brand-500" />
                <h1 className="text-2xl font-bold text-slate-800 font-outfit">Soporte y Tickets</h1>
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100"
            >
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
            </motion.div>
        </div>
    );
};
