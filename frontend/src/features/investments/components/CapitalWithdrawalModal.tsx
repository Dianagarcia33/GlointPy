import React, { useState } from 'react';
import { formatCurrency } from '../../../utils/format';
import { fetchApi } from '../../../services/api';
import { X, Building2, AlertCircle, CheckCircle2, DollarSign } from 'lucide-react';

interface CapitalWithdrawalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    investmentId: number;
    montoDisponible: number;
    bankInfo: {
        banco: string;
        tipo_cuenta: string;
        numero_cuenta: string;
    } | null;
}

export const CapitalWithdrawalModal: React.FC<CapitalWithdrawalModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    investmentId,
    montoDisponible,
    bankInfo
}) => {
    const [step, setStep] = useState<1 | 2>(1);
    const [loading, setLoading] = useState(false);
    const [code, setCode] = useState('');
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const tax = montoDisponible * 0.032;
    const netAmount = montoDisponible - tax;

    const handleSendCode = async () => {
        setLoading(true);
        setError('');
        try {
            await fetchApi(`/investments/${investmentId}/withdraw-capital/send-code`, { method: 'POST' });
            setStep(2);
        } catch (err: any) {
            setError(err.message || 'Error al solicitar el código. Por favor intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async () => {
        if (!code || code.length !== 6) {
            setError('Por favor ingresa un código válido de 6 dígitos.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            await fetchApi(`/investments/${investmentId}/withdraw-capital`, { 
                method: 'POST',
                body: JSON.stringify({ code })
            });
            onSuccess();
        } catch (err: any) {
            setError(err.message || 'Código inválido o expirado. Por favor verifica.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center p-6 border-b border-slate-100">
                    <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-brand-500" />
                        Retiro de Capital
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl text-sm font-medium border border-red-200 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <p>Actualmente no nos encontramos en fechas de retiro habilitadas.</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl flex gap-3 text-sm border border-red-100">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}

                    {step === 1 ? (
                        <div className="space-y-6">
                            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Monto Bruto</span>
                                    <span className="font-semibold text-slate-900">{formatCurrency(montoDisponible)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Impuesto (3.2%)</span>
                                    <span className="font-semibold text-red-500">-{formatCurrency(tax)}</span>
                                </div>
                                <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
                                    <span className="font-bold text-slate-900 uppercase text-xs tracking-wider">Recibirás (Neto)</span>
                                    <span className="text-2xl font-bold text-brand-600">{formatCurrency(netAmount)}</span>
                                </div>
                            </div>

                            <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100">
                                <div className="flex gap-3">
                                    <div className="p-2 bg-blue-100 text-blue-600 rounded-xl h-fit">
                                        <Building2 className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wider text-blue-800 mb-1">Destino del Dinero</p>
                                        {bankInfo ? (
                                            <>
                                                <p className="font-semibold text-slate-900">{bankInfo.banco}</p>
                                                <p className="text-sm text-slate-600">{bankInfo.tipo_cuenta} ••• {bankInfo.numero_cuenta.slice(-4)}</p>
                                            </>
                                        ) : (
                                            <p className="text-sm text-red-500 font-medium">No tienes cuenta bancaria registrada.</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <p className="text-xs text-slate-500 text-center leading-relaxed">
                                Por seguridad, enviaremos un código de verificación a tu correo electrónico registrado antes de procesar el retiro.
                            </p>

                            <button 
                                onClick={handleSendCode}
                                disabled={true}
                                className="w-full py-3.5 rounded-xl font-bold text-sm bg-slate-200 text-slate-400 cursor-not-allowed transition-colors"
                            >
                                {loading ? 'Enviando...' : 'Solicitar Código por Correo'}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6 text-center">
                            <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 text-lg mb-2">Revisa tu correo</h4>
                                <p className="text-sm text-slate-500">
                                    Hemos enviado un código de 6 dígitos a tu correo. Ingrésalo abajo para confirmar el retiro de <strong>{formatCurrency(netAmount)}</strong>.
                                </p>
                            </div>
                            
                            <input 
                                type="text"
                                placeholder="000000"
                                maxLength={6}
                                value={code}
                                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                                className="w-full p-4 text-center text-3xl font-bold tracking-[0.5em] bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                            />

                            <button 
                                onClick={handleConfirm}
                                disabled={loading || code.length !== 6}
                                className="w-full py-3.5 rounded-xl font-bold text-sm bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md shadow-brand-500/20"
                            >
                                {loading ? 'Verificando...' : 'Confirmar Retiro'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
