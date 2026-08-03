import React, { useEffect, useState } from 'react';
import { Wallet, ArrowDownToLine, ArrowRightLeft, Clock, CheckCircle2, XCircle, AlertCircle, ArrowUpToLine, ChevronRight, Send, TrendingUp } from 'lucide-react';
import { Can } from '../../../components/security/Can';
import { fetchApi } from '../../../services/api';
import { WithdrawalModal } from '../components/WithdrawalModal';
import { MovementDetailModal } from '../components/MovementDetailModal';
import { NewInvestmentModal } from '../../dashboard/components/NewInvestmentModal';
import { TransferModal } from '../components/TransferModal';

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

export const WalletsPage = () => {
    const [balance, setBalance] = useState<number>(0);
    const [bankDetails, setBankDetails] = useState<any>(null);
    const [movements, setMovements] = useState<Movement[]>([]);
    const [withdrawals, setWithdrawals] = useState<Movement[]>([]);
    const [activeTab, setActiveTab] = useState<'movements' | 'withdrawals'>('movements');
    const [loading, setLoading] = useState(true);
    
    // Modals state
    const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
    const [isNewInvestmentModalOpen, setIsNewInvestmentModalOpen] = useState(false);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [balanceRes, movementsRes, withdrawalsRes] = await Promise.all([
                fetchApi('/wallets/me/balance'),
                fetchApi('/wallets/me/movements'),
                fetchApi('/wallets/me/withdrawals')
            ]);
            setBalance(balanceRes.balance || 0);
            setBankDetails(balanceRes.bank_details || null);
            setMovements(movementsRes || []);
            setWithdrawals(withdrawalsRes || []);
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

    const handleCancelWithdrawal = async (withdrawalId: number) => {
        if (!window.confirm('¿Estás seguro de que deseas cancelar este retiro? Los fondos serán reembolsados a tu billetera.')) return;
        
        try {
            await fetchApi(`/wallets/me/withdrawals/${withdrawalId}/cancel`, {
                method: 'POST'
            });
            fetchData();
        } catch (error) {
            console.error('Error cancelling withdrawal:', error);
            alert('Error al cancelar el retiro.');
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('es-CO', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const getStatusConfig = (estado: string) => {
        switch (estado) {
            case 'procesado':
            case 'aprobado':
                return { color: 'text-emerald-500', bg: 'bg-emerald-50', icon: CheckCircle2, text: 'Completado' };
            case 'pendiente':
                return { color: 'text-amber-500', bg: 'bg-amber-50', icon: Clock, text: 'Pendiente' };
            case 'rechazado':
            case 'cancelado':
                return { color: 'text-red-500', bg: 'bg-red-50', icon: XCircle, text: 'Rechazado' };
            default:
                return { color: 'text-slate-500', bg: 'bg-slate-50', icon: AlertCircle, text: estado };
        }
    };

    return (
        <Can permission="wallets:view">
            <WithdrawalModal 
                isOpen={isWithdrawalModalOpen} 
                onClose={() => setIsWithdrawalModalOpen(false)} 
                onSuccess={() => {
                    fetchData();
                }} 
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

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 relative pb-20">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight font-montserrat">Mi Billetera</h1>
                    <p className="text-slate-500 mt-1">Gestiona tu saldo y movimientos recientes</p>
                </div>

                {loading ? (
                    <div className="space-y-8 animate-pulse">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Balance Card Skeleton */}
                            <div className="col-span-1 md:col-span-2 h-48 bg-slate-900 rounded-3xl p-8"></div>
                            
                            {/* Actions Card Skeleton */}
                            <div className="col-span-1 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col gap-4">
                                <div className="h-14 w-full bg-slate-100 rounded-xl"></div>
                                <div className="h-14 w-full bg-slate-100 rounded-xl"></div>
                            </div>
                        </div>

                        {/* History Skeleton */}
                        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm">
                            <div className="h-8 w-64 bg-slate-100 rounded-xl mb-6"></div>
                            <div className="space-y-4 mt-4">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="h-20 bg-slate-100 rounded-2xl w-full"></div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                            {/* Balance Card */}
                            <Can permission="wallets:view_balance">
                                <div className="col-span-1 md:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                                    {/* Círculos decorativos tipo Glassmorphism */}
                                    <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-brand-500/20 rounded-full blur-3xl"></div>
                                    <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl"></div>
                                    
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10">
                                                <Wallet className="w-6 h-6 text-brand-400" />
                                            </div>
                                            <h2 className="text-lg font-medium text-slate-300">Saldo Disponible</h2>
                                        </div>
                                        
                                        <p className="text-5xl md:text-6xl font-bold font-montserrat tracking-tight text-white drop-shadow-sm">
                                            {formatCurrency(balance)}
                                        </p>
                                    </div>
                                </div>
                            </Can>

                    {/* Actions Card */}
                    <div className="col-span-1 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-center gap-4">
                        <Can permission="wallets:request_withdrawal">
                            <button 
                                onClick={() => setIsWithdrawalModalOpen(true)}
                                className="flex items-center justify-center gap-2 w-full py-3.5 px-4 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl transition-all shadow-md shadow-brand-500/20 active:scale-95"
                            >
                                <ArrowUpToLine className="w-5 h-5" />
                                Retirar Fondos
                            </button>
                        </Can>
                        
                        <button 
                            onClick={() => setIsTransferModalOpen(true)}
                            className="flex items-center justify-center gap-2 w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                        >
                            <Send className="w-5 h-5 text-brand-400" />
                            Transferir Saldo
                        </button>

                        <Can permission="wallets:new_investment">
                            <button 
                                onClick={() => setIsNewInvestmentModalOpen(true)}
                                className="flex items-center justify-center gap-2 w-full py-3.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold rounded-xl transition-all active:scale-95"
                            >
                                <TrendingUp className="w-5 h-5" />
                                Nueva Inversión
                            </button>
                        </Can>
                    </div>
                </div>

                {/* Historial de Movimientos y Solicitudes de Retiro */}
                <Can permission="wallets:view_history">
                    <div className="space-y-8">
                        {/* Tabla 1: Transacciones y Movimientos */}
                        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-brand-50 text-brand-600 rounded-xl">
                                        <ArrowRightLeft className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900 font-montserrat">Historial de Transacciones</h2>
                                        <p className="text-xs text-slate-500 mt-0.5">Ingresos de rendimientos, comisiones y movimientos de la billetera</p>
                                    </div>
                                </div>
                            </div>

                            {movements.length > 0 ? (
                                <div className="space-y-3">
                                    {movements.map((mov) => {
                                        const status = getStatusConfig(mov.estado);
                                        const rawOrigin = mov.origen || mov.type || mov.reference_type || '';
                                        const originNormalized = rawOrigin.toLowerCase().trim().replace(/_/g, ' ');
                                        const metodoPagoNormalized = mov.metodo_pago ? mov.metodo_pago.toLowerCase().trim() : '';

                                        const isIngreso = [
                                            'generacion_rendimiento', 'bono', 'cash', 'auto_yield_transfer', 'auto_bonus_transfer',
                                            'yield payout', 'transfer received', 'bonus payout', 'withdrawal refund',
                                            'rendimiento_inversion', 'bono_aceleracion', 'generacion rendimiento', 'rendimiento inversion'
                                        ].includes(rawOrigin.toLowerCase().trim()) || metodoPagoNormalized === 'wallet' || mov.tipo === 'ingreso' || mov.type === 'ingreso';

                                        const getOriginTranslation = (raw: string): string => {
                                            const norm = raw.toLowerCase().trim().replace(/_/g, ' ');
                                            const dict: Record<string, string> = {
                                                'yield payout reversal': 'Reversión de Rendimientos',
                                                'yield payout reversed': 'Rendimientos Revertidos',
                                                'yield payout': 'Pago de Rendimientos',
                                                'withdrawal request': 'Solicitud de Retiro',
                                                'withdrawal refund': 'Reembolso de Retiro',
                                                'transfer sent': 'Transferencia Enviada',
                                                'transfer received': 'Transferencia Recibida',
                                                'bonus payout': 'Pago de Bono',
                                                'investment reservation': 'Reserva de Inversión',
                                                'auto yield transfer': 'Pago de Rendimientos',
                                                'auto bonus transfer': 'Pago de Bono',
                                                'generacion rendimiento': 'Pago de Rendimientos',
                                                'rendimiento inversion': 'Pago de Rendimientos',
                                                'bono aceleracion': 'Bono de Aceleración',
                                                'bono': 'Pago de Bono',
                                                'ingreso': 'Ingreso a Billetera',
                                                'egreso': 'Egreso de Billetera',
                                                'cash': 'Depósito de Saldo'
                                            };

                                            if (dict[norm]) return dict[norm];
                                            for (const [key, val] of Object.entries(dict)) {
                                                if (norm.includes(key)) return val;
                                            }
                                            return norm.charAt(0).toUpperCase() + norm.slice(1);
                                        };

                                        const displayType = getOriginTranslation(rawOrigin);

                                        return (
                                            <div 
                                                key={mov.id} 
                                                onClick={() => setSelectedMovement(mov)}
                                                className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-brand-200 hover:bg-brand-50/30 transition-all cursor-pointer group"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-3 rounded-xl flex-shrink-0 ${isIngreso ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                                                        {isIngreso ? <ArrowDownToLine className="w-5 h-5" /> : <ArrowUpToLine className="w-5 h-5" />}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 font-montserrat">
                                                            {displayType}
                                                        </p>
                                                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mt-0.5">
                                                            <span>{formatDate(mov.fecha_solicitud)}</span>
                                                            <span>•</span>
                                                            <span className={`inline-flex items-center gap-1 ${status.color}`}>
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
                                                
                                                <div className="flex items-center gap-4">
                                                    <div className="text-right">
                                                        <p className={`font-bold font-montserrat ${isIngreso ? 'text-emerald-600' : 'text-slate-900'}`}>
                                                            {isIngreso ? '+' : '-'}{formatCurrency(mov.monto_neto)}
                                                        </p>
                                                    </div>
                                                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-brand-500 transition-colors" />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
                                    <p className="text-slate-500 font-medium">No hay transacciones recientes en tu billetera.</p>
                                </div>
                            )}
                        </div>

                        {/* Tabla 2: Solicitudes de Retiro (Debajo de la tabla de movimientos) */}
                        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                                        <ArrowUpToLine className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900 font-montserrat">Solicitudes de Retiro</h2>
                                        <p className="text-xs text-slate-500 mt-0.5">Estado de tus solicitudes de desembolso bancario</p>
                                    </div>
                                </div>
                            </div>

                            {withdrawals.length > 0 ? (
                                <div className="space-y-3">
                                    {withdrawals.map((mov) => {
                                        const status = getStatusConfig(mov.estado);
                                        
                                        return (
                                            <div 
                                                key={mov.id}
                                                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-brand-200 hover:bg-brand-50/30 transition-all group gap-4"
                                            >
                                                <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => setSelectedMovement(mov)}>
                                                    <div className="p-3 rounded-xl flex-shrink-0 bg-amber-50 text-amber-600">
                                                        <ArrowUpToLine className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 capitalize font-montserrat">
                                                            Retiro de Fondos
                                                        </p>
                                                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mt-0.5">
                                                            <span>{formatDate(mov.fecha_solicitud)}</span>
                                                            <span>•</span>
                                                            <span className={`inline-flex items-center gap-1 ${status.color}`}>
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
                                                
                                                <div className="flex items-center justify-between sm:justify-end gap-4">
                                                    <div className="text-right">
                                                        <p className="font-bold font-montserrat text-slate-900">
                                                            -{formatCurrency(mov.monto)}
                                                        </p>
                                                    </div>
                                                    
                                                    {mov.estado === 'pendiente' && (
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (mov.real_id) handleCancelWithdrawal(mov.real_id);
                                                            }}
                                                            className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 font-medium rounded-lg text-xs transition-colors flex items-center gap-1"
                                                        >
                                                            <XCircle className="w-3.5 h-3.5" />
                                                            Cancelar
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
                                    <p className="text-slate-500 font-medium">No tienes solicitudes de retiro.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </Can>
                    </>
                )}
            </div>
        </Can>
    );
};
