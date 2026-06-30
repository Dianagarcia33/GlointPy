import React, { useEffect, useState } from 'react';
import { Wallet, ArrowDownToLine, ArrowRightLeft, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Can } from '../../../components/security/Can';
import { fetchApi } from '../../../services/api';
import { WithdrawalModal } from '../components/WithdrawalModal';

interface Movement {
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
}

export const WalletsPage = () => {
    const [balance, setBalance] = useState<number>(0);
    const [bankDetails, setBankDetails] = useState<any>(null);
    const [movements, setMovements] = useState<Movement[]>([]);
    const [loading, setLoading] = useState(true);
    const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);

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
        return new Date(dateString).toLocaleDateString('es-CO');
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
                    // Opcionalmente mostrar un toast de éxito aquí
                }} 
                availableBalance={balance}
                bankDetails={bankDetails}
            />

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 relative pb-20">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight font-montserrat">Mi Billetera</h1>
                    <p className="text-slate-500 mt-1">Gestiona tu saldo y movimientos recientes</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    {/* Balance Card */}
                    <div className="col-span-1 md:col-span-2 bg-gradient-to-br from-brand-600 to-brand-800 rounded-3xl p-8 text-white shadow-xl shadow-brand-500/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl"></div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                                    <Wallet className="w-6 h-6 text-white" />
                                </div>
                                <h2 className="text-lg font-medium text-brand-50">Saldo Disponible</h2>
                            </div>
                            
                            {loading ? (
                                <div className="h-14 w-48 bg-white/20 rounded-xl animate-pulse"></div>
                            ) : (
                                <p className="text-5xl font-bold font-montserrat tracking-tight">
                                    {formatCurrency(balance)}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Actions Card */}
                    <div className="col-span-1 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-center gap-4">
                        <button 
                            onClick={() => setIsWithdrawalModalOpen(true)}
                            className="flex items-center justify-center gap-2 w-full py-3.5 px-4 bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold rounded-xl transition-colors"
                        >
                            <ArrowDownToLine className="w-5 h-5" />
                            Retirar Fondos
                        </button>
                    </div>
                </div>

                {/* Historial de Movimientos */}
                <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-slate-100 rounded-xl">
                            <ArrowRightLeft className="w-5 h-5 text-slate-700" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 font-montserrat">Historial de Movimientos</h2>
                    </div>

                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse"></div>
                            ))}
                        </div>
                    ) : movements.length > 0 ? (
                        <div className="overflow-x-auto pb-4">
                            <table className="w-full text-left border-collapse whitespace-nowrap min-w-max">
                                <thead>
                                    <tr className="border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                                        <th className="pb-4 font-bold px-4">ID</th>
                                        <th className="pb-4 font-bold px-4">F. Solicitud</th>
                                        <th className="pb-4 font-bold px-4">Detalle</th>
                                        <th className="pb-4 font-bold px-4">Método</th>
                                        <th className="pb-4 font-bold px-4">Datos Banco</th>
                                        <th className="pb-4 font-bold px-4 text-right">Monto Bruto</th>
                                        <th className="pb-4 font-bold px-4 text-right">Impuesto</th>
                                        <th className="pb-4 font-bold px-4 text-right">Monto Neto</th>
                                        <th className="pb-4 font-bold px-4">Estado</th>
                                        <th className="pb-4 font-bold px-4">F. Procesamiento</th>
                                        <th className="pb-4 font-bold px-4">Observaciones / Rechazo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {movements.map((mov) => {
                                        const status = getStatusConfig(mov.estado);
                                        const originNormalized = mov.origen.toLowerCase();
                                        const metodoPagoNormalized = mov.metodo_pago ? mov.metodo_pago.toLowerCase() : '';
                                        // Es ingreso si el origen es de generacion/bono directo O si el metodo_pago fue a la 'wallet'
                                        const isIngreso = ['generacion_rendimiento', 'bono', 'cash', 'auto_yield_transfer', 'auto_bonus_transfer'].includes(originNormalized) || metodoPagoNormalized === 'wallet';

                                        return (
                                            <tr key={mov.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors group">
                                                <td className="py-4 px-4 text-sm text-slate-500 font-medium">#{mov.id}</td>
                                                <td className="py-4 px-4 text-sm text-slate-600">{formatDate(mov.fecha_solicitud)}</td>
                                                <td className="py-4 px-4">
                                                    <p className="text-sm font-medium text-slate-900 capitalize">{mov.origen.replace(/_/g, ' ')}</p>
                                                    <p className="text-xs text-slate-500 capitalize">{mov.tipo}</p>
                                                </td>
                                                <td className="py-4 px-4 text-sm text-slate-600 capitalize">{mov.metodo_pago || '-'}</td>
                                                <td className="py-4 px-4">
                                                    {mov.banco ? (
                                                        <div className="text-xs text-slate-600">
                                                            <p className="font-semibold text-slate-800">{mov.banco}</p>
                                                            <p>{mov.tipo_cuenta} • {mov.numero_cuenta}</p>
                                                        </div>
                                                    ) : '-'}
                                                </td>
                                                <td className="py-4 px-4 text-right text-sm text-slate-600">{formatCurrency(mov.monto)}</td>
                                                <td className="py-4 px-4 text-right text-sm text-red-500">{formatCurrency(mov.impuesto)}</td>
                                                <td className={`py-4 px-4 text-right font-bold font-montserrat ${isIngreso ? 'text-emerald-600' : 'text-slate-900'}`}>
                                                    {isIngreso ? '+' : '-'}{formatCurrency(mov.monto_neto)}
                                                </td>
                                                <td className="py-4 px-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${status.bg} ${status.color}`}>
                                                        <status.icon className="w-3.5 h-3.5" />
                                                        {status.text}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4 text-sm text-slate-600">{formatDate(mov.fecha_procesamiento || mov.fecha_aprobacion)}</td>
                                                <td className="py-4 px-4 text-xs text-slate-500 max-w-[200px] truncate" title={mov.motivo_rechazo || mov.observaciones || ''}>
                                                    {mov.motivo_rechazo || mov.observaciones || '-'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
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
