import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PotentialReferral, PotentialReferralCreate, PotentialReferralUpdate, potentialReferralsService } from '../../../services/potential_referrals';
import { X, Loader2, UserPlus, Phone, Mail, FileText, CheckCircle, Tag } from 'lucide-react';

interface ReferralModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
    referral?: PotentialReferral | null;
    isAdmin?: boolean;
    onTriggerConvert?: (referral: PotentialReferral) => void;
}

export const ReferralModal: React.FC<ReferralModalProps> = ({ 
    isOpen, 
    onClose, 
    onSaved, 
    referral,
    isAdmin = false,
    onTriggerConvert
}) => {
    const [nombre, setNombre] = useState('');
    const [telefono, setTelefono] = useState('');
    const [email, setEmail] = useState('');
    const [estado, setEstado] = useState('pendiente');
    const [notas, setNotas] = useState('');
    const [codigoReferido, setCodigoReferido] = useState('');
    const [myCodes, setMyCodes] = useState<string[]>([]);
    
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Cargar siempre los códigos asignados de las inversiones del usuario logueado
    useEffect(() => {
        if (isOpen) {
            potentialReferralsService.getMyCodes()
                .then((codes: string[]) => {
                    setMyCodes(codes || []);
                    if (codes && codes.length > 0 && !referral) {
                        setCodigoReferido(codes[0]);
                    }
                })
                .catch((err: any) => console.error("Error al cargar códigos de inversión", err));
        }
    }, [isOpen, referral]);

    useEffect(() => {
        if (referral) {
            setNombre(referral.nombre || '');
            setTelefono(referral.telefono || '');
            setEmail(referral.email || '');
            setEstado(referral.estado || 'pendiente');
            setNotas(referral.notas || '');
            setCodigoReferido(referral.codigo_referido || '');
        } else {
            setNombre('');
            setTelefono('');
            setEmail('');
            setEstado('pendiente');
            setNotas('');
            if (myCodes.length > 0) {
                setCodigoReferido(myCodes[0]);
            }
        }
        setError(null);
    }, [referral, isOpen, myCodes]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!nombre.trim()) {
            setError('El nombre del referido es obligatorio');
            return;
        }

        if (!telefono.trim()) {
            setError('El número de teléfono es obligatorio');
            return;
        }

        if (!isAdmin && !referral && !codigoReferido) {
            setError('Debes seleccionar un código de inversión de la lista');
            return;
        }

        // Si el admin selecciona el estado 'registrado', se debe abrir la conversión completa
        if (isAdmin && estado === 'registrado' && referral && onTriggerConvert) {
            onClose();
            onTriggerConvert(referral);
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            if (referral) {
                const payload: PotentialReferralUpdate = {
                    nombre: nombre.trim(),
                    telefono: telefono.trim(),
                    email: email.trim() || null,
                    estado,
                    notas: notas.trim() || null,
                };
                await potentialReferralsService.updateReferral(referral.id, payload);
            } else {
                const payload: PotentialReferralCreate = {
                    nombre: nombre.trim(),
                    telefono: telefono.trim(),
                    email: email.trim() || null,
                    codigo_referido: codigoReferido.trim() || null,
                    notas: notas.trim() || null,
                };
                await potentialReferralsService.createMyReferral(payload);
            }
            onSaved();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.detail || err.message || 'Error al guardar el referido');
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
                            <UserPlus className="w-5 h-5 text-brand-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 font-montserrat">
                                {referral ? 'Editar Referido Potencial' : 'Registrar Nuevo Referido'}
                            </h3>
                            <p className="text-xs text-slate-500">Ingresa los datos de contacto de tu invitado</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form id="referral-form" onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                    {error && (
                        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-600">
                            {error}
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Nombre Completo del Referido <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            placeholder="Ej. Carlos Andrés Mendoza"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none text-xs font-bold text-slate-900"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700">Teléfono / WhatsApp <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={telefono}
                                    onChange={(e) => setTelefono(e.target.value)}
                                    placeholder="Ej. 3001234567"
                                    className="w-full pl-4 pr-9 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none text-xs font-semibold text-slate-900"
                                    required
                                />
                                <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700">Correo Electrónico (Opcional)</label>
                            <div className="relative">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Ej. carlos@ejemplo.com"
                                    className="w-full pl-4 pr-9 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none text-xs font-semibold text-slate-900"
                                />
                                <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                            </div>
                        </div>
                    </div>

                    {/* Selector de Código Asignado de las Inversiones del Inversionista */}
                    {!referral && (
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700">
                                Código de Inversión / Referido <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <select
                                    value={codigoReferido}
                                    onChange={(e) => setCodigoReferido(e.target.value)}
                                    className="w-full pl-4 pr-9 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none text-xs font-mono font-bold text-slate-900 cursor-pointer"
                                    required
                                >
                                    <option value="">-- Selecciona el código de tu inversión --</option>
                                    {myCodes.map(code => (
                                        <option key={code} value={code}>{code}</option>
                                    ))}
                                </select>
                                <Tag className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                            </div>
                        </div>
                    )}

                    {isAdmin && (
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700">Estado del Referido</label>
                            {referral?.estado === 'registrado' ? (
                                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-700 flex items-center gap-2 font-montserrat">
                                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>Registrado como Usuario e Inversionista (Estado Final)</span>
                                </div>
                            ) : (
                                <select
                                    value={estado}
                                    onChange={(e) => setEstado(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none text-xs font-bold text-slate-900"
                                >
                                    <option value="pendiente">Pendiente</option>
                                    <option value="contactado">Contactado</option>
                                    <option value="registrado">Registrado (Abrir conversión a Solicitud)</option>
                                    <option value="rechazado">Rechazado</option>
                                </select>
                            )}
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Notas / Comentarios (Opcional)</label>
                        <textarea
                            value={notas}
                            onChange={(e) => setNotas(e.target.value)}
                            rows={3}
                            placeholder="Añade notas sobre el interés o perfil del referido..."
                            className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none text-xs text-slate-900 resize-y"
                        />
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
                        form="referral-form"
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-brand-500 hover:bg-brand-600 rounded-xl shadow-md shadow-brand-500/20 transition-all disabled:opacity-50 cursor-pointer font-montserrat"
                    >
                        {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                        Guardar Referido
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
