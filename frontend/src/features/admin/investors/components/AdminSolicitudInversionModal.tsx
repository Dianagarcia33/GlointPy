import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Loader2, UploadCloud, CheckCircle2, FileText, Check } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../../../services/api';
import { compressImage } from '../../../../utils/imageCompression';

interface AdminSolicitudInversionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export const AdminSolicitudInversionModal: React.FC<AdminSolicitudInversionModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const queryClient = useQueryClient();
    
    // User search & selection
    const [userSearch, setUserSearch] = useState('');
    const [users, setUsers] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [userId, setUserId] = useState<number | null>(null);
    const [selectedUserName, setSelectedUserName] = useState<string>('');

    // Form fields
    const [packageId, setPackageId] = useState<string>('');
    const [periodId, setPeriodId] = useState<string>('');
    const [monto, setMonto] = useState<string>('');
    const [referralCode, setReferralCode] = useState<string>('');
    const [comprobanteFile, setComprobanteFile] = useState<File | null>(null);
    const [comprobantePreview, setComprobantePreview] = useState<string | null>(null);

    // Status
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<boolean>(false);

    // Fetch Packages
    const { data: packages = [] } = useQuery({
        queryKey: ['packages-solicitud-clean'],
        queryFn: () => fetchApi('/packages'),
        enabled: isOpen
    });

    // Fetch Contract Periods
    const { data: periods = [] } = useQuery({
        queryKey: ['contract-periods-solicitud-clean'],
        queryFn: () => fetchApi('/contract-periods'),
        enabled: isOpen
    });

    // Dynamic user search
    useEffect(() => {
        if (!isOpen) return;

        const handler = setTimeout(async () => {
            if (userSearch.trim().length >= 2) {
                setIsSearching(true);
                try {
                    const res = await fetchApi(`/investments/admin/search-user?query=${encodeURIComponent(userSearch.trim())}`);
                    setUsers(res || []);
                } catch (err) {
                    console.error("Error searching users", err);
                    setUsers([]);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setUsers([]);
            }
        }, 300);

        return () => clearTimeout(handler);
    }, [userSearch, isOpen]);

    // Handle package selection to pre-fill amount
    const handleSelectPackage = (pkgIdStr: string) => {
        setPackageId(pkgIdStr);
        const pkg = packages.find((p: any) => p.id.toString() === pkgIdStr);
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
            setComprobanteFile(file);
        }
    };

    const resetForm = () => {
        setUserId(null);
        setSelectedUserName('');
        setUserSearch('');
        setUsers([]);
        setPackageId('');
        setPeriodId('');
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

        if (!userId) {
            setErrorMessage("Debes buscar y seleccionar un usuario.");
            return;
        }
        if (!packageId) {
            setErrorMessage("Debes seleccionar un paquete.");
            return;
        }
        if (!periodId) {
            setErrorMessage("Debes seleccionar un periodo de contrato.");
            return;
        }
        if (!monto || parseFloat(monto) <= 0) {
            setErrorMessage("Debes ingresar un monto válido.");
            return;
        }

        try {
            setIsSubmitting(true);
            const formData = new FormData();
            formData.append('user_id', userId.toString());
            formData.append('paquete_inversion_id', packageId);
            formData.append('periodo_contrato', periodId);
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
            }, 1500);
        } catch (err: any) {
            setErrorMessage(err.message || 'Error al crear la solicitud de inversión.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-100 my-8">
                
                {/* Modal Header */}
                <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold font-montserrat">Solicitud de Inversión</h2>
                            <p className="text-xs text-slate-300">Selecciona el usuario y completa los datos de la inversión</p>
                        </div>
                    </div>
                    <button 
                        type="button"
                        onClick={() => { resetForm(); onClose(); }}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    
                    {errorMessage && (
                        <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-200">
                            {errorMessage}
                        </div>
                    )}

                    {successMessage && (
                        <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-xl border border-emerald-200 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>¡Solicitud de Inversión creada con éxito!</span>
                        </div>
                    )}

                    {/* 1. Seleccionar Usuario */}
                    <div className="space-y-1.5 relative">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Usuario Inversionista <span className="text-red-500">*</span>
                        </label>
                        {userId ? (
                            <div className="flex items-center justify-between w-full px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-2xl">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span className="text-emerald-900 text-xs font-bold">{selectedUserName}</span>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => { setUserId(null); setSelectedUserName(''); setUserSearch(''); }} 
                                    className="text-xs text-emerald-700 hover:text-emerald-800 font-bold bg-white px-3 py-1 rounded-xl border border-emerald-200 shadow-2xs cursor-pointer"
                                >
                                    Cambiar
                                </button>
                            </div>
                        ) : (
                            <div className="relative">
                                <div className="relative">
                                    <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                                    <input 
                                        type="text"
                                        value={userSearch}
                                        onChange={(e) => setUserSearch(e.target.value)}
                                        placeholder="Buscar usuario por nombre o correo..."
                                        className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                                    />
                                    {isSearching && (
                                        <Loader2 className="absolute right-3.5 top-3.5 w-4 h-4 text-emerald-500 animate-spin" />
                                    )}
                                </div>

                                {userSearch.trim().length >= 2 && (
                                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 max-h-48 overflow-y-auto divide-y divide-slate-100">
                                        {users.length > 0 ? (
                                            users.map(u => (
                                                <div 
                                                    key={u.id} 
                                                    onClick={() => { setUserId(u.id); setSelectedUserName(`${u.name} (${u.email})`); setUserSearch(''); setUsers([]); }}
                                                    className="px-4 py-2.5 hover:bg-emerald-50/80 cursor-pointer transition-colors text-xs"
                                                >
                                                    <div className="font-bold text-slate-800">{u.name}</div>
                                                    <div className="text-[11px] text-slate-500">{u.email} {u.documento ? `| Doc: ${u.documento}` : ''}</div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="px-4 py-3 text-xs text-slate-400 text-center">
                                                {isSearching ? 'Buscando...' : 'No se encontraron usuarios'}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 2. Paquete de Inversión */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Paquete de Inversión <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={packageId}
                            onChange={(e) => handleSelectPackage(e.target.value)}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        >
                            <option value="">-- Seleccionar paquete --</option>
                            {packages.map((p: any) => (
                                <option key={p.id} value={p.id}>
                                    {p.name || `Paquete $${Number(p.value || 0).toLocaleString('es-CO')}`} (${Number(p.value || 0).toLocaleString('es-CO')} COP)
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* 3. Monto y Periodo */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                Monto (COP) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                value={monto}
                                onChange={(e) => setMonto(e.target.value)}
                                placeholder="Ej: 10000000"
                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                Periodo <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={periodId}
                                onChange={(e) => setPeriodId(e.target.value)}
                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                            >
                                <option value="">-- Seleccionar periodo --</option>
                                {periods.map((per: any) => (
                                    <option key={per.id} value={per.id}>
                                        {per.name || `${per.months || per.days / 30} Meses`} ({per.days} Días)
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* 4. Referido */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Código de Referido (Opcional)
                        </label>
                        <input
                            type="text"
                            value={referralCode}
                            onChange={(e) => setReferralCode(e.target.value)}
                            placeholder="Ej: DIR-102"
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                    </div>

                    {/* 5. Comprobante */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Comprobante de Pago (Opcional)
                        </label>
                        <div className="border border-dashed border-slate-200 rounded-2xl p-3 text-center bg-slate-50/50 hover:border-emerald-400 transition-colors">
                            <input 
                                type="file" 
                                accept="image/*,.pdf"
                                id="admin-clean-comprobante-input"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            <label htmlFor="admin-clean-comprobante-input" className="cursor-pointer flex flex-col items-center justify-center gap-1">
                                <UploadCloud className="w-5 h-5 text-slate-400" />
                                <span className="text-xs font-bold text-slate-700">
                                    {comprobanteFile ? comprobanteFile.name : 'Adjuntar comprobante'}
                                </span>
                            </label>
                        </div>
                        {comprobantePreview && (
                            <img src={comprobantePreview} alt="Vista previa" className="h-20 mx-auto rounded-xl border border-slate-200 object-cover mt-2" />
                        )}
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => { resetForm(); onClose(); }}
                            className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || successMessage}
                            className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Guardando...</span>
                                </>
                            ) : (
                                <>
                                    <Check className="w-3.5 h-3.5" />
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
