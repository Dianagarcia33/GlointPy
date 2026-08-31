import React, { useState } from 'react';
import { X, ShoppingBag, Wallet, Building2, UploadCloud, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { shareMarketService, ShareListing } from '../../../services/shareMarket';

interface BuySharesModalProps {
    isOpen: boolean;
    onClose: () => void;
    listing: ShareListing | null;
    userWalletBalance: number;
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
    const [useAllWallet, setUseAllWallet] = useState<boolean>(true);
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen || !listing) return null;

    const maxAvailable = listing.shares_available || 0;
    const unitPrice = listing.price_per_share || 0;
    const totalCost = (quantity || 0) * unitPrice;

    // Cálculo de saldo vs excedente
    const canPayFullWallet = userWalletBalance >= totalCost;
    const walletToUse = canPayFullWallet 
        ? totalCost 
        : (useAllWallet ? Math.min(userWalletBalance, totalCost) : 0);
    const surplusToPay = Math.max(0, totalCost - walletToUse);

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
                        onClick={onClose}
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
                                ${userWalletBalance.toLocaleString('es-CO')} COP
                            </span>
                        </div>
                    </div>

                    {/* Payment Mode Resolution */}
                    {canPayFullWallet ? (
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-xs font-bold text-emerald-900 font-montserrat">Liquidación Inmediata en Tiempo Real</h4>
                                <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                                    Tu saldo disponible cubre el 100% del valor. Las acciones se acreditarán a tu portafolio instantáneamente.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Surplus breakdown alert */}
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-xs font-bold text-amber-900 font-montserrat">Pago con Excedente Bancario</h4>
                                    <p className="text-[11px] text-amber-800 font-medium mt-0.5">
                                        Se usarán <strong className="font-mono">${walletToUse.toLocaleString('es-CO')} COP</strong> de tu billetera y deberás consignar un excedente de <strong className="font-mono">${surplusToPay.toLocaleString('es-CO')} COP</strong>.
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
                                    <div><strong>Banco:</strong> Bancolombia</div>
                                    <div><strong>Tipo:</strong> Cuenta de Ahorros</div>
                                    <div><strong>Titular:</strong> Gloint S.A.S.</div>
                                    <div><strong>NIT:</strong> 901.554.892-1</div>
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
                    )}

                    {/* Submit Buttons */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading || quantity <= 0}
                            className="px-6 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2 font-montserrat"
                        >
                            {loading ? "Procesando..." : (canPayFullWallet ? "Comprar Inmediatamente con Saldo" : "Enviar Comprobante y Reservar Acciones")}
                        </button>
                    </div>
                </form>

            </div>
        </div>
    );
};
