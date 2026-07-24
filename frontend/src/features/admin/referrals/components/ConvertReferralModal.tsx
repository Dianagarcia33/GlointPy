import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PotentialReferral, potentialReferralsService } from '../../../../services/potential_referrals';
import { investmentsService } from '../../../../services/investments';
import { fetchApi } from '../../../../services/api';
import { X, Loader2, User, Landmark, UploadCloud, CheckCircle2, DollarSign } from 'lucide-react';

interface ConvertReferralModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConverted: () => void;
    referral: PotentialReferral | null;
}

const CITIES = [
    "Bogotá", "Medellín", "Cali", "Barranquilla", "Cartagena", 
    "Bucaramanga", "Manizales", "Pereira", "Cúcuta", "Ibagué", 
    "Villavicencio", "Santa Marta", "Valledupar", "Montería", "Pasto", "Otra"
];

const COLOMBIAN_BANKS = [
    "Bancolombia",
    "Nequi",
    "Davivienda",
    "Daviplata",
    "Banco de Bogotá",
    "BBVA Colombia",
    "Banco Popular",
    "Banco de Occidente",
    "Banco AV Villas",
    "Scotiabank Colpatria",
    "Itaú Colombia",
    "GNB Sudameris",
    "Banco Caja Social",
    "Banco Agrario de Colombia",
    "Lulo Bank",
    "Nubank (Nu Colombia)",
    "Ualá",
    "RappiPay (RappiCuenta)",
    "Banco W",
    "Banco Coomeva",
    "Banco Falabella",
    "Banco Pichincha",
    "Otro / Cooperativa"
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

    const [showCustomCity, setShowCustomCity] = useState(false);
    const [isCustomMonto, setIsCustomMonto] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        tipo_documento: 'CC',
        documento: '',
        numero_celular: '',
        ciudad: 'Bogotá',
        custom_ciudad: '',
        fecha_nacimiento: '',
        banco: 'Bancolombia',
        tipo_cuenta: 'Ahorros',
        numero_cuenta: '',
        paquete_id: '',
        contract_period_id: '',
        monto: '',
        comprobante_path: ''
    });

    const [kycDocs, setKycDocs] = useState({ frontal: '', lateral: '', selfie: '' });
    const [uploadingFile, setUploadingFile] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setLoadingOptions(true);
            fetchApi('/auth/public/config')
                .then((cfg: any) => {
                    setPaquetes(cfg?.paquetes || []);
                    setPeriodos(cfg?.periodos || []);
                })
                .catch((err: any) => console.error("Error al cargar opciones de paquetes", err))
                .finally(() => setLoadingOptions(false));
        }
    }, [isOpen]);

    useEffect(() => {
        if (referral && isOpen) {
            setFormData({
                name: referral.nombre || '',
                email: referral.email || '',
                tipo_documento: 'CC',
                documento: '',
                numero_celular: referral.telefono || '',
                ciudad: 'Bogotá',
                custom_ciudad: '',
                fecha_nacimiento: '',
                banco: 'Bancolombia',
                tipo_cuenta: 'Ahorros',
                numero_cuenta: '',
                paquete_id: '',
                contract_period_id: '',
                monto: '',
                comprobante_path: ''
            });
            setShowCustomCity(false);
            setIsCustomMonto(false);
            setKycDocs({ frontal: '', lateral: '', selfie: '' });
            setError(null);
        }
    }, [referral, isOpen]);

    if (!isOpen || !referral) return null;

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'comprobante_path' | 'frontal' | 'lateral') => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploadingFile(type);
            const res = await investmentsService.uploadKycDocument(file);
            if (type === 'comprobante_path') {
                setFormData(prev => ({ ...prev, comprobante_path: res.path }));
            } else {
                setKycDocs(prev => ({ ...prev, [type]: res.path }));
            }
        } catch (err: any) {
            console.error("Error subiendo archivo:", err);
            alert(err?.response?.data?.detail || err?.message || 'Error al subir el archivo');
        } finally {
            setUploadingFile(null);
        }
    };

    const handlePaqueteChange = (paqueteIdStr: string) => {
        if (paqueteIdStr === 'custom') {
            setIsCustomMonto(true);
            setFormData(prev => ({ ...prev, paquete_id: 'custom', monto: '' }));
            return;
        }

        setIsCustomMonto(false);
        const selected = paquetes.find(p => p.id.toString() === paqueteIdStr);
        const montoVal = selected ? (selected.value ? selected.value.toString() : (selected.paquete_accion_adquirido || selected.nombre || '').replace(/[^0-9]/g, '')) : '';
        setFormData(prev => ({
            ...prev,
            paquete_id: paqueteIdStr,
            monto: montoVal
        }));
    };

    // Live Calculations
    const getCalculations = () => {
        const monto = parseFloat(formData.monto) || 0;
        const periodo = periodos.find((p: any) => p.id.toString() === formData.contract_period_id);
        
        if (!monto || !periodo) return null;

        const { percentage, months } = periodo;
        const rendimientoMensual = monto * (percentage / 100);
        const rendimientoTotal = rendimientoMensual * months;
        const totalContrato = monto + rendimientoTotal;

        return {
            porcentaje: percentage,
            meses: months,
            rendimientoMensual,
            rendimientoTotal,
            totalContrato
        };
    };

    const calculations = getCalculations();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.name || !formData.email || !formData.documento || !formData.numero_celular) {
            setError('Por favor diligencia todos los datos personales obligatorios del cliente.');
            return;
        }

        if (!formData.banco || !formData.numero_cuenta) {
            setError('Por favor diligencia la cuenta bancaria del cliente.');
            return;
        }

        if (!formData.paquete_id || !formData.contract_period_id) {
            setError('Por favor selecciona el paquete de inversión y el periodo del contrato.');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const finalCity = formData.ciudad === 'Otra' ? formData.custom_ciudad : formData.ciudad;
            const payload = {
                name: formData.name.trim(),
                email: formData.email.trim(),
                password: formData.documento.trim(),
                tipo_documento: formData.tipo_documento,
                documento: formData.documento.trim(),
                numero_celular: formData.numero_celular.trim(),
                ciudad: finalCity,
                fecha_nacimiento: formData.fecha_nacimiento || null,
                banco: formData.banco.trim(),
                tipo_cuenta: formData.tipo_cuenta,
                numero_cuenta: formData.numero_cuenta.trim(),
                paquete_id: isCustomMonto ? null : parseInt(formData.paquete_id),
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 z-50 animate-in fade-in duration-200" style={{ margin: 0 }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-100">
                
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 font-montserrat tracking-tight">
                            Convertir Referido en Solicitud de Inversión
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Registra la cuenta e inversión inicial para <span className="font-semibold text-slate-800">{referral.nombre}</span>
                        </p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/40">
                    <form id="convert-referral-form" onSubmit={handleSubmit} className="space-y-6">
                        
                        {error && (
                            <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl text-xs font-semibold text-rose-600 flex items-center gap-2">
                                <X className="w-4 h-4 text-rose-500 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Seccion 1: Datos Personales */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2.5 font-montserrat">
                                <User className="w-4 h-4 text-brand-600" />
                                Datos Personales del Cliente
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Nombre Completo *</label>
                                    <input 
                                        type="text" 
                                        required 
                                        value={formData.name} 
                                        onChange={e => setFormData({ ...formData, name: e.target.value })} 
                                        className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-brand-500 rounded-xl text-xs font-semibold text-slate-900 outline-none transition-all" 
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Correo Electrónico *</label>
                                    <input 
                                        type="email" 
                                        required 
                                        value={formData.email} 
                                        onChange={e => setFormData({ ...formData, email: e.target.value })} 
                                        className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-brand-500 rounded-xl text-xs font-semibold text-slate-900 outline-none transition-all" 
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Tipo Documento *</label>
                                    <select 
                                        value={formData.tipo_documento} 
                                        onChange={e => setFormData({ ...formData, tipo_documento: e.target.value })} 
                                        className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-brand-500 rounded-xl text-xs font-bold text-slate-900 outline-none transition-all cursor-pointer"
                                    >
                                        <option value="CC">Cédula de Ciudadanía (CC)</option>
                                        <option value="CE">Cédula de Extranjería (CE)</option>
                                        <option value="PASAPORTE">Pasaporte</option>
                                        <option value="NIT">NIT</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Número de Documento (Contraseña Inicial) *</label>
                                    <input 
                                        type="text" 
                                        required 
                                        value={formData.documento} 
                                        onChange={e => setFormData({ ...formData, documento: e.target.value })} 
                                        placeholder="Ej. 1098765432"
                                        className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-brand-500 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none transition-all" 
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Teléfono / Celular *</label>
                                    <input 
                                        type="text" 
                                        required 
                                        value={formData.numero_celular} 
                                        onChange={e => setFormData({ ...formData, numero_celular: e.target.value })} 
                                        className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-brand-500 rounded-xl text-xs font-mono font-semibold text-slate-900 outline-none transition-all" 
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Ciudad *</label>
                                    <select 
                                        value={formData.ciudad} 
                                        onChange={e => {
                                            const val = e.target.value;
                                            setShowCustomCity(val === 'Otra');
                                            setFormData({ ...formData, ciudad: val });
                                        }} 
                                        className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-brand-500 rounded-xl text-xs font-bold text-slate-900 outline-none transition-all cursor-pointer"
                                    >
                                        {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                {showCustomCity && (
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Nombre de la Ciudad *</label>
                                        <input 
                                            type="text" 
                                            required 
                                            value={formData.custom_ciudad} 
                                            onChange={e => setFormData({ ...formData, custom_ciudad: e.target.value })} 
                                            className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-brand-500 rounded-xl text-xs font-semibold text-slate-900 outline-none transition-all" 
                                        />
                                    </div>
                                )}
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Fecha de Nacimiento</label>
                                    <input 
                                        type="date" 
                                        value={formData.fecha_nacimiento} 
                                        onChange={e => setFormData({ ...formData, fecha_nacimiento: e.target.value })} 
                                        className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-brand-500 rounded-xl text-xs font-semibold text-slate-900 outline-none transition-all" 
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Seccion 2: Bóveda Bancaria */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2.5 font-montserrat">
                                <Landmark className="w-4 h-4 text-brand-600" />
                                Cuenta Bancaria (Bóveda)
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Banco *</label>
                                    <select 
                                        value={formData.banco} 
                                        onChange={e => setFormData({ ...formData, banco: e.target.value })} 
                                        className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-brand-500 rounded-xl text-xs font-bold text-slate-900 outline-none transition-all cursor-pointer"
                                    >
                                        {COLOMBIAN_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Tipo de Cuenta *</label>
                                    <select 
                                        value={formData.tipo_cuenta} 
                                        onChange={e => setFormData({ ...formData, tipo_cuenta: e.target.value })} 
                                        className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-brand-500 rounded-xl text-xs font-bold text-slate-900 outline-none transition-all cursor-pointer"
                                    >
                                        <option value="Ahorros">Ahorros</option>
                                        <option value="Corriente">Corriente</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Número de Cuenta *</label>
                                    <input 
                                        type="text" 
                                        required 
                                        value={formData.numero_cuenta} 
                                        onChange={e => setFormData({ ...formData, numero_cuenta: e.target.value })} 
                                        placeholder="Ej. 123456789" 
                                        className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-brand-500 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none transition-all" 
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Seccion 3: Datos de la Inversión */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2.5 font-montserrat">
                                <DollarSign className="w-4 h-4 text-brand-600" />
                                Configuración de la Inversión
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Paquete de Inversión *</label>
                                    <select 
                                        required 
                                        value={formData.paquete_id} 
                                        onChange={e => handlePaqueteChange(e.target.value)} 
                                        className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-brand-500 rounded-xl text-xs font-bold text-slate-900 outline-none transition-all cursor-pointer"
                                    >
                                        <option value="">Selecciona un paquete...</option>
                                        {paquetes.map((p: any) => (
                                            <option key={p.id} value={p.id}>{p.paquete_accion_adquirido || p.nombre || `$${p.value}`} COP</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Periodo de Contrato *</label>
                                    <select 
                                        required 
                                        value={formData.contract_period_id} 
                                        onChange={e => setFormData({ ...formData, contract_period_id: e.target.value })} 
                                        className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-brand-500 rounded-xl text-xs font-bold text-slate-900 outline-none transition-all cursor-pointer"
                                    >
                                        <option value="">Selecciona un periodo...</option>
                                        {periodos.map((p: any) => (
                                            <option key={p.id} value={p.id}>{p.name || p.nombre || `${p.months} meses`}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Resumen en vivo */}
                            {calculations && (
                                <div className="bg-brand-50/60 border border-brand-200/80 p-4 rounded-xl space-y-2 font-montserrat">
                                    <div className="flex items-center justify-between text-xs text-brand-900 font-bold border-b border-brand-200/50 pb-2">
                                        <span>Rendimiento Mensual ({calculations.porcentaje}%):</span>
                                        <span className="font-mono text-sm">${calculations.rendimientoMensual.toLocaleString('es-CO')} COP</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-brand-900 font-bold">
                                        <span>Retorno Total Estimado ({calculations.meses} meses):</span>
                                        <span className="font-mono text-sm text-emerald-600">${calculations.totalContrato.toLocaleString('es-CO')} COP</span>
                                    </div>
                                </div>
                            )}

                            {/* Carga de Archivos: Comprobante, Documento Frontal y Documento Lateral */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                                <div className="border border-slate-200 p-3 rounded-xl bg-slate-50/60 space-y-2">
                                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                                        <UploadCloud className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                                        Comprobante Pago
                                    </label>
                                    <input 
                                        type="file" 
                                        accept="image/*,.pdf" 
                                        onChange={(e) => handleFileUpload(e, 'comprobante_path')} 
                                        className="block w-full text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-brand-100 file:text-brand-700 hover:file:bg-brand-200 cursor-pointer" 
                                    />
                                    {formData.comprobante_path && (
                                        <p className="text-[11px] text-emerald-600 flex items-center gap-1 font-semibold">
                                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Cargado
                                        </p>
                                    )}
                                </div>

                                <div className="border border-slate-200 p-3 rounded-xl bg-slate-50/60 space-y-2">
                                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                                        <UploadCloud className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                                        Doc. Frontal
                                    </label>
                                    <input 
                                        type="file" 
                                        accept="image/*,.pdf" 
                                        onChange={(e) => handleFileUpload(e, 'frontal')} 
                                        className="block w-full text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-brand-100 file:text-brand-700 hover:file:bg-brand-200 cursor-pointer" 
                                    />
                                    {kycDocs.frontal && (
                                        <p className="text-[11px] text-emerald-600 flex items-center gap-1 font-semibold">
                                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Cargado
                                        </p>
                                    )}
                                </div>

                                <div className="border border-slate-200 p-3 rounded-xl bg-slate-50/60 space-y-2">
                                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                                        <UploadCloud className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                                        Doc. Lateral
                                    </label>
                                    <input 
                                        type="file" 
                                        accept="image/*,.pdf" 
                                        onChange={(e) => handleFileUpload(e, 'lateral')} 
                                        className="block w-full text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-brand-100 file:text-brand-700 hover:file:bg-brand-200 cursor-pointer" 
                                    />
                                    {kycDocs.lateral && (
                                        <p className="text-[11px] text-emerald-600 flex items-center gap-1 font-semibold">
                                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Cargado
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-white shrink-0">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        disabled={isSubmitting}
                        className="px-5 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition-all text-xs cursor-pointer"
                    >
                        Cancelar
                    </button>
                    <button 
                        type="submit" 
                        form="convert-referral-form" 
                        disabled={isSubmitting || !!uploadingFile}
                        className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-xl shadow-md shadow-brand-500/20 transition-all flex items-center gap-2 cursor-pointer font-montserrat"
                    >
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        Convertir y Crear Solicitud
                    </button>
                </div>

            </div>
        </div>,
        document.body
    );
};
