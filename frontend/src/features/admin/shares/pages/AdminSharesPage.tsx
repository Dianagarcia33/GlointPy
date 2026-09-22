import React, { useState, useEffect } from 'react';
import { 
    Layers, 
    CheckCircle2, 
    Plus, 
    Eye, 
    Clock, 
    RefreshCw,
    X,
    Users,
    AlertCircle,
    UserPlus,
    UserMinus,
    Minus,
    Search,
    Calendar
} from 'lucide-react';
import { shareMarketService, ShareTradeOrder, SharePriceHistory, ShareIssuance, UserShareAccount } from '../../../../services/shareMarket';
import { usersService, User } from '../../../../services/users';
import { ShareGrowthChart } from '../components/ShareGrowthChart';

export const AdminSharesPage: React.FC = () => {
    const [pendingOrders, setPendingOrders] = useState<ShareTradeOrder[]>([]);
    const [allOrders, setAllOrders] = useState<ShareTradeOrder[]>([]);
    const [priceHistory, setPriceHistory] = useState<SharePriceHistory[]>([]);
    const [issuances, setIssuances] = useState<ShareIssuance[]>([]);
    const [portfolioPrice, setPortfolioPrice] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

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
    const [syncLoading, setSyncLoading] = useState(false);

    // Modal de Sincronización y Resumen de Acciones
    const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
    const [syncStage, setSyncStage] = useState<'confirm' | 'result'>('confirm');
    const [syncError, setSyncError] = useState<string | null>(null);
    const [syncResult, setSyncResult] = useState<{
        users_synced: number;
        total_shares_credited: number;
        updated_users: Array<{
            user_id: number;
            user_name: string;
            user_email: string;
            shares_credited: number;
            previous_shares?: number;
            new_total_shares?: number;
            available_shares?: number;
            locked_shares?: number;
        }>;
    } | null>(null);

    const [activeTab, setActiveTab] = useState<'issuances' | 'pending' | 'valuation' | 'audit'>('issuances');

    // Modal de Asignación / Deducción Manual de Acciones
    const [isManualGrantModalOpen, setIsManualGrantModalOpen] = useState(false);
    const [grantOperation, setGrantOperation] = useState<'add' | 'deduct'>('add');
    const [grantUserSearch, setGrantUserSearch] = useState('');
    const [grantUsersList, setGrantUsersList] = useState<User[]>([]);
    const [grantUserSearching, setGrantUserSearching] = useState(false);
    const [selectedGrantUser, setSelectedGrantUser] = useState<User | null>(null);
    const [grantUserAccount, setGrantUserAccount] = useState<UserShareAccount | null>(null);
    const [loadingUserAccount, setLoadingUserAccount] = useState(false);
    const [grantQuantity, setGrantQuantity] = useState<number | ''>('');
    const [grantReason, setGrantReason] = useState('');
    const [grantCustomDate, setGrantCustomDate] = useState('');
    const [grantLoading, setGrantLoading] = useState(false);
    const [grantError, setGrantError] = useState<string | null>(null);
    const [grantSuccess, setGrantSuccess] = useState<string | null>(null);

    const handleSelectUser = async (u: User) => {
        setSelectedGrantUser(u);
        setGrantUserAccount(null);
        try {
            setLoadingUserAccount(true);
            const acc = await shareMarketService.getUserAccountAdmin(u.id);
            setGrantUserAccount(acc);
        } catch (e) {
            console.error("Error cargando balance de acciones:", e);
        } finally {
            setLoadingUserAccount(false);
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const [pOrders, aOrders, pHist, iss, port] = await Promise.all([
                shareMarketService.getPendingOrders(),
                shareMarketService.getAllAdminOrders(),
                shareMarketService.getPriceHistory(),
                shareMarketService.getIssuances(),
                shareMarketService.getPortfolio().catch(() => null)
            ]);
            setPendingOrders(pOrders);
            setAllOrders(aOrders);
            setPriceHistory(pHist);
            setIssuances(iss);
            if (port?.current_share_price && port.current_share_price > 0) {
                setPortfolioPrice(port.current_share_price);
            }
        } catch (error) {
            console.error("Error loading admin shares data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Búsqueda dinámica de usuarios para asignación manual
    useEffect(() => {
        if (!isManualGrantModalOpen) return;
        if (!grantUserSearch.trim()) {
            const loadInitial = async () => {
                try {
                    setGrantUserSearching(true);
                    const res = await usersService.getUsers({ limit: 10 });
                    setGrantUsersList(res.data);
                } catch (err) {
                    console.error("Error loading users", err);
                } finally {
                    setGrantUserSearching(false);
                }
            };
            loadInitial();
            return;
        }

        const timer = setTimeout(async () => {
            try {
                setGrantUserSearching(true);
                const res = await usersService.getUsers({ search: grantUserSearch.trim(), limit: 20 });
                setGrantUsersList(res.data);
            } catch (err) {
                console.error("Error searching users", err);
            } finally {
                setGrantUserSearching(false);
            }
        }, 350);

        return () => clearTimeout(timer);
    }, [grantUserSearch, isManualGrantModalOpen]);

    const handleOpenManualGrantModal = () => {
        setSelectedGrantUser(null);
        setGrantUserAccount(null);
        setGrantOperation('add');
        setGrantUserSearch('');
        setGrantQuantity('');
        setGrantReason('');
        setGrantCustomDate(new Date().toISOString().slice(0, 10));
        setGrantError(null);
        setGrantSuccess(null);
        setIsManualGrantModalOpen(true);
    };

    const handleManualGrantSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedGrantUser) {
            setGrantError('Por favor selecciona un usuario.');
            return;
        }
        if (!grantQuantity || grantQuantity <= 0) {
            setGrantError('Por favor ingresa una cantidad de acciones válida mayor a 0.');
            return;
        }
        if (grantOperation === 'deduct') {
            if (grantUserAccount && grantQuantity > grantUserAccount.available_shares) {
                setGrantError(`No es posible descontar ${grantQuantity} acción(es). El usuario solo dispone de ${grantUserAccount.available_shares} acciones disponibles.`);
                return;
            }
        }
        if (!grantReason.trim()) {
            setGrantError('Por favor ingresa un motivo o concepto para el ajuste.');
            return;
        }

        try {
            setGrantLoading(true);
            setGrantError(null);
            await shareMarketService.manualShareGrant({
                user_id: selectedGrantUser.id,
                quantity: Number(grantQuantity),
                operation: grantOperation,
                reason: grantReason.trim(),
                custom_date: grantCustomDate ? `${grantCustomDate}T12:00:00` : undefined
            });
            const actionText = grantOperation === 'add' ? 'acreditado' : 'descontado';
            setGrantSuccess(`¡Se han ${actionText} exitosamente ${grantQuantity} acción(es) a ${selectedGrantUser.name}!`);
            setTimeout(() => {
                setIsManualGrantModalOpen(false);
                fetchData();
            }, 1800);
        } catch (err: any) {
            console.error('Error al procesar ajuste de acciones manualmente:', err);
            setGrantError(err.message || 'Error al procesar ajuste de acciones.');
        } finally {
            setGrantLoading(false);
        }
    };

    // Determinar el precio oficial y real más reciente comparando auditoría, emisiones y portafolio
    const latestHistory = priceHistory[0];
    const latestIssuance = issuances[0];

    let currentPrice = 0;
    if (latestHistory && latestIssuance) {
        currentPrice = new Date(latestHistory.created_at).getTime() >= new Date(latestIssuance.created_at).getTime()
            ? Number(latestHistory.new_price)
            : Number(latestIssuance.price_per_share);
    } else if (latestHistory) {
        currentPrice = Number(latestHistory.new_price);
    } else if (latestIssuance) {
        currentPrice = Number(latestIssuance.price_per_share);
    } else if (portfolioPrice && portfolioPrice > 0) {
        currentPrice = Number(portfolioPrice);
    } else {
        currentPrice = 0;
    }

    const currentAvailableShares = issuances.length > 0 
        ? issuances.reduce((sum, i) => sum + (i.available_shares || 0), 0)
        : (priceHistory[0]?.new_available_shares ?? 0);
    const totalIssuedShares = issuances.reduce((sum, i) => sum + (i.total_shares_issued || 0), 0);

    const handleOpenIssuanceModal = () => {
        setIssuancePrice(currentPrice > 0 ? currentPrice : '');
        setIssuanceQuantity('');
        setIssuanceTitle('');
        setIssuanceDescription('');
        setIsIssuanceModalOpen(true);
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

    const handleOpenSyncModal = () => {
        setSyncStage('confirm');
        setSyncError(null);
        setIsSyncModalOpen(true);
    };

    const handleExecuteSync = async () => {
        try {
            setSyncLoading(true);
            setSyncError(null);
            const res = await shareMarketService.syncLegacyShares();
            const details = res.details || {};
            setSyncResult({
                users_synced: details.users_synced ?? details.synced_users_count ?? 0,
                total_shares_credited: details.total_shares_credited ?? 0,
                updated_users: details.updated_users || []
            });
            setSyncStage('result');
            await fetchData();
        } catch (err: any) {
            setSyncError(err.message || "Error al sincronizar acciones históricas.");
        } finally {
            setSyncLoading(false);
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
                        onClick={handleOpenSyncModal}
                        disabled={syncLoading}
                        className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-2xl text-xs font-bold transition-all shadow-2xs flex items-center gap-2 cursor-pointer font-montserrat disabled:opacity-50"
                        title="Sincronizar retroactivamente las acciones otorgadas por paquetes de inversión existentes"
                    >
                        <RefreshCw className={`w-4 h-4 ${syncLoading ? 'animate-spin' : ''}`} />
                        <span>Sincronizar Acciones Históricas</span>
                    </button>
                    <button
                        onClick={handleOpenManualGrantModal}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer font-montserrat"
                        title="Asignar o descontar acciones a un usuario manualmente"
                    >
                        <UserPlus className="w-4 h-4" />
                        <span>Asignar / Descontar Acciones</span>
                    </button>
                    <button
                        onClick={handleOpenIssuanceModal}
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
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Precio de la Acción</span>
                    <span className="text-2xl font-black text-emerald-600 font-mono block">
                        ${currentPrice.toLocaleString('es-CO')} COP
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium block">Registrado por el Administrador</span>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Acciones Disponibles</span>
                    <span className="text-2xl font-black text-brand-600 font-mono block">
                        {currentAvailableShares.toLocaleString('es-CO')} Unds
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium block">Stock disponible del fondo</span>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Acciones Emitidas</span>
                    <span className="text-2xl font-black text-indigo-600 font-mono block">
                        {totalIssuedShares.toLocaleString('es-CO')} Unds
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium block">Total emisiones creadas</span>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Valor Total en Stock</span>
                    <span className="text-2xl font-black text-slate-900 font-mono block">
                        ${(currentPrice * currentAvailableShares).toLocaleString('es-CO')} COP
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium block">Capitalización disponible</span>
                </div>
            </div>

            {/* Gráfica de Curvas de Crecimiento */}
            <ShareGrowthChart
                priceHistory={priceHistory}
                issuances={issuances}
                currentPrice={currentPrice}
                currentAvailableShares={currentAvailableShares}
            />

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 p-1.5 bg-slate-100/80 rounded-2xl w-fit border border-slate-200/80">
                <button
                    onClick={() => setActiveTab('issuances')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer font-montserrat ${
                        activeTab === 'issuances' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                    Emisiones de Acciones ({issuances.length})
                </button>
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
                    Bitácora de Auditoría ({priceHistory.length})
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

            {/* TAB CONTENT: BITÁCORA DE TRAZABILIDAD & AUDITORÍA */}
            {activeTab === 'valuation' && (
                <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <div>
                            <h3 className="text-base font-black text-slate-900 font-montserrat">Bitácora de Trazabilidad & Auditoría</h3>
                            <p className="text-xs text-slate-500 font-medium">Historial inmutable de precio y cantidad de acciones registradas por el administrador</p>
                        </div>
                        <span className="text-xs font-mono text-slate-400 font-bold">{priceHistory.length} Registros</span>
                    </div>

                    {priceHistory.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 space-y-2">
                            <Clock className="w-8 h-8 mx-auto text-slate-300" />
                            <p className="text-xs font-medium">No hay registros de auditoría aún. Al registrar nuevas emisiones quedará trazabilidad inmutable aquí.</p>
                        </div>
                    ) : (
                        <div className="space-y-4 max-h-[550px] overflow-y-auto pr-1">
                            {priceHistory.map((item) => {
                                const prevShares = item.previous_available_shares ?? 0;
                                const newShares = item.new_available_shares ?? 0;
                                const diffShares = newShares - prevShares;

                                return (
                                    <div key={item.id} className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                            <div className="flex flex-wrap items-center gap-2">
                                                {/* Precio */}
                                                <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200">
                                                    <span className="text-[10px] text-slate-400 font-bold">PRECIO:</span>
                                                    <span className="font-mono font-black text-slate-900">
                                                        ${item.new_price.toLocaleString('es-CO')}
                                                    </span>
                                                    <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full font-mono ${
                                                        item.change_percentage >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                                                    }`}>
                                                        {item.change_percentage >= 0 ? `+${item.change_percentage}%` : `${item.change_percentage}%`}
                                                    </span>
                                                </div>

                                                {/* Stock de Acciones */}
                                                <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200">
                                                    <span className="text-[10px] text-slate-400 font-bold">STOCK:</span>
                                                    <span className="font-mono font-black text-brand-600">
                                                        {newShares.toLocaleString('es-CO')} Unds
                                                    </span>
                                                    {diffShares !== 0 && (
                                                        <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full font-mono ${
                                                            diffShares > 0 ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                                                        }`}>
                                                            {diffShares > 0 ? `+${diffShares}` : `${diffShares}`}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <span className="text-[11px] text-slate-400 font-mono">
                                                {new Date(item.created_at).toLocaleString('es-CO')}
                                            </span>
                                        </div>

                                        <div className="text-xs bg-white p-3 rounded-xl border border-slate-200 text-slate-700 font-medium">
                                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                                                Admin responsable: {item.admin_name || 'Administrador'}
                                            </span>
                                            "{item.justification_notes}"
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
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
                                    <label className="text-xs font-bold text-slate-700 block mb-1">
                                        Total Acciones a Emitir <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={issuanceQuantity}
                                        onChange={(e) => setIssuanceQuantity(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                                        placeholder="Ej. 1000"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-brand-500 outline-hidden"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1">
                                        Valor por Acción ($ COP) <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={issuancePrice}
                                        onChange={(e) => setIssuancePrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                        placeholder={`Ej. ${currentPrice ? currentPrice.toLocaleString('es-CO') : '50000'}`}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-brand-500 outline-hidden"
                                        required
                                    />
                                    <span className="text-[10px] text-slate-400 block mt-1">
                                        Este valor regirá como el precio de las acciones
                                    </span>
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

            {/* Modal de Sincronización y Resumen de Acciones */}
            {isSyncModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative space-y-6">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${syncStage === 'confirm' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                    {syncStage === 'confirm' ? (
                                        <RefreshCw className={`w-5 h-5 ${syncLoading ? 'animate-spin' : ''}`} />
                                    ) : (
                                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-slate-900 font-montserrat">
                                        {syncStage === 'confirm' ? "Sincronizar Acciones Históricas" : "Resumen de Acciones Sincronizadas"}
                                    </h3>
                                    <p className="text-xs text-slate-500 font-medium">
                                        {syncStage === 'confirm' 
                                            ? "Consolida las acciones de contratos existentes en la nueva tabla contable"
                                            : "Detalle de los saldos acreditados y usuarios actualizados en la base de datos"
                                        }
                                    </p>
                                </div>
                            </div>
                            {!syncLoading && (
                                <button 
                                    onClick={() => setIsSyncModalOpen(false)} 
                                    className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {syncStage === 'confirm' ? (
                            <div className="space-y-5">
                                <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-2xl space-y-2">
                                    <div className="flex items-start gap-2.5">
                                        <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                                        <div className="text-xs text-indigo-950 font-medium space-y-1.5">
                                            <p className="font-bold text-indigo-900">¿Cómo funciona la sincronización?</p>
                                            <p className="text-indigo-800 leading-relaxed">
                                                El sistema escaneará los contratos de inversión históricos y verificará el paquete adquirido por cada usuario. Se calculará e insertará en la nueva tabla contable (<code className="font-mono bg-white/70 px-1 py-0.5 rounded text-[11px]">user_shares</code> y <code className="font-mono bg-white/70 px-1 py-0.5 rounded text-[11px]">share_movements</code>) la cantidad exacta de acciones estipulada en su paquete.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {syncError && (
                                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-medium">
                                        {syncError}
                                    </div>
                                )}

                                <div className="flex items-center justify-end gap-3 pt-2">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsSyncModalOpen(false)}
                                        disabled={syncLoading}
                                        className="px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={handleExecuteSync}
                                        disabled={syncLoading}
                                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                                    >
                                        <RefreshCw className={`w-4 h-4 ${syncLoading ? 'animate-spin' : ''}`} />
                                        <span>{syncLoading ? "Sincronizando..." : "Iniciar Sincronización"}</span>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-5">
                                {/* Métricas del resultado */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Usuarios Revisados</span>
                                        <span className="text-xl font-black text-slate-900 font-mono mt-0.5 block">
                                            {syncResult?.users_synced || 0}
                                        </span>
                                    </div>
                                    <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-2xl">
                                        <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider block">Con Acciones Nuevas</span>
                                        <span className="text-xl font-black text-indigo-700 font-mono mt-0.5 block">
                                            {syncResult?.updated_users?.length || 0}
                                        </span>
                                    </div>
                                    <div className="p-3.5 bg-emerald-50/70 border border-emerald-100 rounded-2xl col-span-2 sm:col-span-1">
                                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Acciones Acreditadas</span>
                                        <span className="text-xl font-black text-emerald-600 font-mono mt-0.5 block">
                                            +{(syncResult?.total_shares_credited || 0).toLocaleString('es-CO')}
                                        </span>
                                    </div>
                                </div>

                                {/* Lista de detalle de usuarios actualizados */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-slate-700">Detalle de Acciones Ajustadas / Sincronizadas</span>
                                        <span className="text-[11px] font-semibold text-slate-400 font-mono">
                                            {syncResult?.updated_users?.length || 0} usuarios
                                        </span>
                                    </div>

                                    {syncResult?.updated_users && syncResult.updated_users.length > 0 ? (
                                        <div className="max-h-60 overflow-y-auto space-y-2 pr-1 border border-slate-100 rounded-2xl p-2 bg-slate-50/50">
                                            {syncResult.updated_users.map((u) => (
                                                <div key={u.user_id} className="bg-white p-3 rounded-xl border border-slate-200/80 flex items-center justify-between shadow-2xs">
                                                    <div className="min-w-0 pr-3 flex items-center gap-2.5">
                                                        <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                                                            <Users className="w-3.5 h-3.5" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-bold text-slate-900 truncate font-montserrat">{u.user_name}</p>
                                                            <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                                                <span className="truncate">{u.user_email || `ID Usuario: ${u.user_id}`}</span>
                                                                {u.new_total_shares !== undefined && (
                                                                    <span className="shrink-0 font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                                                                        Total: {u.new_total_shares.toLocaleString('es-CO')} Unds
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <span className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-mono font-black border ${
                                                        u.shares_credited > 0 
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                                            : u.shares_credited < 0 
                                                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                                : 'bg-slate-50 text-slate-700 border-slate-200'
                                                    }`}>
                                                        {u.shares_credited > 0 ? `+${u.shares_credited.toLocaleString('es-CO')}` : u.shares_credited.toLocaleString('es-CO')} Unds
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-2xl text-center space-y-1.5">
                                            <p className="text-xs font-bold text-slate-700">Todos los contratos ya se encuentran al día</p>
                                            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                                                Los contratos históricos de los usuarios ya contaban con sus movimientos asentados y totalizados en el Libro Mayor. No se requirieron ajustes adicionales.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-end pt-2">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsSyncModalOpen(false)}
                                        className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-colors"
                                    >
                                        Entendido y Cerrar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modal de Asignación / Deducción Manual de Acciones */}
            {isManualGrantModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative space-y-5">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border transition-colors ${
                                    grantOperation === 'add' 
                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                        : 'bg-rose-50 text-rose-600 border-rose-100'
                                }`}>
                                    {grantOperation === 'add' ? <UserPlus className="w-5 h-5" /> : <UserMinus className="w-5 h-5" />}
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-slate-900 font-montserrat">
                                        {grantOperation === 'add' ? 'Asignar / Acreditar Acciones' : 'Descontar / Restar Acciones'}
                                    </h3>
                                    <p className="text-xs text-slate-500 font-medium">
                                        {grantOperation === 'add' 
                                            ? 'Acreditación directa con registro oficial en el Libro Mayor' 
                                            : 'Deducción de saldo con registro oficial en el Libro Mayor'}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setIsManualGrantModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Selector de Tipo de Operación: Sumar vs Restar */}
                        <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
                            <button
                                type="button"
                                onClick={() => {
                                    setGrantOperation('add');
                                    setGrantReason('');
                                }}
                                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                    grantOperation === 'add'
                                        ? 'bg-white text-emerald-700 shadow-xs border border-slate-200'
                                        : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <Plus className="w-4 h-4 text-emerald-600" />
                                <span>Sumar / Acreditar</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setGrantOperation('deduct');
                                    setGrantReason('');
                                }}
                                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                    grantOperation === 'deduct'
                                        ? 'bg-white text-rose-700 shadow-xs border border-slate-200'
                                        : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <Minus className="w-4 h-4 text-rose-600" />
                                <span>Restar / Descontar</span>
                            </button>
                        </div>

                        {grantSuccess ? (
                            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3">
                                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                                    <CheckCircle2 className="w-6 h-6" />
                                </div>
                                <h4 className="text-sm font-bold text-emerald-900 font-montserrat">¡Operación Exitosa!</h4>
                                <p className="text-xs text-emerald-700 font-medium">{grantSuccess}</p>
                            </div>
                        ) : (
                            <form onSubmit={handleManualGrantSubmit} className="space-y-4">
                                {grantError && (
                                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700 font-medium">
                                        <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                                        <span>{grantError}</span>
                                    </div>
                                )}

                                {/* Selector de Usuario */}
                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1">
                                        Inversionista / Usuario Destino <span className="text-rose-500">*</span>
                                    </label>
                                    
                                    {selectedGrantUser ? (
                                        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs border ${
                                                        grantOperation === 'add' 
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                                            : 'bg-rose-50 text-rose-700 border-rose-200'
                                                    }`}>
                                                        {selectedGrantUser.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-900 font-montserrat">{selectedGrantUser.name}</p>
                                                        <p className="text-[11px] text-slate-500">
                                                            Doc: <strong className="font-mono text-slate-700">{selectedGrantUser.document_id || 'N/A'}</strong> • {selectedGrantUser.email}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedGrantUser(null);
                                                        setGrantUserAccount(null);
                                                    }}
                                                    className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800 font-bold underline cursor-pointer"
                                                >
                                                    Cambiar
                                                </button>
                                            </div>

                                            {/* Saldo de Acciones Actual del Usuario */}
                                            <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                                                <span className="text-slate-500 font-medium">Saldo en cuenta:</span>
                                                {loadingUserAccount ? (
                                                    <span className="text-slate-400 flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" /> Cargando saldo...</span>
                                                ) : grantUserAccount ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-slate-800 font-mono">Total: {grantUserAccount.total_shares}</span>
                                                        <span className="text-slate-300">•</span>
                                                        <span className="font-bold text-emerald-600 font-mono">Disp: {grantUserAccount.available_shares}</span>
                                                        {grantUserAccount.locked_shares > 0 && (
                                                            <>
                                                                <span className="text-slate-300">•</span>
                                                                <span className="font-bold text-amber-600 font-mono">Bloq: {grantUserAccount.locked_shares}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 font-mono">0 acciones</span>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <div className="relative">
                                                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                                <input
                                                    type="text"
                                                    value={grantUserSearch}
                                                    onChange={(e) => setGrantUserSearch(e.target.value)}
                                                    placeholder="Buscar por nombre, cédula o email..."
                                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-hidden"
                                                    autoFocus
                                                />
                                                {grantUserSearching && (
                                                    <RefreshCw className="w-3.5 h-3.5 text-slate-400 animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
                                                )}
                                            </div>

                                            <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white shadow-xs">
                                                {grantUsersList.length === 0 ? (
                                                    <div className="p-3 text-center text-xs text-slate-400 italic">
                                                        {grantUserSearching ? 'Buscando usuarios...' : 'No se encontraron usuarios'}
                                                    </div>
                                                ) : (
                                                    grantUsersList.map(u => (
                                                        <div
                                                            key={u.id}
                                                            onClick={() => handleSelectUser(u)}
                                                            className="p-2.5 px-3 hover:bg-slate-50 flex items-center justify-between cursor-pointer transition-colors"
                                                        >
                                                            <div>
                                                                <p className="text-xs font-bold text-slate-900">{u.name}</p>
                                                                <p className="text-[10px] text-slate-400">Doc: {u.document_id || 'N/A'} • {u.email}</p>
                                                            </div>
                                                            <span className={`text-[11px] font-bold ${grantOperation === 'add' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                                Seleccionar
                                                            </span>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Cantidad y Fecha */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1">
                                            {grantOperation === 'add' ? 'Cantidad a Acreditar' : 'Cantidad a Descontar'} <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            min={1}
                                            max={grantOperation === 'deduct' && grantUserAccount ? grantUserAccount.available_shares : undefined}
                                            value={grantQuantity}
                                            onChange={(e) => setGrantQuantity(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                                            placeholder="Ej. 25"
                                            className={`w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-hidden focus:ring-2 ${
                                                grantOperation === 'add' ? 'focus:ring-emerald-500' : 'focus:ring-rose-500'
                                            }`}
                                            required
                                        />
                                        {grantQuantity && grantQuantity > 0 && currentPrice > 0 && (
                                            <span className={`text-[10px] font-bold block mt-1 ${
                                                grantOperation === 'add' ? 'text-emerald-700' : 'text-rose-700'
                                            }`}>
                                                {grantOperation === 'add' ? 'Val: ' : 'Val descontado: '} 
                                                ${(Number(grantQuantity) * currentPrice).toLocaleString('es-CO')} COP
                                            </span>
                                        )}
                                        {grantOperation === 'deduct' && grantUserAccount && grantQuantity && Number(grantQuantity) > grantUserAccount.available_shares && (
                                            <span className="text-[10px] text-rose-600 font-bold block mt-1">
                                                ⚠️ Excede las {grantUserAccount.available_shares} disp.
                                            </span>
                                        )}
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1">
                                            {grantOperation === 'add' ? 'Fecha de Acreditación' : 'Fecha de Deducción'}
                                        </label>
                                        <input
                                            type="date"
                                            value={grantCustomDate}
                                            onChange={(e) => setGrantCustomDate(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium focus:ring-2 focus:ring-emerald-500 outline-hidden"
                                        />
                                        <span className="text-[9px] text-slate-400 block mt-1 leading-tight">
                                            Fecha registrada en el extracto
                                        </span>
                                    </div>
                                </div>

                                {/* Concepto / Motivo */}
                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1">
                                        Motivo / Justificación <span className="text-rose-500">*</span>
                                    </label>
                                    
                                    {/* Atajos de concepto contextuales */}
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                        {(grantOperation === 'add' ? [
                                            'Asignación directa de paquete',
                                            'Bonificación por referidos',
                                            'Ajuste administrativo de saldo',
                                            'Compensación patrimonial'
                                        ] : [
                                            'Ajuste por corrección',
                                            'Reversión de asignación',
                                            'Liquidación de acciones',
                                            'Penalización contractual',
                                            'Ajuste administrativo de saldo'
                                        ]).map(preset => (
                                            <button
                                                key={preset}
                                                type="button"
                                                onClick={() => setGrantReason(preset)}
                                                className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-medium transition-colors cursor-pointer"
                                            >
                                                {preset}
                                            </button>
                                        ))}
                                    </div>

                                    <textarea
                                        rows={2}
                                        value={grantReason}
                                        onChange={(e) => setGrantReason(e.target.value)}
                                        placeholder={grantOperation === 'add' ? "Describe el concepto de la acreditación..." : "Describe el motivo de la deducción o ajuste..."}
                                        className={`w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-hidden focus:ring-2 ${
                                            grantOperation === 'add' ? 'focus:ring-emerald-500' : 'focus:ring-rose-500'
                                        }`}
                                        required
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-2">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsManualGrantModalOpen(false)} 
                                        className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        type="submit" 
                                        disabled={
                                            grantLoading || 
                                            !selectedGrantUser || 
                                            !grantQuantity || 
                                            (grantOperation === 'deduct' && !!grantUserAccount && Number(grantQuantity) > grantUserAccount.available_shares)
                                        } 
                                        className={`px-5 py-2.5 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-2 transition-colors ${
                                            grantOperation === 'add'
                                                ? 'bg-emerald-600 hover:bg-emerald-700'
                                                : 'bg-rose-600 hover:bg-rose-700'
                                        }`}
                                    >
                                        {grantLoading ? (
                                            <>
                                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                <span>Procesando...</span>
                                            </>
                                        ) : grantOperation === 'add' ? (
                                            <>
                                                <UserPlus className="w-3.5 h-3.5" />
                                                <span>Acreditar Acciones</span>
                                            </>
                                        ) : (
                                            <>
                                                <UserMinus className="w-3.5 h-3.5" />
                                                <span>Descontar Acciones</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
};
