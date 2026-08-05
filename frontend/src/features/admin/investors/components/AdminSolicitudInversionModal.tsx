import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, TrendingUp, Calendar, ChevronRight, Loader2, Info, ChevronLeft, Upload, Link, Wallet as WalletIcon, CheckCircle2, Search, Check } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../../../services/api';
import { compressImage } from '../../../../utils/imageCompression';
import { usersService } from '../../../../services/users';

interface AdminSolicitudInversionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export const AdminSolicitudInversionModal = ({ isOpen, onClose, onSuccess }: AdminSolicitudInversionModalProps) => {
    const queryClient = useQueryClient();
    
    // UI Step State
    const [step, setStep] = useState(1);
    
    // User Selection State
    const [userId, setUserId] = useState<number | ''>('');
    const [userSearch, setUserSearch] = useState('');
    const [selectedUserName, setSelectedUserName] = useState('');
    const [users, setUsers] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);

    // Investment State
    const [selectedPackage, setSelectedPackage] = useState<any>(null);
    const [selectedPeriod, setSelectedPeriod] = useState<any>(null);
    
    // Step 2 State
    const [referralCode, setReferralCode] = useState('');
    const [useWallet, setUseWallet] = useState(false);
    const [walletAmount, setWalletAmount] = useState<number>(0);
    const [userWalletBalance, setUserWalletBalance] = useState<number>(0);
    const [isLoadingWallet, setIsLoadingWallet] = useState(false);
    const [files, setFiles] = useState<FileList | null>(null);

    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const { data: packages, isLoading: loadingPackages } = useQuery({
        queryKey: ['admin_solicitud_packages'],
        queryFn: () => fetchApi('/packages'),
        enabled: isOpen,
    });

    const { data: periods, isLoading: loadingPeriods } = useQuery({
        queryKey: ['admin_solicitud_periods'],
        queryFn: () => fetchApi('/periods'),
        enabled: isOpen,
    });

    // Dynamic User Search
    useEffect(() => {
        if (!isOpen) return;

        const handler = setTimeout(async () => {
            setIsSearching(true);
            try {
                const res = await usersService.getUsers({ 
                    search: userSearch.trim() || undefined, 
                    limit: 100 
                });
                setUsers(res.data || []);
            } catch (err) {
                console.error("Error buscando usuarios", err);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(handler);
    }, [userSearch, isOpen]);

    // Fetch Selected User's Wallet Balance when userId changes
    useEffect(() => {
        if (!userId) {
            setUserWalletBalance(0);
            setWalletAmount(0);
            return;
        }

        const fetchUserWallet = async () => {
            try {
                setIsLoadingWallet(true);
                const res = await fetchApi('/wallets/admin/all');
                const userWallet = (res || []).find((item: any) => item.user_id === Number(userId));
                const balance = userWallet ? (userWallet.balance || 0) : 0;
                setUserWalletBalance(balance);
            } catch (err) {
                console.error("Error obteniendo saldo de billetera", err);
                setUserWalletBalance(0);
            } finally {
                setIsLoadingWallet(false);
            }
        };

        fetchUserWallet();
    }, [userId]);

    const handleFinalClose = () => {
        setStep(1);
        setUserId('');
        setSelectedUserName('');
        setUserSearch('');
        setSelectedPackage(null);
        setSelectedPeriod(null);
        setReferralCode('');
        setUseWallet(false);
        setWalletAmount(0);
        setUserWalletBalance(0);
        setFiles(null);
        setErrorMessage(null);
        onClose();
    };

    const createRequestMutation = useMutation({
        mutationFn: async (formData: FormData) => {
            return await fetchApi('/investments/requests', {
                method: 'POST',
                body: formData,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-investment-requests'] });
            queryClient.invalidateQueries({ queryKey: ['investment-requests'] });
            setStep(3);
            if (onSuccess) onSuccess();
        },
        onError: (error: any) => {
            console.error("Error al enviar la solicitud:", error);
            setErrorMessage("Error al enviar la solicitud: " + (error.message || "Inténtalo de nuevo"));
        }
    });

    if (!isOpen) return null;

    const getPackageAmount = (pkg: any) => {
        if (!pkg || pkg.value === undefined) return 0;
        return parseFloat(pkg.value) || 0;
    };

    const packageAmount = getPackageAmount(selectedPackage);
    const monthlyYield = selectedPeriod ? packageAmount * (selectedPeriod.percentage / 100) : 0;
    const estimatedYield = selectedPeriod ? monthlyYield * (selectedPeriod.months || Math.round(selectedPeriod.days / 30)) : 0;
    const dailyYield = selectedPeriod && selectedPeriod.days > 0 
        ? estimatedYield / selectedPeriod.days 
        : monthlyYield / 30;
    const totalReturn = packageAmount + estimatedYield;

    const remainingToPay = Math.max(0, packageAmount - (useWallet ? walletAmount : 0));

    const handleSubmit = async () => {
        if (!userId) {
            setErrorMessage("Debes seleccionar un usuario.");
            return;
        }
        if (!selectedPackage || !selectedPeriod) {
            setErrorMessage("Debes seleccionar paquete y periodo.");
            return;
        }
        
        setErrorMessage(null);
        const formData = new FormData();
        formData.append('user_id', userId.toString());
        formData.append('paquete_inversion_id', selectedPackage.id.toString());
        formData.append('monto', packageAmount.toString());
        formData.append('periodo_contrato', selectedPeriod.id.toString());
        
        if (useWallet && walletAmount > 0) {
            formData.append('monto_billetera_usado', walletAmount.toString());
        }
        
        if (referralCode.trim()) {
            formData.append('codigo_referido', referralCode.trim());
        }
        
        if (files && files.length > 0) {
            for (let i = 0; i < files.length; i++) {
                let fileToUpload = files[i];
                if (fileToUpload.type.startsWith('image/')) {
                    fileToUpload = await compressImage(fileToUpload);
                }
                formData.append('comprobantes', fileToUpload);
            }
        }
        
        createRequestMutation.mutate(formData);
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 font-montserrat">
                            {step === 1 ? 'Nueva Solicitud de Inversión' : step === 2 ? 'Detalles de Pago' : '¡Solicitud Registrada!'}
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">
                            {step === 1 ? 'Selecciona el usuario, paquete y periodo de inversión' : step === 2 ? 'Configura el pago con billetera y adjunta comprobantes' : 'La solicitud de inversión fue creada exitosamente'}
                        </p>
                    </div>
                    <button onClick={step === 3 ? handleFinalClose : handleFinalClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-full transition-colors cursor-pointer">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    
                    {errorMessage && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-2xl text-xs font-semibold text-red-700">
                            {errorMessage}
                        </div>
                    )}

                    {step === 1 && (
                        <div className="space-y-6 animate-fadeIn">
                            
                            {/* 1. Buscador Autocompletado de Usuario */}
                            <div>
                                <label className="text-sm font-bold text-slate-700 uppercase tracking-widest mb-2 flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        <Search className="w-4 h-4 text-brand-600" />
                                        1. Selecciona el Usuario Inversionista *
                                    </span>
                                    {isSearching && <Loader2 className="w-3.5 h-3.5 text-brand-500 animate-spin" />}
                                </label>

                                {userId ? (
                                    <div className="flex items-center justify-between w-full px-4 py-3 bg-emerald-50 border-2 border-emerald-200 rounded-2xl">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                                            <div>
                                                <span className="text-emerald-900 text-sm font-bold block">{selectedUserName}</span>
                                                {isLoadingWallet ? (
                                                    <span className="text-xs text-emerald-600 flex items-center gap-1">
                                                        <Loader2 className="w-3 h-3 animate-spin" /> Cargando saldo...
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-emerald-700 font-medium">
                                                        Saldo Billetera: ${userWalletBalance.toLocaleString('es-CO')} COP
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={() => { setUserId(''); setSelectedUserName(''); setUserSearch(''); setShowDropdown(false); }} 
                                            className="text-xs text-emerald-700 hover:text-emerald-800 font-bold bg-white px-3 py-1.5 rounded-xl border border-emerald-200 shadow-2xs cursor-pointer"
                                        >
                                            Cambiar
                                        </button>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <input 
                                            type="text"
                                            value={userSearch}
                                            onChange={(e) => {
                                                setUserSearch(e.target.value);
                                                setShowDropdown(true);
                                            }}
                                            onFocus={() => setShowDropdown(true)}
                                            placeholder="Buscar usuario por nombre, correo o cédula..."
                                            className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl py-3 px-4 text-slate-700 text-sm font-semibold focus:outline-none focus:border-brand-500 transition-all"
                                        />

                                        {showDropdown && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-30 max-h-56 overflow-y-auto divide-y divide-slate-100">
                                                {isSearching ? (
                                                    <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                                                        <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
                                                        <span>Buscando inversionistas...</span>
                                                    </div>
                                                ) : users && users.length > 0 ? (
                                                    users.map((u: any) => (
                                                        <div 
                                                            key={u.id}
                                                            onClick={() => {
                                                                setUserId(u.id);
                                                                setSelectedUserName(`${u.name} (${u.email})`);
                                                                setUserSearch('');
                                                                setShowDropdown(false);
                                                            }}
                                                            className="p-3.5 hover:bg-emerald-50/70 cursor-pointer transition-colors flex items-center justify-between"
                                                        >
                                                            <div>
                                                                <div className="font-bold text-slate-800 text-xs">{u.name}</div>
                                                                <div className="text-[11px] text-slate-500">{u.email} {u.document_id || u.documento ? `• CC: ${u.document_id || u.documento}` : ''}</div>
                                                            </div>
                                                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-1 rounded-lg font-bold">Seleccionar</span>
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

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* 2. Packages Selector */}
                                <div>
                                    <label className="text-sm font-bold text-slate-700 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        2. Selecciona el Paquete *
                                        {loadingPackages && <Loader2 className="w-3 h-3 text-brand-500 animate-spin" />}
                                    </label>
                                    <select 
                                        className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl py-3 px-4 text-slate-700 text-sm font-semibold focus:outline-none focus:border-brand-500 transition-all appearance-none cursor-pointer"
                                        value={selectedPackage?.id || ""}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (!val) setSelectedPackage(null);
                                            else {
                                                const pkg = packages?.find((p: any) => p.id.toString() === val);
                                                setSelectedPackage(pkg);
                                            }
                                        }}
                                        disabled={loadingPackages}
                                    >
                                        <option value="">-- Selecciona un paquete --</option>
                                        {packages?.map((pkg: any) => (
                                            <option key={pkg.id} value={pkg.id}>
                                                {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(getPackageAmount(pkg))} ({pkg.granted_shares} Acciones)
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* 3. Periods Selector */}
                                <div>
                                    <label className="text-sm font-bold text-slate-700 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        3. Elige el Periodo *
                                        {loadingPeriods && <Loader2 className="w-3 h-3 text-emerald-500 animate-spin" />}
                                    </label>
                                    <select 
                                        className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl py-3 px-4 text-slate-700 text-sm font-semibold focus:outline-none focus:border-emerald-500 transition-all appearance-none cursor-pointer"
                                        value={selectedPeriod?.id || ""}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (!val) setSelectedPeriod(null);
                                            else {
                                                const period = periods?.find((p: any) => p.id.toString() === val);
                                                setSelectedPeriod(period);
                                            }
                                        }}
                                        disabled={loadingPeriods}
                                    >
                                        <option value="">-- Selecciona un periodo --</option>
                                        {periods?.map((period: any) => (
                                            <option key={period.id} value={period.id}>
                                                {period.months || Math.round(period.days / 30)} Meses ({period.percentage}% Rendimiento)
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            
                            {/* Summary Block */}
                            {selectedPackage && selectedPeriod && (
                                <div className="space-y-6 animate-fadeIn mt-6">
                                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                                        <h3 className="font-bold text-slate-800 mb-4 uppercase tracking-wider text-xs">Resumen de la Inversión</h3>
                                        <div className="space-y-3">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500">Paquete</span>
                                                <span className="font-bold text-slate-800">
                                                    {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(getPackageAmount(selectedPackage))}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500">Periodo</span>
                                                <span className="font-bold text-slate-800">{selectedPeriod?.months || Math.round(selectedPeriod?.days / 30)} Meses ({selectedPeriod?.percentage}%)</span>
                                            </div>
                                            
                                            <div className="flex justify-between text-sm border-t border-slate-100 pt-3 mt-3">
                                                <span className="text-slate-500">Capital (Base Inversión)</span>
                                                <span className="font-bold text-slate-800">
                                                    {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(packageAmount)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm pt-2 border-t border-slate-50">
                                                <span className="text-emerald-600 font-medium">Rendimiento Diario Estimado</span>
                                                <span className="font-bold text-emerald-600">
                                                    +{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(dailyYield)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-emerald-600 font-medium">Rendimiento Mensual Estimado</span>
                                                <span className="font-bold text-emerald-600">
                                                    +{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(monthlyYield)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
                                                <span className="text-slate-800 font-bold">Total Retorno Estimado</span>
                                                <span className="font-extrabold text-slate-800">
                                                    {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(totalReturn)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end pt-4">
                                <button
                                    disabled={!userId || !selectedPackage || !selectedPeriod}
                                    onClick={() => setStep(2)}
                                    className="bg-brand-500 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-brand-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-brand-500/20 text-sm"
                                >
                                    <span>Continuar a Detalles de Pago</span>
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-fadeIn">
                            
                            {/* Selected Package & User Info Bar */}
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                                <div>
                                    <span className="text-slate-500">Inversionista:</span> <span className="font-bold text-slate-800">{selectedUserName}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500">Valor Paquete:</span> <span className="font-bold text-slate-800">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(packageAmount)}</span>
                                </div>
                            </div>

                            {/* Wallet Option */}
                            <div className="bg-emerald-50/60 p-5 rounded-2xl border border-emerald-200 space-y-4">
                                <div className="flex items-center justify-between">
                                    <label htmlFor="modal-use-wallet-toggle" className="flex items-center gap-2 font-bold text-emerald-900 text-sm cursor-pointer">
                                        <WalletIcon className="w-5 h-5 text-emerald-600" />
                                        <span>Usar Saldo de Billetera del Usuario</span>
                                    </label>
                                    <input 
                                        type="checkbox"
                                        id="modal-use-wallet-toggle"
                                        checked={useWallet}
                                        onChange={(e) => {
                                            const checked = e.target.checked;
                                            setUseWallet(checked);
                                            if (checked) {
                                                setWalletAmount(Math.min(userWalletBalance, packageAmount));
                                            } else {
                                                setWalletAmount(0);
                                            }
                                        }}
                                        className="w-5 h-5 text-emerald-600 rounded-lg focus:ring-emerald-500 cursor-pointer"
                                    />
                                </div>

                                {useWallet && (
                                    <div className="space-y-3 pt-3 border-t border-emerald-200/80 animate-fadeIn">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-emerald-700">Saldo Disponible en Billetera:</span>
                                            <span className="font-bold text-emerald-900">${userWalletBalance.toLocaleString('es-CO')} COP</span>
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="font-bold text-slate-700">Monto a Descontar (COP):</span>
                                                <button 
                                                    type="button"
                                                    onClick={() => setWalletAmount(Math.min(userWalletBalance, packageAmount))}
                                                    className="text-emerald-700 font-bold hover:underline text-[11px]"
                                                >
                                                    Usar máximo disponible
                                                </button>
                                            </div>
                                            <input 
                                                type="number"
                                                value={walletAmount || ''}
                                                onChange={(e) => setWalletAmount(Math.min(Number(e.target.value), userWalletBalance))}
                                                placeholder="Ej: 500000"
                                                className="w-full bg-white border border-emerald-300 rounded-xl py-2.5 px-3 text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                            />
                                        </div>

                                        <div className="bg-white p-3 rounded-xl border border-emerald-200 space-y-1.5 text-xs">
                                            <div className="flex justify-between text-slate-600">
                                                <span>Valor total paquete:</span>
                                                <span>${packageAmount.toLocaleString('es-CO')} COP</span>
                                            </div>
                                            <div className="flex justify-between text-emerald-700 font-semibold">
                                                <span>Pago con Billetera:</span>
                                                <span>- ${walletAmount.toLocaleString('es-CO')} COP</span>
                                            </div>
                                            <div className="flex justify-between text-slate-900 font-extrabold border-t border-slate-100 pt-1.5">
                                                <span>Restante por consignación:</span>
                                                <span>${remainingToPay.toLocaleString('es-CO')} COP</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Código de Referido */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-widest block">
                                    Código de Referido (Opcional)
                                </label>
                                <input 
                                    type="text"
                                    value={referralCode}
                                    onChange={(e) => setReferralCode(e.target.value)}
                                    placeholder="Ej: DIR-102"
                                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl py-3 px-4 text-slate-700 text-sm font-semibold focus:outline-none focus:border-brand-500 transition-all"
                                />
                            </div>

                            {/* Soporte de Pago / Comprobante */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-widest block">
                                    {useWallet && remainingToPay === 0 ? 'Comprobante de Pago (Opcional - Pago 100% con Billetera)' : 'Adjuntar Comprobante de Pago (Opcional)'}
                                </label>
                                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center hover:border-brand-500 transition-colors bg-slate-50/50">
                                    <input 
                                        type="file" 
                                        id="new-investment-admin-files"
                                        accept="image/*,.pdf"
                                        multiple
                                        onChange={(e) => setFiles(e.target.files)}
                                        className="hidden"
                                    />
                                    <label htmlFor="new-investment-admin-files" className="cursor-pointer flex flex-col items-center justify-center gap-2">
                                        <Upload className="w-6 h-6 text-slate-400" />
                                        <span className="text-xs font-bold text-slate-700">
                                            {files && files.length > 0 ? `${files.length} archivo(s) seleccionado(s)` : 'Haz clic para adjuntar comprobante'}
                                        </span>
                                        <span className="text-[10px] text-slate-400">Imágenes (PNG, JPG) o PDF</span>
                                    </label>
                                </div>
                            </div>

                            {/* Footer Buttons */}
                            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    <span>Atrás</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={createRequestMutation.isPending}
                                    className="bg-brand-500 hover:bg-brand-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-brand-500/20 text-xs disabled:opacity-50"
                                >
                                    {createRequestMutation.isPending ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Enviando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-4 h-4" />
                                            <span>Confirmar y Crear Solicitud</span>
                                        </>
                                    )}
                                </button>
                            </div>

                        </div>
                    )}

                    {step === 3 && (
                        <div className="py-8 text-center space-y-4 animate-fadeIn">
                            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle2 className="w-10 h-10" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 font-montserrat">¡Solicitud Registrada con Éxito!</h3>
                                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                                    La solicitud de inversión fue creada a nombre del inversionista <span className="font-bold text-slate-700">{selectedUserName}</span>.
                                </p>
                            </div>
                            <div className="pt-4">
                                <button
                                    type="button"
                                    onClick={handleFinalClose}
                                    className="bg-brand-500 text-white px-8 py-3 rounded-2xl font-bold hover:bg-brand-600 transition-all text-xs cursor-pointer shadow-md"
                                >
                                    Entendido / Cerrar
                                </button>
                            </div>
                        </div>
                    )}

                </div>

            </div>
        </div>,
        document.body
    );
};
