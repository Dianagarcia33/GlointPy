import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Investor, adminWithdrawCapital } from '../../../../services/investors';
import { X, Wallet, AlertCircle, CheckCircle2, Loader2, User, ShieldCheck, DollarSign } from 'lucide-react';

interface AdminCapitalWithdrawalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    investor: Investor | null;
}

export const AdminCapitalWithdrawalModal: React.FC<AdminCapitalWithdrawalModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    investor
}) => {
    const [amount, setAmount] = useState<number>(0);
    const [notes, setNotes] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    const totalPackageValue = investor?.package ? Number(investor.package.value) : 0;
    
    // Calculate previously withdrawn capital
    const alreadyWithdrawn = investor?.withdrawals
        ? investor.withdrawals.reduce((sum: number, w: any) => {
            const wTipo = typeof w.tipo === 'object' ? w.tipo?.value : w.tipo;
            const wEstado = typeof w.estado === 'object' ? w.estado?.value : w.estado;
            if (String(wTipo).toLowerCase() === 'capital' && ['pendiente', 'aprobado', 'procesado'].includes(String(wEstado).toLowerCase())) {
                return sum + Number(w.monto || 0);
            }
            return sum;
        }, 0)
        : 0;

    const availableCapital = Math.max(0, totalPackageValue - alreadyWithdrawn);

    useEffect(() => {
        if (isOpen && investor) {
            setAmount(availableCapital);
            setNotes(`Liquidación y retorno de capital por finalización de contrato #${investor.assigned_code || investor.id}`);
            setError('');
        }
    }, [isOpen, investor, availableCapital]);

    if (!isOpen || !investor) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (amount <= 0) {
            setError('El monto a liquidar debe ser mayor a $0 COP');
            return;
        }
        if (amount > availableCapital) {
            setError(`El monto no puede superar el capital disponible ($${availableCapital.toLocaleString('es-CO')} COP)`);
            return;
        }

        setLoading(true);
        setError('');

        try {
            await adminWithdrawCapital(investor.id, {
                monto: amount,
                notes: notes.trim() || undefined
            });
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error("Error al procesar retiro de capital:", err);
            setError(err.message || "Error al procesar la liquidación de capital");
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150" style={{ margin: 0 }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/60">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-brand-50 text-brand-600 rounded-xl border border-brand-100">
                            <Wallet className="w-5 h-5 text-brand-600" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-800 font-montserrat">Liquidación de Capital a Billetera</h3>
                            <p className="text-xs text-slate-500">Inversión #{investor.assigned_code || investor.id} • {investor.user?.name}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
                    {error && (
                        <div className="p-3.5 bg-red-50 text-red-700 rounded-xl text-xs font-semibold border border-red-100 flex items-center gap-2.5">
                            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Resumen del Contrato */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            Información del Inversionista
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                                <span className="text-slate-400 block text-[11px]">Inversionista:</span>
                                <span className="font-bold text-slate-800">{investor.user?.name}</span>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[11px]">Documento:</span>
                                <span className="font-mono font-bold text-slate-800">{investor.user?.document_id || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[11px]">Periodo de Contrato:</span>
                                <span className="font-bold text-slate-800">
                                    {investor.period ? `${investor.period.months} meses (${investor.period.days} días)` : 'N/A'}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[11px]">Estado:</span>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                                    Días Cumplidos (Finalizado)
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Resumen Financiero */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Valor del Paquete</span>
                            <span className="text-sm font-bold text-slate-900 font-montserrat">
                                ${totalPackageValue.toLocaleString('es-CO')} COP
                            </span>
                        </div>
                        <div className="bg-emerald-50/80 p-3.5 rounded-xl border border-emerald-200">
                            <span className="text-[10px] uppercase font-bold text-emerald-700 block tracking-wider">Capital por Liquidar</span>
                            <span className="text-sm font-extrabold text-emerald-800 font-montserrat">
                                ${availableCapital.toLocaleString('es-CO')} COP
                            </span>
                        </div>
                    </div>

                    {/* Input Monto */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                            Monto a Liquidar y Acreditar ($ COP):
                        </label>
                        <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                            <input
                                type="number"
                                min="1"
                                max={availableCapital}
                                value={amount || ''}
                                onChange={(e) => setAmount(Number(e.target.value))}
                                className="w-full pl-8 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                                required
                            />
                        </div>
                        <div className="flex justify-between items-center text-[11px] pt-0.5">
                            <span className="text-slate-400">Máximo: ${availableCapital.toLocaleString('es-CO')} COP</span>
                            <button
                                type="button"
                                onClick={() => setAmount(availableCapital)}
                                className="text-brand-600 font-bold hover:underline cursor-pointer"
                            >
                                Liquidar 100%
                            </button>
                        </div>
                    </div>

                    {/* Input Observaciones */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                            Concepto / Observaciones:
                        </label>
                        <input
                            type="text"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ej: Retorno de capital por cumplimiento de contrato"
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                        />
                    </div>

                    {/* Notice */}
                    <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
                        <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <span>
                            Se registrará el <strong>Retiro de Capital</strong> oficial del contrato y se <strong>acreditarán ${amount.toLocaleString('es-CO')} COP</strong> directamente en la Billetera Gloint del inversionista.
                        </span>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading || availableCapital <= 0}
                            className="inline-flex items-center gap-2 px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-xl shadow-md shadow-brand-500/20 hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            <span>Liquidar y Abonar a Billetera</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};
