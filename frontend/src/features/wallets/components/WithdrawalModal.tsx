import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Landmark, HelpCircle } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { fetchApi } from '../../../services/api';

interface WithdrawalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    availableBalance: number;
}

export const WithdrawalModal = ({ isOpen, onClose, onSuccess, availableBalance }: WithdrawalModalProps) => {
    const [monto, setMonto] = useState<string>('');
    const [banco, setBanco] = useState<string>('');
    const [tipoCuenta, setTipoCuenta] = useState<string>('ahorros');
    const [numeroCuenta, setNumeroCuenta] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    const withdrawalMutation = useMutation({
        mutationFn: async (data: any) => {
            return await fetchApi('/wallets/me/withdraw', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        },
        onSuccess: () => {
            onSuccess();
            onClose();
            // Reset form
            setMonto('');
            setBanco('');
            setNumeroCuenta('');
            setError(null);
        },
        onError: (err: any) => {
            setError(err.message || 'Error al procesar la solicitud.');
        }
    });

    if (!isOpen) return null;

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

        if (montoNumber <= 0) {
            setError("El monto debe ser mayor a 0.");
            return;
        }
        if (montoNumber > availableBalance) {
            setError("Saldo insuficiente.");
            return;
        }
        if (!banco.trim() || !numeroCuenta.trim()) {
            setError("Por favor completa los datos de tu cuenta bancaria.");
            return;
        }

        withdrawalMutation.mutate({
            monto: montoNumber,
            banco,
            tipo_cuenta: tipoCuenta,
            numero_cuenta: numeroCuenta
        });
    };

    const handleMaxBalance = () => {
        setMonto(availableBalance.toString());
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
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

                    {/* Balance Info */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Saldo Disponible</span>
                            <button 
                                type="button" 
                                onClick={handleMaxBalance}
                                className="text-xs font-bold text-brand-600 hover:text-brand-700 bg-brand-50 px-2.5 py-1 rounded-lg transition-colors"
                            >
                                USAR MAX
                            </button>
                        </div>
                        <p className="text-2xl font-bold text-slate-900 font-montserrat tracking-tight">
                            {formatCurrency(availableBalance)}
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Monto a Retirar (COP)</label>
                            <input 
                                type="number" 
                                value={monto}
                                onChange={(e) => setMonto(e.target.value)}
                                placeholder="Ej. 1000000"
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-medium text-slate-900 outline-none"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Banco</label>
                                <input 
                                    type="text" 
                                    value={banco}
                                    onChange={(e) => setBanco(e.target.value)}
                                    placeholder="Ej. Bancolombia"
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-medium text-slate-900 outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tipo de Cuenta</label>
                                <select
                                    value={tipoCuenta}
                                    onChange={(e) => setTipoCuenta(e.target.value)}
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-medium text-slate-900 outline-none"
                                >
                                    <option value="ahorros">Ahorros</option>
                                    <option value="corriente">Corriente</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Número de Cuenta</label>
                            <input 
                                type="text" 
                                value={numeroCuenta}
                                onChange={(e) => setNumeroCuenta(e.target.value)}
                                placeholder="Ingresa el número"
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-medium text-slate-900 outline-none"
                                required
                            />
                        </div>
                    </div>

                    {/* Resumen */}
                    {montoNumber > 0 && (
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
                        disabled={withdrawalMutation.isPending || montoNumber <= 0 || montoNumber > availableBalance}
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
