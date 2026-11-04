import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Beneficiary, BeneficiaryDistributionItem, beneficiariesService } from '../../../services/beneficiaries';
import { X, Loader2, HeartHandshake, Percent, AlertCircle } from 'lucide-react';

interface BeneficiaryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
    beneficiary?: Beneficiary | null;
    availablePercentage?: number;
    // Demás beneficiarios del usuario (se pueden reajustar para que el total sea 100 %)
    otherBeneficiaries?: Beneficiary[];
}

export const BeneficiaryModal: React.FC<BeneficiaryModalProps> = ({ 
    isOpen, 
    onClose, 
    onSaved, 
    beneficiary,
    availablePercentage = 100,
    otherBeneficiaries = []
}) => {
    const [name, setName] = useState('');
    const [documentNumber, setDocumentNumber] = useState('');
    const [relationship, setRelationship] = useState('');
    const [percentage, setPercentage] = useState<number | ''>('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    
    const [othersPct, setOthersPct] = useState<Record<number, number | ''>>({});

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
        setOthersPct(Object.fromEntries(otherBeneficiaries.map(o => [o.id, Number(o.percentage)])));
        setError(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [beneficiary, isOpen, availablePercentage]);

    // H-91: total resultante (este beneficiario + los demás, con los ajustes) en centésimas de punto
    const toCents = (v: number | '' | undefined) => Math.round(Number(v || 0) * 100);
    const totalCents = toCents(percentage) + otherBeneficiaries.reduce((acc, o) => acc + toCents(othersPct[o.id]), 0);
    const isComplete = totalCents === 10000;

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!name.trim()) {
            setError('El nombre completo del beneficiario es obligatorio');
            return;
        }

        const valPct = Number(percentage);
        if (percentage === '' || isNaN(valPct) || valPct <= 0 || valPct > 100) {
            setError('El porcentaje asignado debe ser un número válido entre 0.01% y 100%');
            return;
        }

        if (!isComplete) {
            const diff = (10000 - totalCents) / 100;
            setError(`La distribución debe sumar exactamente 100 %. Con estos valores suma ${(totalCents / 100).toFixed(2)} % (${diff > 0 ? `faltan ${diff.toFixed(2)} %` : `sobran ${Math.abs(diff).toFixed(2)} %`}). Ajusta los porcentajes.`);
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

            // H-91: un solo guardado atómico; el servidor valida que el total sea exactamente 100 %
            const items: BeneficiaryDistributionItem[] = otherBeneficiaries
                .filter(o => toCents(othersPct[o.id]) !== toCents(o.percentage))
                .map(o => ({ id: o.id, percentage: Number(othersPct[o.id] || 0) }));
            items.push(beneficiary ? { id: beneficiary.id, ...payload } : payload);
            await beneficiariesService.saveMyDistribution(items);
            onSaved();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Error al guardar beneficiario');
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
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold text-brand-600">Disponible: {availablePercentage.toFixed(2)}%</span>
                                {availablePercentage > 0 && Number(percentage) !== availablePercentage && (
                                    <button
                                        type="button"
                                        onClick={() => setPercentage(availablePercentage)}
                                        className="text-[10px] font-bold px-2 py-0.5 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-md border border-brand-200 transition-colors cursor-pointer"
                                    >
                                        Asignar restante ({availablePercentage.toFixed(2)}%)
                                    </button>
                                )}
                            </div>
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
                        {otherBeneficiaries.length > 0 && (
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                                <p className="text-[11px] font-bold text-slate-700">Otros beneficiarios (puedes reajustar su porcentaje)</p>
                                {otherBeneficiaries.map(o => (
                                    <div key={o.id} className="flex items-center justify-between gap-3">
                                        <span className="text-[11px] font-semibold text-slate-600 truncate">{o.name}</span>
                                        <input
                                            type="number"
                                            min="0.01"
                                            max="100"
                                            step="0.01"
                                            value={othersPct[o.id] ?? ''}
                                            onChange={(e) => setOthersPct(prev => ({ ...prev, [o.id]: e.target.value ? Number(e.target.value) : '' }))}
                                            className="w-24 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-900"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className={`p-2.5 border rounded-xl text-[11px] flex items-start gap-2 ${isComplete ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
                            <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${isComplete ? 'text-emerald-600' : 'text-amber-600'}`} />
                            <div>
                                <span className="font-bold">Total de la distribución: {(totalCents / 100).toFixed(2)}%.</span>{' '}
                                {isComplete ? 'Listo para guardar.' : 'Debe sumar exactamente 100 % para poder guardar.'}
                            </div>
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
                        disabled={isSaving || !isComplete}
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
