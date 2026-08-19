import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchApi, getMediaUrl } from '../../../services/api';
import { formatCurrency } from '../../../utils/format';
import { ArrowLeft, Clock, DollarSign, Activity, FileText, ArrowDownToLine, Zap, PlusCircle, Printer, Eye, X, Calendar } from 'lucide-react';
import { CapitalWithdrawalModal } from '../components/CapitalWithdrawalModal';
import { NewInvestmentModal } from '../../dashboard/components/NewInvestmentModal';
import { investorDocumentsService, InvestorDocument } from '../../../services/investorDocuments';

export const InvestmentDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [inv, setInv] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const [documents, setDocuments] = useState<InvestorDocument[]>([]);
    const [viewingDoc, setViewingDoc] = useState<InvestorDocument | null>(null);

    const loadDetails = async () => {
        try {
            const data = await fetchApi(`/investments/${id}`);
            setInv(data);

            if (!String(id).startsWith('req_')) {
                try {
                    const docs = await investorDocumentsService.getMyDocuments(Number(id));
                    setDocuments(docs);
                } catch (docErr) {
                    console.error("Error loading documents:", docErr);
                }
            }
        } catch (err) {
            console.error("Error loading investment:", err);
            alert("Error al cargar los detalles de la inversión");
            navigate('/dashboard');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDetails();
    }, [id, navigate]);

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Cargando detalles...</div>;
    }

    if (!inv) return null;

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'Pendiente';
        return new Date(dateStr).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const statusConfig = inv.status === 'approved' 
        ? { label: 'Activo', classes: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
        : { label: 'Finalizado', classes: 'bg-slate-100 text-slate-600 border-slate-200' };

    const progressPct = inv.dias_contrato > 0 ? Math.min(100, Math.max(0, (inv.dias_transcurridos / inv.dias_contrato) * 100)) : 0;
    const daysLeft = Math.max(0, inv.dias_contrato - inv.dias_transcurridos);

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-12">
            <CapitalWithdrawalModal
                isOpen={isWithdrawModalOpen}
                onClose={() => setIsWithdrawModalOpen(false)}
                onSuccess={() => {
                    setIsWithdrawModalOpen(false);
                    alert("¡Retiro solicitado con éxito!");
                    loadDetails();
                }}
                investmentId={inv.id}
                montoDisponible={inv.capital_disponible}
                canWithdrawCapital={inv.can_withdraw_capital}
                withdrawalDateMessage={inv.withdrawal_date_message}
                bankInfo={inv.bank_info}
            />
            <NewInvestmentModal 
                isOpen={isUpgradeModalOpen} 
                onClose={() => setIsUpgradeModalOpen(false)} 
                isUpgrade={true}
                investorId={inv.id}
                currentPackageId={inv.paquete?.id}
                currentPeriodId={inv.periodo?.id}
            />
            {/* Header / Back */}
            <div className="flex items-center gap-4 cursor-pointer text-slate-500 hover:text-slate-800 transition-colors" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5" />
                <span className="font-bold">Volver al Dashboard</span>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white border border-slate-200 shadow-sm rounded-2xl text-brand-500">
                                <DollarSign className="w-8 h-8" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Contrato de Inversión</p>
                                <h1 className="text-3xl font-bold text-slate-900 font-montserrat">
                                    {formatCurrency(inv.monto)}
                                </h1>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <span className={`text-xs uppercase tracking-widest px-3 py-1.5 rounded-lg font-bold border ${statusConfig.classes}`}>
                                {statusConfig.label}
                            </span>
                            <p className="text-sm font-semibold text-slate-500">ID: #{inv.id}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                        <div>
                            <div className="flex justify-between items-end mb-2">
                                <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-500">
                                    <Clock className="w-4 h-4" />
                                    {daysLeft} días restantes
                                </div>
                                <span className="text-sm font-bold text-slate-900">{progressPct.toFixed(0)}% Completado</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-3 border border-slate-200 overflow-hidden">
                                <div 
                                    className="bg-brand-500 h-3 rounded-full transition-all duration-1000 ease-out" 
                                    style={{ width: `${progressPct}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between mt-3 text-xs font-bold text-slate-400 uppercase">
                                <span>Inicio: {formatDate(inv.fecha_ingreso)}</span>
                                <span>Fin: {formatDate(inv.fecha_finalizacion)}</span>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                        Rendimientos Acumulados del Ciclo
                                    </span>
                                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/80">
                                        {inv.dias_ciclo_actual || 0} días en ciclo
                                    </span>
                                </div>
                                <p className="text-3xl md:text-4xl font-extrabold text-emerald-600 font-montserrat tracking-tight">
                                    +{formatCurrency(inv.rendimiento_ciclo_actual || 0)}
                                </p>
                            </div>
                            
                            <div className="pt-3 mt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                                <span className="text-slate-500 font-medium">Generación Diaria:</span>
                                <span className="font-extrabold text-emerald-600">
                                    +{formatCurrency(inv.liquidacion_diaria_rendimiento || 0, true)} / día
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Capital Management */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-brand-500" />
                                Gestión de Capital
                            </h3>
                            
                            <div className="mb-6">
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-xs font-semibold text-slate-500">Progreso de Liberación</span>
                                    <span className="text-xs font-bold text-brand-600">{((inv.capital_liberado / inv.monto) * 100 || 0).toFixed(0)}%</span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                    <div 
                                        className="bg-brand-500 h-2 rounded-full transition-all duration-1000 ease-out" 
                                        style={{ width: `${Math.min(100, Math.max(0, (inv.capital_liberado / inv.monto) * 100 || 0))}%` }}
                                    ></div>
                                </div>
                            </div>
                            
                            <div className="space-y-4 mb-6">
                                <div>
                                    <p className="text-xs font-semibold text-slate-500">Capital Liberado a la fecha</p>
                                    <p className="text-lg font-bold text-slate-900">{formatCurrency(inv.capital_liberado)}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-slate-500">Capital ya Retirado</p>
                                    <p className="text-sm font-bold text-red-500">-{formatCurrency(inv.capital_retirado)}</p>
                                </div>
                                <div className="pt-3 border-t border-slate-200">
                                    <p className="text-xs font-bold text-slate-900 uppercase">Capital Disponible</p>
                                    <p className="text-2xl font-bold text-brand-600">{formatCurrency(inv.capital_disponible)}</p>
                                </div>
                            </div>

                            <button 
                                onClick={() => setIsWithdrawModalOpen(true)}
                                disabled={inv.capital_disponible <= 0}
                                className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                                    inv.capital_disponible > 0 
                                    ? 'bg-brand-500 text-white hover:bg-brand-600 shadow-md shadow-brand-500/20 hover:shadow-lg hover:-translate-y-0.5'
                                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                }`}
                            >
                                <ArrowDownToLine className="w-4 h-4" />
                                Retirar Capital
                            </button>

                            {inv.can_upgrade && (
                                <button 
                                    onClick={() => setIsUpgradeModalOpen(true)}
                                    className="w-full mt-3 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                                >
                                    <PlusCircle className="w-4 h-4" />
                                    Aumento de Capital
                                </button>
                            )}
                            
                            {!inv.can_upgrade && (
                                <p className="text-xs text-center text-slate-500 mt-4">
                                    El aumento de capital solo está disponible durante los primeros 3 meses del contrato.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Right column: Movements and History */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Accelerations & Referral Bonuses */}
                        {inv.accelerations && inv.accelerations.length > 0 && (
                            <div className="bg-purple-50/60 p-6 rounded-2xl border border-purple-200/80">
                                <div className="flex justify-between items-center mb-4 border-b border-purple-200/50 pb-3">
                                    <h3 className="text-sm font-bold text-purple-900 uppercase tracking-widest flex items-center gap-2">
                                        <Zap className="w-4 h-4 text-purple-600" />
                                        Aceleraciones por Bonos de Referido (5%)
                                    </h3>
                                    <span className="text-xs font-bold bg-purple-200 text-purple-800 px-2.5 py-1 rounded-full">
                                        -{inv.dias_reducidos_totales || 0} días en total
                                    </span>
                                </div>
                                <div className="space-y-3">
                                    {inv.accelerations.map((acc: any) => (
                                        <div key={acc.id} className="p-4 rounded-xl border border-purple-100 bg-white shadow-sm flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                                                    <Zap className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 text-sm">Bono de Aceleración 5%</p>
                                                    <p className="text-xs text-slate-500">Monto equivalente: <strong className="text-emerald-600">{formatCurrency(acc.bonus_amount)}</strong></p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-bold text-purple-700 text-sm">-{acc.days_to_reduce} días</span>
                                                <p className="text-[11px] text-slate-400 mt-0.5">{formatDate(acc.created_at)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Contract History */}
                        {inv.history && inv.history.length > 0 && (
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4">Actualizaciones de Contrato</h3>
                                <div className="space-y-3">
                                    {inv.history.map((h: any) => (
                                        <div key={h.id} className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                                                    <Zap className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900">{h.cambio_tipo}</p>
                                                    <p className="text-xs text-slate-500">{h.observacion}</p>
                                                </div>
                                            </div>
                                            <span className="text-xs font-bold text-slate-400">{formatDate(h.fecha)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {/* Documentos y Contratos Emitidos */}
                        {documents.length > 0 && (
                            <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 space-y-4">
                                <div className="flex justify-between items-center border-b border-indigo-200/50 pb-3">
                                    <h3 className="text-sm font-bold text-indigo-950 uppercase tracking-widest flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-indigo-600" />
                                        Documentos & Contratos Legales
                                    </h3>
                                    <span className="text-xs font-bold bg-indigo-200 text-indigo-800 px-2.5 py-0.5 rounded-full">
                                        {documents.length} {documents.length === 1 ? 'documento' : 'documentos'}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {documents.map((doc) => (
                                        <div key={doc.id} className="bg-white p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all flex flex-col justify-between">
                                            <div>
                                                <div className="flex justify-between items-center mb-1.5">
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 uppercase tracking-wider border border-indigo-100">
                                                        {doc.document_type || 'Contrato'}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-medium">
                                                        {new Date(doc.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </span>
                                                </div>
                                                <h4 className="text-xs font-bold text-slate-800 line-clamp-2">{doc.title}</h4>
                                            </div>

                                            <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                                                <button
                                                    onClick={() => setViewingDoc(doc)}
                                                    className="flex-1 py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                    <span>Ver</span>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const printWindow = window.open('', '_blank');
                                                        if (!printWindow) return;
                                                        const resolvedBg = doc.background_image ? getMediaUrl(doc.background_image) : '';
                                                        const bgStyle = resolvedBg ? `
                                                            background-image: url('${resolvedBg}');
                                                            background-size: 100% 100%;
                                                            background-position: center;
                                                            background-repeat: no-repeat;
                                                            padding: 130px 65px 90px 90px;
                                                        ` : 'padding: 40px;';
                                                        printWindow.document.write(`
                                                            <!DOCTYPE html>
                                                            <html>
                                                            <head>
                                                                <title>${doc.title}</title>
                                                                <style>
                                                                    @page { size: letter; margin: 0; }
                                                                    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; margin: 0; box-sizing: border-box; min-height: 100vh; ${bgStyle} }
                                                                    @media print { body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
                                                                </style>
                                                            </head>
                                                            <body>
                                                                <div>${doc.html_content}</div>
                                                                <script>
                                                                    window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; };
                                                                </script>
                                                            </body>
                                                            </html>
                                                        `);
                                                        printWindow.document.close();
                                                    }}
                                                    className="py-1.5 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                                    title="Imprimir o Descargar PDF"
                                                >
                                                    <Printer className="w-3.5 h-3.5" />
                                                    <span>PDF</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Projection Table */}
                {inv.projection && inv.projection.length > 0 && (
                    <div className="p-8 border-t border-slate-100 bg-white">
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-6">Proyección de Rendimientos</h3>
                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3">Ciclo</th>
                                        <th className="px-4 py-3 text-center">Días</th>
                                        <th className="px-4 py-3 text-right">Capital de Cálculo</th>
                                        <th className="px-4 py-3 text-right">Rendimiento (Est.)</th>
                                        <th className="px-4 py-3 text-center">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {inv.projection.map((proj: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-3 font-medium text-slate-700 whitespace-nowrap">
                                                {formatDate(proj.fecha_inicio)} - {formatDate(proj.fecha_fin)}
                                            </td>
                                            <td className="px-4 py-3 text-center text-slate-600">
                                                {proj.dias}
                                            </td>
                                            <td className="px-4 py-3 text-right font-semibold text-slate-900">
                                                {formatCurrency(proj.capital_base)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-emerald-600">
                                                +{formatCurrency(proj.rendimiento)}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded-md ${
                                                    proj.estado === 'Procesado' ? 'bg-emerald-100 text-emerald-700' : 'bg-brand-100 text-brand-700'
                                                }`}>
                                                    {proj.estado}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Document Viewer Modal */}
            {viewingDoc && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-150">
                    <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                        <div className="p-5 bg-slate-900 text-white flex justify-between items-center">
                            <div>
                                <h3 className="text-base font-bold font-montserrat">{viewingDoc.title}</h3>
                                <span className="text-xs text-slate-400">Documento Oficial</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => {
                                        const printWindow = window.open('', '_blank');
                                        if (!printWindow) return;
                                        const resolvedBg = viewingDoc.background_image ? getMediaUrl(viewingDoc.background_image) : '';
                                        const bgStyle = resolvedBg ? `
                                            background-image: url('${resolvedBg}');
                                            background-size: 100% 100%;
                                            background-position: center;
                                            background-repeat: no-repeat;
                                            padding: 130px 65px 90px 90px;
                                        ` : 'padding: 40px;';
                                        printWindow.document.write(`
                                            <!DOCTYPE html>
                                            <html>
                                            <head>
                                                <title>${viewingDoc.title}</title>
                                                <style>
                                                    @page { size: letter; margin: 0; }
                                                    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; margin: 0; box-sizing: border-box; min-height: 100vh; ${bgStyle} }
                                                    @media print { body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
                                                </style>
                                            </head>
                                            <body>
                                                <div>${viewingDoc.html_content}</div>
                                                <script>
                                                    window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; };
                                                </script>
                                            </body>
                                            </html>
                                        `);
                                        printWindow.document.close();
                                    }}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 transition-all cursor-pointer"
                                >
                                    <Printer className="w-4 h-4" />
                                    Imprimir / PDF
                                </button>
                                <button
                                    onClick={() => setViewingDoc(null)}
                                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="p-8 bg-slate-300/80 flex-1 overflow-y-auto flex justify-center custom-scrollbar">
                            <div 
                                className="bg-white shadow-2xl rounded-sm text-slate-800 relative mx-auto shrink-0 my-4"
                                style={{
                                    width: '100%',
                                    maxWidth: '820px',
                                    minHeight: '1150px',
                                    backgroundImage: viewingDoc.background_image ? `url('${getMediaUrl(viewingDoc.background_image)}')` : undefined,
                                    backgroundSize: '100% 100%',
                                    backgroundPosition: 'top center',
                                    backgroundRepeat: 'no-repeat',
                                    padding: viewingDoc.background_image ? '160px 80px 105px 105px' : '50px 60px',
                                    boxSizing: 'border-box'
                                }}
                            >
                                <div 
                                    className="prose prose-slate max-w-none text-xs leading-relaxed text-slate-800 font-sans"
                                    dangerouslySetInnerHTML={{ __html: viewingDoc.html_content }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
