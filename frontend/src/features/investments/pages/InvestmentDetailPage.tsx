import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchApi, getMediaUrl } from '../../../services/api';
import { formatCurrency } from '../../../utils/format';
import { ArrowLeft, Clock, DollarSign, Activity, FileText, ArrowDownToLine, Zap, PlusCircle, Printer, Eye, X, Calendar, Download, ShieldCheck, User, Hash } from 'lucide-react';
import { CapitalWithdrawalModal } from '../components/CapitalWithdrawalModal';
import { NewInvestmentModal } from '../../dashboard/components/NewInvestmentModal';
import { investorDocumentsService, InvestorDocument } from '../../../services/investorDocuments';
import { DocumentPagesPreview, printPaginatedDocument } from '../../../components/common/DocumentPagesPreview';
import { usePermissions } from '../../../hooks/usePermissions';

export const InvestmentDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isAdmin } = usePermissions();
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
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return 'Pendiente';
        return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
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
            <div className="flex items-center justify-between">
                <div 
                    className="inline-flex items-center gap-2 cursor-pointer text-slate-500 hover:text-slate-800 transition-colors font-bold text-sm" 
                    onClick={() => navigate(-1)}
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>{isAdmin() ? "Volver a Inversionistas" : "Volver al Dashboard"}</span>
                </div>

                {isAdmin() && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500/10 text-amber-700 border border-amber-500/20 rounded-full text-xs font-bold">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                        Vista de Administrador
                    </span>
                )}
            </div>

            {/* Admin Info Banner */}
            {isAdmin() && inv.user && (
                <div className="bg-slate-900 text-white p-5 rounded-3xl flex flex-wrap items-center justify-between gap-4 shadow-xl border border-slate-800 relative overflow-hidden">
                    <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-brand-500/10 rounded-full blur-2xl pointer-events-none"></div>
                    <div className="flex items-center gap-3 relative z-10">
                        <div className="w-11 h-11 rounded-2xl bg-brand-500/20 border border-brand-500/30 text-brand-400 flex items-center justify-center font-bold">
                            <User className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold text-brand-400 uppercase tracking-wider">Inversionista Titular</span>
                                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-amber-300 font-mono font-bold border border-slate-700">
                                    {inv.assigned_code || `#${inv.id}`}
                                </span>
                            </div>
                            <h2 className="text-base font-bold text-white font-montserrat">{inv.user.name}</h2>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-400 relative z-10">
                        {inv.user.document_id && <span>Cédula: <strong className="text-slate-200 font-mono">{inv.user.document_id}</strong></span>}
                        {inv.user.email && <span>Email: <strong className="text-slate-200">{inv.user.email}</strong></span>}
                        {inv.user.phone_number && <span>Tel: <strong className="text-slate-200">{inv.user.phone_number}</strong></span>}
                    </div>
                </div>
            )}

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white border border-slate-200 shadow-sm rounded-2xl text-brand-500">
                                <DollarSign className="w-8 h-8" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Contrato de Inversión</p>
                                    {(inv.assigned_code || inv.codigo_asignado) && (
                                        <span className="text-xs font-mono font-extrabold text-brand-700 bg-brand-50 border border-brand-200 px-2.5 py-0.5 rounded-lg flex items-center gap-1 shadow-2xs">
                                            <Hash className="w-3 h-3 text-brand-500" />
                                            {inv.assigned_code || inv.codigo_asignado}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-baseline gap-3">
                                    <h1 className="text-3xl font-bold text-slate-900 font-montserrat">
                                        {formatCurrency(inv.monto)}
                                    </h1>
                                    {(inv.periodo?.percentage || inv.porcentaje_mensual) && (
                                        <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl font-montserrat">
                                            {inv.periodo?.percentage || inv.porcentaje_mensual}% mensual
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <span className={`text-xs uppercase tracking-widest px-3 py-1.5 rounded-lg font-bold border ${statusConfig.classes}`}>
                                {statusConfig.label}
                            </span>
                            <p className="text-sm font-semibold text-slate-500">
                                Contrato: <strong className="text-slate-800 font-mono">{inv.assigned_code || inv.codigo_asignado || `#${inv.id}`}</strong>
                            </p>
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
                        {documents.length > 0 ? (
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-brand-50 text-brand-500 rounded-xl border border-brand-100">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900 font-montserrat uppercase tracking-wider">
                                                Documentos & Contratos Oficiales
                                            </h3>
                                            <p className="text-xs text-slate-500">Documentos legales y certificados emitidos para esta inversión</p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-bold bg-brand-50 text-brand-700 px-3 py-1 rounded-full border border-brand-200">
                                        {documents.length} {documents.length === 1 ? 'documento' : 'documentos'}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                                    {documents.map((doc) => (
                                        <div key={doc.id} className="bg-slate-50/60 hover:bg-white p-5 rounded-2xl border border-slate-200 hover:border-brand-300 hover:shadow-md transition-all flex flex-col justify-between group">
                                            <div>
                                                <div className="flex justify-between items-center mb-2.5">
                                                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-white text-brand-600 uppercase tracking-wider border border-brand-200 shadow-2xs">
                                                        {doc.document_type || 'Contrato'}
                                                    </span>
                                                    <span className="text-[11px] text-slate-400 font-medium">
                                                        {formatDate(doc.created_at)}
                                                    </span>
                                                </div>
                                                <h4 className="text-sm font-bold text-slate-900 group-hover:text-brand-500 transition-colors line-clamp-2">
                                                    {doc.title}
                                                </h4>
                                            </div>

                                            <div className="flex items-center gap-2 mt-4 pt-3.5 border-t border-slate-200/60">
                                                <button
                                                    type="button"
                                                    onClick={() => setViewingDoc(doc)}
                                                    className="flex-1 py-2.5 px-3 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                    <span>Visualizar</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => printPaginatedDocument(doc.title, doc.html_content, doc.background_image)}
                                                    className="flex-1 py-2.5 px-3 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-xl shadow-md shadow-brand-500/20 hover:shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                                    title="Descargar o Guardar como PDF"
                                                >
                                                    <Download className="w-3.5 h-3.5" />
                                                    <span>Descargar PDF</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-200 flex items-center gap-4">
                                <div className="p-3 bg-white border border-slate-200 text-slate-400 rounded-xl shrink-0 shadow-2xs">
                                    <FileText className="w-5 h-5 text-brand-500" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Documentos Legales</h4>
                                    <p className="text-xs text-slate-500 mt-0.5">Tus contratos y certificados oficiales emitidos aparecerán aquí listos para descargar en formato PDF.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Projection Table */}
                {inv.projection && inv.projection.length > 0 && (
                    <div className="p-8 border-t border-slate-100 bg-white">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">
                                    Proyección de Rendimientos por Ciclos
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Cortes periódicos de liquidación y estimación de rendimientos mensuales
                                </p>
                            </div>
                            <span className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200 font-mono">
                                {inv.projection.length} ciclos
                            </span>
                        </div>

                        <div className="overflow-x-auto rounded-2xl border border-slate-200">
                            <table className="w-full text-left text-xs whitespace-nowrap">
                                <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase text-[11px] tracking-widest">
                                    <tr>
                                        <th className="py-3 px-4 text-center"># Ciclo</th>
                                        <th className="py-3 px-4">Periodo de Liquidación</th>
                                        <th className="py-3 px-4 text-center">Días</th>
                                        <th className="py-3 px-4 text-right">Capital Base</th>
                                        <th className="py-3 px-4 text-right">Rendimiento Generado</th>
                                        <th className="py-3 px-4 text-center">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium">
                                    {inv.projection.map((proj: any, idx: number) => {
                                        const isProcessed = (proj.estado || '').toLowerCase() === 'procesado' || (proj.estado || '').toLowerCase() === 'pagado';
                                        return (
                                            <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                                                <td className="py-3 px-4 text-center font-bold text-slate-900 font-mono">
                                                    Ciclo {idx + 1}
                                                </td>
                                                <td className="py-3 px-4 text-slate-700">
                                                    <span className="text-slate-500 font-mono">{formatDate(proj.fecha_inicio)}</span>
                                                    <span className="text-slate-400 mx-1.5 font-bold">→</span>
                                                    <span className="font-bold text-slate-900 font-mono">{formatDate(proj.fecha_fin)}</span>
                                                </td>
                                                <td className="py-3 px-4 text-center font-bold text-slate-800 font-mono">
                                                    {proj.dias} días
                                                </td>
                                                <td className="py-3 px-4 text-right font-mono text-slate-700">
                                                    {formatCurrency(proj.capital_base || 0)}
                                                </td>
                                                <td className="py-3 px-4 text-right font-bold text-emerald-600 font-mono text-xs">
                                                    +{formatCurrency(proj.rendimiento || 0)}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                                        isProcessed 
                                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                                                    }`}>
                                                        {proj.estado || 'Proyectado'}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
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
                                <span className="text-xs text-slate-400">Documento Oficial de Inversión</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => printPaginatedDocument(viewingDoc.title, viewingDoc.html_content, viewingDoc.background_image)}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 transition-all cursor-pointer"
                                >
                                    <Download className="w-4 h-4" />
                                    Descargar / Imprimir PDF
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewingDoc(null)}
                                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="p-8 bg-slate-300/80 flex-1 overflow-y-auto flex justify-center custom-scrollbar">
                            <DocumentPagesPreview 
                                html={viewingDoc.html_content} 
                                bgUrl={viewingDoc.background_image} 
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
