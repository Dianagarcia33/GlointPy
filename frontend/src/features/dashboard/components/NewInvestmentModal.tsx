import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
    X, 
    TrendingUp, 
    Calendar, 
    ChevronRight, 
    Loader2, 
    Info, 
    ChevronLeft, 
    Upload, 
    Wallet, 
    AlertCircle, 
    Trash2, 
    ShieldCheck, 
    Clock, 
    ShieldAlert, 
    Zap, 
    CheckCircle2,
    Sparkles,
    Building2,
    Copy,
    Check,
    Award,
    FileText
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../../services/api';
import { sarlaftService } from '../../../services/sarlaft';
import { compressImage } from '../../../utils/imageCompression';
import { useAuthStore } from '../../../store/authStore';
import { YointPaymentWidget } from '../../../components/payments/YointPaymentWidget';
import { GLOINT_BANK_INFO } from '../../../constants/contactInfo';

interface NewInvestmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentPackageId?: number;
    currentPackageAmount?: number;
    currentPeriodId?: number;
    investorId?: number;
    isUpgrade?: boolean;
}

export const NewInvestmentModal = ({ 
    isOpen, 
    onClose, 
    currentPackageId, 
    currentPackageAmount, 
    currentPeriodId, 
    investorId, 
    isUpgrade = false 
}: NewInvestmentModalProps) => {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    
    // UI State
    const [step, setStep] = useState(1);
    const [selectedPackage, setSelectedPackage] = useState<any>(null);
    const [selectedPeriod, setSelectedPeriod] = useState<any>(null);
    
    // Step 2 State
    const [useWallet, setUseWallet] = useState(false);
    const [walletAmount, setWalletAmount] = useState<number>(0);
    const [paymentChoice, setPaymentChoice] = useState<'YOINT_ONLINE' | 'MANUAL_VOUCHER'>('YOINT_ONLINE');
    const [autoApproved, setAutoApproved] = useState(false);
    const [createdRequestId, setCreatedRequestId] = useState<number | null>(null);
    const [files, setFiles] = useState<FileList | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [copiedField, setCopiedField] = useState<string | null>(null);

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

    // SARLAFT Compliance Query
    const { data: sarlaftData, isLoading: loadingSarlaft } = useQuery({
        queryKey: ['my_sarlaft_check'],
        queryFn: () => sarlaftService.getMyCheck(),
        enabled: isOpen,
    });

    const sarlaftCheck = sarlaftData?.check;
    const rawStatus = (sarlaftCheck?.status || sarlaftCheck?.tusdatos_status || sarlaftData?.status || 'none').toLowerCase();
    
    // Si no hay verificación o está en proceso -> Pendiente
    const isSarlaftPending = rawStatus === 'none' || rawStatus === 'pending' || rawStatus === 'processing' || rawStatus === 'procesando';
    
    // Si falló o fue clasificado de alto riesgo sin corregir -> Rechazado
    const isSarlaftRejected = !isSarlaftPending && (
        rawStatus === 'failed' || rawStatus === 'error' || (
            sarlaftCheck?.risk_level === 'HIGH' && !(sarlaftCheck as any)?.tusdatos_hallazgos_corregidos
        )
    );

    React.useEffect(() => {
        if (isUpgrade && currentPeriodId && periods) {
            const period = periods.find((p: any) => p.id === currentPeriodId);
            if (period) setSelectedPeriod(period);
        }
    }, [isUpgrade, currentPeriodId, periods, isOpen]);

    const handleCopy = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleFinalClose = () => {
        setStep(1);
        setSelectedPackage(null);
        setSelectedPeriod(null);
        setUseWallet(false);
        setWalletAmount(0);
        setFiles(null);
        setSubmitError(null);
        setCreatedRequestId(null);
        setAutoApproved(false);
        setPaymentChoice('YOINT_ONLINE');
        onClose();
    };

    const handleCreateRequestForOnlinePayment = async (): Promise<number> => {
        if (!selectedPackage || !selectedPeriod) {
            throw new Error('Debes seleccionar un paquete y un periodo de contrato.');
        }
        if (createdRequestId) {
            return createdRequestId;
        }

        const formData = new FormData();
        formData.append('paquete_inversion_id', selectedPackage.id.toString());
        formData.append('monto', packageAmount.toString());
        formData.append('periodo_contrato', selectedPeriod.id.toString());
        
        if (useWallet && walletAmount > 0) {
            formData.append('monto_billetera_usado', walletAmount.toString());
        }
        if (isUpgrade) {
            formData.append('is_upgrade', 'true');
        }
        if (investorId) {
            formData.append('investor_id', investorId.toString());
        }

        const res = await fetchApi('/investments/requests', {
            method: 'POST',
            body: formData,
        });

        if (!res || !res.id) {
            throw new Error(res?.detail || 'No se pudo crear la solicitud de inversión previa al pago.');
        }

        setCreatedRequestId(res.id);
        return res.id;
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

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('es-CO', { 
            style: 'currency', 
            currency: 'COP', 
            maximumFractionDigits: 0 
        }).format(val || 0);
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
        : monthlyYield / 30;
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-100 font-montserrat">
                
                {/* Header */}
                <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-white">
                    <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center border border-brand-100 shadow-2xs">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight font-montserrat">
                                {isSarlaftPending
                                    ? 'Validación de Identidad'
                                    : isSarlaftRejected
                                    ? 'Verificación de Seguridad'
                                    : isUpgrade ? 'Aumento de Capital' : 'Nueva Inversión'}
                            </h2>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                                {isSarlaftPending
                                    ? 'Cumplimiento normativo y validación automática de identidad'
                                    : isSarlaftRejected
                                    ? 'Estado de la cuenta para solicitudes de inversión'
                                    : step === 1 
                                    ? 'Selecciona tu paquete de inversión y plazo de contrato' 
                                    : step === 2 
                                    ? 'Elige tu medio de pago y confirma tu solicitud' 
                                    : 'Confirmación y activación de tu contrato'}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={step === 3 ? handleFinalClose : onClose} 
                        className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Step Progress Bar */}
                {step !== 3 && !isSarlaftPending && !isSarlaftRejected && !loadingSarlaft && (
                    <div className="px-6 sm:px-8 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs font-bold font-montserrat">
                        <div className={`flex items-center gap-2 ${step >= 1 ? 'text-brand-600' : 'text-slate-400'}`}>
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                                step > 1 ? 'bg-brand-500 text-white shadow-2xs' : 'bg-brand-100 text-brand-700 border border-brand-200'
                            }`}>
                                {step > 1 ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '1'}
                            </span>
                            <span className="hidden sm:inline">1. Paquete y Plazo</span>
                            <span className="sm:hidden">1. Plan</span>
                        </div>

                        <div className="h-0.5 flex-1 mx-3 bg-slate-200 relative overflow-hidden rounded-full">
                            <div className={`h-full bg-brand-500 transition-all duration-300 ${step >= 2 ? 'w-full' : 'w-0'}`} />
                        </div>

                        <div className={`flex items-center gap-2 ${step >= 2 ? 'text-brand-600' : 'text-slate-400'}`}>
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                                step > 2 ? 'bg-brand-500 text-white shadow-2xs' : step === 2 ? 'bg-brand-100 text-brand-700 border border-brand-200' : 'bg-slate-200 text-slate-500'
                            }`}>
                                {step > 2 ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '2'}
                            </span>
                            <span className="hidden sm:inline">2. Método de Pago</span>
                            <span className="sm:hidden">2. Pago</span>
                        </div>

                        <div className="h-0.5 flex-1 mx-3 bg-slate-200 relative overflow-hidden rounded-full">
                            <div className={`h-full bg-brand-500 transition-all duration-300 ${step >= 3 ? 'w-full' : 'w-0'}`} />
                        </div>

                        <div className={`flex items-center gap-2 ${step === 3 ? 'text-emerald-600' : 'text-slate-400'}`}>
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                                step === 3 ? 'bg-emerald-500 text-white shadow-2xs' : 'bg-slate-200 text-slate-500'
                            }`}>
                                3
                            </span>
                            <span className="hidden sm:inline">3. Confirmación</span>
                            <span className="sm:hidden">3. Listo</span>
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="p-5 sm:p-7 overflow-y-auto custom-scrollbar flex-1">
                    {loadingSarlaft ? (
                        <div className="py-16 flex flex-col items-center justify-center space-y-3">
                            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                            <p className="text-sm font-semibold text-slate-500">Verificando cumplimiento normativo SARLAFT...</p>
                        </div>
                    ) : isSarlaftPending ? (
                        <div className="py-8 px-4 text-center space-y-5 animate-in fade-in duration-200">
                            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-3xl mx-auto flex items-center justify-center shadow-inner">
                                <Clock className="w-8 h-8 animate-pulse" />
                            </div>
                            <div className="space-y-2 max-w-md mx-auto">
                                <h3 className="text-lg font-bold text-slate-900 font-montserrat">Validación de Identidad en Proceso</h3>
                                <p className="text-sm text-slate-600">
                                    Tu cuenta se encuentra en proceso de validación automática de antecedentes y listas restrictivas con Tusdatos.co.
                                </p>
                                <div className="text-xs text-amber-800 bg-amber-50 p-4 rounded-2xl border border-amber-200 text-left space-y-1 mt-3">
                                    <p className="font-bold flex items-center gap-1.5 text-amber-900">
                                        <span>⏳</span> Cumplimiento SARLAFT / SAGRILAFT
                                    </p>
                                    <p className="text-amber-700 leading-relaxed">
                                        Por disposiciones legales y normativas, las solicitudes de inversión sólo pueden realizarse una vez tu verificación de identidad haya finalizado satisfactoriamente.
                                    </p>
                                </div>
                            </div>
                            <div className="pt-2">
                                <button 
                                    onClick={handleFinalClose} 
                                    className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
                                >
                                    Entendido
                                </button>
                            </div>
                        </div>
                    ) : isSarlaftRejected ? (
                        <div className="py-8 px-4 text-center space-y-5 animate-in fade-in duration-200">
                            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-3xl mx-auto flex items-center justify-center shadow-inner">
                                <ShieldAlert className="w-8 h-8" />
                            </div>
                            <div className="space-y-2 max-w-md mx-auto">
                                <h3 className="text-lg font-bold text-slate-900 font-montserrat">Cuenta No Habilitada para Inversiones</h3>
                                <p className="text-sm text-slate-600">
                                    Tu validación SARLAFT fue rechazada o presentó alertas de alto riesgo en listas restrictivas y antecedentes normativos.
                                </p>
                                <div className="text-xs text-rose-800 bg-rose-50 p-4 rounded-2xl border border-rose-200 text-left space-y-1 mt-3">
                                    <p className="font-bold flex items-center gap-1.5 text-rose-900">
                                        <span>🛡️</span> Revisión de Cumplimiento Requerida
                                    </p>
                                    <p className="text-rose-700 leading-relaxed">
                                        Por seguridad y políticas regulatorias, no es posible generar solicitudes de inversión. Tu expediente debe ser evaluado manualmente por un oficial de cumplimiento.
                                    </p>
                                </div>
                            </div>
                            <div className="pt-2 flex justify-center gap-3">
                                <button 
                                    onClick={handleFinalClose} 
                                    className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-200 transition-colors cursor-pointer"
                                >
                                    Cerrar
                                </button>
                                <button 
                                    onClick={() => { handleFinalClose(); window.location.href = '/dashboard/tickets'; }} 
                                    className="px-6 py-2.5 bg-brand-600 text-white rounded-xl font-bold text-xs hover:bg-brand-700 transition-colors shadow-sm cursor-pointer"
                                >
                                    Contactar a Soporte
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* PASO 1: SELECCIÓN DE PAQUETE Y PERIODO */}
                            {step === 1 && (
                                <div className="space-y-6 animate-in fade-in duration-200">
                                    
                                    {/* 1. Selector de Paquete */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                                <span className="w-5 h-5 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center text-[11px] font-black">1</span>
                                                <span>Selecciona tu Paquete de Inversión</span>
                                            </label>
                                            {loadingPackages && (
                                                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                                    <Loader2 className="w-3.5 h-3.5 text-brand-500 animate-spin" />
                                                    <span>Cargando paquetes...</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                                            {packages?.filter((pkg: any) => !isUpgrade || getPackageAmount(pkg) > currentPackageValue).map((pkg: any) => {
                                                const val = getPackageAmount(pkg);
                                                const isSelected = selectedPackage?.id === pkg.id;
                                                return (
                                                    <button
                                                        key={pkg.id}
                                                        type="button"
                                                        onClick={() => setSelectedPackage(pkg)}
                                                        className={`p-3.5 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer flex flex-col justify-between gap-2 relative ${
                                                            isSelected 
                                                                ? 'border-brand-500 bg-brand-50/50 ring-2 ring-brand-500/20 shadow-xs' 
                                                                : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/60'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between gap-1 w-full">
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                                {val >= 1000000 ? `${(val / 1000000).toLocaleString('es-CO')}M` : `${(val / 1000).toLocaleString('es-CO')}K`} COP
                                                            </span>
                                                            {pkg.granted_shares > 0 && (
                                                                <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-0.5">
                                                                    <Award className="w-2.5 h-2.5 text-amber-600" />
                                                                    +{pkg.granted_shares}
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div>
                                                            <div className="text-sm sm:text-base font-black text-slate-900 font-montserrat tracking-tight leading-none">
                                                                {formatCurrency(val)}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-slate-100 w-full">
                                                            <span className={`font-semibold ${isSelected ? 'text-brand-600 font-bold' : 'text-slate-400'}`}>
                                                                {isSelected ? 'Seleccionado' : 'Elegir'}
                                                            </span>
                                                            <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-all ${
                                                                isSelected ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-300 bg-white'
                                                            }`}>
                                                                {isSelected && <Check className="w-2 h-2 stroke-[3]" />}
                                                            </div>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* 2. Selector de Periodo */}
                                    <div className="space-y-3 pt-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                                <span className="w-5 h-5 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-[11px] font-black">2</span>
                                                <span>Elige el Plazo del Contrato</span>
                                            </label>
                                            {loadingPeriods && (
                                                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                                    <Loader2 className="w-3.5 h-3.5 text-emerald-500 animate-spin" />
                                                    <span>Cargando periodos...</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            {periods?.filter((period: any) => !isUpgrade || period.id === currentPeriodId).map((period: any) => {
                                                const isSelected = selectedPeriod?.id === period.id;
                                                return (
                                                    <button
                                                        key={period.id}
                                                        type="button"
                                                        disabled={isUpgrade}
                                                        onClick={() => {
                                                            if (!isUpgrade) setSelectedPeriod(period);
                                                        }}
                                                        className={`p-4 rounded-2xl border-2 text-left transition-all duration-200 flex flex-col justify-between gap-3 ${
                                                            isUpgrade ? 'opacity-80 cursor-default' : 'cursor-pointer'
                                                        } ${
                                                            isSelected 
                                                                ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20 shadow-xs' 
                                                                : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/60'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-1.5">
                                                                <Calendar className={`w-4 h-4 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
                                                                <span className="text-sm font-extrabold text-slate-900 font-montserrat">
                                                                    {period.months} Meses
                                                                </span>
                                                            </div>
                                                            {period.months === 12 && (
                                                                <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                                                                    Popular
                                                                </span>
                                                            )}
                                                            {period.months === 18 && (
                                                                <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 uppercase tracking-wider">
                                                                    Máximo
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="flex items-baseline gap-1.5">
                                                            <span className="text-2xl font-black text-emerald-700 font-montserrat">
                                                                {period.percentage}%
                                                            </span>
                                                            <span className="text-xs font-bold text-emerald-600">mensual</span>
                                                        </div>

                                                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-100">
                                                            <span>Plazo: {period.days} días</span>
                                                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                                                                isSelected ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 bg-white'
                                                            }`}>
                                                                {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                                            </div>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* 3. Resumen Proyectado de Inversión */}
                                    {selectedPackage && selectedPeriod && (
                                        <div className="rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs bg-white animate-in fade-in duration-200">
                                            {/* Tarjeta Hero oscura con rentabilidad */}
                                            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-5 sm:p-6 relative overflow-hidden">
                                                <div className="absolute -right-8 -top-8 w-32 h-32 bg-brand-500/10 rounded-full blur-2xl pointer-events-none"></div>
                                                
                                                <div className="flex flex-wrap items-center justify-between gap-2 mb-3 relative z-10">
                                                    <span className="text-xs font-extrabold text-brand-400 uppercase tracking-widest flex items-center gap-1.5 font-montserrat">
                                                        <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                                                        Proyección de Rentabilidad Oficial
                                                    </span>
                                                    <span className="text-xs font-mono font-bold bg-white/10 px-2.5 py-0.5 rounded-full text-slate-200 border border-white/10">
                                                        {selectedPeriod.months} Meses al {selectedPeriod.percentage}% mes
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10 pt-1">
                                                    <div>
                                                        <span className="text-xs text-slate-400 block font-medium">Capital Base Invertido</span>
                                                        <span className="text-2xl sm:text-3xl font-black text-white font-montserrat">
                                                            {formatCurrency(packageAmount)}
                                                        </span>
                                                    </div>
                                                    <div className="sm:text-right">
                                                        <span className="text-xs text-emerald-400 block font-medium">Retorno Total Proyectado</span>
                                                        <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-montserrat">
                                                            {formatCurrency(totalReturn)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Métricas detalladas */}
                                            <div className="p-4 sm:p-5 bg-slate-50/70 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center border-t border-slate-100">
                                                <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rendimiento Mes</span>
                                                    <span className="text-xs sm:text-sm font-extrabold text-emerald-600 block mt-0.5">
                                                        +{formatCurrency(monthlyYield)}
                                                    </span>
                                                </div>
                                                <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rendimiento Día</span>
                                                    <span className="text-xs sm:text-sm font-extrabold text-emerald-600 block mt-0.5">
                                                        +{formatCurrency(dailyYield)}
                                                    </span>
                                                </div>
                                                <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ganancia Neta</span>
                                                    <span className="text-xs sm:text-sm font-black text-slate-800 block mt-0.5">
                                                        +{formatCurrency(estimatedYield)}
                                                    </span>
                                                </div>
                                                <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Acciones Otorgadas</span>
                                                    <span className="text-xs sm:text-sm font-extrabold text-brand-600 block mt-0.5">
                                                        {selectedPackage.granted_shares || 0} acciones
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* PASO 2: FORMA DE PAGO */}
                            {step === 2 && (
                                <div className="space-y-5 animate-in fade-in duration-200">
                                    
                                    {/* Resumen del Monto a Pagar */}
                                    <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-2.5">
                                        <div className="flex justify-between items-center text-xs text-slate-500">
                                            <span>Paquete Seleccionado:</span>
                                            <span className="font-bold text-slate-800 font-montserrat">{formatCurrency(packageAmount)}</span>
                                        </div>

                                        {isUpgrade && (
                                            <>
                                                <div className="flex justify-between items-center text-xs text-slate-500">
                                                    <span>Paquete Actual:</span>
                                                    <span className="font-semibold text-slate-700">{formatCurrency(currentPackageValue)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-xs font-bold text-slate-800 border-t border-slate-200/60 pt-2">
                                                    <span>Diferencia por Aumento:</span>
                                                    <span className="font-black text-slate-900">{formatCurrency(upgradeDifference)}</span>
                                                </div>
                                            </>
                                        )}

                                        {useWallet && walletAmount > 0 && (
                                            <div className="flex justify-between items-center text-xs text-brand-600 font-bold border-t border-slate-200/60 pt-2">
                                                <span>Abono con Saldo de Billetera:</span>
                                                <span>-{formatCurrency(walletAmount)}</span>
                                            </div>
                                        )}

                                        <div className="flex justify-between items-center text-sm sm:text-base border-t border-slate-200 pt-2.5 mt-2">
                                            <span className="text-slate-800 font-extrabold font-montserrat">Total a Pagar / Transferir:</span>
                                            <span className={`font-black text-lg sm:text-xl font-montserrat ${amountToPay === 0 ? 'text-emerald-600' : 'text-brand-600'}`}>
                                                {formatCurrency(amountToPay)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Usar saldo de Billetera */}
                                    {wallet && wallet.balance > 0 && (
                                        <div className="bg-white border-2 border-slate-100 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center border border-brand-100">
                                                        <Wallet className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-xs sm:text-sm text-slate-800 font-montserrat">Usar Saldo de Billetera</h4>
                                                        <p className="text-[11px] text-slate-500">
                                                            Disponible: <strong className="text-slate-700">{formatCurrency(wallet.balance)}</strong>
                                                        </p>
                                                    </div>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input 
                                                        type="checkbox" 
                                                        className="sr-only peer" 
                                                        checked={useWallet}
                                                        onChange={(e) => {
                                                            setUseWallet(e.target.checked);
                                                            setWalletAmount(e.target.checked ? maxWalletAllowed : 0);
                                                        }}
                                                    />
                                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
                                                </label>
                                            </div>
                                            
                                            {useWallet && (
                                                <div className="space-y-2 pt-2 border-t border-slate-100 animate-in fade-in duration-150">
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span className="text-slate-500">Monto a descontar de billetera:</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setWalletAmount(maxWalletAllowed)}
                                                            className="text-brand-600 font-bold hover:underline cursor-pointer text-[11px]"
                                                        >
                                                            Usar máximo ({formatCurrency(maxWalletAllowed)})
                                                        </button>
                                                    </div>
                                                    <div className="relative">
                                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold font-mono text-xs">
                                                            $
                                                        </span>
                                                        <input 
                                                            type="number"
                                                            min="0"
                                                            max={maxWalletAllowed}
                                                            value={walletAmount || ''}
                                                            onChange={(e) => {
                                                                const val = parseFloat(e.target.value) || 0;
                                                                setWalletAmount(Math.min(val, maxWalletAllowed));
                                                            }}
                                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-8 pr-4 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-mono"
                                                            placeholder="0"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Selector de Modo de Pago (En Línea vs Manual) */}
                                    {amountToPay > 0 && (
                                        <div className="space-y-3">
                                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                                                Selecciona cómo pagar los {formatCurrency(amountToPay)}:
                                            </label>

                                            <div className="grid grid-cols-2 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80">
                                                <button
                                                    type="button"
                                                    onClick={() => { setPaymentChoice('YOINT_ONLINE'); setSubmitError(null); }}
                                                    className={`flex items-center justify-center gap-1.5 sm:gap-2 py-3 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer font-montserrat ${
                                                        paymentChoice === 'YOINT_ONLINE'
                                                            ? 'bg-white text-brand-600 shadow-sm'
                                                            : 'text-slate-500 hover:text-slate-800'
                                                    }`}
                                                >
                                                    <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                                                    <span>Pago en Línea</span>
                                                    <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider hidden sm:inline">
                                                        Inmediato
                                                    </span>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => { setPaymentChoice('MANUAL_VOUCHER'); setSubmitError(null); }}
                                                    className={`flex items-center justify-center gap-1.5 sm:gap-2 py-3 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer font-montserrat ${
                                                        paymentChoice === 'MANUAL_VOUCHER'
                                                            ? 'bg-white text-brand-600 shadow-sm'
                                                            : 'text-slate-500 hover:text-slate-800'
                                                    }`}
                                                >
                                                    <Upload className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                                    <span>Transferencia Manual</span>
                                                    <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider hidden sm:inline">
                                                        Comprobante
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Error Alert */}
                                    {submitError && (
                                        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-700 text-xs font-semibold animate-in fade-in duration-200">
                                            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                                            <div className="flex-1 space-y-1">
                                                <p className="font-bold text-xs">Error en la solicitud</p>
                                                <p className="font-normal text-red-600 leading-relaxed text-[11px]">{submitError}</p>
                                            </div>
                                            <button 
                                                type="button" 
                                                onClick={() => setSubmitError(null)}
                                                className="p-1 text-red-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    )}

                                    {/* Contenido según Selección */}
                                    {amountToPay > 0 && paymentChoice === 'YOINT_ONLINE' ? (
                                        <div className="pt-1">
                                            <YointPaymentWidget
                                                amount={amountToPay}
                                                payinType="INVESTMENT_REQUEST"
                                                userPhone={user?.phone_number || ''}
                                                submitButtonText="Pagar Inversión en Línea"
                                                onRequestCreate={handleCreateRequestForOnlinePayment}
                                                onSuccess={(statusRes) => {
                                                    setAutoApproved(statusRes.investment_approved || statusRes.status === 'SUCCESS');
                                                    queryClient.invalidateQueries({ queryKey: ['my_investments'] });
                                                    queryClient.invalidateQueries({ queryKey: ['wallet'] });
                                                    setStep(3);
                                                }}
                                                onFailed={(_statusRes, errMsg) => {
                                                    setSubmitError(errMsg || 'El pago de la inversión no fue aprobado por la pasarela.');
                                                }}
                                            />
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {/* Datos Bancarios Oficiales si hay saldo a transferir */}
                                            {amountToPay > 0 && (
                                                <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-3 font-montserrat">
                                                    <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center border border-brand-100">
                                                                <Building2 className="w-4 h-4 text-brand-600" />
                                                            </div>
                                                            <div>
                                                                <span className="text-xs font-bold text-slate-900 block">
                                                                    Cuenta Bancaria Oficial de Gloint
                                                                </span>
                                                                <span className="text-[10px] text-slate-500 font-medium block">
                                                                    Transfiere a esta cuenta y adjunta el comprobante
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <span className="text-[11px] font-bold text-brand-700 bg-brand-50 border border-brand-200/70 px-2.5 py-0.5 rounded-full shadow-2xs">
                                                            {GLOINT_BANK_INFO.bank}
                                                        </span>
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                                                        <div>
                                                            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">Titular</span>
                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                <span className="font-bold text-slate-800 text-xs leading-tight">{GLOINT_BANK_INFO.holder}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleCopy(GLOINT_BANK_INFO.holder, 'holder')}
                                                                    className="text-slate-400 hover:text-brand-600 transition-colors p-1 shrink-0"
                                                                    title="Copiar Titular"
                                                                >
                                                                    {copiedField === 'holder' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">NIT</span>
                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                <span className="font-bold text-slate-800 font-mono text-xs">{GLOINT_BANK_INFO.nit}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleCopy(GLOINT_BANK_INFO.nit, 'nit')}
                                                                    className="text-slate-400 hover:text-brand-600 transition-colors p-1 shrink-0"
                                                                    title="Copiar NIT"
                                                                >
                                                                    {copiedField === 'nit' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">Tipo de Cuenta</span>
                                                            <span className="font-bold text-slate-800 text-xs block mt-0.5">{GLOINT_BANK_INFO.accountType}</span>
                                                        </div>

                                                        <div>
                                                            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">Número de Cuenta</span>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className="font-mono font-bold text-sm text-slate-900 bg-white border border-slate-300/80 px-2.5 py-1 rounded-xl shadow-2xs select-all">
                                                                    {GLOINT_BANK_INFO.accountNumber}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleCopy(GLOINT_BANK_INFO.accountNumber, 'acc')}
                                                                    className="text-slate-400 hover:text-brand-600 transition-colors p-1.5 bg-white border border-slate-200 rounded-lg hover:border-brand-300 shadow-2xs cursor-pointer"
                                                                    title="Copiar Número de Cuenta"
                                                                >
                                                                    {copiedField === 'acc' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Adjuntar Comprobantes */}
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5">
                                                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                                                        <span>Comprobante de Pago Bancario</span>
                                                    </div>
                                                    {amountToPay === 0 && (
                                                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                                            100% Cubierto con Billetera (Opcional)
                                                        </span>
                                                    )}
                                                </label>

                                                {amountToPay === 0 ? (
                                                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs font-semibold">
                                                        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                                                        <div>
                                                            <p className="font-bold text-xs text-emerald-900">¡Valor 100% cubierto con tu Billetera!</p>
                                                            <p className="font-normal text-emerald-700 mt-0.5 text-[11px]">Los fondos se debitarán directamente de tu saldo. No requieres adjuntar soporte.</p>
                                                        </div>
                                                    </div>
                                                ) : null}

                                                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-brand-400 transition-colors bg-slate-50/70">
                                                    <input 
                                                        type="file" 
                                                        id="comprobantes" 
                                                        multiple
                                                        accept="image/*,.pdf"
                                                        className="hidden"
                                                        onChange={(e) => handleFilesSelected(e.target.files)}
                                                    />
                                                    <label htmlFor="comprobantes" className="cursor-pointer flex flex-col items-center">
                                                        <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-2xs mb-2">
                                                            <Upload className="w-6 h-6 text-brand-500" />
                                                        </div>
                                                        <span className="text-xs font-bold text-slate-700 font-montserrat">
                                                            {amountToPay === 0 ? 'Adjuntar soporte voluntario (opcional)' : 'Haz clic para subir o arrastra tu comprobante'}
                                                        </span>
                                                        <span className="text-[11px] text-slate-400 mt-1">Imágenes (PNG, JPG, WEBP) o PDF • <strong>Máx. 10 MB</strong></span>
                                                    </label>
                                                    
                                                    {files && files.length > 0 && (
                                                        <div className="mt-4 pt-4 border-t border-slate-200 text-left space-y-2">
                                                            <div className="flex items-center justify-between">
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Archivos seleccionados:</p>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setFiles(null);
                                                                        const inputEl = document.getElementById('comprobantes') as HTMLInputElement;
                                                                        if (inputEl) inputEl.value = '';
                                                                    }}
                                                                    className="text-[11px] text-rose-500 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer"
                                                                >
                                                                    <Trash2 className="w-3 h-3" />
                                                                    Quitar
                                                                </button>
                                                            </div>
                                                            {Array.from(files).map((file, i) => (
                                                                <div key={i} className="text-xs text-slate-700 flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200">
                                                                    <div className="w-2 h-2 rounded-full bg-brand-500"></div>
                                                                    <span className="truncate flex-1 font-medium">{file.name}</span>
                                                                    <span className="text-[10px] font-mono text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="bg-blue-50/80 border border-blue-100 p-3.5 rounded-2xl flex gap-2.5 text-blue-700">
                                                <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                                                <p className="text-[11px] leading-relaxed">
                                                    Al enviar tu comprobante manual, el equipo administrativo validará la transferencia bancaria en horario hábil para activar tu contrato.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* PASO 3: CONFIRMACIÓN EXITOSA */}
                            {step === 3 && (
                                <div className="flex flex-col items-center justify-center py-8 px-4 text-center animate-in fade-in duration-200 space-y-4">
                                    {autoApproved ? (
                                        <>
                                            <div className="w-20 h-20 bg-emerald-100 rounded-3xl flex items-center justify-center mb-2 border-4 border-emerald-50 text-emerald-600 shadow-md animate-bounce">
                                                <CheckCircle2 className="w-10 h-10" />
                                            </div>
                                            <div className="space-y-2">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-full inline-block">
                                                    Aprobación Inmediata Confirmada
                                                </span>
                                                <h3 className="text-2xl font-black text-slate-900 font-montserrat">¡Inversión Aprobada y Activa!</h3>
                                                <p className="text-slate-600 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
                                                    Tu pago en línea fue validado y confirmado exitosamente. Tu contrato de inversión y rentabilidad ya se encuentran activos en tu panel.
                                                </p>
                                            </div>
                                            <button 
                                                onClick={handleFinalClose}
                                                className="mt-6 px-8 py-3 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-bold rounded-2xl shadow-md shadow-brand-500/25 transition-all cursor-pointer font-montserrat text-xs"
                                            >
                                                Ver Mis Inversiones
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-20 h-20 bg-brand-50 rounded-3xl flex items-center justify-center mb-2 border-4 border-brand-100 text-brand-600 shadow-md">
                                                <Clock className="w-10 h-10 text-brand-600 animate-pulse" />
                                            </div>
                                            <div className="space-y-2">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-brand-800 bg-brand-100 border border-brand-200 px-3 py-1 rounded-full inline-block">
                                                    Solicitud Radicada
                                                </span>
                                                <h3 className="text-2xl font-black text-slate-900 font-montserrat">¡Solicitud de Inversión Recibida!</h3>
                                                <p className="text-slate-600 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
                                                    Hemos recibido tu solicitud de inversión junto con los soportes de pago. Nuestro equipo administrativo la validará en breve y te notificaremos cuando tu contrato esté activo.
                                                </p>
                                            </div>
                                            <button 
                                                onClick={handleFinalClose}
                                                className="mt-6 px-8 py-3 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-bold rounded-2xl shadow-md shadow-brand-500/25 transition-all cursor-pointer font-montserrat text-xs"
                                            >
                                                Entendido
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer Buttons */}
                {step !== 3 && !isSarlaftPending && !isSarlaftRejected && !loadingSarlaft && (
                    <div className="px-6 sm:px-8 py-4 border-t border-slate-100 bg-white flex justify-between items-center gap-3">
                        {step === 1 ? (
                            <div className="w-full flex justify-between items-center">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2.5 rounded-xl font-bold text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setStep(2)}
                                    disabled={!selectedPackage || !selectedPeriod}
                                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-bold rounded-2xl shadow-md shadow-brand-500/25 hover:shadow-lg hover:shadow-brand-500/35 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer font-montserrat text-xs active:scale-95"
                                >
                                    <span>Continuar a Pago</span>
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="w-full flex justify-between items-center">
                                <button 
                                    type="button"
                                    onClick={() => setStep(1)}
                                    disabled={createRequestMutation.isPending}
                                    className="flex items-center gap-1.5 px-4 py-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    <span>Cambiar Paquete</span>
                                </button>
                                {(amountToPay === 0 || paymentChoice === 'MANUAL_VOUCHER') && (
                                    <button 
                                        type="button"
                                        onClick={handleSubmit}
                                        disabled={createRequestMutation.isPending || (amountToPay > 0 && (!files || files.length === 0))}
                                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-bold rounded-2xl shadow-md shadow-brand-500/25 hover:shadow-lg hover:shadow-brand-500/35 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer font-montserrat text-xs active:scale-95"
                                    >
                                        {createRequestMutation.isPending ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <ShieldCheck className="w-4 h-4 text-emerald-200" />
                                        )}
                                        <span>Confirmar Inversión</span>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};
