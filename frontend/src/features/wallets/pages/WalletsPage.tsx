import React, { useEffect, useState } from 'react';
import { 
    Wallet, 
    ArrowDownToLine, 
    ArrowRightLeft, 
    Clock, 
    CheckCircle2, 
    XCircle, 
    AlertCircle, 
    ArrowUpToLine, 
    ChevronRight, 
    Send, 
    TrendingUp, 
    FileText, 
    RefreshCw, 
    Building2 
} from 'lucide-react';
import { Can } from '../../../components/security/Can';
import { fetchApi } from '../../../services/api';
import { WithdrawalModal } from '../components/WithdrawalModal';
import { MovementDetailModal } from '../components/MovementDetailModal';
import { NewInvestmentModal } from '../../dashboard/components/NewInvestmentModal';
import { TransferModal } from '../components/TransferModal';
import { RechargeModal } from '../components/RechargeModal';
import { ConfirmationModal } from '../../../components/common/ConfirmationModal';
import { getMyRecharges, cancelMyRecharge, WalletRecharge } from '../../../services/wallets';
import { useSarlaftStatus } from '../../../hooks/useSarlaftStatus';
import { useAuthStore } from '../../../store/authStore';

export interface Movement {
    id: number | string;
    real_id?: number;
    investor_id: number | null;
    user_id: number;
    origen: string;
    tipo: string;
    type?: string;
    reference_type?: string;
    monto: number;
    impuesto: number;
    monto_neto: number;
    fecha_solicitud: string | null;
    fecha_retiro: string | null;
    estado: string;
    metodo_pago: string | null;
    banco: string | null;
    tipo_cuenta: string | null;
    numero_cuenta: string | null;
    observaciones: string | null;
    motivo_rechazo: string | null;
    fecha_aprobacion: string | null;
    fecha_procesamiento: string | null;
    created_at: string | null;
    updated_at: string | null;
    saldo_anterior: number | null;
    saldo_nuevo: number | null;
}

