import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Landmark, HelpCircle, AlertTriangle } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { fetchApi } from '../../../services/api';

interface WithdrawalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    availableBalance?: number;
    bankDetails?: any;
}

export const WithdrawalModal = ({ isOpen, onClose, onSuccess, availableBalance: propBalance, bankDetails: propBankDetails }: WithdrawalModalProps) => {
    const [monto, setMonto] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [balance, setBalance] = useState<number>(0);
    const [bankDetails, setBankDetails] = useState<any>(null);
    const [canWithdraw, setCanWithdraw] = useState<boolean>(true);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (propBalance !== undefined && propBankDetails !== undefined) {
                setBalance(propBalance);
                setBankDetails(propBankDetails);
            } else {
                setIsLoadingData(true);
                fetchApi('/wallets/me/balance')
                    .then(res => {
                        setBalance(res.balance || 0);
                        setBankDetails(res.bank_details || null);
                        setCanWithdraw(res.can_withdraw !== false); // Default true if undefined
                    })
                    .catch(err => console.error("Error fetching balance:", err))
                    .finally(() => setIsLoadingData(false));
            }
        } else {
            setIsSuccess(false);
            setMonto('');
            setError(null);
        }
    }, [isOpen, propBalance, propBankDetails]);

    const withdrawalMutation = useMutation({
        mutationFn: async (data: any) => {
            return await fetchApi('/wallets/me/withdraw', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        },
        onSuccess: () => {
            if (onSuccess) {
                onSuccess();
            }
            setIsSuccess(true);
        },
        onError: (err: any) => {
            setError(err.message || 'Error al procesar la solicitud.');
        }
    });

    if (!isOpen) return null;

    if (isSuccess) {
        return createPortal(
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col p-8 text-center items-center">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
                        <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold font-montserrat text-slate-900 mb-2">¡Solicitud Exitosa!</h2>
                    <p className="text-slate-500 mb-8 text-sm">
                        Tu retiro está siendo procesado. Te notificaremos cuando los fondos hayan sido transferidos a tu cuenta.
                    </p>
                    <button 
                        onClick={onClose}
                        className="w-full px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl transition-all active:scale-95 shadow-md shadow-brand-500/20"
                    >
                        Entendido
                    </button>
                </div>
            </div>,
            document.body
        );
    }

    const montoNumber = parseFloat(monto) || 0;
    const impuesto = montoNumber * 0.032;
    const montoNeto = montoNumber - impuesto;

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(value);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!bankDetails) {
            setError("No tienes información bancaria registrada. Contacta a soporte.");
            return;
        }
        if (montoNumber < 5000) {
            setError("El monto mínimo de retiro es de $5,000 COP.");
            return;
        }
        if (montoNumber > balance) {
            setError("Saldo insuficiente.");
            return;
        }

        withdrawalMutation.mutate({
            monto: montoNumber
        });
    };

    const handleMaxBalance = () => {
        setMonto(balance.toString());
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between relative bg-brand-50/50">
                    <div>
                        <h2 className="text-xl font-bold font-montserrat text-slate-900 flex items-center gap-2">
                            <Landmark className="w-5 h-5 text-brand-500" /> Solicitar Retiro
                        </h2>
                        <p className="text-slate-500 text-sm mt-1">Transfiere fondos a tu cuenta bancaria</p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 hover:bg-slate-200/50 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                        disabled={withdrawalMutation.isPending}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto space-y-6">
                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100 flex items-start gap-2">
                            <HelpCircle className="w-5 h-5 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {!canWithdraw && !isLoadingData && (
                        <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm font-medium border border-red-200 flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-500" />
                            <p>Actualmente no nos encontramos en fechas de retiro habilitadas. Por favor consulta el cronograma oficial.</p>
                        </div>
                    )}

                    {!bankDetails && canWithdraw && (
                        <div className="p-4 bg-amber-50 text-amber-700 rounded-xl text-sm font-medium border border-amber-200 flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-500" />
                            <p>No hemos encontrado datos bancarios asociados a tu perfil. Por favor contacta a soporte para registrar tu cuenta antes de retirar.</p>
                        </div>
                    )}

                    {/* Balance Info */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Saldo Disponible</span>
                            <button 
                                type="button" 
                                onClick={handleMaxBalance}
                                disabled={!bankDetails || isLoadingData}
                                className="text-xs font-bold text-brand-600 hover:text-brand-700 bg-brand-50 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
                            >
                                USAR MAX
                            </button>
                        </div>
                        <p className="text-2xl font-bold text-slate-900 font-montserrat tracking-tight">
                            {isLoadingData ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : formatCurrency(balance)}
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Monto a Retirar (COP)</label>
                            <input 
                                type="number" 
                                value={monto}
                                onChange={(e) => setMonto(e.target.value)}
                                placeholder="Mínimo $5,000"
                                disabled={!bankDetails || !canWithdraw}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-medium text-slate-900 outline-none disabled:bg-slate-50 disabled:text-slate-500"
                                required
                            />
                        </div>

                        {bankDetails && (
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                                <label className="block text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">Cuenta de Destino</label>
                                <div className="space-y-1">
                                    <p className="text-sm text-blue-900 font-medium"><span className="text-blue-700">Banco:</span> {bankDetails.banco}</p>
                                    <p className="text-sm text-blue-900 font-medium"><span className="text-blue-700">Tipo:</span> {bankDetails.tipo_cuenta}</p>
                                    <p className="text-sm text-blue-900 font-medium"><span className="text-blue-700">Número:</span> {bankDetails.numero_cuenta}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Resumen */}
                    {montoNumber > 0 && bankDetails && (
                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 space-y-2 animate-in fade-in slide-in-from-bottom-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-amber-700">Subtotal solicitado:</span>
                                <span className="font-semibold text-amber-900">{formatCurrency(montoNumber)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-amber-700 flex items-center gap-1">
                                    Impuestos/Comisión (3.2%): 
                                </span>
                                <span className="font-semibold text-red-600">-{formatCurrency(impuesto)}</span>
                            </div>
                            <div className="pt-2 border-t border-amber-200 flex justify-between">
                                <span className="font-bold text-amber-900">Total a Recibir:</span>
                                <span className="font-bold text-emerald-600 text-lg">{formatCurrency(montoNeto)}</span>
                            </div>
                        </div>
                    )}
                </form>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-3xl">
                    <button 
                        type="button"
                        onClick={onClose}
                        disabled={withdrawalMutation.isPending}
                        className="px-5 py-2.5 text-slate-600 hover:text-slate-800 font-semibold transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSubmit}
                        disabled={withdrawalMutation.isPending || montoNumber < 5000 || montoNumber > balance || !bankDetails || !canWithdraw || isLoadingData}
                        className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl flex items-center gap-2 transition-all active:scale-95 shadow-md disabled:opacity-50 disabled:active:scale-100 shadow-brand-500/20"
                    >
                        {withdrawalMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        Confirmar Retiro
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
