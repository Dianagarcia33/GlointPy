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
    const [amount, setAmount] = useState<string>('');
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

    const numAmount = parseFloat(amount.replace(/[^0-9.-]+/g,"")) || 0;
    const estimatedYield = selectedPeriod ? numAmount * (selectedPeriod.percentage / 100) : 0;
    const totalReturn = numAmount + estimatedYield;

    const handleNext = () => {
        if (step === 1 && selectedPackage && selectedPeriod && numAmount > 0) {
            setStep(2);
        }
    };

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
                    {loadingPackages || loadingPeriods ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="w-10 h-10 text-brand-500 animate-spin mb-4" />
                            <p className="text-sm font-semibold text-slate-500">Cargando opciones...</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            
                            {/* Step 1: Configuration */}
                            {step === 1 && (
                                <div className="space-y-8 animate-fadeIn">
                                    {/* Packages */}
                                    <div>
                                        <label className="text-sm font-bold text-slate-700 uppercase tracking-widest mb-3 block">1. Selecciona tu Paquete</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {packages?.map((pkg: any) => (
                                                <div 
                                                    key={pkg.id}
                                                    onClick={() => setSelectedPackage(pkg)}
                                                    className={`cursor-pointer border-2 rounded-2xl p-4 transition-all duration-200 ${
                                                        selectedPackage?.id === pkg.id 
                                                            ? 'border-brand-500 bg-brand-50 shadow-md shadow-brand-500/10' 
                                                            : 'border-slate-200 hover:border-brand-300 bg-white'
                                                    }`}
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h3 className={`font-bold ${selectedPackage?.id === pkg.id ? 'text-brand-700' : 'text-slate-700'}`}>
                                                            {pkg.paquete_accion_adquirido}
                                                        </h3>
                                                        <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded uppercase">
                                                            {pkg.acciones_otorgadas} Acciones
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Periods */}
                                    <div>
                                        <label className="text-sm font-bold text-slate-700 uppercase tracking-widest mb-3 block">2. Elige el Plazo</label>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            {periods?.map((period: any) => (
                                                <div 
                                                    key={period.id}
                                                    onClick={() => setSelectedPeriod(period)}
                                                    className={`cursor-pointer border-2 rounded-2xl p-3 text-center transition-all duration-200 ${
                                                        selectedPeriod?.id === period.id 
                                                            ? 'border-emerald-500 bg-emerald-50 shadow-md shadow-emerald-500/10' 
                                                            : 'border-slate-200 hover:border-emerald-300 bg-white'
                                                    }`}
                                                >
                                                    <div className={`text-xl font-black mb-1 ${selectedPeriod?.id === period.id ? 'text-emerald-700' : 'text-slate-700'}`}>
                                                        {period.months} <span className="text-xs font-semibold">Meses</span>
                                                    </div>
                                                    <div className={`text-xs font-bold ${selectedPeriod?.id === period.id ? 'text-emerald-600' : 'text-slate-500'}`}>
                                                        {period.percentage}% Rendimiento
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Amount */}
                                    <div>
                                        <label className="text-sm font-bold text-slate-700 uppercase tracking-widest mb-3 block">3. Monto a Invertir</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400">$</span>
                                            <input 
                                                type="text" 
                                                value={amount}
                                                onChange={(e) => {
                                                    // Format as currency while typing
                                                    const val = e.target.value.replace(/[^0-9]/g, "");
                                                    if(val) {
                                                        const num = parseInt(val, 10);
                                                        setAmount(new Intl.NumberFormat('es-CO').format(num));
                                                    } else {
                                                        setAmount('');
                                                    }
                                                }}
                                                placeholder="0"
                                                className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl py-4 pl-10 pr-4 text-2xl font-black text-slate-800 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
                                            />
                                        </div>
                                    </div>

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
                                                <span className="font-bold text-slate-800">{selectedPackage?.paquete_accion_adquirido}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500">Plazo</span>
                                                <span className="font-bold text-slate-800">{selectedPeriod?.months} Meses ({selectedPeriod?.percentage}%)</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500">Capital Inicial</span>
                                                <span className="font-bold text-slate-800">${new Intl.NumberFormat('es-CO').format(numAmount)}</span>
                                            </div>
                                            <div className="border-t border-slate-200 my-2 pt-2 flex justify-between text-sm">
                                                <span className="text-emerald-600 font-bold">Rendimiento Proyectado</span>
                                                <span className="font-bold text-emerald-600">+${new Intl.NumberFormat('es-CO').format(estimatedYield)}</span>
                                            </div>
                                            <div className="bg-slate-800 text-white p-4 rounded-xl flex justify-between items-center mt-4 shadow-inner">
                                                <span className="text-sm font-semibold uppercase tracking-wider text-slate-300">Total Esperado</span>
                                                <span className="text-2xl font-black">${new Intl.NumberFormat('es-CO').format(totalReturn)}</span>
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
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-between items-center">
                    {/* Live Calculator Preview (Only in step 1) */}
                    {step === 1 ? (
                        <div className="flex items-center gap-2">
                            <TrendingUp className={`w-5 h-5 ${numAmount > 0 && selectedPeriod ? 'text-emerald-500' : 'text-slate-300'}`} />
                            <div>
                                <p className="text-[10px] uppercase font-bold text-slate-400">Total Esperado</p>
                                <p className={`font-black ${numAmount > 0 && selectedPeriod ? 'text-emerald-600' : 'text-slate-400'}`}>
                                    ${new Intl.NumberFormat('es-CO').format(totalReturn)}
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
                        disabled={step === 1 && (!selectedPackage || !selectedPeriod || numAmount <= 0)}
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
