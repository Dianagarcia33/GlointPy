import React from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowDownToLine, ArrowUpToLine, CheckCircle2, Clock, XCircle, AlertCircle, Landmark, Calendar, User, FileText, Wallet } from 'lucide-react';

interface MovementDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    movement: any; // The movement object containing all 11+ columns
}

export const MovementDetailModal = ({ isOpen, onClose, movement }: MovementDetailModalProps) => {
    if (!isOpen || !movement) return null;

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(value);
    };

    const formatDate = (dateString: string | null, includeTime = false) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        if (includeTime) {
            return date.toLocaleString('es-CO');
        }
        return date.toLocaleDateString('es-CO');
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

    const status = getStatusConfig(movement.estado);

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

    const isIngreso = isIngresoMovement(movement);

    const getOriginTranslation = (raw: string): string => {
        if (!raw) return 'Transacción de Billetera';
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

    const rawOrigin = movement.origen || movement.type || movement.reference_type || '';
    const displayType = getOriginTranslation(rawOrigin);

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-start justify-between relative bg-slate-50">
                    <div className="flex gap-4 items-center">
                        <div className={`p-3 rounded-2xl ${isIngreso ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-700'}`}>
                            {isIngreso ? <ArrowDownToLine className="w-6 h-6" /> : <ArrowUpToLine className="w-6 h-6" />}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold font-montserrat text-slate-900">
                                {displayType}
                            </h2>
                            <p className="text-slate-500 text-sm mt-0.5">{isIngreso ? 'Ingreso' : 'Egreso'} • ID: #{movement.id}</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 hover:bg-slate-200/50 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 overflow-y-auto space-y-6">
                    {/* Monto Principal */}
                    <div className="text-center py-4">
                        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Monto Neto {isIngreso ? 'Recibido' : 'Retirado'}</p>
                        <p className={`text-4xl font-bold font-montserrat tracking-tight ${isIngreso ? 'text-emerald-600' : 'text-slate-900'}`}>
                            {isIngreso ? '+' : '-'}{formatCurrency(movement.monto_neto)}
                        </p>
                        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border" style={{ backgroundColor: status.bg.replace('bg-', 'var(--tw-colors-').replace('-50', '-50)'), borderColor: status.bg.replace('bg-', 'var(--tw-colors-').replace('-50', '-100)'), color: status.color.replace('text-', 'var(--tw-colors-') }}>
                            <status.icon className="w-4 h-4" />
                            {status.text}
                        </div>
                    </div>

                    <hr className="border-slate-100" />

                    {/* Desglose Financiero */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                            <Landmark className="w-4 h-4 text-slate-400" /> Desglose Financiero
                        </h3>
                        <div className="bg-slate-50 rounded-2xl p-4 space-y-3 border border-slate-100">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500 font-medium">Monto Bruto</span>
                                <span className="font-semibold text-slate-900">{formatCurrency(movement.monto)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500 font-medium">Impuestos / Deducciones</span>
                                <span className="font-semibold text-red-500">-{formatCurrency(movement.impuesto)}</span>
                            </div>
                            <div className="pt-2 border-t border-slate-200 flex justify-between text-sm">
                                <span className="text-slate-700 font-bold">Total Neto</span>
                                <span className="font-bold text-slate-900">{formatCurrency(movement.monto_neto)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Historial de Saldo */}
                    {(movement.saldo_anterior !== null && movement.saldo_nuevo !== null) && (
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                                <Wallet className="w-4 h-4 text-slate-400" /> Historial de Saldo
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                                    <p className="text-xs text-slate-500 font-medium mb-1">Saldo Anterior</p>
                                    <p className="text-sm font-semibold text-slate-900">{formatCurrency(movement.saldo_anterior)}</p>
                                </div>
                                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                                    <p className="text-xs text-slate-500 font-medium mb-1">Saldo Nuevo</p>
                                    <p className="text-sm font-semibold text-slate-900">{formatCurrency(movement.saldo_nuevo)}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Fechas */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" /> Fechas y Tiempos
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                                <p className="text-xs text-slate-500 font-medium mb-1">Solicitado el</p>
                                <p className="text-sm font-semibold text-slate-900">{formatDate(movement.fecha_solicitud)}</p>
                            </div>
                            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                                <p className="text-xs text-slate-500 font-medium mb-1">Procesado el</p>
                                <p className="text-sm font-semibold text-slate-900">{formatDate(movement.fecha_procesamiento || movement.fecha_aprobacion) || 'Pendiente'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Datos de Destino (Banco) */}
                    {movement.banco && (
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                                <User className="w-4 h-4 text-slate-400" /> Información de Destino
                            </h3>
                            <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-blue-700 font-medium">Método</span>
                                        <span className="font-semibold text-blue-900 capitalize">{movement.metodo_pago}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-blue-700 font-medium">Banco</span>
                                        <span className="font-semibold text-blue-900">{movement.banco}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-blue-700 font-medium">Cuenta</span>
                                        <span className="font-semibold text-blue-900">{movement.tipo_cuenta} • {movement.numero_cuenta}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Observaciones */}
                    {(() => {
                        const cleanObs = movement.observaciones ? movement.observaciones.replace(/\(Admin:.*?\)/gi, '').replace(/\s*\([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+\)/gi, '').trim() : '';
                        if (!cleanObs && !movement.motivo_rechazo) return null;
                        return (
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-slate-400" /> Notas Administrativas
                                </h3>
                                <div className={`rounded-2xl p-4 border text-sm ${movement.motivo_rechazo ? 'bg-red-50 border-red-100 text-red-700' : 'bg-slate-50 border-slate-100 text-slate-700'}`}>
                                    {movement.motivo_rechazo || cleanObs}
                                </div>
                            </div>
                        );
                    })()}

                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
                    <button 
                        onClick={onClose}
                        className="px-6 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-colors shadow-sm"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
