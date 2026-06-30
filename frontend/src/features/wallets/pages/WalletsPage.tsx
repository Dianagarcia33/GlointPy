import React, { useEffect, useState } from 'react';
import { Wallet, ArrowDownToLine, ArrowRightLeft, Clock, CheckCircle2, XCircle, AlertCircle, ArrowUpToLine, ChevronRight } from 'lucide-react';
import { Can } from '../../../components/security/Can';
import { fetchApi } from '../../../services/api';
import { WithdrawalModal } from '../components/WithdrawalModal';
import { MovementDetailModal } from '../components/MovementDetailModal';
import { NewInvestmentModal } from '../../dashboard/components/NewInvestmentModal';
import { TrendingUp } from 'lucide-react';

export interface Movement {
    id: number;
    investor_id: number | null;
    user_id: number;
    origen: string;
    tipo: string;
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
    const [loading, setLoading] = useState(true);
    
    // Modals state
    const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
    const [isNewInvestmentModalOpen, setIsNewInvestmentModalOpen] = useState(false);
    const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [balanceRes, movementsRes] = await Promise.all([
                fetchApi('/wallets/me/balance'),
                fetchApi('/wallets/me/movements')
            ]);
            setBalance(balanceRes.balance || 0);
            setBankDetails(balanceRes.bank_details || null);
            setMovements(movementsRes || []);
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

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 relative pb-20">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight font-montserrat">Mi Billetera</h1>
                    <p className="text-slate-500 mt-1">Gestiona tu saldo y movimientos recientes</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    {/* Balance Card (Rediseñada para coherencia con HeroCard del Dashboard) */}
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
                            
                            {loading ? (
                                <div className="h-14 w-48 bg-white/10 rounded-xl animate-pulse"></div>
                            ) : (
                                <p className="text-5xl md:text-6xl font-bold font-montserrat tracking-tight text-white drop-shadow-sm">
                                    {formatCurrency(balance)}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Actions Card */}
                    <div className="col-span-1 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-center gap-4">
                        <button 
                            onClick={() => setIsWithdrawalModalOpen(true)}
                            className="flex items-center justify-center gap-2 w-full py-3.5 px-4 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl transition-all shadow-md shadow-brand-500/20 active:scale-95"
                        >
                            <ArrowUpToLine className="w-5 h-5" />
                            Retirar Fondos
                        </button>
                        
                        <button 
                            onClick={() => setIsNewInvestmentModalOpen(true)}
                            className="flex items-center justify-center gap-2 w-full py-3.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold rounded-xl transition-all active:scale-95"
                        >
                            <TrendingUp className="w-5 h-5" />
                            Nueva Inversión
                        </button>
                    </div>
                </div>

                {/* Historial de Movimientos (Lista Moderna) */}
                <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-slate-100 rounded-xl">
                                <ArrowRightLeft className="w-5 h-5 text-slate-700" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 font-montserrat">Historial de Movimientos</h2>
                        </div>
                    </div>

                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-20 bg-slate-50 rounded-2xl animate-pulse border border-slate-100"></div>
                            ))}
                        </div>
                    ) : movements.length > 0 ? (
                        <div className="space-y-3">
                            {movements.map((mov) => {
                                const status = getStatusConfig(mov.estado);
                                const originNormalized = mov.origen.toLowerCase();
                                const metodoPagoNormalized = mov.metodo_pago ? mov.metodo_pago.toLowerCase() : '';
                                const isIngreso = ['generacion_rendimiento', 'bono', 'cash', 'auto_yield_transfer', 'auto_bonus_transfer'].includes(originNormalized) || metodoPagoNormalized === 'wallet';

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
                                                <p className="font-bold text-slate-900 capitalize font-montserrat">
                                                    {mov.origen.replace(/_/g, ' ')}
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
                            <p className="text-slate-500 font-medium">No hay movimientos recientes en tu billetera.</p>
                        </div>
                    )}
                </div>
            </div>
        </Can>
    );
};
