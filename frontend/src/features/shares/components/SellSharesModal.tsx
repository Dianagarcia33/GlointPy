import React, { useState } from 'react';
import { X, TrendingUp, AlertCircle, ShieldCheck } from 'lucide-react';
import { shareMarketService, SharePortfolio } from '../../../services/shareMarket';

interface SellSharesModalProps {
    isOpen: boolean;
    onClose: () => void;
    portfolio: SharePortfolio | null;
    onSuccess: () => void;
}

export const SellSharesModal: React.FC<SellSharesModalProps> = ({
    isOpen,
    onClose,
    portfolio,
    onSuccess
}) => {
    const [quantity, setQuantity] = useState<number>(1);
    const [pricePerShare, setPricePerShare] = useState<number>(portfolio?.current_share_price || 50000);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const availableShares = portfolio?.shares_available_for_sale || 0;
    const totalEarnings = (quantity || 0) * (pricePerShare || 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!portfolio?.sales_window_open) {
            setError("La ventana de venta de acciones no está activa según las fechas oficiales del sistema.");
            return;
        }

        if (quantity <= 0) {
            setError("Debes indicar al menos 1 acción para vender.");
            return;
        }

        if (quantity > availableShares) {
            setError(`Solo dispones de ${availableShares} acciones libres para vender.`);
            return;
        }

        if (pricePerShare <= 0) {
            setError("El precio por acción debe ser mayor a cero.");
            return;
        }

        try {
            setLoading(true);
            await shareMarketService.createListing(quantity, pricePerShare);
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || "Error al publicar la oferta de venta.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative space-y-6">
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/60">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-900 font-montserrat">Poner Acciones a la Venta</h3>
                            <p className="text-xs text-slate-500 font-medium">Publica tu oferta en el mercado secundario</p>
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

                {/* Info Card */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Acciones Libres en Custodia</span>
                        <span className="text-xl font-black text-slate-900 font-mono">{availableShares} Acciones</span>
                    </div>
                    <div className="text-right">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Precio Oficial Referencial</span>
                        <span className="text-sm font-extrabold text-emerald-600 font-mono">${(portfolio?.current_share_price || 50000).toLocaleString('es-CO')} COP</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-bold text-slate-700">Cantidad de Acciones a Vender</label>
                            <button
                                type="button"
                                onClick={() => setQuantity(availableShares)}
                                className="text-[11px] font-extrabold text-brand-600 hover:text-brand-700 hover:underline cursor-pointer"
                            >
                                Vender Todas ({availableShares})
                            </button>
                        </div>
                        <input
                            type="number"
                            min={1}
                            max={availableShares}
                            value={quantity || ''}
                            onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-brand-500 focus:bg-white outline-hidden transition-all text-sm font-mono"
                            placeholder="Ej. 10"
                            required
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1.5">Precio Unitario por Acción ($ COP)</label>
                        <input
                            type="number"
                            min={1}
                            value={pricePerShare || ''}
                            onChange={(e) => setPricePerShare(parseFloat(e.target.value) || 0)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-brand-500 focus:bg-white outline-hidden transition-all text-sm font-mono"
                            placeholder="Ej. 50000"
                            required
                        />
                    </div>

                    {/* Resumen Calculado */}
                    <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4 space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-emerald-900">
                            <span className="font-semibold">Monto Total a Recibir al Venderse:</span>
                            <span className="text-base font-black font-mono text-emerald-700">
                                ${totalEarnings.toLocaleString('es-CO')} COP
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-emerald-700/90 font-medium">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>El dinero se abonará automáticamente a tu Billetera Gloint cuando otro inversionista compre tu oferta.</span>
                        </div>
                    </div>

                    {/* Footer Buttons */}
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
                            disabled={loading || availableShares === 0 || !portfolio?.sales_window_open}
                            className="px-6 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2 font-montserrat"
                        >
                            {loading ? "Publicando..." : "Publicar Oferta en el Mercado"}
                        </button>
                    </div>
                </form>

            </div>
        </div>
    );
};