export const WalletsPage: React.FC = () => {
    const { user } = useAuthStore();
    const isDirectivo = Boolean(
        !user?.is_superuser &&
        (
            user?.roles?.some((r: any) => {
                const n = (typeof r === 'string' ? r : r?.name || '').toLowerCase();
                return n.includes('directiv') || n.includes('director') || n.includes('comercial') || n.includes('asesor') || n.includes('lider');
            }) ||
            user?.roles_list?.some((r: string) => {
                const n = r.toLowerCase();
                return n.includes('directiv') || n.includes('director') || n.includes('comercial') || n.includes('asesor') || n.includes('lider');
            })
        )
    );

    const [balance, setBalance] = useState<number>(0);
    const [bankDetails, setBankDetails] = useState<any>(null);
    const [movements, setMovements] = useState<Movement[]>([]);
    const [withdrawals, setWithdrawals] = useState<Movement[]>([]);
    const [recharges, setRecharges] = useState<WalletRecharge[]>([]);
    const [activeTab, setActiveTab] = useState<'movements' | 'recharges' | 'withdrawals'>('movements');
    const [loading, setLoading] = useState(true);
    
    // Modals state
    const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
    const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);
    const [isNewInvestmentModalOpen, setIsNewInvestmentModalOpen] = useState(false);
    const { canInvest, isPending: isSarlaftPending } = useSarlaftStatus();
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null);
    const [cancellingWithdrawalId, setCancellingWithdrawalId] = useState<number | null>(null);
    const [isCancellingWithdrawal, setIsCancellingWithdrawal] = useState(false);
    const [cancellingRechargeId, setCancellingRechargeId] = useState<number | null>(null);
    const [isCancellingRecharge, setIsCancellingRecharge] = useState(false);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [balanceRes, movementsRes, withdrawalsRes, rechargesRes] = await Promise.all([
                fetchApi('/wallets/me/balance'),
                fetchApi('/wallets/me/movements'),
                fetchApi('/wallets/me/withdrawals'),
                getMyRecharges()
            ]);
            setBalance(balanceRes?.balance || 0);
            setBankDetails(balanceRes?.bank_details || null);
            setMovements(movementsRes || []);
            setWithdrawals(withdrawalsRes || []);
            setRecharges(rechargesRes || []);
        } catch (error) {
            console.error('Error fetching wallet data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(value);
    };

    const handleConfirmCancelWithdrawal = async () => {
        if (!cancellingWithdrawalId) return;
        setIsCancellingWithdrawal(true);
        try {
            await fetchApi(`/wallets/me/withdrawals/${cancellingWithdrawalId}/cancel`, {
                method: 'POST'
            });
            setCancellingWithdrawalId(null);
            fetchData();
        } catch (error) {
            console.error('Error cancelling withdrawal:', error);
        } finally {
            setIsCancellingWithdrawal(false);
        }
    };

    const handleConfirmCancelRecharge = async () => {
        if (!cancellingRechargeId) return;
        setIsCancellingRecharge(true);
        try {
            await cancelMyRecharge(cancellingRechargeId);
            setCancellingRechargeId(null);
            fetchData();
        } catch (error) {
            console.error('Error cancelling recharge:', error);
        } finally {
            setIsCancellingRecharge(false);
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('es-CO', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const getStatusConfig = (estado: string) => {
        const est = (estado || '').toLowerCase().trim();
        switch (est) {
            case 'aprobado':
            case 'completed':
            case 'completado':
                return { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle2, text: 'Completado' };
            case 'procesado':
            case 'en_proceso':
            case 'processing':
                return { color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: Clock, text: 'En Proceso' };
            case 'pendiente':
            case 'pending':
                return { color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: Clock, text: 'Pendiente' };
            case 'rechazado':
            case 'cancelado':
            case 'rejected':
            case 'cancelled':
                return { color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200', icon: XCircle, text: 'Rechazado' };
            default:
                return { color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200', icon: AlertCircle, text: estado };
        }
    };

    const isIngresoMovement = (m: any): boolean => {
        if (m.direction === 'in' || m.tipo === 'ingreso' || m.type === 'ingreso') return true;
        if (m.direction === 'out' || m.tipo === 'egreso' || m.type === 'egreso') return false;

        const raw = (m.origen || m.type || m.reference_type || m.tipo || '').toLowerCase().trim().replace(/_/g, ' ');
        
        const egresosKeywords = [
            'transfer out', 'transfer sent', 'transferencia enviada',
            'withdrawal request', 'solicitud de retiro', 'retiro',
            'investment reservation', 'reserva de inversión', 'investment payment',
            'yield payout reversal', 'rendimientos revertidos', 'ajuste debito', 'debit', 'egreso'
        ];
        if (egresosKeywords.some(kw => raw.includes(kw))) return false;

        const ingresosKeywords = [
            'transfer in', 'transfer received', 'transferencia recibida',
            'withdrawal refund', 'withdrawal rejection', 'reembolso de retiro', 'reembolso retiro', 'devolución por rechazo',
            'generacion rendimiento', 'rendimiento inversion', 'yield payout', 'auto yield transfer',
            'bono', 'bonus payout', 'auto bonus transfer', 'bono aceleracion',
            'deposito', 'deposit', 'cash', 'recarga', 'capital liquidation', 'liquidación de capital',
            'ajuste credito', 'credit', 'ingreso'
        ];
        if (ingresosKeywords.some(kw => raw.includes(kw))) return true;

        return m.metodo_pago?.toLowerCase().trim() === 'wallet';
    };

    const getOriginTranslation = (raw: string): string => {
        if (!raw) return 'Movimiento de Billetera';
        const norm = raw.toLowerCase().trim().replace(/_/g, ' ');
        const dict: Record<string, string> = {
            'transfer in': 'Transferencia Recibida',
            'transfer received': 'Transferencia Recibida',
            'transferencia recibida': 'Transferencia Recibida',
            'transfer out': 'Transferencia Enviada',
            'transfer sent': 'Transferencia Enviada',
            'transferencia enviada': 'Transferencia Enviada',
            'withdrawal rejection': 'Reembolso de Retiro',
            'withdrawal refund': 'Reembolso de Retiro',
            'reembolso de retiro': 'Reembolso de Retiro',
            'reembolso retiro': 'Reembolso de Retiro',
            'devolución por rechazo': 'Reembolso de Retiro',
            'withdrawal request': 'Solicitud de Retiro',
            'yield payout reversal': 'Reversión de Rendimientos',
            'yield payout reversed': 'Rendimientos Revertidos',
            'yield payout': 'Pago de Rendimientos',
            'auto yield transfer': 'Pago de Rendimientos',
            'generacion rendimiento': 'Pago de Rendimientos',
            'rendimiento inversion': 'Pago de Rendimientos',
            'bonus payout': 'Pago de Bono',
            'auto bonus transfer': 'Pago de Bono',
            'bono aceleracion': 'Bono de Aceleración',
            'bono': 'Pago de Bono',
            'investment reservation': 'Reserva de Inversión',
            'capital liquidation': 'Liquidación de Capital',
            'liquidación de capital': 'Liquidación de Capital',
            'admin adjustment': 'Ajuste de Saldo',
            'ajuste de saldo': 'Ajuste de Saldo',
            'ajuste administrativo': 'Ajuste de Saldo',
            'ingreso': 'Ingreso a Billetera',
            'egreso': 'Egreso de Billetera',
            'cash': 'Depósito de Saldo',
            'deposit': 'Depósito de Saldo'
        };

        if (dict[norm]) return dict[norm];
        for (const [key, val] of Object.entries(dict)) {
            if (norm.includes(key)) return val;
        }
        return norm.charAt(0).toUpperCase() + norm.slice(1);
    };

    return (
        <Can permission="wallets:view">
            {/* Modales de la Billetera */}
            <RechargeModal
                isOpen={isRechargeModalOpen}
                onClose={() => setIsRechargeModalOpen(false)}
                onSuccess={() => fetchData()}
            />

            <WithdrawalModal 
                isOpen={isWithdrawalModalOpen} 
                onClose={() => setIsWithdrawalModalOpen(false)} 
                onSuccess={() => fetchData()} 
                availableBalance={balance}
                bankDetails={bankDetails}
            />

            <MovementDetailModal 
                isOpen={!!selectedMovement}
                onClose={() => setSelectedMovement(null)}
                movement={selectedMovement}
            />

            <NewInvestmentModal 
                isOpen={isNewInvestmentModalOpen}
                onClose={() => setIsNewInvestmentModalOpen(false)}
            />

            <TransferModal
                isOpen={isTransferModalOpen}
                onClose={() => setIsTransferModalOpen(false)}
                onSuccess={() => fetchData()}
                currentBalance={balance}
            />

            {/* Contenedor Principal Unificado */}
            <div className="w-full max-w-7xl mx-auto min-w-0 pb-20 space-y-6 animate-in fade-in duration-300">
                
                {/* 🏛️ 1. Encabezado de Página (Estándar Soporte en Tickets) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight font-montserrat flex items-center gap-2.5">
                            <span className="p-2 bg-brand-50 text-brand-600 border border-brand-200 rounded-2xl inline-flex shadow-xs">
                                <Wallet className="w-6 h-6" />
                            </span>
                            Mi Billetera
                        </h1>
                        <p className="text-xs text-slate-500 mt-1">
                            Gestiona tu saldo disponible, recargas, transferencias y retiros bancarios
                        </p>
                    </div>

                    {/* Acciones Principales del Header */}
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <button
                            onClick={() => setIsRechargeModalOpen(true)}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-600 to-amber-600 hover:from-brand-700 hover:to-amber-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-brand-500/20 transition-all cursor-pointer font-montserrat"
                        >
                            <ArrowDownToLine className="w-4 h-4" />
                            <span>Recargar Billetera</span>
                        </button>

                        <Can permission="wallets:request_withdrawal">
                            <button
                                onClick={() => setIsWithdrawalModalOpen(true)}
                                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-xs shadow-sm transition-all cursor-pointer font-montserrat"
                            >
                                <ArrowUpToLine className="w-4 h-4" />
                                <span>Retirar Fondos</span>
                            </button>
                        </Can>

                        <button
                            onClick={fetchData}
                            className="p-2.5 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 rounded-2xl hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
                            title="Actualizar datos"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Aviso Informativo de Cuenta Bancaria Vinculada (si existe) */}
                {bankDetails?.banco && (
                    <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between gap-3 text-xs text-slate-600">
                        <div className="flex items-center gap-2.5">
                            <Building2 className="w-4 h-4 text-brand-600 shrink-0" />
                            <span>
                                Cuenta bancaria para retiros: <strong className="text-slate-900 font-bold">{bankDetails.banco}</strong> ({bankDetails.tipo_cuenta || 'Ahorros'}) •••••{String(bankDetails.numero_cuenta || '').slice(-4)}
                            </span>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Vinculada
                        </span>
                    </div>
                )}

                {/* 📊 2. Cuadrícula de Métricas KPI (4-Stat Cards exactas al Mercado de Acciones) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Card 1: Saldo Disponible */}
                    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Saldo Disponible</span>
                            <Wallet className="w-4 h-4 text-brand-600" />
                        </div>
                        <span className="text-2xl font-black text-slate-900 font-mono block">
                            {formatCurrency(balance)}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium block">
                            Fondos libres para transferir o retirar
                        </span>
                    </div>

                    {/* Card 2: Total Movimientos */}
                    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Transacciones</span>
                            <ArrowRightLeft className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="text-2xl font-black text-slate-900 font-mono block">
                            {movements.length}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium block">
                            Movimientos en tu historial
                        </span>
                    </div>

                    {/* Card 3: Recargas Realizadas */}
                    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Recargas Realizadas</span>
                            <ArrowDownToLine className="w-4 h-4 text-emerald-600" />
                        </div>
                        <span className="text-2xl font-black text-emerald-600 font-mono block">
                            {recharges.length}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium block">
                            {recharges.filter(r => r.status === 'pending').length > 0 
                                ? `${recharges.filter(r => r.status === 'pending').length} pendientes de validación`
                                : 'Sin solicitudes pendientes'}
                        </span>
                    </div>

                    {/* Card 4: Solicitudes de Retiro */}
                    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Solicitudes de Retiro</span>
                            <ArrowUpToLine className="w-4 h-4 text-amber-600" />
                        </div>
                        <span className="text-2xl font-black text-amber-600 font-mono block">
                            {withdrawals.length}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium block">
                            {withdrawals.filter(w => w.estado === 'pendiente').length > 0
                                ? `${withdrawals.filter(w => w.estado === 'pendiente').length} en proceso de aprobación`
                                : 'Sin retiros pendientes'}
                        </span>
                    </div>
                </div>

                {/* ⚡ Acciones Secundarias Rápidas */}
                <div className="flex flex-wrap items-center gap-2.5">
                    <button
                        onClick={() => setIsTransferModalOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-2xl font-bold text-xs shadow-2xs transition-all cursor-pointer font-montserrat"
                    >
                        <Send className="w-4 h-4 text-brand-500" />
                        <span>Transferir Saldo</span>
                    </button>

                    {!isDirectivo && (
                        <Can permission="wallets:new_investment">
                            <button
                                onClick={canInvest ? () => setIsNewInvestmentModalOpen(true) : undefined}
                                disabled={!canInvest}
                                title={!canInvest ? (isSarlaftPending ? "Validación SARLAFT en proceso" : "Cuenta no habilitada para inversiones") : undefined}
                                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all font-montserrat ${
                                    !canInvest
                                        ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 cursor-pointer shadow-2xs'
                                }`}
                            >
                                <TrendingUp className="w-4 h-4 text-emerald-600" />
                                <span>Nueva Inversión</span>
                                {!canInvest && (
                                    <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border ${
                                        isSarlaftPending
                                            ? 'bg-amber-100 text-amber-800 border-amber-200'
                                            : 'bg-rose-100 text-rose-800 border-rose-200'
                                    }`}>
                                        {isSarlaftPending ? "En validación" : "Bloqueado"}
                                    </span>
                                )}
                            </button>
                        </Can>
                    )}
                </div>

                {/* 🎛️ 3. Pestañas de Navegación Segmentadas (Pill Controls) */}
                <div className="flex items-center gap-2 p-1.5 bg-slate-100/80 rounded-2xl w-fit border border-slate-200/80 overflow-x-auto max-w-full">
                    <button
                        onClick={() => setActiveTab('movements')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer font-montserrat whitespace-nowrap flex items-center gap-2 ${
                            activeTab === 'movements'
                                ? 'bg-slate-900 text-white shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        <span>Historial de Transacciones ({movements.length})</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('recharges')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer font-montserrat whitespace-nowrap flex items-center gap-2 ${
                            activeTab === 'recharges'
                                ? 'bg-slate-900 text-white shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <ArrowDownToLine className="w-3.5 h-3.5" />
                        <span>Solicitudes de Recarga ({recharges.length})</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('withdrawals')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer font-montserrat whitespace-nowrap flex items-center gap-2 ${
                            activeTab === 'withdrawals'
                                ? 'bg-slate-900 text-white shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <ArrowUpToLine className="w-3.5 h-3.5" />
                        <span>Solicitudes de Retiro ({withdrawals.length})</span>
                    </button>
                </div>

                {/* Estado de Carga */}
                {loading ? (
                    <div className="bg-white border border-slate-200 rounded-3xl p-8 space-y-4 animate-pulse">
                        <div className="h-6 w-48 bg-slate-100 rounded-xl"></div>
                        <div className="space-y-3">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="h-16 bg-slate-100 rounded-2xl w-full"></div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* 📑 TAB 1: HISTORIAL DE TRANSACCIONES */}
                        {activeTab === 'movements' && (
                            <Can permission="wallets:view_history">
                                <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-xs space-y-6">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                        <div>
                                            <h3 className="text-base sm:text-lg font-black text-slate-900 font-montserrat">
                                                Historial de Transacciones
                                            </h3>
                                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                                                Ingresos de rendimientos, comisiones, transferencias y movimientos de tu saldo
                                            </p>
                                        </div>
                                    </div>

                                    {movements.length > 0 ? (
                                        <div className="space-y-3">
                                            {movements.map((mov) => {
                                                const status = getStatusConfig(mov.estado);
                                                const rawOrigin = mov.origen || mov.type || mov.reference_type || '';
                                                const isIngreso = isIngresoMovement(mov);
                                                const displayType = getOriginTranslation(rawOrigin);
                                                const cleanObs = mov.observaciones ? mov.observaciones.replace(/\(Admin:.*?\)/gi, '').replace(/\s*\([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+\)/gi, '').trim() : '';

                                                return (
                                                    <div 
                                                        key={mov.id} 
                                                        onClick={() => setSelectedMovement(mov)}
                                                        className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-brand-200 hover:bg-brand-50/20 transition-all cursor-pointer group"
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className={`p-3 rounded-2xl shrink-0 ${isIngreso ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-600 border border-slate-200/80'}`}>
                                                                {isIngreso ? <ArrowDownToLine className="w-5 h-5" /> : <ArrowUpToLine className="w-5 h-5" />}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-slate-900 font-montserrat">
                                                                    {displayType}
                                                                </p>
                                                                <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 mt-0.5">
                                                                    <span>{formatDate(mov.fecha_solicitud || mov.created_at)}</span>
                                                                    <span>•</span>
                                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${status.bg} ${status.color}`}>
                                                                        <status.icon className="w-3 h-3" />
                                                                        {status.text}
                                                                    </span>
                                                                </div>
                                                                {(cleanObs || mov.motivo_rechazo) && (
                                                                    <p className="text-xs text-slate-500 mt-1 max-w-[200px] sm:max-w-xs md:max-w-md lg:max-w-lg xl:max-w-xl truncate">
                                                                        {mov.motivo_rechazo || cleanObs}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="flex items-center gap-3">
                                                            <div className="text-right">
                                                                <p className={`font-bold font-mono text-sm sm:text-base ${isIngreso ? 'text-emerald-600' : 'text-slate-900'}`}>
                                                                    {isIngreso ? '+' : '-'}{formatCurrency(mov.monto_neto)}
                                                                </p>
                                                                {mov.impuesto > 0 && (
                                                                    <p className="text-[10px] font-mono text-slate-400">
                                                                        Bruto: {formatCurrency(mov.monto)}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-brand-500 transition-colors" />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
                                            <div className="w-14 h-14 rounded-3xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto">
                                                <ArrowRightLeft className="w-7 h-7" />
                                            </div>
                                            <h3 className="text-base font-bold text-slate-800 font-montserrat">
                                                No hay transacciones registradas
                                            </h3>
                                            <p className="text-xs text-slate-500 max-w-md mx-auto font-medium">
                                                Tus ingresos por rendimientos, recargas de saldo o transferencias aparecerán listados aquí en tiempo real.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </Can>
                        )}

                        {/* 📑 TAB 2: SOLICITUDES DE RECARGA */}
                        {activeTab === 'recharges' && (
                            <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-xs space-y-6">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                    <div>
                                        <h3 className="text-base sm:text-lg font-black text-slate-900 font-montserrat">
                                            Solicitudes de Recarga de Saldo
                                        </h3>
                                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                                            Estado de tus comprobantes de recarga y consignaciones remitidas a la administración
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setIsRechargeModalOpen(true)}
                                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold transition-all cursor-pointer font-montserrat"
                                    >
                                        <ArrowDownToLine className="w-3.5 h-3.5" />
                                        <span>Nueva Recarga</span>
                                    </button>
                                </div>

                                {recharges.length > 0 ? (
                                    <div className="space-y-3">
                                        {recharges.map((r) => {
                                            const status = getStatusConfig(r.status);
                                            return (
                                                <div 
                                                    key={r.id}
                                                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/20 transition-all gap-4"
                                                >
                                                    <div className="flex items-center gap-4 flex-1">
                                                        <div className="p-3 rounded-2xl shrink-0 bg-emerald-50 text-emerald-600 border border-emerald-100">
                                                            <ArrowDownToLine className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-900 font-montserrat">
                                                                Recarga de Billetera ({r.payment_method})
                                                            </p>
                                                            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 mt-0.5">
                                                                <span>{formatDate(r.created_at || null)}</span>
                                                                <span>•</span>
                                                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${status.bg} ${status.color}`}>
                                                                    <status.icon className="w-3 h-3" />
                                                                    {status.text}
                                                                </span>
                                                                {r.reference_number && (
                                                                    <>
                                                                        <span>•</span>
                                                                        <span className="font-mono text-slate-600">Ref: {r.reference_number}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                            {(r.user_notes || r.admin_notes) && (
                                                                <p className="text-xs text-slate-500 mt-1 max-w-[200px] sm:max-w-xs md:max-w-md lg:max-w-lg truncate">
                                                                    {r.admin_notes ? `Nota de Administración: ${r.admin_notes}` : r.user_notes}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex items-center justify-between sm:justify-end gap-3">
                                                        <div className="text-right">
                                                            <p className="font-bold font-mono text-sm sm:text-base text-emerald-600">
                                                                +{formatCurrency(r.amount)}
                                                            </p>
                                                        </div>

                                                        {r.receipt_url && (
                                                            <a 
                                                                href={r.receipt_url.startsWith('/') ? r.receipt_url : `/api/v1/${r.receipt_url}`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors flex items-center gap-1 cursor-pointer font-montserrat"
                                                            >
                                                                <FileText className="w-3.5 h-3.5" />
                                                                <span>Comprobante</span>
                                                            </a>
                                                        )}
                                                        
                                                        {r.status === 'pending' && (
                                                            <button 
                                                                onClick={() => setCancellingRechargeId(r.id)}
                                                                className="px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 font-bold rounded-xl text-xs transition-colors flex items-center gap-1 cursor-pointer font-montserrat"
                                                            >
                                                                <XCircle className="w-3.5 h-3.5" />
                                                                <span>Cancelar</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
                                        <div className="w-14 h-14 rounded-3xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto">
                                            <ArrowDownToLine className="w-7 h-7" />
                                        </div>
                                        <h3 className="text-base font-bold text-slate-800 font-montserrat">
                                            No tienes solicitudes de recarga recientes
                                        </h3>
                                        <p className="text-xs text-slate-500 max-w-md mx-auto font-medium">
                                            Puedes adjuntar tu comprobante de pago o transferencia bancaria para abonar fondos a tu billetera.
                                        </p>
                                        <button
                                            onClick={() => setIsRechargeModalOpen(true)}
                                            className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-2xl text-xs font-bold transition-all shadow-sm shadow-brand-500/20 inline-flex items-center gap-2 cursor-pointer font-montserrat"
                                        >
                                            <ArrowDownToLine className="w-4 h-4" />
                                            <span>Crear tu primera recarga</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 📑 TAB 3: SOLICITUDES DE RETIRO */}
                        {activeTab === 'withdrawals' && (
                            <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-xs space-y-6">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                    <div>
                                        <h3 className="text-base sm:text-lg font-black text-slate-900 font-montserrat">
                                            Solicitudes de Retiro de Fondos
                                        </h3>
                                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                                            Seguimiento y estado de tus solicitudes de desembolso a tu cuenta bancaria registrada
                                        </p>
                                    </div>
                                    <Can permission="wallets:request_withdrawal">
                                        <button
                                            onClick={() => setIsWithdrawalModalOpen(true)}
                                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 rounded-xl text-xs font-bold transition-all cursor-pointer font-montserrat"
                                        >
                                            <ArrowUpToLine className="w-3.5 h-3.5" />
                                            <span>Nuevo Retiro</span>
                                        </button>
                                    </Can>
                                </div>

                                {withdrawals.length > 0 ? (
                                    <div className="space-y-3">
                                        {withdrawals.map((mov) => {
                                            const status = getStatusConfig(mov.estado);
                                            
                                            return (
                                                <div 
                                                    key={mov.id} 
                                                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-amber-200 hover:bg-amber-50/20 transition-all gap-4"
                                                >
                                                    <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => setSelectedMovement(mov)}>
                                                        <div className="p-3 rounded-2xl shrink-0 bg-amber-50 text-amber-600 border border-amber-100">
                                                            <ArrowUpToLine className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-900 capitalize font-montserrat">
                                                                Solicitud de Retiro de Fondos
                                                            </p>
                                                            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 mt-0.5">
                                                                <span>{formatDate(mov.fecha_solicitud || mov.created_at)}</span>
                                                                <span>•</span>
                                                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${status.bg} ${status.color}`}>
                                                                    <status.icon className="w-3 h-3" />
                                                                    {status.text}
                                                                </span>
                                                            </div>
                                                            {(mov.observaciones || mov.motivo_rechazo) && (
                                                                <p className="text-xs text-slate-500 mt-1 max-w-[200px] sm:max-w-xs md:max-w-md lg:max-w-lg xl:max-w-xl truncate">
                                                                    {mov.motivo_rechazo || mov.observaciones}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex items-center justify-between sm:justify-end gap-3">
                                                        <div className="text-right">
                                                            <p className="font-bold font-mono text-sm sm:text-base text-slate-900">
                                                                -{formatCurrency(mov.monto)}
                                                            </p>
                                                        </div>
                                                        
                                                        {mov.estado === 'pendiente' && (
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (mov.real_id) setCancellingWithdrawalId(mov.real_id);
                                                                }}
                                                                className="px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 font-bold rounded-xl text-xs transition-colors flex items-center gap-1 cursor-pointer font-montserrat"
                                                            >
                                                                <XCircle className="w-3.5 h-3.5" />
                                                                <span>Cancelar</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
                                        <div className="w-14 h-14 rounded-3xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto">
                                            <ArrowUpToLine className="w-7 h-7" />
                                        </div>
                                        <h3 className="text-base font-bold text-slate-800 font-montserrat">
                                            No tienes solicitudes de retiro activas
                                        </h3>
                                        <p className="text-xs text-slate-500 max-w-md mx-auto font-medium">
                                            Cuando solicites transferir saldo de tu billetera a tu cuenta bancaria registrada, podrás supervisar el estado aquí.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}

                {/* Modal de Confirmación para Cancelar Retiro */}
                <ConfirmationModal
                    isOpen={!!cancellingWithdrawalId}
                    onClose={() => setCancellingWithdrawalId(null)}
                    onConfirm={handleConfirmCancelWithdrawal}
                    title="¿Cancelar Solicitud de Retiro?"
                    description="Los fondos retenidos serán reembolsados automáticamente a tu saldo disponible en la billetera."
                    confirmText="Sí, Cancelar Retiro"
                    cancelText="Mantener Retiro"
                    variant="warning"
                    isLoading={isCancellingWithdrawal}
                />

                {/* Modal de Confirmación para Cancelar Recarga */}
                <ConfirmationModal
                    isOpen={!!cancellingRechargeId}
                    onClose={() => setCancellingRechargeId(null)}
                    onConfirm={handleConfirmCancelRecharge}
                    title="¿Cancelar Solicitud de Recarga?"
                    description="Esta solicitud de recarga será cancelada y no será procesada por la administración."
                    confirmText="Sí, Cancelar Solicitud"
                    cancelText="Mantener Solicitud"
                    variant="warning"
                    isLoading={isCancellingRecharge}
                />
            </div>
        </Can>
    );
};
