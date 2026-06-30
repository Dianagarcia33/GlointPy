import React, { useState } from 'react';
import { X, TrendingUp, Calendar, ChevronRight, Loader2, Info } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../../../services/api';

interface NewInvestmentModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const NewInvestmentModal = ({ isOpen, onClose }: NewInvestmentModalProps) => {
    const [selectedPackage, setSelectedPackage] = useState<any>(null);
    const [selectedPeriod, setSelectedPeriod] = useState<any>(null);
    const [step, setStep] = useState(1);

    const { data: packages, isLoading: loadingPackages } = useQuery({
        queryKey: ['investment_packages'],
        queryFn: () => fetchApi('/investments/packages'),
        enabled: isOpen,
    });

    const { data: periods, isLoading: loadingPeriods } = useQuery({
        queryKey: ['contract_periods'],
        queryFn: () => fetchApi('/contract-periods'),
        enabled: isOpen,
    });

    if (!isOpen) return null;

    const handleNext = () => {
        if (step === 1 && selectedPackage && selectedPeriod) {
            setStep(2);
        }
    };

    // Calculate amounts dynamically based on Package name and Period
    const getPackageAmount = (pkg: any) => {
        if (!pkg || !pkg.paquete_accion_adquirido) return 0;
        // Extracts the first continuous number from the string (e.g. "Plan 1000" -> 1000, "$ 50.5" -> 50.5)
        const match = pkg.paquete_accion_adquirido.match(/[\d,.]+/);
        if (!match) return 0;
        // Parse the number, handling commas/dots properly if needed.
        // Assuming standard format like "1000", "5000", etc.
        const numStr = match[0].replace(/,/g, '');
        return parseFloat(numStr) || 0;
    };

    const packageAmount = getPackageAmount(selectedPackage);
    const monthlyYield = selectedPeriod ? packageAmount * (selectedPeriod.percentage / 100) : 0;
    const estimatedYield = selectedPeriod ? monthlyYield * selectedPeriod.months : 0;
    const dailyYield = selectedPeriod && selectedPeriod.days > 0 
        ? estimatedYield / selectedPeriod.days 
        : monthlyYield / 30; // Fallback
    const totalReturn = packageAmount + estimatedYield;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Nueva Inversión</h2>
                        <p className="text-xs text-slate-500 mt-1">Configura tu plan y descubre tu rentabilidad</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    <div className="space-y-8">
                        
                        {/* Step 1: Configuration */}
                        {step === 1 && (
                            <div className="space-y-6 animate-fadeIn">
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
                                        {packages?.map((pkg: any) => (
                                            <option key={pkg.id} value={pkg.id}>
                                                {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(getPackageAmount(pkg))} ({pkg.acciones_otorgadas} Acciones)
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
                                        className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl py-3 px-4 text-slate-700 font-semibold focus:outline-none focus:border-emerald-500 transition-all appearance-none"
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
                                                {period.months} Meses ({period.percentage}% Rendimiento)
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                
                                {/* Live breakdown preview in Step 1 */}
                                {selectedPackage && selectedPeriod && (
                                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 mt-4 space-y-2 animate-fadeIn">
                                        <div className="flex justify-between text-xs text-emerald-800">
                                            <span>Rendimiento Diario:</span>
                                            <span className="font-bold">+{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(dailyYield)}</span>
                                        </div>
                                        <div className="flex justify-between text-xs text-emerald-800">
                                            <span>Rendimiento Mensual:</span>
                                            <span className="font-bold">+{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(monthlyYield)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm text-emerald-900 border-t border-emerald-100 pt-2 mt-1">
                                            <span className="font-semibold">Rendimiento Total:</span>
                                            <span className="font-bold">+{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(estimatedYield)}</span>
                                        </div>
                                    </div>
                                )}
                                </div>
                            )}

                            {/* Step 2: Summary & Upload */}
                            {step === 2 && (
                                <div className="space-y-6 animate-fadeIn">
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
                                                    +{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(dailyYield)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-emerald-600 font-medium">Rendimiento Mensual Estimado</span>
                                                <span className="font-bold text-emerald-600">
                                                    +{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(monthlyYield)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm pt-2">
                                                <span className="text-emerald-600 font-bold">Rendimiento Total ({selectedPeriod?.months} Meses)</span>
                                                <span className="font-black text-emerald-600">
                                                    +{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(estimatedYield)}
                                                </span>
                                            </div>
                                            <div className="bg-slate-800 text-white p-4 rounded-xl flex justify-between items-center mt-4 shadow-inner">
                                                <span className="text-sm font-semibold uppercase tracking-wider text-slate-300">Total Esperado</span>
                                                <span className="text-xl font-black">
                                                    {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(totalReturn)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3">
                                        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                                        <p className="text-xs text-blue-700 leading-relaxed">
                                            Para completar tu inversión, deberás cargar el comprobante de pago en el siguiente paso. 
                                            Verifica que los datos sean correctos.
                                        </p>
                                    </div>
                                </div>
                            )}

                        </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-between items-center">
                    {step === 1 ? (
                        <div className="flex items-center gap-2">
                            <TrendingUp className={`w-5 h-5 ${packageAmount > 0 && selectedPeriod ? 'text-emerald-500' : 'text-slate-300'}`} />
                            <div>
                                <p className="text-[10px] uppercase font-bold text-slate-400">Rendimiento Proyectado</p>
                                <p className={`font-black ${packageAmount > 0 && selectedPeriod ? 'text-emerald-600' : 'text-slate-400'}`}>
                                    +{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(estimatedYield)}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <button 
                            onClick={() => setStep(1)}
                            className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                            Atrás
                        </button>
                    )}

                    <button 
                        onClick={step === 1 ? handleNext : () => console.log("Submit!")}
                        disabled={step === 1 && (!selectedPackage || !selectedPeriod)}
                        className="flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all ml-auto"
                    >
                        {step === 1 ? 'Continuar' : 'Confirmar Inversión'}
                        {step === 1 && <ChevronRight className="w-4 h-4" />}
                    </button>
                </div>

            </div>
        </div>
    );
};
