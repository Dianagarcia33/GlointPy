import React, { useState, useEffect } from 'react';
import { 
    Layers, 
    TrendingUp, 
    CheckCircle2, 
    XCircle, 
    FileText, 
    AlertCircle, 
    Sparkles, 
    Plus, 
    Eye, 
    DollarSign, 
    ShieldCheck, 
    Clock, 
    RefreshCw,
    X,
    User
} from 'lucide-react';
import { shareMarketService, ShareTradeOrder, SharePriceHistory, ShareIssuance } from '../../../../services/shareMarket';

export const AdminSharesPage: React.FC = () => {
    const [pendingOrders, setPendingOrders] = useState<ShareTradeOrder[]>([]);
    const [allOrders, setAllOrders] = useState<ShareTradeOrder[]>([]);
    const [priceHistory, setPriceHistory] = useState<SharePriceHistory[]>([]);
    const [issuances, setIssuances] = useState<ShareIssuance[]>([]);
    const [loading, setLoading] = useState(true);

    // Formulario de Valoración
    const [newPrice, setNewPrice] = useState<number | ''>('');
    const [justificationNotes, setJustificationNotes] = useState<string>('');
    const [priceLoading, setPriceLoading] = useState(false);
    const [priceSuccess, setPriceSuccess] = useState(false);
    const [priceError, setPriceError] = useState<string | null>(null);

    // Modal de Emisión de Acciones
    const [isIssuanceModalOpen, setIsIssuanceModalOpen] = useState(false);
    const [issuanceTitle, setIssuanceTitle] = useState('');
    const [issuanceDescription, setIssuanceDescription] = useState('');
    const [issuanceQuantity, setIssuanceQuantity] = useState<number | ''>('');
    const [issuancePrice, setIssuancePrice] = useState<number | ''>('');
    const [issuanceLoading, setIssuanceLoading] = useState(false);

    // Modal de Visualización de Comprobante / Decisión
    const [selectedOrder, setSelectedOrder] = useState<ShareTradeOrder | null>(null);
    const [decisionAction, setDecisionAction] = useState<'approve' | 'reject' | null>(null);
    const [decisionNotes, setDecisionNotes] = useState('');
    const [decisionLoading, setDecisionLoading] = useState(false);

    const [activeTab, setActiveTab] = useState<'pending' | 'valuation' | 'issuances' | 'audit'>('pending');

    const fetchData = async () => {
        try {
            setLoading(true);
            const [pOrders, aOrders, pHist, iss] = await Promise.all([
                shareMarketService.getPendingOrders(),
                shareMarketService.getAllAdminOrders(),
                shareMarketService.getPriceHistory(),
                shareMarketService.getIssuances()
            ]);
            setPendingOrders(pOrders);
            setAllOrders(aOrders);
            setPriceHistory(pHist);
            setIssuances(iss);
        } catch (error) {
            console.error("Error loading admin shares data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const currentPrice = priceHistory[0]?.new_price || 50000;

    const handleUpdatePrice = async (e: React.FormEvent) => {
        e.preventDefault();
        setPriceError(null);
        setPriceSuccess(false);

        if (!newPrice || Number(newPrice) <= 0) {
            setPriceError("Ingresa un precio válido mayor a 0.");
            return;
        }

        if (!justificationNotes || justificationNotes.trim().length < 5) {
            setPriceError("Es obligatorio ingresar un motivo o justificación detallada para el cambio de precio.");
            return;
        }

        try {
            setPriceLoading(true);
            await shareMarketService.updateOfficialPrice(Number(newPrice), justificationNotes);
            setPriceSuccess(true);
            setNewPrice('');
            setJustificationNotes('');
            await fetchData();
        } catch (err: any) {
            setPriceError(err.message || "Error al actualizar el precio.");
        } finally {
            setPriceLoading(false);
        }
    };

    const handleCreateIssuance = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!issuanceTitle || !issuanceQuantity || !issuancePrice) return;

        try {
            setIssuanceLoading(true);
            await shareMarketService.createIssuance({
                title: issuanceTitle,
                description: issuanceDescription,
                total_shares_issued: Number(issuanceQuantity),
                price_per_share: Number(issuancePrice)
            });
            setIsIssuanceModalOpen(false);
            setIssuanceTitle('');
            setIssuanceDescription('');
            setIssuanceQuantity('');
            setIssuancePrice('');
            await fetchData();
        } catch (err: any) {
            alert(err.message || "Error al emitir acciones.");
        } finally {
            setIssuanceLoading(false);
        }
    };

    const handleExecuteDecision = async () => {
        if (!selectedOrder || !decisionAction) return;

        try {
            setDecisionLoading(true);
            await shareMarketService.decideTradeOrder(selectedOrder.id, decisionAction, decisionNotes);
            setSelectedOrder(null);
            setDecisionAction(null);
            setDecisionNotes('');
            await fetchData();
        } catch (err: any) {
            alert(err.message || "Error al procesar la orden.");
        } finally {
            setDecisionLoading(false);
        }
    };

    return (
        <div className="w-full max-w-7xl mx-auto min-w-0 pb-20 space-y-6 animate-in fade-in duration-300">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-slate-900 text-white">
                            Administración Central
                        </span>
                        {pendingOrders.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 animate-pulse">
                                <Clock className="w-3 h-3 text-amber-600" />
                                {pendingOrders.length} {pendingOrders.length === 1 ? 'Compra pendiente' : 'Compras pendientes'}
                            </span>
                        )}
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-montserrat tracking-tight mt-1">
                        Gestión del Mercado de Acciones
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                        Supervisa emisiones, valoración oficial con bitácora obligatoria y aprueba pagos con excedente
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
                        onClick={() => setIsIssuanceModalOpen(true)}
                        className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer font-montserrat"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Nueva Emisión de Acciones</span>
                    </button>
                </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Precio Oficial Actual</span>
                    <span className="text-2xl font-black text-emerald-600 font-mono block">
                        ${currentPrice.toLocaleString('es-CO')} COP
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium block">Valoración de referencia</span>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Órdenes Pendientes</span>
                    <span className="text-2xl font-black text-amber-600 font-mono block">
                        {pendingOrders.length}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium block">Por verificar comprobante</span>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Operaciones</span>
                    <span className="text-2xl font-black text-slate-900 font-mono block">
                        {allOrders.length}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium block">Compras y transferencias</span>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Emisiones Corporativas</span>
                    <span className="text-2xl font-black text-brand-600 font-mono block">
                        {issuances.length}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium block">Lotes de títulos activos</span>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 p-1.5 bg-slate-100/80 rounded-2xl w-fit border border-slate-200/80">
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer font-montserrat ${
                        activeTab === 'pending' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                    Aprobación de Excedentes ({pendingOrders.length})
                </button>
                <button
                    onClick={() => setActiveTab('valuation')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer font-montserrat ${
                        activeTab === 'valuation' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                    Valoración & Justificación Obligatoria
                </button>
                <button
                    onClick={() => setActiveTab('issuances')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer font-montserrat ${
                        activeTab === 'issuances' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                    Emisiones de Acciones ({issuances.length})
                </button>
                <button
                    onClick={() => setActiveTab('audit')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer font-montserrat ${
                        activeTab === 'audit' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                    Libro Mayor de Operaciones ({allOrders.length})
                </button>
            </div>

            {/* TAB CONTENT: BANDEJA DE APROBACIÓN DE EXCEDENTES */}
            {activeTab === 'pending' && (
                <div className="space-y-4">
                    {pendingOrders.length === 0 ? (
                        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
                            <div className="w-14 h-14 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                                <CheckCircle2 className="w-7 h-7" />
                            </div>
                            <h3 className="text-base font-bold text-slate-800 font-montserrat">Bandeja de verificación al día</h3>
                            <p className="text-xs text-slate-500 max-w-md mx-auto font-medium">
                                No hay compras de acciones con comprobante bancario pendientes de aprobación en este momento.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {pendingOrders.map((order) => (
                                <div key={order.id} className="bg-white border border-amber-200 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all space-y-4">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                        <div>
                                            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                                                Orden #{order.id} • Pendiente Aprobación
                                            </span>
                                            <h4 className="text-sm font-bold text-slate-900 font-montserrat mt-1">
                                                Comprador: {order.buyer_name}
                                            </h4>
                                        </div>
                                        <span className="text-xs text-slate-400 font-mono">
                                            {new Date(order.created_at).toLocaleDateString('es-CO')}
                                        </span>
                                    </div>

                                    {/* Comprador & Vendedor breakdown */}
                                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                                        <div>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Cédula / Documento</span>
                                            <span className="font-bold text-slate-800 font-mono">{order.buyer_document || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Vendedor</span>
                                            <span className="font-bold text-slate-800 truncate block">{order.seller_name || 'Gloint'}</span>
                                        </div>
                                    </div>

                                    {/* Financial Breakdown */}
                                    <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-2 text-xs">
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-400">Acciones a Transferir:</span>
                                            <span className="font-bold font-mono text-base text-amber-400">{order.shares_quantity} Acciones</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-400">Saldo Billetera Usado:</span>
                                            <span className="font-mono text-emerald-400">${order.wallet_amount_used.toLocaleString('es-CO')} COP</span>
                                        </div>
                                        <div className="flex items-center justify-between pt-1 border-t border-slate-800 font-bold">
                                            <span className="text-slate-300">Excedente por Verificar:</span>
                                            <span className="font-mono text-base text-white">${order.surplus_amount.toLocaleString('es-CO')} COP</span>
                                        </div>
                                    </div>

                                    {/* Actions & Receipt */}
                                    <div className="flex items-center justify-between gap-3 pt-2">
                                        {order.receipt_url && (
                                            <a
                                                href={order.receipt_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                <span>Ver Comprobante</span>
                                            </a>
                                        )}

                                        <div className="flex items-center gap-2 ml-auto">
                                            <button
                                                onClick={() => {
                                                    setSelectedOrder(order);
                                                    setDecisionAction('reject');
                                                }}
                                                className="px-3.5 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                            >
                                                Rechazar
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedOrder(order);
                                                    setDecisionAction('approve');
                                                }}
                                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer font-montserrat"
                                            >
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                <span>Aprobar Transferencia</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* TAB CONTENT: VALORACIÓN & JUSTIFICACIÓN OBLIGATORIA */}
            {activeTab === 'valuation' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* Formulario de Actualización */}
                    <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xs h-fit">
                        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                            <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
                                <DollarSign className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-slate-900 font-montserrat">Actualizar Valor Oficial de la Acción</h3>
                                <p className="text-xs text-slate-500 font-medium">Define el precio de referencia en la plataforma</p>
                            </div>
                        </div>

                        {priceSuccess && (
                            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>¡Precio oficial actualizado exitosamente y registrado en la bitácora!</span>
                            </div>
                        )}

                        {priceError && (
                            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                <span>{priceError}</span>
                            </div>
                        )}

                        <form onSubmit={handleUpdatePrice} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                                    Nuevo Precio por Acción ($ COP) <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    value={newPrice}
                                    onChange={(e) => setNewPrice(parseFloat(e.target.value) || '')}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-brand-500 focus:bg-white outline-hidden transition-all text-sm font-mono"
                                    placeholder={`Precio actual: $${currentPrice.toLocaleString('es-CO')} COP`}
                                    required
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-xs font-bold text-slate-700">
                                        Motivo / Justificación Obligatoria <span className="text-rose-500">*</span>
                                    </label>
                                    <span className="text-[10px] text-slate-400 font-medium">Requerido por auditoría</span>
                                </div>
                                <textarea
                                    rows={4}
                                    value={justificationNotes}
                                    onChange={(e) => setJustificationNotes(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-medium focus:ring-2 focus:ring-brand-500 focus:bg-white outline-hidden transition-all text-xs"
                                    placeholder="Explica detalladamente la razón financiera, balance corporativo o revalorización de la empresa para este cambio de precio..."
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={priceLoading || !newPrice || !justificationNotes.trim()}
                                className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 font-montserrat"
                            >
                                {priceLoading ? "Guardando en Bitácora..." : "Actualizar y Registrar en Auditoría"}
                            </button>
                        </form>
                    </div>

                    {/* Timeline de Cambios */}
                    <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xs">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <div>
                                <h3 className="text-base font-black text-slate-900 font-montserrat">Historial de Valoraciones & Auditoría</h3>
                                <p className="text-xs text-slate-500 font-medium">Bitácora inmutable de cambios de precio</p>
                            </div>
                            <span className="text-xs font-mono text-slate-400 font-bold">{priceHistory.length} Registros</span>
                        </div>

                        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                            {priceHistory.map((item) => (
                                <div key={item.id} className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-black text-slate-900 text-sm">
                                                ${item.new_price.toLocaleString('es-CO')} COP
                                            </span>
                                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full font-mono ${
                                                item.change_percentage >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                                            }`}>
                                                {item.change_percentage >= 0 ? `+${item.change_percentage}%` : `${item.change_percentage}%`}
                                            </span>
                                        </div>
                                        <span className="text-[11px] text-slate-400 font-mono">
                                            {new Date(item.created_at).toLocaleString('es-CO')}
                                        </span>
                                    </div>
                                    <div className="text-xs bg-white p-3 rounded-xl border border-slate-200 text-slate-700 font-medium">
                                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Admin: {item.admin_name}</span>
                                        "{item.justification_notes}"
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            )}

            {/* TAB CONTENT: EMISIONES */}
            {activeTab === 'issuances' && (
                <div className="space-y-4">
                    {issuances.length === 0 ? (
                        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
                            <div className="w-14 h-14 rounded-3xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto">
                                <Layers className="w-7 h-7" />
                            </div>
                            <h3 className="text-base font-bold text-slate-800 font-montserrat">No hay emisiones corporativas creadas</h3>
                            <p className="text-xs text-slate-500 max-w-md mx-auto font-medium">
                                Utiliza el botón "Nueva Emisión de Acciones" para lanzar lotes de títulos primarios.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {issuances.map((iss) => (
                                <div key={iss.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
                                            Emisión #{iss.id}
                                        </span>
                                        <span className="text-xs text-slate-400 font-mono">
                                            {new Date(iss.created_at).toLocaleDateString('es-CO')}
                                        </span>
                                    </div>

                                    <div>
                                        <h4 className="text-base font-black text-slate-900 font-montserrat">{iss.title}</h4>
                                        {iss.description && <p className="text-xs text-slate-500 font-medium mt-1">{iss.description}</p>}
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl text-xs">
                                        <div>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Emitidas</span>
                                            <span className="font-mono font-bold text-slate-900">{iss.total_shares_issued}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Disponibles</span>
                                            <span className="font-mono font-bold text-emerald-600">{iss.available_shares}</span>
                                        </div>
                                    </div>

                                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                                        <span className="text-slate-500 font-medium">Precio Unitario:</span>
                                        <span className="font-mono font-black text-slate-900 text-sm">
                                            ${iss.price_per_share.toLocaleString('es-CO')} COP
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* TAB CONTENT: LIBRO MAYOR DE AUDITORÍA */}
            {activeTab === 'audit' && (
                <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/75 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                                    <th className="p-4 pl-6">ID / Fecha</th>
                                    <th className="p-4">Comprador</th>
                                    <th className="p-4">Vendedor</th>
                                    <th className="p-4">Acciones</th>
                                    <th className="p-4">Precio Unitario</th>
                                    <th className="p-4">Total COP</th>
                                    <th className="p-4">Método</th>
                                    <th className="p-4">Estado</th>
                                    <th className="p-4 pr-6">Comprobante / Admin</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                {allOrders.map((o) => (
                                    <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4 pl-6 font-mono text-slate-500">
                                            #{o.id} • {new Date(o.created_at).toLocaleDateString('es-CO')}
                                        </td>
                                        <td className="p-4">
                                            <span className="font-bold text-slate-900 block">{o.buyer_name}</span>
                                            <span className="text-[10px] text-slate-400 font-mono">{o.buyer_email}</span>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-slate-700 block">{o.seller_name || "Gloint Oficial"}</span>
                                        </td>
                                        <td className="p-4 font-bold font-mono text-slate-900">{o.shares_quantity}</td>
                                        <td className="p-4 font-mono">${o.price_per_share.toLocaleString('es-CO')}</td>
                                        <td className="p-4 font-bold font-mono text-slate-900">${o.total_amount.toLocaleString('es-CO')}</td>
                                        <td className="p-4 text-[11px]">
                                            {o.payment_method === 'full_wallet' ? '100% Saldo' : 'Excedente'}
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                                o.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                                o.status === 'pending_admin_approval' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                                            }`}>
                                                {o.status === 'completed' ? 'Completada' : o.status === 'pending_admin_approval' ? 'Pendiente' : 'Rechazada'}
                                            </span>
                                        </td>
                                        <td className="p-4 pr-6">
                                            {o.receipt_url && (
                                                <a href={o.receipt_url} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline font-bold text-[11px] block">
                                                    Ver Comprobante
                                                </a>
                                            )}
                                            {o.approver_name && (
                                                <span className="text-[10px] text-slate-400 block font-mono">Por: {o.approver_name}</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal de Emisión */}
            {isIssuanceModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative space-y-5">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <h3 className="text-base font-black text-slate-900 font-montserrat">Emitir Nuevo Lote de Acciones</h3>
                            <button onClick={() => setIsIssuanceModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateIssuance} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1">Título de la Emisión</label>
                                <input
                                    type="text"
                                    value={issuanceTitle}
                                    onChange={(e) => setIssuanceTitle(e.target.value)}
                                    placeholder="Ej. Emisión Serie 2026 - Expansión"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-brand-500 outline-hidden"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1">Descripción (Opcional)</label>
                                <textarea
                                    rows={2}
                                    value={issuanceDescription}
                                    onChange={(e) => setIssuanceDescription(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-brand-500 outline-hidden"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1">Total Acciones</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={issuanceQuantity}
                                        onChange={(e) => setIssuanceQuantity(parseInt(e.target.value) || '')}
                                        placeholder="Ej. 1000"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-brand-500 outline-hidden"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1">Precio Unitario ($ COP)</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={issuancePrice}
                                        onChange={(e) => setIssuancePrice(parseFloat(e.target.value) || '')}
                                        placeholder="Ej. 50000"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-brand-500 outline-hidden"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setIsIssuanceModalOpen(false)} className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 cursor-pointer">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={issuanceLoading} className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer">
                                    {issuanceLoading ? "Emitiendo..." : "Crear Emisión"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Decisión de Orden */}
            {selectedOrder && decisionAction && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="text-base font-black text-slate-900 font-montserrat">
                                {decisionAction === 'approve' ? 'Aprobar Transferencia de Acciones' : 'Rechazar Orden de Compra'}
                            </h3>
                            <button onClick={() => { setSelectedOrder(null); setDecisionAction(null); }} className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <p className="text-xs text-slate-600 font-medium">
                            {decisionAction === 'approve'
                                ? `¿Confirmas que el comprobante bancario por $${selectedOrder.surplus_amount.toLocaleString('es-CO')} COP es válido? Al aprobar, se liberarán ${selectedOrder.shares_quantity} acciones al comprador y se abonará el valor al vendedor.`
                                : `¿Estás seguro de que deseas rechazar la orden #${selectedOrder.id}? Las acciones bloqueadas volverán a la oferta del vendedor y se devolverá cualquier saldo retenido al comprador.`
                            }
                        </p>

                        <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">Notas u Observaciones</label>
                            <textarea
                                rows={3}
                                value={decisionNotes}
                                onChange={(e) => setDecisionNotes(e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-brand-500 outline-hidden"
                                placeholder="Ingresa detalles de la verificación o motivo del rechazo..."
                            />
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button onClick={() => { setSelectedOrder(null); setDecisionAction(null); }} className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 cursor-pointer">
                                Cancelar
                            </button>
                            <button
                                onClick={handleExecuteDecision}
                                disabled={decisionLoading}
                                className={`px-5 py-2 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer ${
                                    decisionAction === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                                }`}
                            >
                                {decisionLoading ? "Procesando..." : (decisionAction === 'approve' ? "Confirmar y Aprobar" : "Confirmar Rechazo")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
