import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, TrendingUp, Calendar, ChevronRight, Loader2, Info, ChevronLeft, Upload, Link, Wallet, AlertCircle, Trash2, ShieldCheck } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../../services/api';
import { compressImage } from '../../../utils/imageCompression';

interface NewInvestmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentPackageId?: number;
    currentPackageAmount?: number;
    currentPeriodId?: number;
    investorId?: number;
    isUpgrade?: boolean;
}

export const NewInvestmentModal = ({ isOpen, onClose, currentPackageId, currentPackageAmount, currentPeriodId, investorId, isUpgrade = false }: NewInvestmentModalProps) => {
    const queryClient = useQueryClient();
    
    // UI State
    const [step, setStep] = useState(1);
    const [selectedPackage, setSelectedPackage] = useState<any>(null);
    const [selectedPeriod, setSelectedPeriod] = useState<any>(null);
    
    // Step 2 State
    const [referralCode, setReferralCode] = useState('');
    const [useWallet, setUseWallet] = useState(false);
    const [walletAmount, setWalletAmount] = useState<number>(0);
    const [files, setFiles] = useState<FileList | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const { data: packages, isLoading: loadingPackages } = useQuery({
        queryKey: ['investment_packages'],
        queryFn: () => fetchApi('/packages'),
        enabled: isOpen,
    });

    const { data: periods, isLoading: loadingPeriods } = useQuery({
        queryKey: ['contract_periods'],
        queryFn: () => fetchApi('/periods'),
        enabled: isOpen,
    });
    
    // Fetch user wallet to know balance
    const { data: wallet } = useQuery({
        queryKey: ['wallet'],
        queryFn: () => fetchApi('/wallets/me/balance'),
        enabled: isOpen && step === 2,
    });
    
    const { data: myInvestments } = useQuery({
        queryKey: ['my_investments'],
        queryFn: () => fetchApi('/investments/me'),
        enabled: isOpen && step === 2,
    });

    React.useEffect(() => {
        if (isUpgrade && currentPeriodId && periods) {
            const period = periods.find((p: any) => p.id === currentPeriodId);
            if (period) setSelectedPeriod(period);
        }
    }, [isUpgrade, currentPeriodId, periods, isOpen]);

    const handleFinalClose = () => {
        setStep(1);
        setSelectedPackage(null);
        setSelectedPeriod(null);
        setReferralCode('');
        setUseWallet(false);
        setWalletAmount(0);
        setFiles(null);
        setSubmitError(null);
        onClose();
    };

    const handleFilesSelected = (selectedFiles: FileList | null) => {
        setSubmitError(null);
        if (!selectedFiles || selectedFiles.length === 0) {
            setFiles(null);
            return;
        }
        const MAX_SIZE_MB = 10;
        const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            if (file.size > MAX_SIZE_BYTES) {
                setSubmitError(`El archivo "${file.name}" (${(file.size / 1024 / 1024).toFixed(1)} MB) supera el tamaño máximo permitido de ${MAX_SIZE_MB} MB. Por favor comprímelo o adjunta un archivo más liviano.`);
                setFiles(null);
                const inputEl = document.getElementById('comprobantes') as HTMLInputElement;
                if (inputEl) inputEl.value = '';
                return;
            }
        }
        setFiles(selectedFiles);
    };

    const createRequestMutation = useMutation({
        mutationFn: async (formData: FormData) => {
            return await fetchApi('/investments/requests', {
                method: 'POST',
                body: formData,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my_investments'] });
            setSubmitError(null);
            setStep(3);
        },
        onError: (error: any) => {
            console.error("Error creating request", error);
            const msg = error.message || 'Error al enviar la solicitud de inversión.';
            setSubmitError(msg);
        }
    });

    if (!isOpen) return null;

    // Calculate amounts dynamically based on Package name and Period
    const getPackageAmount = (pkg: any) => {
        if (!pkg || pkg.value === undefined) return 0;
        return parseFloat(pkg.value) || 0;
    };

    const currentPackage = packages?.find((p: any) => p.id === currentPackageId);
    const currentPackageValue = isUpgrade 
        ? (currentPackage ? getPackageAmount(currentPackage) : (Number(currentPackageAmount) || 0)) 
        : 0;

    const packageAmount = getPackageAmount(selectedPackage);
    const upgradeDifference = isUpgrade ? Math.max(0, packageAmount - currentPackageValue) : packageAmount;
    const baseToPay = isUpgrade ? upgradeDifference : packageAmount;

    const monthlyYield = selectedPeriod ? packageAmount * (selectedPeriod.percentage / 100) : 0;
    const estimatedYield = selectedPeriod ? monthlyYield * selectedPeriod.months : 0;
    const dailyYield = selectedPeriod && selectedPeriod.days > 0 
        ? estimatedYield / selectedPeriod.days 
        : monthlyYield / 30; // Fallback
    const totalReturn = packageAmount + estimatedYield;

    const maxWalletAllowed = wallet ? Math.min(wallet.balance, baseToPay) : 0;
    const amountToPay = Math.max(0, baseToPay - (useWallet ? walletAmount : 0));

    const handleSubmit = async () => {
        if (!selectedPackage || !selectedPeriod) return;
        
        const formData = new FormData();
        formData.append('paquete_inversion_id', selectedPackage.id.toString());
        formData.append('monto', packageAmount.toString());
        formData.append('periodo_contrato', selectedPeriod.id.toString());
        
        if (useWallet && walletAmount > 0) {
            formData.append('monto_billetera_usado', walletAmount.toString());
        }
        
        if (!isUpgrade && referralCode.trim()) {
            formData.append('codigo_referido', referralCode.trim());
        }
        
        if (isUpgrade) {
            formData.append('is_upgrade', 'true');
        }
        if (investorId) {
            formData.append('investor_id', investorId.toString());
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
                        <h2 className="text-xl font-bold text-slate-800">
                            {step === 1 ? (isUpgrade ? 'Aumento de Capital' : 'Nueva Inversión') : step === 2 ? 'Detalles de Pago' : (isUpgrade ? '¡Solicitud de Aumento Registrada!' : '¡Inversión Registrada!')}
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">
                            {step === 1 ? 'Configura tu plan y descubre tu rentabilidad' : step === 2 ? 'Adjunta tus soportes y código de referido' : 'Tu solicitud ha sido procesada con éxito'}
                        </p>
                    </div>
                    <button onClick={step === 3 ? handleFinalClose : onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {step === 1 && (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Packages Selector */}
                                <div>
                                    <label className="text-sm font-bold text-slate-700 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        1. Selecciona tu Paquete
                                        {loadingPackages && <Loader2 className="w-3 h-3 text-brand-500 animate-spin" />}
                                    </label>
                                    <select 
                                        className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl py-3 px-4 text-slate-700 font-semibold focus:outline-none focus:border-brand-500 transition-all appearance-none"
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
                                        {packages?.filter((pkg: any) => !isUpgrade || getPackageAmount(pkg) > currentPackageValue).map((pkg: any) => (
                                            <option key={pkg.id} value={pkg.id}>
                                                {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(getPackageAmount(pkg))} ({pkg.granted_shares} Acciones)
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Periods Selector */}
                                <div>
                                    <label className="text-sm font-bold text-slate-700 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        2. Elige el Periodo
                                        {loadingPeriods && <Loader2 className="w-3 h-3 text-emerald-500 animate-spin" />}
                                    </label>
                                    <select 
                                        className={`w-full bg-slate-50 border-2 border-slate-200 rounded-2xl py-3 px-4 text-slate-700 font-semibold focus:outline-none focus:border-emerald-500 transition-all appearance-none ${isUpgrade ? 'opacity-70 cursor-not-allowed' : ''}`}
                                        value={selectedPeriod?.id || ""}
                                        onChange={(e) => {
                                            if (isUpgrade) return;
                                            const val = e.target.value;
                                            if (!val) setSelectedPeriod(null);
                                            else {
                                                const period = periods?.find((p: any) => p.id.toString() === val);
                                                setSelectedPeriod(period);
                                            }
                                        }}
                                        disabled={loadingPeriods || isUpgrade}
                                    >
                                        <option value="">-- Selecciona un periodo --</option>
                                        {periods?.filter((period: any) => !isUpgrade || period.id === currentPeriodId).map((period: any) => (
                                            <option key={period.id} value={period.id}>
                                                {period.months} Meses ({period.percentage}% Rendimiento)
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            
                            {/* Summary Block */}
                            {selectedPackage && selectedPeriod && (
                                <div className="space-y-6 animate-fadeIn mt-6">
                                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                                        <h3 className="font-bold text-slate-800 mb-4 uppercase tracking-wider text-xs">Resumen de tu Inversión</h3>
                                        <div className="space-y-3">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500">Paquete</span>
                                                <span className="font-bold text-slate-800">
                                                    {selectedPackage ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(getPackageAmount(selectedPackage)) : ''}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500">Periodo</span>
                                                <span className="font-bold text-slate-800">{selectedPeriod?.months} Meses ({selectedPeriod?.percentage}%)</span>
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
                                            <div className="flex justify-between text-sm pt-2">
                                                <span className="text-emerald-600 font-bold">Rendimiento Total ({selectedPeriod?.months} Meses)</span>
                                                <span className="font-black text-emerald-600">
                                                    +{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(estimatedYield)}
                                                </span>
                                            </div>
                                            <div className="bg-slate-800 text-white p-4 rounded-xl flex justify-between items-center mt-4 shadow-inner">
                                                <span className="text-sm font-semibold uppercase tracking-wider text-slate-300">Total Esperado</span>
                                                <span className="text-xl font-black">
                                                    {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalReturn)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-fadeIn">
                            
                            {/* Pago con Wallet */}
                            <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-2">
                                        <Wallet className="w-5 h-5 text-brand-500" />
                                        <h3 className="font-bold text-slate-700">Usar saldo de Wallet</h3>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            className="sr-only peer" 
                                            checked={useWallet}
                                            onChange={(e) => {
                                                setUseWallet(e.target.checked);
                                                if (!e.target.checked) setWalletAmount(0);
                                            }}
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
                                    </label>
                                </div>
                                
                                {useWallet && (
                                    <div className="space-y-3 animate-fadeIn">
                                        <p className="text-sm text-slate-500">
                                            Saldo disponible: <span className="font-bold text-slate-700">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(maxWalletAllowed)}</span>
                                        </p>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                                            <input 
                                                type="number"
                                                min="0"
                                                max={maxWalletAllowed}
                                                value={walletAmount}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value) || 0;
                                                    setWalletAmount(Math.min(val, maxWalletAllowed));
                                                }}
                                                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-2 pl-8 pr-4 text-slate-700 font-semibold focus:outline-none focus:border-brand-500"
                                                placeholder="Monto a usar"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Error Alert Banner */}
                            {submitError && (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-700 text-xs font-semibold animate-in fade-in duration-200">
                                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                                    <div className="flex-1 space-y-1">
                                        <p className="font-bold text-sm">Error en la solicitud</p>
                                        <p className="font-normal text-red-600 leading-relaxed">{submitError}</p>
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={() => setSubmitError(null)}
                                        className="p-1 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-100/50 transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            {/* Resumen de Pago */}
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
                                {isUpgrade && (
                                    <div className="flex justify-between items-center text-xs text-slate-500">
                                        <span>Paquete Actual:</span>
                                        <span className="font-semibold text-slate-700">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(currentPackageValue)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-600">{isUpgrade ? 'Nuevo Paquete Seleccionado:' : 'Total Inversión:'}</span>
                                    <span className="font-bold text-slate-800">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(packageAmount)}</span>
                                </div>
                                {isUpgrade && (
                                    <div className="flex justify-between items-center text-sm font-semibold text-slate-800 border-t border-slate-200/60 pt-2">
                                        <span>Diferencia por Aumento:</span>
                                        <span className="font-bold text-slate-900">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(upgradeDifference)}</span>
                                    </div>
                                )}
                                {useWallet && walletAmount > 0 && (
                                    <div className="flex justify-between items-center text-sm text-brand-600">
                                        <span>Abono con Billetera:</span>
                                        <span className="font-bold">-{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(walletAmount)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center text-base border-t border-slate-200 pt-2 mt-2">
                                    <span className="text-slate-800 font-bold">Total a transferir / consignar:</span>
                                    <span className={`font-black text-lg ${amountToPay === 0 ? 'text-emerald-600' : 'text-brand-600'}`}>
                                        {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amountToPay)}
                                    </span>
                                </div>
                            </div>

                            {/* Comprobantes */}
                            <div>
                                <label className="text-sm font-bold text-slate-700 uppercase tracking-widest mb-2 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Upload className="w-4 h-4 text-slate-400" />
                                        <span>Comprobantes de Pago</span>
                                    </div>
                                    {amountToPay === 0 && (
                                        <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                            100% Cubierto con Billetera (Opcional)
                                        </span>
                                    )}
                                </label>

                                {amountToPay === 0 ? (
                                    <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs font-semibold mb-3">
                                        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                                        <div>
                                            <p className="font-bold text-sm text-emerald-900">¡Diferencia 100% cubierta con tu Billetera!</p>
                                            <p className="font-normal text-emerald-700 mt-0.5">El valor del aumento se debitará directamente de tu saldo. No es necesario adjuntar comprobantes bancarios.</p>
                                        </div>
                                    </div>
                                ) : null}

                                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-brand-400 transition-colors bg-slate-50">
                                    <input 
                                        type="file" 
                                        id="comprobantes" 
                                        multiple
                                        accept="image/*,.pdf"
                                        className="hidden"
                                        onChange={(e) => handleFilesSelected(e.target.files)}
                                    />
                                    <label htmlFor="comprobantes" className="cursor-pointer flex flex-col items-center">
                                        <Upload className="w-8 h-8 text-slate-400 mb-2" />
                                        <span className="text-sm font-semibold text-slate-700">
                                            {amountToPay === 0 ? 'Adjuntar soporte voluntario (opcional)' : 'Haz clic para subir o arrastra tus archivos'}
                                        </span>
                                        <span className="text-xs text-slate-500 mt-1">Imágenes (PNG, JPG, WEBP) o PDF • <strong>Máx. 10 MB por archivo</strong></span>
                                    </label>
                                    
                                    {files && files.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-slate-200 text-left space-y-2">
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs font-bold text-slate-500 uppercase">Archivos seleccionados:</p>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setFiles(null);
                                                        const inputEl = document.getElementById('comprobantes') as HTMLInputElement;
                                                        if (inputEl) inputEl.value = '';
                                                    }}
                                                    className="text-xs text-red-500 hover:text-red-700 font-semibold flex items-center gap-1 cursor-pointer"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                    Quitar archivos
                                                </button>
                                            </div>
                                            {Array.from(files).map((file, i) => (
                                                <div key={i} className="text-sm text-slate-700 flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-100">
                                                    <div className="w-2 h-2 rounded-full bg-brand-500"></div>
                                                    <span className="truncate flex-1">{file.name}</span>
                                                    <span className="text-xs font-mono text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Referido (Solo para nuevas inversiones) */}
                            {!isUpgrade && (
                                <div>
                                    <label className="text-sm font-bold text-slate-700 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <Link className="w-4 h-4 text-slate-400" />
                                        Código de Referido (Opcional)
                                    </label>
                                    {myInvestments && myInvestments.filter((inv: any) => (inv.codigo_asignado || inv.assigned_code)).length > 0 ? (
                                        <select 
                                            value={referralCode}
                                            onChange={(e) => setReferralCode(e.target.value)}
                                            className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-3 px-4 text-slate-700 font-semibold focus:outline-none focus:border-brand-500 appearance-none"
                                        >
                                            <option value="">-- Sin código de referido --</option>
                                            {myInvestments.filter((inv: any) => (inv.codigo_asignado || inv.assigned_code)).map((inv: any) => {
                                                const code = inv.codigo_asignado || inv.assigned_code;
                                                return (
                                                    <option key={inv.id} value={code}>
                                                        {code} - {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(inv.monto)} ({inv.paquete?.acciones_otorgadas || 0} Acciones)
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    ) : (
                                        <div className="bg-slate-50 border-2 border-slate-200 rounded-xl py-3 px-4 text-slate-400 font-medium italic text-sm">
                                            No tienes códigos de referido disponibles.
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3">
                                <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-blue-700 leading-relaxed">
                                    Al enviar tu solicitud, el estado de tu inversión será "Pendiente" hasta que el equipo administrativo valide los comprobantes de pago.
                                </p>
                            </div>
                        </div>
                    )}
                    
                    {step === 3 && (
                        <div className="flex flex-col items-center justify-center p-8 text-center animate-fadeIn space-y-4">
                            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-4 border-4 border-emerald-50">
                                <TrendingUp className="w-10 h-10 text-emerald-500" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-800">¡Solicitud Registrada!</h3>
                            <p className="text-slate-600 text-sm max-w-sm mx-auto">
                                Hemos recibido tu solicitud de inversión. Nuestro equipo administrativo la validará en breve y te notificaremos cuando esté aprobada.
                            </p>
                            <button 
                                onClick={handleFinalClose}
                                className="mt-6 px-8 py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl shadow-md transition-all"
                            >
                                Entendido
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {step !== 3 && (
                    <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-between items-center">
                        {step === 1 ? (
                            <div className="w-full flex justify-end">
                                <button 
                                    onClick={() => setStep(2)}
                                    disabled={!selectedPackage || !selectedPeriod}
                                    className="flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    Continuar
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <>
                                <button 
                                    onClick={() => setStep(1)}
                                    disabled={createRequestMutation.isPending}
                                    className="flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-slate-700 font-semibold transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Atrás
                                </button>
                                <button 
                                    onClick={handleSubmit}
                                    disabled={createRequestMutation.isPending || (amountToPay > 0 && (!files || files.length === 0))}
                                    className="flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    {createRequestMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                    Confirmar Inversión
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};
