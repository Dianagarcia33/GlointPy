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
    const [code, setCode] = useState<string>('');
    const [step, setStep] = useState<'amount' | 'code'>('amount');
    const [error, setError] = useState<string | null>(null);
    const [balance, setBalance] = useState<number>(0);
    const [bankDetails, setBankDetails] = useState<any>(null);
    const [bankAccounts, setBankAccounts] = useState<any[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
    const [canWithdraw, setCanWithdraw] = useState<boolean>(true);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const [withdrawalDateMessage, setWithdrawalDateMessage] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setIsLoadingData(true);
            fetchApi('/wallets/me/balance')
                .then(res => {
                    setBalance(res.balance !== undefined ? res.balance : (propBalance || 0));
                    setBankDetails(res.bank_details || propBankDetails || null);
                    
                    const accounts = res.bank_accounts && res.bank_accounts.length > 0
                        ? res.bank_accounts
                        : (res.bank_details ? [res.bank_details] : (propBankDetails ? [propBankDetails] : []));
                    
                    setBankAccounts(accounts);
                    if (accounts.length > 0) {
                        setSelectedAccountId(accounts[0].id || null);
                    }
                    
                    setCanWithdraw(res.can_withdraw !== false);
                    setWithdrawalDateMessage(res.withdrawal_date_message || null);
                })
                .catch(err => console.error("Error fetching balance:", err))
                .finally(() => setIsLoadingData(false));
        } else {
            setIsSuccess(false);
            setMonto('');
            setCode('');
            setStep('amount');
            setError(null);
            setSelectedAccountId(null);
        }
    }, [isOpen, propBalance, propBankDetails]);

    const sendCodeMutation = useMutation({
        mutationFn: async (data: any) => {
            return await fetchApi('/wallets/me/withdraw/send-code', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        },
        onSuccess: () => {
            setStep('code');
            setError(null);
        },
        onError: (err: any) => {
            setError(err.message || 'Error al enviar el código de verificación.');
        }
    });

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
            setError(err.message || 'Error al procesar la solicitud. Verifica el código.');
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

    const handleSendCode = (e: React.FormEvent) => {
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

        sendCodeMutation.mutate({ monto: montoNumber });
    };

    const handleWithdraw = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (code.length !== 6) {
            setError("Por favor ingresa un código válido de 6 dígitos.");
            return;
        }

        withdrawalMutation.mutate({
            monto: montoNumber,
            code: code
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
                        <p className="text-slate-500 text-sm mt-1">
                            {step === 'amount' ? 'Transfiere fondos a tu cuenta bancaria' : 'Verificación de Seguridad'}
                        </p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 hover:bg-slate-200/50 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                        disabled={withdrawalMutation.isPending || sendCodeMutation.isPending}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={step === 'amount' ? handleSendCode : handleWithdraw} className="p-6 flex-1 overflow-y-auto space-y-6">
                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100 flex items-start gap-2 animate-in fade-in">
                            <HelpCircle className="w-5 h-5 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {step === 'amount' && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
                            {!canWithdraw && (
                                <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm font-medium border border-red-200 flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-500" />
                                    <p>{withdrawalDateMessage || "Actualmente no nos encontramos en fechas de retiro habilitadas."}</p>
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

                                {bankAccounts.length > 0 && (
                                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3">
                                        <label className="block text-xs font-bold text-blue-700 uppercase tracking-wider">
                                            Seleccionar Cuenta de Destino
                                        </label>
                                        
                                        {bankAccounts.length > 1 ? (
                                            <select
                                                value={selectedAccountId || ''}
                                                onChange={(e) => {
                                                    const accId = Number(e.target.value);
                                                    setSelectedAccountId(accId);
                                                    const selected = bankAccounts.find(a => a.id === accId);
                                                    if (selected) setBankDetails(selected);
                                                }}
                                                className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
                                            >
                                                {bankAccounts.map((acc) => (
                                                    <option key={acc.id || acc.numero_cuenta} value={acc.id}>
                                                        {acc.banco} - {acc.tipo_cuenta} (****{String(acc.numero_cuenta).slice(-4)})
                                                    </option>
                                                ))}
                                            </select>
                                        ) : null}

                                        {bankDetails && (
                                            <div className="space-y-1 text-xs pt-1 border-t border-blue-100">
                                                <p className="text-sm text-blue-900 font-medium"><span className="text-blue-700 font-bold">Banco:</span> {bankDetails.banco}</p>
                                                <p className="text-sm text-blue-900 font-medium"><span className="text-blue-700 font-bold">Tipo de Cuenta:</span> {bankDetails.tipo_cuenta}</p>
                                                <p className="text-sm text-blue-900 font-medium"><span className="text-blue-700 font-bold">Número de Cuenta:</span> {bankDetails.numero_cuenta}</p>
                                            </div>
                                        )}
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
                        </div>
                    )}

                    {step === 'code' && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6 text-center">
                            <div className="bg-brand-50 rounded-2xl p-6 mb-2 inline-block">
                                <svg className="w-12 h-12 text-brand-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold font-montserrat text-slate-900">Código Enviado</h3>
                            <p className="text-slate-500 text-sm">
                                Hemos enviado un código de seguridad de 6 dígitos a tu correo electrónico. Por favor, ingrésalo a continuación para autorizar el retiro.
                            </p>

                            <div className="pt-4">
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Código de 6 dígitos</label>
                                <input 
                                    type="text" 
                                    maxLength={6}
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                                    placeholder="000000"
                                    className="w-full text-center tracking-[0.5em] text-2xl px-4 py-4 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-bold text-slate-900 outline-none"
                                    required
                                />
                            </div>

                            <button
                                type="button"
                                onClick={handleSendCode}
                                disabled={sendCodeMutation.isPending}
                                className="text-sm font-bold text-brand-600 hover:text-brand-700 disabled:opacity-50 transition-colors mt-2"
                            >
                                {sendCodeMutation.isPending ? 'Reenviando...' : 'Reenviar código'}
                            </button>
                        </div>
                    )}
                </form>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-3xl">
                    {step === 'code' ? (
                        <button 
                            type="button"
                            onClick={() => { setStep('amount'); setCode(''); setError(null); }}
                            disabled={withdrawalMutation.isPending}
                            className="px-5 py-2.5 text-slate-600 hover:text-slate-800 font-semibold transition-colors"
                        >
                            Volver
                        </button>
                    ) : (
                        <button 
                            type="button"
                            onClick={onClose}
                            disabled={sendCodeMutation.isPending}
                            className="px-5 py-2.5 text-slate-600 hover:text-slate-800 font-semibold transition-colors"
                        >
                            Cancelar
                        </button>
                    )}
                    
                    {step === 'amount' ? (
                        <button 
                            onClick={handleSendCode}
                            disabled={!canWithdraw || !bankDetails || sendCodeMutation.isPending || montoNumber < 5000 || montoNumber > balance}
                            className={`px-6 py-2.5 font-bold rounded-xl flex items-center gap-2 transition-all active:scale-95 shadow-md ${
                                (!canWithdraw || !bankDetails || sendCodeMutation.isPending || montoNumber < 5000 || montoNumber > balance)
                                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                                    : 'bg-brand-500 hover:bg-brand-600 text-white shadow-brand-500/20'
                            }`}
                        >
                            {sendCodeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            Continuar
                        </button>
                    ) : (
                        <button 
                            onClick={handleWithdraw}
                            disabled={withdrawalMutation.isPending || code.length !== 6}
                            className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl flex items-center gap-2 transition-all active:scale-95 shadow-md disabled:opacity-50 disabled:active:scale-100 shadow-brand-500/20"
                        >
                            {withdrawalMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            Confirmar Retiro
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};
