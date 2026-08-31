import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, TrendingUp, Activity, Calendar, Clock, ChevronRight, FileText, ArrowDownToLine, Zap, Loader2 } from 'lucide-react';
import { formatCurrency } from '../../../utils/format';
import { Investment } from '../../../services/investments';
import { WithdrawalModal } from '../../wallets/components/WithdrawalModal';
import { investorDocumentsService } from '../../../services/investorDocuments';
import { printPaginatedDocument } from '../../../components/common/DocumentPagesPreview';

interface InvestmentCardProps {
    investment: Investment;
}

export const InvestmentCard: React.FC<InvestmentCardProps> = ({ investment }) => {
    const navigate = useNavigate();
    const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
    const [isDownloadingCert, setIsDownloadingCert] = useState(false);
    const inv = investment;
    
    // Status Logic
    const getStatusConfig = (status: string) => {
        switch(status) {
            case 'approved': return { label: 'Activo', classes: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
            case 'pending': return { label: 'En Revisión', classes: 'bg-brand-100 text-brand-700 border-brand-200' };
            case 'rejected': return { label: 'Rechazado', classes: 'bg-red-100 text-red-700 border-red-200' };
            default: return { label: 'Finalizado', classes: 'bg-slate-100 text-slate-600 border-slate-200' };
        }
    };
    
    const statusConfig = getStatusConfig(inv.status || 'pending');

    // Financial Metrics
    const monto = parseInt(inv.monto as any) || 0;
    const rendimiento = parseInt(inv.rendimiento_total_contrato as any) || 0;
    const rentabilidadPct = monto > 0 ? ((rendimiento / monto) * 100).toFixed(1) : "0.0";
    
    // Progress calculation
    const aceleracionDias = inv.aceleracion_dias || 0;
    const totalDays = Math.max(1, (inv.dias_contrato || 547) - aceleracionDias);
    let daysElapsed = 0;
    
    if (inv.fecha_ingreso) {
        const startDate = new Date(inv.fecha_ingreso);
        const today = new Date();
        const diffTime = today.getTime() - startDate.getTime();
        daysElapsed = diffTime > 0 ? Math.floor(diffTime / (1000 * 60 * 60 * 24)) : 0;
    } else if (inv.status === 'pending' || inv.status === 'rejected') {
        daysElapsed = 0;
    } else if (inv.created_at) {
        const startDate = new Date(inv.created_at);
        const today = new Date();
        const diffTime = today.getTime() - startDate.getTime();
        daysElapsed = diffTime > 0 ? Math.floor(diffTime / (1000 * 60 * 60 * 24)) : 0;
    }
    
    const daysLeft = Math.max(0, totalDays - daysElapsed);
    const progressPct = Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100));

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'Pendiente';
        return new Date(dateStr).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const handleDownloadCertificate = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (String(inv.id).startsWith('req_')) {
            alert("El certificado oficial se generará automáticamente una vez sea aprobada la inversión.");
            return;
        }

        setIsDownloadingCert(true);
        try {
            const docs = await investorDocumentsService.getMyDocuments(Number(inv.id));
            if (docs && docs.length > 0) {
                // Find certificate or first available legal document
                const certDoc = docs.find(d => 
                    (d.document_type || '').toLowerCase().includes('cert') || 
                    (d.title || '').toLowerCase().includes('cert')
                ) || docs[0];

                printPaginatedDocument(certDoc.title, certDoc.html_content, certDoc.background_image);
            } else {
                // If no generated document found, navigate to contract detail page where documents are listed
                navigate(`/dashboard/investments/${inv.id}`);
            }
        } catch (err) {
            console.error("Error al obtener certificado:", err);
            navigate(`/dashboard/investments/${inv.id}`);
        } finally {
            setIsDownloadingCert(false);
        }
    };

    return (
        <>
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-slate-300 transition-all duration-300 overflow-hidden flex flex-col group">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-white border border-slate-200 shadow-sm rounded-xl text-slate-400 group-hover:text-brand-500 transition-colors">
                            <DollarSign className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Paquete de Inversión</p>
                            <div className="flex items-baseline gap-2">
                                <h4 className="text-xl font-bold text-slate-900 font-montserrat">
                                    {formatCurrency(parseInt(inv.paquete?.paquete_accion_adquirido || "0") || monto)}
                                </h4>
                                {((inv as any).periodo?.percentage || (inv as any).porcentaje_mensual) && (
                                    <span className="text-xs font-extrabold text-emerald-600 font-montserrat bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                                        {(inv as any).periodo?.percentage || (inv as any).porcentaje_mensual}% / mes
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {aceleracionDias > 0 && (
                            <span className="text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-md font-bold border bg-purple-100 text-purple-700 border-purple-200 flex items-center gap-1">
                                <Zap className="w-3 h-3 fill-current" />
                                -{Math.floor(aceleracionDias)}d
                            </span>
                        )}
                        <span className={`text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-md font-bold border ${statusConfig.classes}`}>
                            {statusConfig.label}
                        </span>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-6">
                    <div className="flex justify-between items-end mb-2">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                            <Clock className="w-3.5 h-3.5" />
                            {daysLeft} días restantes
                        </div>
                        <span className="text-xs font-bold text-slate-900">{progressPct.toFixed(0)}% Completado</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 border border-slate-200 overflow-hidden">
                        <div 
                            className="bg-brand-500 h-2.5 rounded-full transition-all duration-1000 ease-out" 
                            style={{ width: `${progressPct}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* Financial Details */}
            <div className="p-6 space-y-4">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600 font-medium">Capital Invertido</span>
                    <span className="font-semibold text-slate-900">{formatCurrency(monto)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600 font-medium">Rentabilidad del Contrato</span>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 text-xs font-montserrat flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                        {(inv as any).periodo?.percentage 
                            ? `${(inv as any).periodo.percentage}% mensual (${(inv as any).periodo.months || Math.round((inv.dias_contrato || 0) / 30)} meses)` 
                            : (inv as any).porcentaje_mensual 
                                ? `${(inv as any).porcentaje_mensual}% mensual` 
                                : `+${rentabilidadPct}% total`}
                    </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600 font-medium">Rendimiento Proyectado</span>
                    <div className="text-right">
                        <span className="font-bold text-brand-600 block">+{formatCurrency(rendimiento)}</span>
                        <span className="text-[10px] font-bold text-emerald-600">+{rentabilidadPct}% acumulado</span>
                    </div>
                </div>
                {inv.liquidacion_diaria_rendimiento && (
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-600 font-medium">Rendimiento Diario</span>
                        <span className="font-semibold text-brand-600">+{formatCurrency(inv.liquidacion_diaria_rendimiento)}</span>
                    </div>
                )}
                <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600 font-medium">Acciones Otorgadas</span>
                    <span className="font-semibold text-slate-900">{inv.paquete?.acciones_otorgadas || 0} unds</span>
                </div>
            </div>

            {/* Footer Dates */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center mt-auto">
                <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Inicio</p>
                    <p className="text-xs font-semibold text-slate-700">{formatDate(inv.fecha_ingreso || inv.created_at)}</p>
                </div>
                <div className="text-right">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Finalización</p>
                    <p className="text-xs font-semibold text-slate-700">{formatDate(inv.fecha_finalizacion)}</p>
                </div>
            </div>

            {/* Action Bar */}
            <div className="px-3 py-3 border-t border-slate-200 flex items-center justify-between bg-white">
                <div className="flex gap-2">
                    <button 
                        onClick={handleDownloadCertificate}
                        disabled={isDownloadingCert}
                        className="p-2 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center" 
                        title="Descargar Certificado Oficial / Documento Legal"
                    >
                        {isDownloadingCert ? (
                            <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
                        ) : (
                            <FileText className="w-4 h-4" />
                        )}
                    </button>
                    <button 
                        onClick={() => setIsWithdrawalModalOpen(true)}
                        className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer" 
                        title="Solicitar Retiro"
                    >
                        <ArrowDownToLine className="w-4 h-4" />
                    </button>
                </div>
                <button 
                    onClick={() => navigate(`/dashboard/investments/${inv.id}`)}
                    className="flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700 px-3 py-2 hover:bg-brand-50 rounded-lg transition-colors cursor-pointer"
                >
                    Ver Detalles <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>

        <WithdrawalModal 
            isOpen={isWithdrawalModalOpen} 
            onClose={() => setIsWithdrawalModalOpen(false)} 
        />
        </>
    );
};
