import React, { useState, useEffect } from 'react';
import { X, User, CreditCard, Landmark, Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { investmentsService, AdminInvestment } from '../../../../services/investments';

interface EditInvestmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    investment: AdminInvestment | null;
}

export const EditInvestmentModal: React.FC<EditInvestmentModalProps> = ({ isOpen, onClose, investment }) => {
    const queryClient = useQueryClient();
    
    const [formData, setFormData] = useState({
        // Personal
        nombre_completo: '',
        correo_electronico: '',
        tipo_documento: '',
        documento: '',
        numero_celular: '',
        ciudad: '',
        fecha_nacimiento: '',
        referido_por: '',
        observaciones: '',
        
        // Bank
        banco: '',
        tipo_cuenta: '',
        numero_cuenta: '',
        
        // Financial
        paquete_inversion_adquirido: 1,
        total_contrato: '',
        fecha_ingreso: '',
        fecha_finalizacion: ''
    });

    useEffect(() => {
        if (investment) {
            setFormData({
                nombre_completo: investment.personal_info.nombre_completo || '',
                correo_electronico: investment.personal_info.correo_electronico || '',
                tipo_documento: investment.personal_info.tipo_documento || 'CC',
                documento: investment.personal_info.documento || '',
                numero_celular: investment.personal_info.numero_celular || '',
                ciudad: investment.personal_info.ciudad || '',
                fecha_nacimiento: investment.personal_info.fecha_nacimiento ? investment.personal_info.fecha_nacimiento.substring(0, 10) : '',
                referido_por: investment.personal_info.referido_por || '',
                observaciones: investment.personal_info.observaciones || '',
                
                banco: investment.bank_account.banco || '',
                tipo_cuenta: investment.bank_account.tipo_cuenta || 'Ahorros',
                numero_cuenta: investment.bank_account.numero_cuenta || '',
                
                paquete_inversion_adquirido: investment.financial_info.paquete_inversion_adquirido || 1,
                total_contrato: investment.financial_info.total_contrato ? investment.financial_info.total_contrato.toString() : '',
                fecha_ingreso: investment.fecha_ingreso ? investment.fecha_ingreso.substring(0, 10) : '',
                fecha_finalizacion: investment.fecha_finalizacion ? investment.fecha_finalizacion.substring(0, 10) : ''
            });
        }
    }, [investment]);

    const updateMutation = useMutation({
        mutationFn: (data: any) => investmentsService.updateInvestment(investment!.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-investments'] });
            onClose();
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Clean up data before sending
        const payload = { ...formData };
        if (payload.total_contrato) {
            (payload as any).total_contrato = parseFloat(payload.total_contrato);
        }
        
        updateMutation.mutate(payload);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    if (!isOpen || !investment) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white z-10">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Editar Inversión</h2>
                        <p className="text-sm text-slate-500 mt-1">ID de Contrato: {investment.codigo_asignado || investment.id}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                    <form id="edit-investment-form" onSubmit={handleSubmit} className="space-y-8 max-w-3xl mx-auto pb-8">
                        
                        {/* Datos Personales */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                                <User className="w-5 h-5 text-brand-600" />
                                Información Personal
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Nombre Completo</label>
                                    <input name="nombre_completo" value={formData.nombre_completo} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Correo Electrónico</label>
                                    <input type="email" name="correo_electronico" value={formData.correo_electronico} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
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
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Número de Documento</label>
                                    <input name="documento" value={formData.documento} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Celular</label>
                                    <input name="numero_celular" value={formData.numero_celular} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Ciudad</label>
                                    <input name="ciudad" value={formData.ciudad} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Fecha de Nacimiento</label>
                                    <input type="date" name="fecha_nacimiento" value={formData.fecha_nacimiento} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Referido por</label>
                                    <input name="referido_por" value={formData.referido_por} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Observaciones</label>
                                    <textarea name="observaciones" value={formData.observaciones} onChange={handleChange} rows={3} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"></textarea>
                                </div>
                            </div>
                        </div>

                        {/* Cuenta Bancaria */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                                <Landmark className="w-5 h-5 text-brand-600" />
                                Cuenta Bancaria
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Banco</label>
                                    <input name="banco" value={formData.banco} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Tipo de Cuenta</label>
                                    <select name="tipo_cuenta" value={formData.tipo_cuenta} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none">
                                        <option value="Ahorros">Ahorros</option>
                                        <option value="Corriente">Corriente</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Número de Cuenta</label>
                                    <input name="numero_cuenta" value={formData.numero_cuenta} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                                </div>
                            </div>
                        </div>

                        {/* Detalles Financieros */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                                <CreditCard className="w-5 h-5 text-brand-600" />
                                Datos Financieros
                            </h3>
                            
                            <div className="p-4 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl flex items-start gap-3 mb-6">
                                <span>⚠️</span>
                                <div>
                                    <p className="font-bold text-sm">Modificación de Datos Financieros</p>
                                    <p className="text-xs mt-1">Modificar estos valores afectará el cálculo de los rendimientos diarios. Por favor, haz cambios aquí solo si es estrictamente necesario o hay un error en la migración.</p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Paquete Adquirido (ID)</label>
                                    <input type="number" name="paquete_inversion_adquirido" value={formData.paquete_inversion_adquirido} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Capital Base (Total Contrato)</label>
                                    <input type="number" step="0.01" name="total_contrato" value={formData.total_contrato} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Fecha de Inicio (Ingreso)</label>
                                    <input type="date" name="fecha_ingreso" value={formData.fecha_ingreso} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Fecha de Finalización</label>
                                    <input type="date" name="fecha_finalizacion" value={formData.fecha_finalizacion} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                                </div>
                            </div>
                        </div>

                    </form>
                </div>

                <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-white z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                    <button 
                        type="button" 
                        onClick={onClose}
                        className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        type="submit"
                        form="edit-investment-form"
                        disabled={updateMutation.isPending}
                        className="px-8 py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl transition-colors flex items-center gap-2 shadow-sm shadow-brand-500/30"
                    >
                        {updateMutation.isPending && <Loader2 className="w-5 h-5 animate-spin" />}
                        Guardar Cambios
                    </button>
                </div>
            </div>
        </div>
    );
};
