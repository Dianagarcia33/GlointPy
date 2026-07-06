import React, { useState } from 'react';
import { X, Search, User, CreditCard, Landmark, Loader2, UploadCloud } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { investmentsService } from '../../../../services/investments';
import { useAuthStore } from '../../../../store/authStore';

interface CreateInvestmentModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CreateInvestmentModal: React.FC<CreateInvestmentModalProps> = ({ isOpen, onClose }) => {
    const queryClient = useQueryClient();
    const token = useAuthStore(state => state.accessToken);
    const [step, setStep] = useState<1 | 2>(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchError, setSearchError] = useState('');
    
    // Form State
    const [userId, setUserId] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        tipo_documento: 'CC',
        documento: '',
        numero_celular: '',
        ciudad: '',
        fecha_nacimiento: '',
        banco: '',
        tipo_cuenta: 'Ahorros',
        numero_cuenta: '',
        paquete_id: 1,
        monto: '',
        comprobante_path: ''
    });

    const [activeTab, setActiveTab] = useState<'personal' | 'bank' | 'investment'>('personal');

    const searchMutation = useMutation({
        mutationFn: (query: string) => investmentsService.searchUser(query),
        onSuccess: (data) => {
            setUserId(data.id);
            setFormData(prev => ({
                ...prev,
                name: data.name || '',
                email: data.email || '',
                documento: data.documento || prev.documento,
                numero_celular: data.numero_celular || '',
                ciudad: data.ciudad || '',
                banco: data.banco || '',
                tipo_cuenta: data.tipo_cuenta || 'Ahorros',
                numero_cuenta: data.numero_cuenta || ''
            }));
            setSearchError('');
            setStep(2);
        },
        onError: () => {
            setUserId(null);
            setSearchError('Usuario no encontrado. Puedes registrarlo como un usuario nuevo llenando sus datos.');
            setStep(2); // Avanzamos igual, pero como usuario nuevo
        }
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => investmentsService.createInvestmentForClient(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-investments'] });
            queryClient.invalidateQueries({ queryKey: ['admin-investment-requests'] });
            onClose();
            // Reset form
            setStep(1);
            setFormData({
                name: '', email: '', tipo_documento: 'CC', documento: '',
                numero_celular: '', ciudad: '', fecha_nacimiento: '',
                banco: '', tipo_cuenta: 'Ahorros', numero_cuenta: '',
                paquete_id: 1, monto: '', comprobante_path: ''
            });
        }
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.length >= 3) {
            searchMutation.mutate(searchQuery);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate({
            ...formData,
            user_id: userId,
            monto: parseFloat(formData.monto)
        });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Crear Solicitud de Inversión</h2>
                        <p className="text-sm text-slate-500 mt-1">Registra una inversión a nombre de un cliente</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                    {step === 1 ? (
                        <div className="max-w-md mx-auto py-12">
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 bg-brand-100 text-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <Search className="w-8 h-8" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900">Buscar Cliente Existente</h3>
                                <p className="text-sm text-slate-500 mt-2">Busca por correo electrónico o número de cédula para autocompletar sus datos, o presiona "Crear Nuevo Cliente".</p>
                            </div>
                            
                            <form onSubmit={handleSearch} className="space-y-4">
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input 
                                        type="text" 
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        placeholder="ej. juan@email.com o 1010101010"
                                        className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                                        autoFocus
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button 
                                        type="submit" 
                                        disabled={searchMutation.isPending || searchQuery.length < 3}
                                        className="flex-1 py-3 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl flex items-center justify-center disabled:opacity-50"
                                    >
                                        {searchMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Buscar Cliente'}
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => { setUserId(null); setStep(2); }}
                                        className="flex-1 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-xl"
                                    >
                                        Crear Nuevo Cliente
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : (
                        <form id="create-investment-form" onSubmit={handleSubmit} className="space-y-6">
                            {searchError && (
                                <div className="p-4 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl flex items-start gap-3">
                                    <span>⚠️</span>
                                    <div>
                                        <p className="font-bold">Cliente no encontrado</p>
                                        <p className="text-sm">{searchError}</p>
                                    </div>
                                </div>
                            )}

                            {/* Tabs */}
                            <div className="flex border-b border-slate-200">
                                <button type="button" onClick={() => setActiveTab('personal')} className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'personal' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                                    <User className="w-4 h-4" /> Personal
                                </button>
                                <button type="button" onClick={() => setActiveTab('bank')} className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'bank' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                                    <Landmark className="w-4 h-4" /> Cuenta Bancaria
                                </button>
                                <button type="button" onClick={() => setActiveTab('investment')} className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'investment' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                                    <CreditCard className="w-4 h-4" /> Inversión
                                </button>
                            </div>

                            <div className="bg-white p-6 rounded-xl border border-slate-200">
                                {activeTab === 'personal' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1">Nombre Completo *</label>
                                            <input required name="name" value={formData.name} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1">Correo Electrónico *</label>
                                            <input required type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" disabled={!!userId} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1">Tipo de Documento</label>
                                            <select name="tipo_documento" value={formData.tipo_documento} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none">
                                                <option value="CC">Cédula de Ciudadanía</option>
                                                <option value="CE">Cédula de Extranjería</option>
                                                <option value="NIT">NIT</option>
                                                <option value="PAS">Pasaporte</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1">Número de Documento *</label>
                                            <input required name="documento" value={formData.documento} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1">Celular *</label>
                                            <input required name="numero_celular" value={formData.numero_celular} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1">Ciudad *</label>
                                            <input required name="ciudad" value={formData.ciudad} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1">Fecha de Nacimiento</label>
                                            <input type="date" name="fecha_nacimiento" value={formData.fecha_nacimiento} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'bank' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1">Banco *</label>
                                            <input required name="banco" value={formData.banco} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1">Tipo de Cuenta</label>
                                            <select name="tipo_cuenta" value={formData.tipo_cuenta} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none">
                                                <option value="Ahorros">Ahorros</option>
                                                <option value="Corriente">Corriente</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1">Número de Cuenta *</label>
                                            <input required name="numero_cuenta" value={formData.numero_cuenta} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'investment' && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-1">Paquete de Inversión *</label>
                                                <select required name="paquete_id" value={formData.paquete_id} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none">
                                                    <option value={1}>12 Meses</option>
                                                    <option value={2}>12 Meses (Promo)</option>
                                                    <option value={3}>18 Meses</option>
                                                    <option value={4}>18 Meses (Promo)</option>
                                                    <option value={5}>24 Meses</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-1">Monto de Inversión (COP) *</label>
                                                <input required type="number" min="0" step="0.01" name="monto" value={formData.monto} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1">Comprobante de Pago (URL)</label>
                                            <div className="relative">
                                                <UploadCloud className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                                <input name="comprobante_path" value={formData.comprobante_path} onChange={handleChange} placeholder="https://ejemplo.com/comprobante.pdf" className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1">Ingresa la URL del comprobante si ya lo tienes subido a un almacenamiento en la nube.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </form>
                    )}
                </div>

                <div className="p-6 border-t border-slate-100 flex justify-between bg-white">
                    {step === 2 && (
                        <>
                            <button 
                                type="button" 
                                onClick={() => setStep(1)}
                                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
                            >
                                Atrás
                            </button>
                            <button 
                                type="submit"
                                form="create-investment-form"
                                disabled={createMutation.isPending}
                                className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl transition-colors flex items-center gap-2"
                            >
                                {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                                Crear Solicitud
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
