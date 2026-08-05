import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, User, CreditCard, Landmark, Loader2, UploadCloud, CheckCircle2, FileText, Check, Phone, MapPin, Mail } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../../../services/api';
import { compressImage } from '../../../../utils/imageCompression';

interface AdminSolicitudInversionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

const CITIES = [
    "Bogotá", "Medellín", "Cali", "Barranquilla", "Cartagena", 
    "Bucaramanga", "Manizales", "Pereira", "Cúcuta", "Ibagué", 
    "Villavicencio", "Santa Marta", "Valledupar", "Montería", "Pasto", "Otra"
];

export const AdminSolicitudInversionModal: React.FC<AdminSolicitudInversionModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const queryClient = useQueryClient();
    
    // Autocomplete User Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    
    // Selected User ID
    const [userId, setUserId] = useState<number | null>(null);

    // Client Form Fields
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        tipo_documento: 'CC',
        documento: '',
        numero_celular: '',
        ciudad: '',
        custom_ciudad: '',
        banco: '',
        tipo_cuenta: 'Ahorros',
        numero_cuenta: ''
    });

    const [showCustomCity, setShowCustomCity] = useState(false);

    // Investment Form Fields
    const [selectedPackageId, setSelectedPackageId] = useState<string>('');
    const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
    const [monto, setMonto] = useState<string>('');
    const [referralCode, setReferralCode] = useState<string>('');
    const [comprobanteFile, setComprobanteFile] = useState<File | null>(null);
    const [comprobantePreview, setComprobantePreview] = useState<string | null>(null);
    
    // Status
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<boolean>(false);

    // Fetch Packages
    const { data: paquetes = [] } = useQuery({
        queryKey: ['packages-solicitud-admin-modal-v2'],
        queryFn: () => fetchApi('/packages'),
        enabled: isOpen
    });

    // Fetch Contract Periods
    const { data: periodos = [] } = useQuery({
        queryKey: ['contract-periods-solicitud-admin-modal-v2'],
        queryFn: () => fetchApi('/contract-periods'),
        enabled: isOpen
    });

    // Debounced search user query
    useEffect(() => {
        const handler = setTimeout(async () => {
            if (searchQuery.trim().length >= 3) {
                setIsSearching(true);
                try {
                    const res = await fetchApi(`/investments/admin/search-user?query=${encodeURIComponent(searchQuery.trim())}`);
                    setSearchResults(res || []);
                    setShowDropdown(true);
                } catch (e) {
                    setSearchResults([]);
                    setShowDropdown(false);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults([]);
                setShowDropdown(false);
            }
        }, 400);

        return () => clearTimeout(handler);
    }, [searchQuery]);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle user selection from search dropdown
    const handleSelectUser = (u: any) => {
        setUserId(u.id);

        let cityToSet = u.ciudad || u.city || '';
        let isCustom = false;
        if (cityToSet && !CITIES.includes(cityToSet) && cityToSet !== 'Otra') {
            isCustom = true;
        }

        setFormData(prev => ({
            ...prev,
            name: u.name || '',
            email: u.email || '',
            documento: u.documento || u.document_id || prev.documento,
            numero_celular: u.numero_celular || u.phone || '',
            ciudad: isCustom ? 'Otra' : cityToSet,
            custom_ciudad: isCustom ? cityToSet : '',
            banco: u.banco || '',
            tipo_cuenta: u.tipo_cuenta || 'Ahorros',
            numero_cuenta: u.numero_cuenta || ''
        }));
        setShowCustomCity(isCustom);
        setSearchQuery('');
        setShowDropdown(false);
    };

    const handleClearUser = () => {
        setUserId(null);
        setFormData(prev => ({
            ...prev,
            name: '',
            email: '',
            documento: '',
            numero_celular: '',
            ciudad: '',
            custom_ciudad: '',
            banco: '',
            tipo_cuenta: 'Ahorros',
            numero_cuenta: ''
        }));
        setShowCustomCity(false);
    };

    // Auto-fill amount when package is selected
    const handleSelectPackage = (pkgIdStr: string) => {
        setSelectedPackageId(pkgIdStr);
        const pkg = paquetes.find((p: any) => p.id.toString() === pkgIdStr);
        if (pkg && pkg.value) {
            setMonto(pkg.value.toString());
        }
    };

    // Compress & preview voucher
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            let processedFile = file;
            if (file.type.startsWith('image/')) {
                processedFile = await compressImage(file);
                setComprobantePreview(URL.createObjectURL(processedFile));
            } else {
                setComprobantePreview(null);
            }
            setComprobanteFile(processedFile);
        } catch (e) {
            console.error("Error al procesar comprobante:", e);
            setComprobanteFile(file);
        }
    };

    const resetForm = () => {
        setUserId(null);
        setSearchQuery('');
        setSearchResults([]);
        setFormData({
            name: '',
            email: '',
            tipo_documento: 'CC',
            documento: '',
            numero_celular: '',
            ciudad: '',
            custom_ciudad: '',
            banco: '',
            tipo_cuenta: 'Ahorros',
            numero_cuenta: ''
        });
        setShowCustomCity(false);
        setSelectedPackageId('');
        setSelectedPeriodId('');
        setMonto('');
        setReferralCode('');
        setComprobanteFile(null);
        setComprobantePreview(null);
        setErrorMessage(null);
        setSuccessMessage(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'ciudad') {
            setShowCustomCity(value === 'Otra');
        }
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);

        if (!formData.name.trim()) {
            setErrorMessage("El Nombre del Inversionista es obligatorio.");
            return;
        }
        if (!formData.documento.trim()) {
            setErrorMessage("El Número de Documento es obligatorio.");
            return;
        }
        if (!selectedPackageId) {
            setErrorMessage("Debes seleccionar un Paquete de Inversión.");
            return;
        }
        if (!selectedPeriodId) {
            setErrorMessage("Debes seleccionar un Periodo de Contrato.");
            return;
        }
        if (!monto || parseFloat(monto) <= 0) {
            setErrorMessage("Debes ingresar un Monto válido de inversión.");
            return;
        }

        try {
            setIsSubmitting(true);
            const finalCity = formData.ciudad === 'Otra' ? formData.custom_ciudad.trim() : formData.ciudad;

            const formPayload = new FormData();
            if (userId) {
                formPayload.append('user_id', userId.toString());
            }
            formPayload.append('paquete_inversion_id', selectedPackageId);
            formPayload.append('periodo_contrato', selectedPeriodId);
            formPayload.append('monto', monto);
            if (referralCode.trim()) {
                formPayload.append('codigo_referido', referralCode.trim());
            }
            if (comprobanteFile) {
                formPayload.append('comprobantes', comprobanteFile);
            }

            await fetchApi('/investments/requests', {
                method: 'POST',
                body: formPayload
            });

            queryClient.invalidateQueries({ queryKey: ['admin-investment-requests'] });
            queryClient.invalidateQueries({ queryKey: ['investment-requests'] });
            setSuccessMessage(true);
            if (onSuccess) onSuccess();

            setTimeout(() => {
                resetForm();
                onClose();
            }, 1800);
        } catch (err: any) {
            setErrorMessage(err.message || 'Error al registrar la solicitud de inversión.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl border border-slate-100 my-8">
                
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-5 text-white flex items-center justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                    <div className="relative z-10 flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl">
                            <FileText className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold font-montserrat">Solicitud de Inversión</h2>
                            <p className="text-xs text-slate-300">Registra una inversión a nombre de un inversionista</p>
                        </div>
                    </div>
                    <button 
                        type="button"
                        onClick={() => { resetForm(); onClose(); }}
                        className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer relative z-10"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[82vh] overflow-y-auto">
                    
                    {/* Error Banner */}
                    {errorMessage && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs font-semibold text-red-700">
                            {errorMessage}
                        </div>
                    )}

                    {/* Success Banner */}
                    {successMessage && (
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                            <span>¡Solicitud de Inversión registrada exitosamente!</span>
                        </div>
                    )}

                    {/* BUSCADOR AUTOCOMPLETADO DE INVERSIONISTA (IGUAL A CREAR INVERSION) */}
                    <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm relative">
                        <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
                            <Search className="w-4 h-4 text-emerald-600" />
                            <span>Buscar Inversionista Registrado</span>
                        </h3>

                        {userId ? (
                            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                                    <div>
                                        <p className="font-bold text-emerald-900 text-xs">Inversionista Seleccionado</p>
                                        <p className="text-xs text-emerald-700">{formData.name} ({formData.email})</p>
                                    </div>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={handleClearUser}
                                    className="px-3 py-1.5 bg-white border border-emerald-200 text-emerald-700 text-xs font-bold rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer"
                                >
                                    Cambiar
                                </button>
                            </div>
                        ) : (
                            <div className="relative" ref={dropdownRef}>
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input 
                                        type="text" 
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        onFocus={() => { if (searchQuery.length >= 3) setShowDropdown(true); }}
                                        placeholder="Escribe nombre, correo o cédula para autocompletar..."
                                        className="w-full pl-11 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-none transition-shadow"
                                        autoComplete="off"
                                    />
                                    {isSearching && (
                                        <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 animate-spin" />
                                    )}
                                </div>

                                {/* Dropdown Results */}
                                {showDropdown && searchQuery.length >= 3 && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-30 max-h-64 overflow-y-auto">
                                        {searchResults.length > 0 ? (
                                            <ul className="divide-y divide-slate-100">
                                                {searchResults.map((user) => (
                                                    <li key={user.id}>
                                                        <button 
                                                            type="button"
                                                            onClick={() => handleSelectUser(user)}
                                                            className="w-full text-left px-4 py-3 hover:bg-emerald-50/70 flex flex-col transition-colors cursor-pointer"
                                                        >
                                                            <span className="font-semibold text-slate-800 text-xs">{user.name}</span>
                                                            <span className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                                                                <span>{user.email}</span>
                                                                {user.documento && (
                                                                    <>
                                                                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                                        <span>CC: {user.documento}</span>
                                                                    </>
                                                                )}
                                                            </span>
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <div className="p-4 text-center text-xs text-slate-400">
                                                No se encontraron usuarios coincidentes
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* DATOS PERSONALES DEL INVERSIONISTA */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
                            <User className="w-4 h-4 text-emerald-600" />
                            <span>Datos del Inversionista</span>
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="block text-[11px] font-bold text-slate-700 uppercase">
                                    Nombre Completo <span className="text-red-500">*</span>
                                </label>
                                <input 
                                    type="text"
                                    name="name"
                                    placeholder="Nombre y Apellidos del inversionista"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="block text-[11px] font-bold text-slate-700 uppercase">
                                    Correo Electrónico
                                </label>
                                <input 
                                    type="email"
                                    name="email"
                                    placeholder="correo@ejemplo.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <label className="block text-[11px] font-bold text-slate-700 uppercase">
                                    Tipo Documento
                                </label>
                                <select 
                                    name="tipo_documento"
                                    value={formData.tipo_documento}
                                    onChange={handleChange}
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                                >
                                    <option value="CC">Cédula de Ciudadanía (CC)</option>
                                    <option value="CE">Cédula de Extranjería (CE)</option>
                                    <option value="NIT">NIT Empresa</option>
                                    <option value="PASAPORTE">Pasaporte</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-[11px] font-bold text-slate-700 uppercase">
                                    Número de Documento <span className="text-red-500">*</span>
                                </label>
                                <input 
                                    type="text"
                                    name="documento"
                                    placeholder="Ej: 1020304050"
                                    value={formData.documento}
                                    onChange={handleChange}
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="block text-[11px] font-bold text-slate-700 uppercase">
                                    Teléfono / Celular
                                </label>
                                <input 
                                    type="text"
                                    name="numero_celular"
                                    placeholder="Ej: 3001234567"
                                    value={formData.numero_celular}
                                    onChange={handleChange}
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="block text-[11px] font-bold text-slate-700 uppercase">
                                    Ciudad
                                </label>
                                <select 
                                    name="ciudad"
                                    value={formData.ciudad}
                                    onChange={handleChange}
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                                >
                                    <option value="">-- Seleccionar Ciudad --</option>
                                    {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>

                            {showCustomCity && (
                                <div className="space-y-1">
                                    <label className="block text-[11px] font-bold text-slate-700 uppercase">
                                        Escriba la Ciudad
                                    </label>
                                    <input 
                                        type="text"
                                        name="custom_ciudad"
                                        placeholder="Nombre de la ciudad"
                                        value={formData.custom_ciudad}
                                        onChange={handleChange}
                                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* DATOS BANCARIOS */}
                    <div className="space-y-3 pt-2">
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
                            <Landmark className="w-4 h-4 text-emerald-600" />
                            <span>Datos Bancarios del Inversionista (Opcional)</span>
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <label className="block text-[11px] font-bold text-slate-700 uppercase">Banco</label>
                                <input 
                                    type="text"
                                    name="banco"
                                    placeholder="Ej: Bancolombia, Davivienda"
                                    value={formData.banco}
                                    onChange={handleChange}
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="block text-[11px] font-bold text-slate-700 uppercase">Tipo de Cuenta</label>
                                <select 
                                    name="tipo_cuenta"
                                    value={formData.tipo_cuenta}
                                    onChange={handleChange}
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                                >
                                    <option value="Ahorros">Ahorros</option>
                                    <option value="Corriente">Corriente</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-[11px] font-bold text-slate-700 uppercase">Número de Cuenta</label>
                                <input 
                                    type="text"
                                    name="numero_cuenta"
                                    placeholder="Ej: 12345678901"
                                    value={formData.numero_cuenta}
                                    onChange={handleChange}
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* DETALLES DE LA INVERSIÓN */}
                    <div className="space-y-4 pt-2">
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-emerald-600" />
                            <span>Detalles de la Inversión</span>
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="block text-[11px] font-bold text-slate-700 uppercase">
                                    Paquete de Inversión <span className="text-red-500">*</span>
                                </label>
                                <select 
                                    value={selectedPackageId}
                                    onChange={(e) => handleSelectPackage(e.target.value)}
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                                >
                                    <option value="">-- Seleccionar Paquete --</option>
                                    {paquetes.map((pkg: any) => (
                                        <option key={pkg.id} value={pkg.id}>
                                            {pkg.name || `Paquete $${Number(pkg.value || 0).toLocaleString('es-CO')}`} (${Number(pkg.value || 0).toLocaleString('es-CO')} COP)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-[11px] font-bold text-slate-700 uppercase">
                                    Monto a Invertir (COP) <span className="text-red-500">*</span>
                                </label>
                                <input 
                                    type="number"
                                    placeholder="Ej: 10000000"
                                    value={monto}
                                    onChange={(e) => setMonto(e.target.value)}
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="block text-[11px] font-bold text-slate-700 uppercase">
                                    Periodo de Contrato <span className="text-red-500">*</span>
                                </label>
                                <select 
                                    value={selectedPeriodId}
                                    onChange={(e) => setSelectedPeriodId(e.target.value)}
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                                >
                                    <option value="">-- Seleccionar Periodo --</option>
                                    {periodos.map((per: any) => (
                                        <option key={per.id} value={per.id}>
                                            {per.name || `${per.months || per.days / 30} Meses`} ({per.days} Días)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-[11px] font-bold text-slate-700 uppercase">
                                    Código de Referido (Opcional)
                                </label>
                                <input 
                                    type="text"
                                    placeholder="Ej: DIR-102"
                                    value={referralCode}
                                    onChange={(e) => setReferralCode(e.target.value)}
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-[11px] font-bold text-slate-700 uppercase">
                                Comprobante de Pago / Soporte (Opcional)
                            </label>
                            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center hover:border-emerald-400 transition-colors bg-slate-50/50">
                                <input 
                                    type="file" 
                                    accept="image/*,.pdf"
                                    id="admin-solicitud-comprobante-input-v3"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                                <label htmlFor="admin-solicitud-comprobante-input-v3" className="cursor-pointer flex flex-col items-center justify-center gap-1.5">
                                    <UploadCloud className="w-6 h-6 text-slate-400" />
                                    <span className="text-xs font-bold text-slate-700">
                                        {comprobanteFile ? comprobanteFile.name : 'Haz clic para adjuntar comprobante'}
                                    </span>
                                    <span className="text-[10px] text-slate-400">Imágenes (PNG, JPG) o PDF hasta 10MB</span>
                                </label>
                            </div>

                            {comprobantePreview && (
                                <div className="mt-2 text-center">
                                    <img src={comprobantePreview} alt="Comprobante vista previa" className="h-28 mx-auto rounded-xl border border-slate-200 object-cover shadow-xs" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => { resetForm(); onClose(); }}
                            className="px-5 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-2xl text-xs font-bold transition-colors cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || successMessage}
                            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-emerald-600/30 cursor-pointer disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Registrando Solicitud...</span>
                                </>
                            ) : (
                                <>
                                    <Check className="w-4 h-4" />
                                    <span>Crear Solicitud de Inversión</span>
                                </>
                            )}
                        </button>
                    </div>

                </form>

            </div>
        </div>,
        document.body
    );
};
