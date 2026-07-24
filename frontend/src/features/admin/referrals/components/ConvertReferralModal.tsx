import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PotentialReferral, potentialReferralsService } from '../../../../services/potential_referrals';
import { investmentsService } from '../../../../services/investments';
import { X, Loader2, ArrowRight, CheckCircle2, ShieldCheck, Upload, Landmark, UserCheck, DollarSign } from 'lucide-react';

interface ConvertReferralModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConverted: () => void;
    referral: PotentialReferral | null;
}

const CITIES = [
    'Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena',
    'Bucaramanga', 'Manizales', 'Pereira', 'Cúcuta', 'Ibagué',
    'Santa Marta', 'Villavicencio', 'Pasto', 'Montería', 'Neiva', 'Otra'
];

export const ConvertReferralModal: React.FC<ConvertReferralModalProps> = ({
    isOpen,
    onClose,
    onConverted,
    referral
}) => {
    const [paquetes, setPaquetes] = useState<any[]>([]);
    const [periodos, setPeriodos] = useState<any[]>([]);
    const [loadingOptions, setLoadingOptions] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        tipo_documento: 'CC',
        documento: '',
        numero_celular: '',
        ciudad: 'Bogotá',
        custom_ciudad: '',
        fecha_nacimiento: '',
        banco: '',
        tipo_cuenta: 'Ahorros',
        numero_cuenta: '',
        paquete_id: '',
        contract_period_id: '',
        monto: '',
        comprobante_path: ''
    });

    const [kycDocs, setKycDocs] = useState({ frontal: '', selfie: '' });
    const [uploadingFile, setUploadingFile] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setLoadingOptions(true);
            Promise.all([
                investmentsService.getPaquetes(),
                investmentsService.getContractPeriods()
            ]).then(([pkgs, prds]) => {
                setPaquetes(pkgs || []);
                setPeriodos(prds || []);
            }).catch(err => console.error("Error al cargar paquetes/periodos", err))
            .finally(() => setLoadingOptions(false));
        }
    }, [isOpen]);

    useEffect(() => {
        if (referral && isOpen) {
            setFormData({
                name: referral.nombre || '',
                email: referral.email || '',
                password: '',
                tipo_documento: 'CC',
                documento: '',
                numero_celular: referral.telefono || '',
                ciudad: 'Bogotá',
                custom_ciudad: '',
                fecha_nacimiento: '',
                banco: '',
                tipo_cuenta: 'Ahorros',
                numero_cuenta: '',
                paquete_id: '',
                contract_period_id: '',
                monto: '',
                comprobante_path: ''
            });
            setKycDocs({ frontal: '', selfie: '' });
            setError(null);
        }
    }, [referral, isOpen]);

    if (!isOpen || !referral) return null;

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'comprobante_path' | 'frontal' | 'selfie') => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploadingFile(fieldName);
            const res = await investmentsService.uploadKycDocument(file);
            if (fieldName === 'comprobante_path') {
                setFormData(prev => ({ ...prev, comprobante_path: res.path }));
            } else {
                setKycDocs(prev => ({ ...prev, [fieldName]: res.path }));
            }
        } catch (err: any) {
            alert('Error al subir el archivo');
        } finally {
            setUploadingFile(null);
        }
    };

    const handlePaqueteChange = (paqueteIdStr: string) => {
        const selected = paquetes.find(p => p.id.toString() === paqueteIdStr);
        const montoVal = selected ? (selected.value || selected.nombre.replace(/[^0-9]/g, '')) : '';
        setFormData(prev => ({
            ...prev,
            paquete_id: paqueteIdStr,
            monto: montoVal
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.name || !formData.email || !formData.password || !formData.documento || !formData.numero_celular) {
            setError('Por favor diligencia todos los datos personales obligatorios.');
            return;
        }

        if (!formData.banco || !formData.numero_cuenta) {
            setError('Por favor diligencia los datos bancarios obligatorios.');
            return;
        }

        if (!formData.paquete_id || !formData.contract_period_id || !formData.monto) {
            setError('Por favor selecciona el paquete de inversión y periodo del contrato.');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const finalCity = formData.ciudad === 'Otra' ? formData.custom_ciudad : formData.ciudad;
            const payload = {
                name: formData.name.trim(),
                email: formData.email.trim(),
                password: formData.password,
                tipo_documento: formData.tipo_documento,
                documento: formData.documento.trim(),
                numero_celular: formData.numero_celular.trim(),
                ciudad: finalCity,
                fecha_nacimiento: formData.fecha_nacimiento || null,
                banco: formData.banco.trim(),
                tipo_cuenta: formData.tipo_cuenta,
                numero_cuenta: formData.numero_cuenta.trim(),
                paquete_id: parseInt(formData.paquete_id),
                contract_period_id: parseInt(formData.contract_period_id),
                monto: parseFloat(formData.monto),
                comprobante_path: formData.comprobante_path || null,
                kyc_docs: kycDocs
            };

            await potentialReferralsService.convertReferralToRequest(referral.id, payload);
            onConverted();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.detail || err.message || 'Error al convertir referido');
        } finally {
            setIsSubmitting(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200" style={{ margin: 0 }}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-100">
                
                {/* Header Modal */}
                <div className="bg-slate-900 text-white p-6 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-brand-500/20 text-brand-400 rounded-2xl border border-brand-500/30">
                            <UserCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold font-montserrat">Convertir en Solicitud de Inversión</h3>
                            <p className="text-xs text-slate-300">
                                Registro completo del usuario y generación de solicitud de inversión para <span className="font-bold text-brand-300">{referral.nombre}</span>
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form id="convert-form" onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
                    
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs font-semibold text-red-600 flex items-center gap-2">
                            <X className="w-4 h-4 text-red-500 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Sección 1: Datos Personales */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                            <ShieldCheck className="w-4 h-4 text-brand-600" />
                            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider font-montserrat">1. Datos Personales del Usuario</h4>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700">Nombre Completo <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/20"
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700">Correo Electrónico <span className="text-red-500">*</span></label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="ejemplo@correo.com"
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/20"
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700">Tipo de Documento <span className="text-red-500">*</span></label>
                                <select
                                    value={formData.tipo_documento}
                                    onChange={e => setFormData({ ...formData, tipo_documento: e.target.value })}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/20"
                                >
                                    <option value="CC">Cédula de Ciudadanía (CC)</option>
                                    <option value="CE">Cédula de Extranjería (CE)</option>
                                    <option value="PASAPORTE">Pasaporte</option>
                                    <option value="NIT">NIT</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700">Número de Documento <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={formData.documento}
                                    onChange={e => setFormData({ ...formData, documento: e.target.value })}
                                    placeholder="Ej. 1098765432"
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/20 font-mono"
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700">Teléfono / Celular <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={formData.numero_celular}
                                    onChange={e => setFormData({ ...formData, numero_celular: e.target.value })}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/20 font-mono"
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700">Contraseña de Acceso Inicial <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="Ej. Gloint2026*"
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/20"
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700">Ciudad de Residencia <span className="text-red-500">*</span></label>
                                <select
                                    value={formData.ciudad}
                                    onChange={e => setFormData({ ...formData, ciudad: e.target.value })}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/20"
                                >
                                    {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>

                            {formData.ciudad === 'Otra' && (
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700">Nombre de la Ciudad <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={formData.custom_ciudad}
                                        onChange={e => setFormData({ ...formData, custom_ciudad: e.target.value })}
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-bold text-slate-900 outline-none"
                                        required
                                    />
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700">Fecha de Nacimiento</label>
                                <input
                                    type="date"
                                    value={formData.fecha_nacimiento}
                                    onChange={e => setFormData({ ...formData, fecha_nacimiento: e.target.value })}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-semibold text-slate-900 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Sección 2: Bóveda Bancaria */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                            <Landmark className="w-4 h-4 text-brand-600" />
                            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider font-montserrat">2. Cuenta Bancaria del Usuario (Bóveda)</h4>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700">Entidad Bancaria <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={formData.banco}
                                    onChange={e => setFormData({ ...formData, banco: e.target.value })}
                                    placeholder="Ej. Bancolombia, Davivienda"
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-bold text-slate-900 outline-none"
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700">Tipo de Cuenta <span className="text-red-500">*</span></label>
                                <select
                                    value={formData.tipo_cuenta}
                                    onChange={e => setFormData({ ...formData, tipo_cuenta: e.target.value })}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-bold text-slate-900 outline-none"
                                >
                                    <option value="Ahorros">Cuenta de Ahorros</option>
                                    <option value="Corriente">Cuenta Corriente</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700">Número de Cuenta <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={formData.numero_cuenta}
                                    onChange={e => setFormData({ ...formData, numero_cuenta: e.target.value })}
                                    placeholder="Ej. 1234567890"
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-bold text-slate-900 outline-none font-mono"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Sección 3: Datos de la Inversión */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                            <DollarSign className="w-4 h-4 text-brand-600" />
                            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider font-montserrat">3. Paquete y Solicitud de Inversión</h4>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700">Paquete de Inversión <span className="text-red-500">*</span></label>
                                <select
                                    value={formData.paquete_id}
                                    onChange={e => handlePaqueteChange(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-bold text-slate-900 outline-none"
                                    required
                                >
                                    <option value="">Selecciona un paquete</option>
                                    {paquetes.map((p: any) => (
                                        <option key={p.id} value={p.id}>{p.nombre || `$${p.value || p.value}`} COP</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700">Periodo del Contrato <span className="text-red-500">*</span></label>
                                <select
                                    value={formData.contract_period_id}
                                    onChange={e => setFormData({ ...formData, contract_period_id: e.target.value })}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-bold text-slate-900 outline-none"
                                    required
                                >
                                    <option value="">Selecciona un periodo</option>
                                    {periodos.map((prd: any) => (
                                        <option key={prd.id} value={prd.id}>{prd.name || prd.nombre || `${prd.months} meses`}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700">Monto Inversión (COP) <span className="text-red-500">*</span></label>
                                <input
                                    type="number"
                                    value={formData.monto}
                                    onChange={e => setFormData({ ...formData, monto: e.target.value })}
                                    placeholder="Ej. 5000000"
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-bold text-slate-900 outline-none font-mono"
                                    required
                                />
                            </div>
                        </div>

                        {/* Archivos Adjuntos */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                    <Upload className="w-4 h-4 text-brand-600" /> Comprobante de Pago
                                </label>
                                <input 
                                    type="file" 
                                    accept="image/*,.pdf" 
                                    onChange={e => handleFileUpload(e, 'comprobante_path')} 
                                    className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-100 file:text-brand-700 hover:file:bg-brand-200 cursor-pointer" 
                                />
                                {formData.comprobante_path && (
                                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> Comprobante Adjunto
                                    </span>
                                )}
                            </div>

                            <div className="space-y-1.5 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                    <Upload className="w-4 h-4 text-brand-600" /> Documento KYC Frontal
                                </label>
                                <input 
                                    type="file" 
                                    accept="image/*,.pdf" 
                                    onChange={e => handleFileUpload(e, 'frontal')} 
                                    className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-100 file:text-brand-700 hover:file:bg-brand-200 cursor-pointer" 
                                />
                                {kycDocs.frontal && (
                                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> KYC Frontal Adjunto
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </form>

                {/* Footer Modal */}
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-5 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-200 transition-all text-sm cursor-pointer"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="convert-form"
                        disabled={isSubmitting || !!uploadingFile}
                        className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-brand-500 hover:bg-brand-600 rounded-xl shadow-md shadow-brand-500/20 transition-all disabled:opacity-50 cursor-pointer font-montserrat"
                    >
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                        Convertir a Solicitud de Inversión
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
