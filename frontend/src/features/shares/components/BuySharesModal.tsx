import React, { useState } from 'react';
import { X, ShoppingBag, Wallet, Building2, UploadCloud, AlertCircle, CheckCircle2, ShieldAlert, Copy, Check } from 'lucide-react';
import { shareMarketService, ShareListing } from '../../../services/shareMarket';
import { GLOINT_BANK_INFO } from '../../../constants/contactInfo';
import { ONLINE_PAYMENTS_ENABLED } from '../../../constants/features';
import { YointPaymentWidget } from '../../../components/payments/YointPaymentWidget';
import { useAuthStore } from '../../../store/authStore';

interface BuySharesModalProps {
    isOpen: boolean;
    onClose: () => void;
    listing: ShareListing | null;
    /** null = saldo oculto por permiso o no disponible (no es $0) */
    userWalletBalance: number | null;
    onSuccess: () => void;
}

export const BuySharesModal: React.FC<BuySharesModalProps> = ({
    isOpen,
    onClose,
    listing,
    userWalletBalance,
    onSuccess
}) => {
    const [quantity, setQuantity] = useState<number>(1);
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Medio de pago elegido. Con saldo oculto el servidor valida el saldo real al comprar
    const [payMethod, setPayMethod] = useState<'wallet' | 'online' | 'transfer'>('wallet');
    // Orden reservada para el pago en línea (las acciones quedan apartadas hasta que se pague o se cancele)
    const [onlineOrderId, setOnlineOrderId] = useState<number | null>(null);
    const [onlineDone, setOnlineDone] = useState(false);
    const { user } = useAuthStore();
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const handleCopy = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    if (!isOpen || !listing) return null;

    const maxAvailable = listing.shares_available || 0;
    const unitPrice = listing.price_per_share || 0;
    const totalCost = (quantity || 0) * unitPrice;

    // Cálculo de saldo vs excedente
    const balanceKnown = userWalletBalance !== null && userWalletBalance !== undefined;
    const knownBalance = balanceKnown ? (userWalletBalance as number) : 0;
    const walletAvailable = !balanceKnown || knownBalance >= totalCost;
    // Si la billetera ya no alcanza para la cantidad elegida, pasar al primer medio externo disponible
    const effectiveMethod: 'wallet' | 'online' | 'transfer' =
        payMethod === 'wallet' && !walletAvailable
            ? (ONLINE_PAYMENTS_ENABLED ? 'online' : 'transfer')
            : (payMethod === 'online' && !ONLINE_PAYMENTS_ENABLED ? 'transfer' : payMethod);
    const canPayFullWallet = effectiveMethod === 'wallet';
    // Fuera de billetera se usa el saldo disponible y se paga solo el excedente; si el saldo alcanza para todo, se paga el total aparte
    const walletToUse = canPayFullWallet
        ? totalCost
        : (balanceKnown && knownBalance < totalCost ? knownBalance : 0);
    const surplusToPay = Math.max(0, totalCost - walletToUse);
    const isOnline = effectiveMethod === 'online';
    const onlineTooLow = isOnline && surplusToPay < 5000;

    const releaseOnlineOrder = async () => {
        if (onlineOrderId && !onlineDone) {
            try { await shareMarketService.cancelOnlineOrder(onlineOrderId); } catch { /* el servidor la libera sola si no se pudo */ }
        }
        setOnlineOrderId(null);
    };

    const handleClose = async () => {
        await releaseOnlineOrder();
        onClose();
    };

    // Reserva las acciones una sola vez; si el usuario vuelve a intentar el pago se reutiliza la misma orden
    const createOnlineOrder = async (): Promise<number> => {
        if (onlineOrderId) return onlineOrderId;
        if (quantity <= 0 || quantity > maxAvailable) {
            throw new Error(`La cantidad debe estar entre 1 y ${maxAvailable} acciones.`);
        }
        const order = await shareMarketService.buySharesOnline(listing.id, quantity, walletToUse);
        setOnlineOrderId(order.id);
        return order.id;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (quantity <= 0 || quantity > maxAvailable) {
            setError(`La cantidad debe estar entre 1 y ${maxAvailable} acciones.`);
            return;
        }

        try {
            setLoading(true);
            if (canPayFullWallet) {
                // Compra inmediata en tiempo real 100% saldo
                await shareMarketService.buySharesInstant(listing.id, quantity);
            } else {
                // Compra con excedente + comprobante
                if (!receiptFile) {
                    setError("Debes adjuntar el comprobante de pago bancario del excedente.");
                    setLoading(false);
                    return;
                }
                await shareMarketService.buySharesSurplus(
                    listing.id,
                    quantity,
                    walletToUse,
                    surplusToPay,
                    receiptFile
                );
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || "Error al procesar la compra de acciones.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative space-y-6 max-h-[90vh] overflow-y-auto">
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center border border-brand-200/60">
                            <ShoppingBag className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-900 font-montserrat">Comprar Acciones</h3>
                            <p className="text-xs text-slate-500 font-medium">Vendedor: {listing.seller_name}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-all cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {error && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Offer Details */}
                <div className="grid grid-cols-2 gap-3 bg-slate-50 rounded-2xl p-4 border border-slate-200/80">
                    <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Precio por Acción</span>
                        <span className="text-lg font-extrabold text-slate-900 font-mono">
                            ${unitPrice.toLocaleString('es-CO')} COP
                        </span>
                    </div>
                    <div className="text-right">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Disponibles</span>
                        <span className="text-lg font-extrabold text-brand-600 font-mono">
                            {maxAvailable} Acciones
                        </span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Quantity Input */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-bold text-slate-700">Cantidad de Acciones a Comprar</label>
                            <button
                                type="button"
                                onClick={() => setQuantity(maxAvailable)}
                                className="text-[11px] font-extrabold text-brand-600 hover:text-brand-700 hover:underline cursor-pointer"
                            >
                                Comprar Todas ({maxAvailable})
                            </button>
                        </div>
                        <input
                            type="number"
                            min={1}
                            max={maxAvailable}
                            value={quantity || ''}
                            disabled={!!onlineOrderId}
                            onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-brand-500 focus:bg-white outline-hidden transition-all text-sm font-mono"
                            placeholder="Ej. 5"
                            required
                        />
                    </div>

                    {/* Total & Payment Method Detection */}
                    <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-3 shadow-md">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-400 font-medium">Total de la Compra:</span>
                            <span className="text-xl font-black font-mono text-white">
                                ${totalCost.toLocaleString('es-CO')} COP
                            </span>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                            <div className="flex items-center gap-1.5 text-slate-300">
                                <Wallet className="w-4 h-4 text-emerald-400" />
                                <span>Tu Saldo en Billetera:</span>
                            </div>
                            <span className="font-bold font-mono text-emerald-400">
                                {balanceKnown ? `$${knownBalance.toLocaleString('es-CO')} COP` : 'Saldo no disponible'}
                            </span>
                        </div>
                    </div>

                    {/* Medio de pago */}
                    <div className={`grid gap-2 ${ONLINE_PAYMENTS_ENABLED ? 'grid-cols-3' : 'grid-cols-2'}`} role="radiogroup" aria-label="Medio de pago">
                        {walletAvailable && (
                            <button
                                type="button"
                                disabled={!!onlineOrderId}
                                onClick={() => setPayMethod('wallet')}
                                className={`px-3 py-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${effectiveMethod === 'wallet' ? 'bg-emerald-50 border-emerald-400 text-emerald-800' : 'bg-white border-slate-200 text-slate-600'}`}
                            >
                                Mi billetera
                            </button>
                        )}
                        {ONLINE_PAYMENTS_ENABLED && (
                            <button
                                type="button"
                                disabled={!!onlineOrderId}
                                onClick={() => setPayMethod('online')}
                                className={`px-3 py-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${effectiveMethod === 'online' ? 'bg-brand-50 border-brand-400 text-brand-800' : 'bg-white border-slate-200 text-slate-600'}`}
                            >
                                Pago en línea
                            </button>
                        )}
                        <button
                            type="button"
                            disabled={!!onlineOrderId}
                            onClick={() => setPayMethod('transfer')}
                            className={`px-3 py-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${effectiveMethod === 'transfer' ? 'bg-amber-50 border-amber-400 text-amber-800' : 'bg-white border-slate-200 text-slate-600'}`}
                        >
                            Transferencia
                        </button>
                    </div>

                    {isOnline && (
                        <div className="space-y-3">
                            <div className="p-4 bg-brand-50/60 border border-brand-200 rounded-2xl text-[11px] text-brand-900 font-medium">
                                {walletToUse > 0
                                    ? <>Se usarán <strong className="font-mono">${walletToUse.toLocaleString('es-CO')} COP</strong> de tu billetera y pagarás en línea el excedente de <strong className="font-mono">${surplusToPay.toLocaleString('es-CO')} COP</strong>.</>
                                    : <>Pagarás en línea el total de <strong className="font-mono">${surplusToPay.toLocaleString('es-CO')} COP</strong>.</>}
                                {' '}Las acciones se acreditan solas apenas se confirma el pago.
                            </div>
                            {onlineTooLow ? (
                                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700">
                                    El monto mínimo para pagar en línea es de $5.000 COP. Aumenta la cantidad o elige otro medio de pago.
                                </div>
                            ) : (
                                <YointPaymentWidget
                                    amount={surplusToPay}
                                    payinType="SHARE_PURCHASE"
                                    userPhone={user?.phone_number || ''}
                                    submitButtonText="Pagar y Comprar Acciones"
                                    onRequestCreate={createOnlineOrder}
                                    onSuccess={() => {
                                        setOnlineDone(true);
                                        onSuccess();
                                        onClose();
                                    }}
                                    onFailed={(_status, msg) => {
                                        // El servidor libera la orden cuando el pago falla; permitir un intento nuevo
                                        setOnlineOrderId(null);
                                        if (msg) setError(msg);
                                    }}
                                />
                            )}
                        </div>
                    )}

                    {/* Payment Mode Resolution */}
                    {canPayFullWallet ? (
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-xs font-bold text-emerald-900 font-montserrat">Liquidación Inmediata en Tiempo Real</h4>
                                <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                                    {balanceKnown ? 'Tu saldo disponible cubre el 100% del valor.' : 'Se descontará el 100% del valor de tu billetera; el sistema verifica que tengas fondos suficientes.'} Las acciones se acreditarán a tu portafolio instantáneamente.
                                </p>
                            </div>
                        </div>
                    ) : effectiveMethod === 'transfer' ? (
                        <div className="space-y-4">
                            {/* Surplus breakdown alert */}
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-xs font-bold text-amber-900 font-montserrat">Pago por Transferencia Bancaria</h4>
                                    <p className="text-[11px] text-amber-800 font-medium mt-0.5">
                                        {walletToUse > 0
                                            ? <>Se usarán <strong className="font-mono">${walletToUse.toLocaleString('es-CO')} COP</strong> de tu billetera y deberás consignar un excedente de <strong className="font-mono">${surplusToPay.toLocaleString('es-CO')} COP</strong>.</>
                                            : <>Deberás consignar <strong className="font-mono">${surplusToPay.toLocaleString('es-CO')} COP</strong>.</>}
                                        {' '}Un administrador verificará tu comprobante antes de acreditar las acciones.
                                    </p>
                                </div>
                            </div>

                            {/* Bank details for deposit */}
                            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2 text-xs">
                                <div className="flex items-center gap-2 text-slate-700 font-bold">
                                    <Building2 className="w-4 h-4 text-brand-600" />
                                    <span>Datos Bancarios Oficiales de Gloint para Transferencia</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1">
                                    <div><strong>Banco:</strong> {GLOINT_BANK_INFO.bank}</div>
                                    <div><strong>Tipo:</strong> {GLOINT_BANK_INFO.accountType}</div>
                                    <div className="col-span-2 sm:col-span-1 flex items-center gap-1.5">
                                        <span><strong>No. Cuenta:</strong> <span className="font-mono font-bold text-slate-900 bg-slate-200/70 px-1.5 py-0.5 rounded">{GLOINT_BANK_INFO.accountNumber}</span></span>
                                        <button
                                            type="button"
                                            onClick={() => handleCopy(GLOINT_BANK_INFO.accountNumber, 'acc')}
                                            className="text-slate-400 hover:text-brand-600 transition-colors p-0.5"
                                            title="Copiar Número de Cuenta"
                                        >
                                            {copiedField === 'acc' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span><strong>NIT:</strong> <span className="font-mono font-semibold text-slate-800">{GLOINT_BANK_INFO.nit}</span></span>
                                        <button
                                            type="button"
                                            onClick={() => handleCopy(GLOINT_BANK_INFO.nit, 'nit')}
                                            className="text-slate-400 hover:text-brand-600 transition-colors p-0.5"
                                            title="Copiar NIT"
                                        >
                                            {copiedField === 'nit' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                    <div className="col-span-2 flex items-center gap-1.5">
                                        <span><strong>Titular:</strong> <span className="font-semibold text-slate-800">{GLOINT_BANK_INFO.holder}</span></span>
                                        <button
                                            type="button"
                                            onClick={() => handleCopy(GLOINT_BANK_INFO.holder, 'holder')}
                                            className="text-slate-400 hover:text-brand-600 transition-colors p-0.5"
                                            title="Copiar Titular"
                                        >
                                            {copiedField === 'holder' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* File Upload */}
                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                                    Adjuntar Comprobante de Transferencia (JPG, PNG, PDF) <span className="text-rose-500">*</span>
                                </label>
                                <div className="border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-2xl p-4 text-center cursor-pointer transition-all bg-slate-50/50 hover:bg-brand-50/20 relative">
                                    <input
                                        type="file"
                                        accept="image/*,application/pdf"
                                        onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        required
                                    />
                                    <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-1.5" />
                                    <span className="text-xs font-bold text-slate-700 block truncate">
                                        {receiptFile ? receiptFile.name : "Haz clic o arrastra aquí tu comprobante bancario"}
                                    </span>
                                    <span className="text-[10px] text-slate-400 block mt-0.5">
                                        {receiptFile ? `${(receiptFile.size / 1024 / 1024).toFixed(2)} MB` : "Máximo 10 MB"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {/* Submit Buttons (el pago en línea tiene su propio botón) */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                        >
                            Cancelar
                        </button>
                        {!isOnline && (
                        <button
                            type="submit"
                            disabled={loading || quantity <= 0}
                            className="px-6 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2 font-montserrat"
                        >
                            {loading ? "Procesando..." : (canPayFullWallet ? "Comprar Inmediatamente con Saldo" : "Enviar Comprobante y Reservar Acciones")}
                        </button>
                        )}
                    </div>
                </form>

            </div>
        </div>
    );
};
