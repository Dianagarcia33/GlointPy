import React, { useState, useEffect } from 'react';
import { 
    TrendingUp, 
    ShoppingBag, 
    Layers, 
    Calendar, 
    Clock, 
    CheckCircle2, 
    AlertCircle, 
    ShieldAlert, 
    Plus, 
    Trash2, 
    ArrowUpRight, 
    ArrowDownLeft, 
    FileText, 
    Sparkles, 
    RefreshCw,
    Wallet
} from 'lucide-react';
import { shareMarketService, SharePortfolio, ShareListing, ShareTradeOrder, SharePriceHistory } from '../../../services/shareMarket';
import { getMyWallet } from '../../../services/wallets';
import { SellSharesModal } from '../components/SellSharesModal';
import { BuySharesModal } from '../components/BuySharesModal';

export const SharesMarketPage: React.FC = () => {
    const [portfolio, setPortfolio] = useState<SharePortfolio | null>(null);
    const [listings, setListings] = useState<ShareListing[]>([]);
    const [myOrders, setMyOrders] = useState<ShareTradeOrder[]>([]);
    const [priceHistory, setPriceHistory] = useState<SharePriceHistory[]>([]);
    const [walletBalance, setWalletBalance] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    const [activeTab, setActiveTab] = useState<'market' | 'my_listings' | 'orders' | 'history'>('market');
    const [isSellModalOpen, setIsSellModalOpen] = useState(false);
    const [selectedListingForBuy, setSelectedListingForBuy] = useState<ShareListing | null>(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [pData, lData, oData, hData, wData] = await Promise.all([
                shareMarketService.getPortfolio(),
                shareMarketService.getListings(),
                shareMarketService.getMyOrders(),
                shareMarketService.getPriceHistory(),
                getMyWallet().catch(() => ({ balance: 0 }))
            ]);
            setPortfolio(pData);
            setListings(lData);
            setMyOrders(oData);
            setPriceHistory(hData);
            setWalletBalance(typeof wData.balance === 'number' ? wData.balance : parseFloat(wData.balance || '0'));
        } catch (error) {
            console.error("Error fetching share market data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCancelListing = async (listingId: number) => {
        if (!confirm("¿Estás seguro de que deseas retirar esta oferta de venta?")) return;
        try {
            await shareMarketService.cancelListing(listingId);
            await fetchData();
        } catch (err: any) {
            alert(err.message || "Error al cancelar la oferta.");
        }
    };

    const myListings = listings.filter(l => l.is_mine);
    const marketListings = listings.filter(l => !l.is_mine);

    return (
        <div className="w-full max-w-7xl mx-auto min-w-0 pb-20 space-y-6 animate-in fade-in duration-300">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
                            Mercado de Acciones Gloint
                        </span>
                        {portfolio?.sales_window_open ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Ventana de Venta Abierta
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                                <Calendar className="w-3 h-3 text-slate-500" />
                                Ventana de Venta Cerrada
                            </span>
                        )}
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-montserrat tracking-tight mt-1">
                        Compra y Venta de Acciones
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                        Negocia tus títulos accionarios en tiempo real y gestiona tu custodia en Gloint
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchData}
                        className="p-2.5 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 rounded-2xl hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
                        title="Actualizar datos"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => setIsSellModalOpen(true)}
                        disabled={!portfolio?.sales_window_open || (portfolio?.shares_available_for_sale || 0) <= 0}
                        className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-2xl text-xs font-bold transition-all shadow-sm shadow-brand-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed font-montserrat"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Poner Acciones a la Venta</span>
                    </button>
                </div>
            </div>

            {/* Alerta si la ventana de venta está cerrada */}
            {!portfolio?.sales_window_open && (
                <div className="p-4 bg-slate-100 border border-slate-200/80 rounded-2xl flex items-start gap-3 text-xs text-slate-700">
                    <Clock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                    <div>
                        <span className="font-bold">Aviso sobre venta de acciones:</span> {portfolio?.sales_window_message || "La creación de nuevas ofertas de venta solo está permitida durante las fechas habilitadas por el sistema. Sin embargo, puedes comprar las ofertas disponibles en el mercado en cualquier momento."}
                    </div>
                </div>
            )}

            {/* Resumen de Portafolio de Acciones */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Acciones en Propiedad</span>
                        <Layers className="w-4 h-4 text-brand-600" />
                    </div>
                    <span className="text-2xl font-black text-slate-900 font-mono block">
                        {portfolio?.total_shares_owned || 0}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium block">Títulos valores en custodia</span>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Acciones Libres para Venta</span>
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                    </div>
                    <span className="text-2xl font-black text-emerald-600 font-mono block">
                        {portfolio?.shares_available_for_sale || 0}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium block">Disponibles sin publicar</span>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Precio Oficial por Acción</span>
                        <Sparkles className="w-4 h-4 text-amber-500" />
                    </div>
                    <span className="text-2xl font-black text-amber-600 font-mono block">
                        ${(portfolio?.current_share_price || 50000).toLocaleString('es-CO')}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium block">Valor oficial de referencia</span>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Valor de mi Portafolio</span>
                        <Wallet className="w-4 h-4 text-indigo-600" />
                    </div>
                    <span className="text-2xl font-black text-indigo-700 font-mono block">
                        ${(portfolio?.portfolio_market_value || 0).toLocaleString('es-CO')}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium block">Valorización estimada en COP</span>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 p-1.5 bg-slate-100/80 rounded-2xl w-fit border border-slate-200/80">
                <button
                    onClick={() => setActiveTab('market')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer font-montserrat ${
                        activeTab === 'market' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                    Mercado de Acciones ({marketListings.length})
                </button>
                <button
                    onClick={() => setActiveTab('my_listings')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer font-montserrat ${
                        activeTab === 'my_listings' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                    Mis Ofertas en Venta ({myListings.length})
                </button>
                <button
                    onClick={() => setActiveTab('orders')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer font-montserrat ${
                        activeTab === 'orders' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                    Mis Transacciones ({myOrders.length})
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer font-montserrat ${
                        activeTab === 'history' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                    Valorización Oficial ({priceHistory.length})
                </button>
            </div>

            {/* TAB CONTENT: MERCADO DE OFERTAS */}
            {activeTab === 'market' && (
                <div className="space-y-4">
                    {marketListings.length === 0 ? (
                        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
                            <div className="w-14 h-14 rounded-3xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto">
                                <ShoppingBag className="w-7 h-7" />
                            </div>
                            <h3 className="text-base font-bold text-slate-800 font-montserrat">No hay ofertas de acciones publicadas en este momento</h3>
                            <p className="text-xs text-slate-500 max-w-md mx-auto font-medium">
                                Cuando otros inversionistas pongan a la venta sus acciones dentro de la ventana de fechas, podrás verlas aquí y comprarlas en tiempo real.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {marketListings.map((listing) => (
                                <div key={listing.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-5">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                Disponible
                                            </span>
                                            <span className="text-xs text-slate-400 font-mono">
                                                {new Date(listing.created_at).toLocaleDateString('es-CO')}
                                            </span>
                                        </div>

                                        <div>
                                            <span className="text-xs text-slate-500 font-semibold block">Vendedor:</span>
                                            <h4 className="text-base font-black text-slate-900 font-montserrat truncate">
                                                {listing.seller_name}
                                            </h4>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 bg-slate-50 rounded-2xl p-3.5 border border-slate-100">
                                            <div>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Acciones</span>
                                                <span className="text-base font-black text-slate-900 font-mono">{listing.shares_available} Acciones</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Precio Unitario</span>
                                                <span className="text-base font-black text-brand-600 font-mono">${listing.price_per_share.toLocaleString('es-CO')}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                                        <div>
                                            <span className="text-[10px] text-slate-400 font-medium block">Valor Total Lote</span>
                                            <span className="text-sm font-extrabold text-slate-900 font-mono">
                                                ${listing.total_value.toLocaleString('es-CO')} COP
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => setSelectedListingForBuy(listing)}
                                            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 font-montserrat"
                                        >
                                            <ShoppingBag className="w-3.5 h-3.5" />
                                            <span>Comprar</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* TAB CONTENT: MIS OFERTAS EN VENTA */}
            {activeTab === 'my_listings' && (
                <div className="space-y-4">
                    {myListings.length === 0 ? (
                        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
                            <div className="w-14 h-14 rounded-3xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto">
                                <TrendingUp className="w-7 h-7" />
                            </div>
                            <h3 className="text-base font-bold text-slate-800 font-montserrat">No tienes ofertas de venta publicadas actualmente</h3>
                            <p className="text-xs text-slate-500 max-w-md mx-auto font-medium">
                                Si deseas vender parte de tus acciones en custodia, utiliza el botón "Poner Acciones a la Venta" en la parte superior.
                            </p>
                        </div>
                    ) : (
                        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-100 bg-slate-50/75 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                                            <th className="p-4 pl-6">Fecha Publicación</th>
                                            <th className="p-4">Acciones Ofertadas</th>
                                            <th className="p-4">Disponibles</th>
                                            <th className="p-4">En Retención (Escrow)</th>
                                            <th className="p-4">Precio Unitario</th>
                                            <th className="p-4">Total Lote</th>
                                            <th className="p-4">Estado</th>
                                            <th className="p-4 pr-6 text-right">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                        {myListings.map((l) => (
                                            <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="p-4 pl-6 font-mono text-slate-500">
                                                    {new Date(l.created_at).toLocaleDateString('es-CO')}
                                                </td>
                                                <td className="p-4 font-bold font-mono text-slate-900">{l.shares_total}</td>
                                                <td className="p-4 font-bold font-mono text-emerald-600">{l.shares_available}</td>
                                                <td className="p-4 font-bold font-mono text-amber-600">{l.shares_locked}</td>
                                                <td className="p-4 font-bold font-mono">${l.price_per_share.toLocaleString('es-CO')} COP</td>
                                                <td className="p-4 font-bold font-mono">${l.total_value.toLocaleString('es-CO')} COP</td>
                                                <td className="p-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                                        l.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                                                    }`}>
                                                        {l.status === 'active' ? 'Activa en Mercado' : l.status}
                                                    </span>
                                                </td>
                                                <td className="p-4 pr-6 text-right">
                                                    {l.status === 'active' && l.shares_locked === 0 && (
                                                        <button
                                                            onClick={() => handleCancelListing(l.id)}
                                                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                                                            title="Retirar oferta"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB CONTENT: MIS TRANSACCIONES */}
            {activeTab === 'orders' && (
                <div className="space-y-4">
                    {myOrders.length === 0 ? (
                        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
                            <div className="w-14 h-14 rounded-3xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto">
                                <FileText className="w-7 h-7" />
                            </div>
                            <h3 className="text-base font-bold text-slate-800 font-montserrat">Aún no tienes compras ni ventas registradas</h3>
                            <p className="text-xs text-slate-500 max-w-md mx-auto font-medium">
                                Todas tus operaciones y órdenes de compraventa quedarán registradas aquí con su respectivo comprobante.
                            </p>
                        </div>
                    ) : (
                        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-100 bg-slate-50/75 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                                            <th className="p-4 pl-6">Tipo / Fecha</th>
                                            <th className="p-4">Contraparte</th>
                                            <th className="p-4">Acciones</th>
                                            <th className="p-4">Precio Unitario</th>
                                            <th className="p-4">Total</th>
                                            <th className="p-4">Método de Pago</th>
                                            <th className="p-4">Estado</th>
                                            <th className="p-4 pr-6">Comprobante / Detalle</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                        {myOrders.map((o) => {
                                            const isBuyer = o.buyer_id === portfolio?.total_shares_owned; // helper check
                                            return (
                                                <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="p-4 pl-6">
                                                        <div className="flex items-center gap-2">
                                                            {o.buyer_name?.includes("Tú") || o.buyer_id ? (
                                                                <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                                                            ) : (
                                                                <ArrowUpRight className="w-4 h-4 text-amber-600" />
                                                            )}
                                                            <div>
                                                                <span className="font-bold text-slate-900 block">
                                                                    Compra #{o.id}
                                                                </span>
                                                                <span className="text-[10px] text-slate-400 font-mono">
                                                                    {new Date(o.created_at).toLocaleDateString('es-CO')}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="text-slate-800 font-bold block">{o.seller_name || "Gloint Oficial"}</span>
                                                    </td>
                                                    <td className="p-4 font-bold font-mono text-slate-900">{o.shares_quantity}</td>
                                                    <td className="p-4 font-mono">${o.price_per_share.toLocaleString('es-CO')}</td>
                                                    <td className="p-4 font-bold font-mono text-slate-900">${o.total_amount.toLocaleString('es-CO')} COP</td>
                                                    <td className="p-4">
                                                        <span className="text-[11px] text-slate-600 font-medium">
                                                            {o.payment_method === 'full_wallet' ? '100% Saldo Billetera' : 'Excedente Bancario'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4">
                                                        {o.status === 'completed' && (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                <CheckCircle2 className="w-3 h-3" /> Completada
                                                            </span>
                                                        )}
                                                        {o.status === 'pending_admin_approval' && (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
                                                                <Clock className="w-3 h-3" /> Pendiente Verificación
                                                            </span>
                                                        )}
                                                        {o.status === 'rejected' && (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                                                                <AlertCircle className="w-3 h-3" /> Rechazada
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-4 pr-6">
                                                        {o.receipt_url && (
                                                            <a
                                                                href={o.receipt_url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="text-brand-600 hover:text-brand-700 font-bold hover:underline text-[11px] inline-flex items-center gap-1"
                                                            >
                                                                <FileText className="w-3.5 h-3.5" /> Ver Comprobante
                                                            </a>
                                                        )}
                                                        {o.admin_notes && (
                                                            <span className="text-[10px] text-slate-400 block mt-0.5 italic">
                                                                Nota: {o.admin_notes}
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB CONTENT: VALORIZACIÓN Y JUSTIFICACIONES */}
            {activeTab === 'history' && (
                <div className="space-y-4">
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
                        <div>
                            <h3 className="text-lg font-black text-slate-900 font-montserrat">Bitácora Oficial de Valorización Accionaria</h3>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                                Registro inmutable de cada actualización en el valor oficial de la acción respaldado con sus notas de auditoría.
                            </p>
                        </div>

                        {priceHistory.length === 0 ? (
                            <div className="p-6 bg-slate-50 rounded-2xl text-center text-xs text-slate-500">
                                El valor inicial referencial de la acción se mantiene en $50.000 COP.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {priceHistory.map((item, idx) => (
                                    <div key={item.id} className="p-5 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-2">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-base font-black text-slate-900 font-mono">
                                                    ${item.new_price.toLocaleString('es-CO')} COP
                                                </span>
                                                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full font-mono ${
                                                    item.change_percentage >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                                                }`}>
                                                    {item.change_percentage >= 0 ? `+${item.change_percentage}%` : `${item.change_percentage}%`}
                                                </span>
                                            </div>
                                            <div className="text-xs text-slate-400 font-mono">
                                                {new Date(item.created_at).toLocaleString('es-CO')} • Por: <strong className="text-slate-600 font-sans">{item.admin_name}</strong>
                                            </div>
                                        </div>

                                        <div className="text-xs text-slate-700 pt-1">
                                            <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block mb-0.5">Motivo / Justificación Oficial:</span>
                                            <p className="bg-white p-3 rounded-xl border border-slate-200 text-slate-800 font-medium">
                                                "{item.justification_notes}"
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modals */}
            <SellSharesModal
                isOpen={isSellModalOpen}
                onClose={() => setIsSellModalOpen(false)}
                portfolio={portfolio}
                onSuccess={fetchData}
            />

            <BuySharesModal
                isOpen={!!selectedListingForBuy}
                onClose={() => setSelectedListingForBuy(null)}
                listing={selectedListingForBuy}
                userWalletBalance={walletBalance}
                onSuccess={fetchData}
            />

        </div>
    );
};
