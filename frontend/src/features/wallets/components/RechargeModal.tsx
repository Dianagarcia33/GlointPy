import React, { useState } from 'react';
import { 
    X, 
    UploadCloud, 
    Building2, 
    Copy, 
    Check, 
    ArrowDownToLine, 
    ShieldCheck, 
    AlertCircle, 
    CheckCircle2, 
    FileText,
    Loader2
} from 'lucide-react';
import { createWalletRecharge } from '../../../services/wallets';

interface RechargeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const PRESET_AMOUNTS = [
    50000,
    100000,
    200000,
    500000,
    1000000,
    2000000
];

const BANK_INFO = {
    bank: 'Bancolombia',
    accountType: 'Cuenta de Ahorros',
    accountNumber: '245-000124-88',
    holder: 'Gloint S.A.S.',
    nit: '901.554.892-1'
};

export const RechargeModal: React.FC<RechargeModalProps> = ({
    isOpen,
    onClose,
    onSuccess
}) => {
    const [amount, setAmount] = useState<number | ''>(100000);
    const [paymentMethod, setPaymentMethod] = useState('Transferencia Bancolombia');
    const [referenceNumber, setReferenceNumber] = useState('');
    const [notes, setNotes] = useState('');
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleCopy = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handlePresetClick = (val: number) => {
        setAmount(val);
        setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!amount || Number(amount) < 5000) {
            setError('El monto mínimo para recargar es de $5.000 COP.');
            return;
        }

        if (!receiptFile) {
            setError('Es obligatorio adjuntar el comprobante de pago bancario (JPG, PNG o PDF).');
            return;
        }

        try {
            setLoading(true);
            await createWalletRecharge({
                amount: Number(amount),
                payment_method: paymentMethod,
                reference_number: referenceNumber.trim() || undefined,
                notes: notes.trim() || undefined,
                receipt: receiptFile
            });

            setSuccessMessage('¡Solicitud de recarga enviada con éxito! Tu saldo se acreditará una vez que el equipo administrativo valide el comprobante.');
            setTimeout(() => {
                setSuccessMessage(null);
                onSuccess();
                onClose();
            }, 2500);
        } catch (err: any) {
            console.error('Error al enviar recarga:', err);
            setError(err.message || 'Error al procesar la solicitud de recarga.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative max-h-[92vh] overflow-y-auto font-montserrat">
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                            <ArrowDownToLine className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-900 tracking-tight">
                                Recargar Billetera
                            </h3>
                            <p className="text-xs text-slate-500 font-medium">
                                Transfiere a la cuenta oficial y adjunta tu comprobante
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {successMessage ? (
                    <div className="py-10 text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto animate-bounce">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <h4 className="text-lg font-bold text-slate-900">¡Recarga en Proceso!</h4>
                        <p className="text-xs text-slate-600 max-w-md mx-auto font-medium">
                            {successMessage}
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5 pt-4">

                        {error && (
                            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-xs text-rose-700 font-medium animate-in fade-in">
                                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Monto a recargar */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-700 block">
                                Monto a Recargar ($ COP) <span className="text-rose-500">*</span>
                            </label>
                            
                            {/* Input principal */}
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold font-mono text-sm">
                                    $
                                </span>
                                <input
                                    type="number"
                                    min={5000}
                                    step={1000}
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value)))}
                                    placeholder="Ej. 100000"
                                    className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-base font-mono font-black text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-hidden transition-all"
                                    required
                                />
                            </div>

                            {/* Botones de sugerencia rápida */}
                            <div className="flex flex-wrap gap-1.5 pt-1">
                                {PRESET_AMOUNTS.map((val) => (
                                    <button
                                        type="button"
                                        key={val}
                                        onClick={() => handlePresetClick(val)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                                            amount === val
                                                ? 'bg-emerald-600 text-white shadow-xs'
                                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                        }`}
                                    >
                                        ${(val / 1000).toLocaleString('es-CO')}K
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Datos Bancarios Oficiales de Gloint */}
                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-4.5 space-y-3 shadow-md relative overflow-hidden">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-emerald-400" />
                                    <span className="text-xs font-bold text-emerald-400 tracking-wide uppercase">
                                        Cuenta Oficial de la Empresa
                                    </span>
                                </div>
                                <span className="text-[10px] font-mono bg-white/10 px-2 py-0.5 rounded-full text-slate-300">
                                    Bancolombia
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                                <div>
                                    <span className="text-[10px] text-slate-400 block">Titular de la Cuenta:</span>
                                    <span className="font-bold text-white block">{BANK_INFO.holder}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-400 block">NIT:</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-bold text-white font-mono">{BANK_INFO.nit}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleCopy(BANK_INFO.nit, 'nit')}
                                            className="text-slate-400 hover:text-emerald-400 transition-colors p-1"
                                            title="Copiar NIT"
                                        >
                                            {copiedField === 'nit' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-400 block">Tipo de Cuenta:</span>
                                    <span className="font-bold text-white block">{BANK_INFO.accountType}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-400 block">Número de Cuenta:</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-bold text-white font-mono text-sm text-emerald-300">
                                            {BANK_INFO.accountNumber}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleCopy(BANK_INFO.accountNumber, 'acc')}
                                            className="text-slate-400 hover:text-emerald-400 transition-colors p-1"
                                            title="Copiar Número"
                                        >
                                            {copiedField === 'acc' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Método y Referencia */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1">
                                    Método de Pago
                                </label>
                                <select
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-hidden"
                                >
                                    <option value="Transferencia Bancolombia">Transferencia Bancolombia</option>
                                    <option value="Nequi">Nequi</option>
                                    <option value="Daviplata">Daviplata</option>
                                    <option value="PSE / Otra Entidad">PSE / Otra Entidad Bancaria</option>
                                    <option value="Depósito en Efectivo">Corresponsal / Depósito en Efectivo</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1">
                                    N° de Comprobante / Referencia
                                </label>
                                <input
                                    type="text"
                                    value={referenceNumber}
                                    onChange={(e) => setReferenceNumber(e.target.value)}
                                    placeholder="Ej. REF-983421"
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium focus:ring-2 focus:ring-emerald-500 outline-hidden"
                                />
                            </div>
                        </div>

                        {/* Subida de Comprobante */}
                        <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">
                                Adjuntar Comprobante de Transferencia (JPG, PNG, PDF) <span className="text-rose-500">*</span>
                            </label>
                            
                            <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-4 text-center cursor-pointer transition-all bg-slate-50/60 hover:bg-emerald-50/20 relative group">
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,application/pdf"
                                    onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    required
                                />
                                <div className="space-y-1">
                                    <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-emerald-500 mx-auto transition-colors" />
                                    <p className="text-xs font-bold text-slate-700 block truncate">
                                        {receiptFile ? receiptFile.name : "Haz clic o arrastra tu comprobante aquí"}
                                    </p>
                                    <p className="text-[10px] text-slate-400">
                                        {receiptFile ? `${(receiptFile.size / 1024 / 1024).toFixed(2)} MB adjuntado` : "Formatos soportados: JPG, PNG, PDF (Máx. 10 MB)"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Notas opcionales */}
                        <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">
                                Observaciones o Notas (Opcional)
                            </label>
                            <input
                                type="text"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Ej. Transferencia desde cuenta personal"
                                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-hidden"
                            />
                        </div>

                        {/* Seguridad y Disclaimer */}
                        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-start gap-2 text-[11px] text-slate-500">
                            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <span>
                                Tu solicitud quedará en estado <strong>Pendiente</strong> y se acreditará inmediatamente en tu saldo una vez confirmada por el área financiera.
                            </span>
                        </div>

                        {/* Botones de acción */}
                        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={loading}
                                className="px-5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Enviando Comprobante...</span>
                                    </>
                                ) : (
                                    <>
                                        <ArrowDownToLine className="w-4 h-4" />
                                        <span>Solicitar Recarga</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}

            </div>
        </div>
    );
};
