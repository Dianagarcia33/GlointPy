import React from 'react';
import { createPortal } from 'react-dom';
import { X, Briefcase, TrendingUp, DollarSign, Activity, Calendar, ArrowRight, Award } from 'lucide-react';
import { formatCurrency } from '../../../utils/format';
import { Investment } from '../../../services/investments';
import { useNavigate } from 'react-router-dom';

export type KPIType = 'invested' | 'finished' | 'current' | 'profit' | 'shares' | null;

interface KPIDetailModalProps {
    type: KPIType;
    onClose: () => void;
    activeInvestments: Investment[];
    finishedInvestments: Investment[];
    totalInvertido: number;
    totalInvertidoFinalizado: number;
    totalPortafolio: number;
    totalRendimiento: number;
    totalAcciones: number;
    rentabilidadGlobal: number;
    gananciaDiaria: number;
}

export const KPIDetailModal: React.FC<KPIDetailModalProps> = ({
    type,
    onClose,
    activeInvestments,
    finishedInvestments,
    totalInvertido,
    totalInvertidoFinalizado,
    totalPortafolio,
    totalRendimiento,
    totalAcciones,
    rentabilidadGlobal,
    gananciaDiaria,
}) => {
    const navigate = useNavigate();

    if (!type) return null;

    const getModalConfig = () => {
        switch (type) {
            case 'invested':
                return {
                    title: 'Capital Invertido Activo',
                    subtitle: 'Suma de capital en contratos de inversión vigentes',
                    badge: `${activeInvestments.length} Contratos Activos`,
                    icon: <Briefcase className="w-6 h-6 text-emerald-600" />,
                    bgIcon: 'bg-emerald-50 text-emerald-600 border-emerald-100',
                    mainValue: formatCurrency(totalInvertido),
                    formulaLabel: 'Total Capital Colocado',
                    items: activeInvestments,
                    emptyText: 'No tienes contratos activos actualmente.',
                };
            case 'finished':
                return {
                    title: 'Capital Finalizado',
                    subtitle: 'Contratos cuyo ciclo y periodo han culminado',
                    badge: `${finishedInvestments.length} Contratos Finalizados`,
                    icon: <Briefcase className="w-6 h-6 text-slate-600" />,
                    bgIcon: 'bg-slate-100 text-slate-600 border-slate-200',
                    mainValue: formatCurrency(totalInvertidoFinalizado),
                    formulaLabel: 'Total Capital Liquidado',
                    items: finishedInvestments,
                    emptyText: 'No tienes contratos finalizados en tu historial.',
                };
            case 'current':
                return {
                    title: 'Valor Proyectado del Portafolio',
                    subtitle: 'Capital invertido más los rendimientos estimados totales a recibir',
                    badge: `+${rentabilidadGlobal.toFixed(1)}% ROI Estimado`,
                    icon: <DollarSign className="w-6 h-6 text-brand-600" />,
                    bgIcon: 'bg-brand-50 text-brand-600 border-brand-100',
                    mainValue: formatCurrency(totalPortafolio),
                    formulaLabel: 'Fórmula: Capital Activo + Rendimientos Totales',
                    items: activeInvestments,
                    emptyText: 'No hay proyecciones activas.',
                };
            case 'profit':
                return {
                    title: 'Rendimiento Proyectado',
                    subtitle: 'Ganancia neta total generada por tus contratos activos',
                    badge: `+${formatCurrency(gananciaDiaria, true)}/día estimado`,
                    icon: <TrendingUp className="w-6 h-6 text-emerald-600" />,
                    bgIcon: 'bg-emerald-50 text-emerald-600 border-emerald-100',
                    mainValue: `+${formatCurrency(totalRendimiento)}`,
                    formulaLabel: 'Rendimiento Acumulado Global',
                    items: activeInvestments,
                    emptyText: 'No hay rendimientos proyectados activos.',
                };
            case 'shares':
                return {
                    title: 'Acciones Adquiridas',
                    subtitle: 'Participación y acciones asignadas por tus paquetes de inversión',
                    badge: `${totalAcciones} Acciones Totales`,
                    icon: <Activity className="w-6 h-6 text-purple-600" />,
                    bgIcon: 'bg-purple-50 text-purple-600 border-purple-100',
                    mainValue: `${totalAcciones} unds`,
                    formulaLabel: 'Participación en Equity de la Compañía',
                    items: activeInvestments,
                    emptyText: 'No tienes acciones asignadas en contratos activos.',
                };
            default:
                return null;
        }
    };

    const config = getModalConfig();
    if (!config) return null;

    return createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200">
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
                    <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-2xl border ${config.bgIcon}`}>
                            {config.icon}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-bold text-slate-900 font-montserrat">{config.title}</h2>
                                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-slate-200/80 text-slate-700">
                                    {config.badge}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">{config.subtitle}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-full transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Hero Metric Summary */}
                <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">
                            {config.formulaLabel}
                        </span>
                        <h3 className="text-3xl font-extrabold font-montserrat tracking-tight text-white mt-0.5">
                            {config.mainValue}
                        </h3>
                    </div>
                    {type === 'current' && (
                        <div className="text-xs text-slate-300 bg-white/10 px-3.5 py-2 rounded-xl border border-white/10 space-y-0.5">
                            <p className="font-semibold text-emerald-400">Capital: {formatCurrency(totalInvertido)}</p>
                            <p className="font-semibold text-brand-300">Rendimiento: +{formatCurrency(totalRendimiento)}</p>
                        </div>
                    )}
                    {type === 'profit' && (
                        <div className="text-xs text-slate-300 bg-white/10 px-3.5 py-2 rounded-xl border border-white/10 space-y-0.5">
                            <p className="font-semibold text-emerald-400">ROI Global: +{rentabilidadGlobal.toFixed(1)}%</p>
                            <p className="font-semibold text-slate-300">Generación diaria: +{formatCurrency(gananciaDiaria, true)}/d</p>
                        </div>
                    )}
                    {type === 'shares' && (
                        <div className="text-xs text-slate-300 bg-white/10 px-3.5 py-2 rounded-xl border border-white/10">
                            <p className="font-semibold text-purple-300 flex items-center gap-1">
                                <Award className="w-3.5 h-3.5" /> Acciones con plenos derechos
                            </p>
                        </div>
                    )}
                </div>

                {/* Contracts List */}
                <div className="p-6 overflow-y-auto space-y-3 flex-1 custom-scrollbar">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Desglose de Contratos Asociados
                    </h4>

                    {config.items.length === 0 ? (
                        <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            <p className="text-xs font-semibold text-slate-400">{config.emptyText}</p>
                        </div>
                    ) : (
                        config.items.map((inv) => {
                            const monto = Number(inv.monto) || 0;
                            const rendimiento = Number(inv.rendimiento_total_contrato) || 0;
                            const acciones = inv.paquete?.acciones_otorgadas || 0;
                            const porcentaje = (inv as any).periodo?.percentage || (inv as any).porcentaje_mensual;

                            return (
                                <div
                                    key={inv.id}
                                    className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-brand-300 hover:shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                >
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-extrabold text-slate-900 font-montserrat">
                                                Contrato #{inv.id}
                                            </span>
                                            {porcentaje && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    {porcentaje}% mensual
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-slate-500">
                                            <span className="font-semibold text-slate-700">
                                                Capital: {formatCurrency(monto)}
                                            </span>
                                            <span>•</span>
                                            <span className="text-emerald-600 font-semibold">
                                                Rendimiento: +{formatCurrency(rendimiento)}
                                            </span>
                                            <span>•</span>
                                            <span className="text-purple-600 font-semibold">
                                                {acciones} acciones
                                            </span>
                                        </div>
                                        {inv.fecha_ingreso && (
                                            <p className="text-[11px] text-slate-400 flex items-center gap-1">
                                                <Calendar className="w-3 h-3" /> Inicio: {new Date(inv.fecha_ingreso).toLocaleDateString('es-CO')}
                                            </p>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => {
                                            onClose();
                                            navigate(`/dashboard/investments/${inv.id}`);
                                        }}
                                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-xl transition-colors cursor-pointer shrink-0"
                                    >
                                        Ver Contrato <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                        Cerrar Detalle
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
