import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Beneficiary, BeneficiaryCreate, BeneficiaryUpdate, beneficiariesService } from '../../../services/beneficiaries';
import { X, Loader2, HeartHandshake, Percent } from 'lucide-react';

interface BeneficiaryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
    beneficiary?: Beneficiary | null;
    availablePercentage?: number;
}

export const BeneficiaryModal: React.FC<BeneficiaryModalProps> = ({ 
    isOpen, 
    onClose, 
    onSaved, 
    beneficiary,
    availablePercentage = 100 
}) => {
    const [name, setName] = useState('');
    const [documentNumber, setDocumentNumber] = useState('');
    const [relationship, setRelationship] = useState('');
    const [percentage, setPercentage] = useState<number | ''>('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (beneficiary) {
            setName(beneficiary.name || '');
            setDocumentNumber(beneficiary.document_number || '');
            setRelationship(beneficiary.relationship || '');
            setPercentage(beneficiary.percentage || '');
            setPhone(beneficiary.phone || '');
            setEmail(beneficiary.email || '');
        } else {
            setName('');
            setDocumentNumber('');
            setRelationship('');
            setPercentage(availablePercentage > 0 ? availablePercentage : '');
            setPhone('');
            setEmail('');
        }
        setError(null);
    }, [beneficiary, isOpen, availablePercentage]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!name.trim()) {
            setError('El nombre completo del beneficiario es obligatorio');
            return;
        }

        if (percentage === '' || Number(percentage) <= 0 || Number(percentage) > 100) {
            setError('El porcentaje asignado debe ser un número entre 1% y 100%');
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            const payload = {
                name: name.trim(),
                document_number: documentNumber.trim() || null,
                relationship: relationship.trim() || null,
                percentage: Number(percentage),
                phone: phone.trim() || null,
                email: email.trim() || null,
            };

            if (beneficiary) {
                await beneficiariesService.updateMyBeneficiary(beneficiary.id, payload as BeneficiaryUpdate);
            } else {
                await beneficiariesService.createMyBeneficiary(payload as BeneficiaryCreate);
            }
            onSaved();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.detail || err.message || 'Error al guardar beneficiario');
        } finally {
            setIsSaving(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200" style={{ margin: 0 }}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header Estandarizado */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-brand-100 text-brand-700 rounded-xl">
                            <HeartHandshake className="w-5 h-5 text-brand-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 font-montserrat">
                                {beneficiary ? 'Editar Beneficiario' : 'Nuevo Beneficiario'}
                            </h3>
                            <p className="text-xs text-slate-500">Asigna parentesco y porcentaje de participación</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form id="beneficiary-form" onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                    {error && (
                        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-600">
                            {error}
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Nombre Completo <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ej. María Fernanda Pérez"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none text-xs font-bold text-slate-900"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700">Número de Documento</label>
                            <input
                                type="text"
                                value={documentNumber}
                                onChange={(e) => setDocumentNumber(e.target.value)}
                                placeholder="Ej. 1098765432"
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none text-xs font-semibold text-slate-900"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700">Parentesco / Relación</label>
                            <input
                                type="text"
                                value={relationship}
                                onChange={(e) => setRelationship(e.target.value)}
                                placeholder="Ej. Cónyuge, Hijo(a), Madre"
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none text-xs font-semibold text-slate-900"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-slate-700">Porcentaje Asignado (%) <span className="text-red-500">*</span></label>
                            <span className="text-[11px] font-bold text-brand-600">Disponible: {availablePercentage}%</span>
                        </div>
                        <div className="relative">
                            <input
                                type="number"
                                min="0.01"
                                max="100"
                                step="0.01"
                                value={percentage}
                                onChange={(e) => setPercentage(e.target.value ? Number(e.target.value) : '')}
                                placeholder="Ej. 50"
                                className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none text-xs font-bold text-slate-900 font-montserrat"
                                required
                            />
                            <Percent className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700">Teléfono (Opcional)</label>
                            <input
                                type="text"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="Ej. +57 300 123 4567"
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none text-xs font-semibold text-slate-900"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700">Correo Electrónico (Opcional)</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Ej. maria@ejemplo.com"
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none text-xs font-semibold text-slate-900"
                            />
                        </div>
                    </div>
                </form>

                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSaving}
                        className="px-5 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-200 transition-all text-sm cursor-pointer"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="beneficiary-form"
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-brand-500 hover:bg-brand-600 rounded-xl shadow-md shadow-brand-500/20 transition-all disabled:opacity-50 cursor-pointer"
                    >
                        {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                        Guardar Beneficiario
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
