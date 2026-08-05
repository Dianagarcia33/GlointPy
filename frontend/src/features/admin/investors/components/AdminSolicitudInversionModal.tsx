import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, User, CreditCard, Landmark, Loader2, UploadCloud, CheckCircle2, Calendar, FileText, Check } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../../../services/api';
import { compressImage } from '../../../../utils/imageCompression';

interface AdminSolicitudInversionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export const AdminSolicitudInversionModal: React.FC<AdminSolicitudInversionModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const queryClient = useQueryClient();
    
    // User Autocomplete Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any | null>(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    
    // Form State
    const [selectedPackageId, setSelectedPackageId] = useState<string>('');
    const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
    const [monto, setMonto] = useState<string>('');
    const [referralCode, setReferralCode] = useState<string>('');
    const [comprobanteFile, setComprobanteFile] = useState<File | null>(null);
    const [comprobantePreview, setComprobantePreview] = useState<string | null>(null);
    
    // Submit Status
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<boolean>(false);

    // Fetch Packages
    const { data: paquetes = [] } = useQuery({
        queryKey: ['packages-solicitud-admin'],
        queryFn: () => fetchApi('/packages'),
        enabled: isOpen
    });

    // Fetch Contract Periods
    const { data: periodos = [] } = useQuery({
        queryKey: ['contract-periods-solicitud-admin'],
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

    // Handle package selection to auto-fill default value
    const handleSelectPackage = (pkgIdStr: string) => {
        setSelectedPackageId(pkgIdStr);
        const pkg = paquetes.find((p: any) => p.id.toString() === pkgIdStr);
        if (pkg && pkg.value) {
            setMonto(pkg.value.toString());
        }
    };

    // Handle File upload & compression
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
            console.error("Error al procesar el comprobante:", e);
            setComprobanteFile(file);
        }
    };

    const resetForm = () => {
        setSelectedUser(null);
        setSearchQuery('');
        setSearchResults([]);
        setSelectedPackageId('');
        setSelectedPeriodId('');
        setMonto('');
        setReferralCode('');
        setComprobanteFile(null);
        setComprobantePreview(null);
        setErrorMessage(null);
        setSuccessMessage(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);

        if (!selectedUser) {
            setErrorMessage("Debes buscar y seleccionar un usuario inversionista.");
            return;
        }
        if (!selectedPackageId) {
            setErrorMessage("Debes seleccionar un paquete de inversión.");
            return;
        }
        if (!selectedPeriodId) {
            setErrorMessage("Debes seleccionar un periodo de contrato.");
            return;
        }
        if (!monto || parseFloat(monto) <= 0) {
            setErrorMessage("Debes ingresar un monto válido de inversión.");
            return;
        }

        try {
            setIsSubmitting(true);
            const formData = new FormData();
            formData.append('user_id', selectedUser.id.toString());
            formData.append('paquete_inversion_id', selectedPackageId);
            formData.append('periodo_contrato', selectedPeriodId);
            formData.append('monto', monto);
            if (referralCode.trim()) {
                formData.append('codigo_referido', referralCode.trim());
            }
            if (comprobanteFile) {
                formData.append('comprobantes', comprobanteFile);
            }

            await fetchApi('/investments/requests', {
                method: 'POST',
                body: formData
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
            setErrorMessage(err.message || 'Error al crear la solicitud de inversión.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-100 my-8">
                
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-5 text-white flex items-center justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                    <div className="relative z-10 flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl">
                            <FileText className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold font-montserrat">Solicitud de Inversión</h2>
                            <p className="text-xs text-slate-300">Crear solicitud de inversión asignada a un usuario inversionista</p>
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
                <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
                    
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

                    {/* Step 1: User Selection Autocomplete */}
                    <div className="space-y-2 relative" ref={dropdownRef}>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                            1. Seleccionar Inversionista <span className="text-red-500">*</span>
                        </label>
                        
                        {selectedUser ? (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">
                                        {selectedUser.name?.charAt(0)?.toUpperCase() || 'U'}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800 text-sm">{selectedUser.name}</div>
                                        <div className="text-xs text-slate-500">{selectedUser.email} {selectedUser.documento ? `| Doc: ${selectedUser.documento}` : ''}</div>
                                    </div>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => { setSelectedUser(null); setSearchQuery(''); }}
                                    className="px-3 py-1.5 bg-white text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                                >
                                    Cambiar
                                </button>
                            </div>
                        ) : (
                            <div className="relative">
                                <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
                                <input 
                                    type="text"
                                    placeholder="Escribe 3 o más caracteres (Nombre, correo o documento)..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-11 pr-10 py-3 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                                />
                                {isSearching && (
                                    <Loader2 className="w-4 h-4 text-emerald-500 animate-spin absolute right-4 top-3.5" />
                                )}

                                {/* Dropdown Menu */}
                                {showDropdown && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-200 shadow-xl z-30 max-h-56 overflow-y-auto divide-y divide-slate-100">
                                        {searchResults.length > 0 ? (
                                            searchResults.map((u: any) => (
                                                <div 
                                                    key={u.id}
                                                    onClick={() => {
                                                        setSelectedUser(u);
                                                        setShowDropdown(false);
                                                    }}
                                                    className="p-3 hover:bg-emerald-50/60 transition-colors cursor-pointer flex items-center justify-between"
                                                >
                                                    <div>
                                                        <div className="font-bold text-slate-800 text-xs">{u.name}</div>
                                                        <div className="text-[11px] text-slate-500">{u.email} {u.documento ? `• Doc: ${u.documento}` : ''}</div>
                                                    </div>
                                                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">Seleccionar</span>
                                                </div>
                                            ))
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

                    {/* Step 2: Package & Amount Selection */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                2. Paquete de Inversión <span className="text-red-500">*</span>
                            </label>
                            <select 
                                value={selectedPackageId}
                                onChange={(e) => handleSelectPackage(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                            >
                                <option value="">-- Seleccionar Paquete --</option>
                                {paquetes.map((pkg: any) => (
                                    <option key={pkg.id} value={pkg.id}>
                                        {pkg.name || `Paquete $${Number(pkg.value || 0).toLocaleString('es-CO')}`} (${Number(pkg.value || 0).toLocaleString('es-CO')} COP)
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                Monto a Invertir (COP) <span className="text-red-500">*</span>
                            </label>
                            <input 
                                type="number"
                                placeholder="Ej: 10000000"
                                value={monto}
                                onChange={(e) => setMonto(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                            />
                        </div>
                    </div>

                    {/* Step 3: Period & Referral Code */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                3. Periodo de Contrato <span className="text-red-500">*</span>
                            </label>
                            <select 
                                value={selectedPeriodId}
                                onChange={(e) => setSelectedPeriodId(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                            >
                                <option value="">-- Seleccionar Periodo --</option>
                                {periodos.map((per: any) => (
                                    <option key={per.id} value={per.id}>
                                        {per.name || `${per.months || per.days / 30} Meses`} ({per.days} Días)
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                Código de Referido (Opcional)
                            </label>
                            <input 
                                type="text"
                                placeholder="Ej: DIR-102"
                                value={referralCode}
                                onChange={(e) => setReferralCode(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                            />
                        </div>
                    </div>

                    {/* Step 4: Comprobante File */}
                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Comprobante de Pago / Soporte (Opcional)
                        </label>
                        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center hover:border-emerald-400 transition-colors bg-slate-50/50">
                            <input 
                                type="file" 
                                accept="image/*,.pdf"
                                id="admin-solicitud-comprobante-input"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            <label htmlFor="admin-solicitud-comprobante-input" className="cursor-pointer flex flex-col items-center justify-center gap-1.5">
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
                                    <span>Registrando...</span>
                                </>
                            ) : (
                                <>
                                    <Check className="w-4 h-4" />
                                    <span>Crear Solicitud</span>
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
