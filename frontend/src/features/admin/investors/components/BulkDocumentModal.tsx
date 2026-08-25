import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
    X, 
    Layers, 
    FileText, 
    CheckCircle2, 
    AlertCircle, 
    Loader2, 
    Users, 
    Filter, 
    Sparkles, 
    Image, 
    ArrowRight
} from 'lucide-react';
import { templatesService, DocumentTemplate } from '../../../../services/templates';
import { investorDocumentsService, InvestorDocumentBulkGenerateResponse } from '../../../../services/investorDocuments';
import { getInvestors, Investor } from '../../../../services/investors';

interface BulkDocumentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    preselectedInvestorIds?: number[];
    totalInvestorsCount?: number;
}

export const BulkDocumentModal: React.FC<BulkDocumentModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    preselectedInvestorIds = [],
    totalInvestorsCount = 0
}) => {
    const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);
    
    // Form state
    const [targetType, setTargetType] = useState<'all' | 'without_document' | 'selected'>('all');
    const [bgMode, setBgMode] = useState<'template' | 'blank'>('template');
    const [overwriteExisting, setOverwriteExisting] = useState(false);

    // Live Progress State
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState<{
        current: number;
        total: number;
        percent: number;
        currentName: string;
    }>({ current: 0, total: 0, percent: 0, currentName: '' });

    // Result State
    const [result, setResult] = useState<InvestorDocumentBulkGenerateResponse | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        if (toast) {
            const t = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(t);
        }
    }, [toast]);

    const fetchTemplates = async () => {
        setLoadingTemplates(true);
        try {
            const data = await templatesService.getTemplates();
            const list = Array.isArray(data) ? data : [];
            setTemplates(list);
        } catch (err: any) {
            console.error("Error cargando plantillas", err);
        } finally {
            setLoadingTemplates(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchTemplates();
            setResult(null);
            setIsProcessing(false);
            setProgress({ current: 0, total: 0, percent: 0, currentName: '' });
            if (preselectedInvestorIds && preselectedInvestorIds.length > 0) {
                setTargetType('selected');
            } else {
                setTargetType('all');
            }
        }
    }, [isOpen]);

    const handleExecute = async () => {
        setIsProcessing(true);
        setResult(null);
        setProgress({ current: 0, total: 1, percent: 5, currentName: 'Iniciando procesamiento por bloques...' });

        try {
            // 1. Get all templates
            let allTemplates = templates;
            if (allTemplates.length === 0) {
                const freshTemplates = await templatesService.getTemplates();
                allTemplates = Array.isArray(freshTemplates) ? freshTemplates : [];
                setTemplates(allTemplates);
            }

            if (allTemplates.length === 0) {
                setToast({ message: "No hay plantillas registradas en el sistema.", type: "error" });
                setIsProcessing(false);
                return;
            }

            const BATCH_SIZE = 50;
            let grandTotalCandidates = 0;
            let grandTotalGenerated = 0;
            let grandTotalSkipped = 0;
            const allErrors: string[] = [];

            for (let tIdx = 0; tIdx < allTemplates.length; tIdx++) {
                const tpl = allTemplates[tIdx];
                let offset = 0;
                let hasMore = true;
                let batchNum = 1;
                let tplCandidates = 0;

                while (hasMore) {
                    const currentOffsetDisplay = offset + 1;
                    const endOffsetDisplay = offset + BATCH_SIZE;

                    setProgress({
                        current: tIdx + 1,
                        total: allTemplates.length,
                        percent: Math.min(98, Math.max(5, Math.round(((tIdx + (offset / (tplCandidates || 500))) / allTemplates.length) * 100))),
                        currentName: `Plantilla ${tIdx + 1}/${allTemplates.length}: ${tpl.name} ➔ Lote ${batchNum} (${currentOffsetDisplay} a ${endOffsetDisplay})`
                    });

                    const effectiveBgToSend = bgMode === 'blank'
                        ? ''
                        : (tpl.background_image || undefined);

                    const res = await investorDocumentsService.bulkGenerateDocuments({
                        template_id: tpl.id,
                        target_type: targetType,
                        investor_ids: targetType === 'selected' ? preselectedInvestorIds : undefined,
                        background_image: effectiveBgToSend,
                        overwrite_existing: overwriteExisting,
                        offset: offset,
                        batch_size: BATCH_SIZE
                    });

                    tplCandidates = res.total_candidates;
                    grandTotalGenerated += res.generated_count;
                    grandTotalSkipped += res.skipped_count;
                    if (res.errors && res.errors.length > 0) {
                        allErrors.push(...res.errors);
                    }

                    hasMore = res.has_more;
                    offset = res.next_offset;
                    batchNum++;
                }

                grandTotalCandidates += tplCandidates;
            }

            setProgress({
                current: allTemplates.length,
                total: allTemplates.length,
                percent: 100,
                currentName: '¡Finalizado con éxito!'
            });

            setResult({
                total_candidates: grandTotalCandidates,
                generated_count: grandTotalGenerated,
                skipped_count: grandTotalSkipped,
                processed_in_batch: grandTotalGenerated,
                has_more: false,
                next_offset: 0,
                errors: allErrors
            });

            setToast({ 
                message: `¡Generación masiva completada! Se emitieron ${grandTotalGenerated} documentos en bloques.`, 
                type: "success" 
            });

            if (onSuccess) {
                onSuccess();
            }
        } catch (err: any) {
            console.error("Error en generación masiva", err);
            setToast({ 
                message: err.message || "Error al procesar la generación masiva", 
                type: "error" 
            });
        } finally {
            setIsProcessing(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-2xl flex flex-col shadow-2xl border border-slate-100 overflow-hidden max-h-[92vh]">
                
                {/* Header */}
                <div className="p-6 bg-slate-900 text-white flex justify-between items-center relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="relative z-10 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400">
                            <Layers className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-bold font-montserrat">Generación Masiva de Documentos</h2>
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" /> Paquete Completo
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Emite todos los documentos legales del sistema para los inversionistas en un solo clic
                            </p>
                        </div>
                    </div>
                    
                    <button 
                        onClick={onClose}
                        disabled={isProcessing}
                        className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer relative z-10 disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Toast Notification */}
                {toast && (
                    <div className={`px-6 py-3 text-xs font-bold flex items-center gap-2 transition-all ${
                        toast.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-b border-emerald-200' : 'bg-rose-50 text-rose-700 border-b border-rose-200'
                    }`}>
                        {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        {toast.message}
                    </div>
                )}

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-6">
                    {isProcessing ? (
                        /* Live Processing Screen with Progress Bar */
                        <div className="space-y-6 text-center py-8">
                            <div className="relative w-20 h-20 mx-auto">
                                <div className="absolute inset-0 rounded-full bg-brand-500/20 animate-ping"></div>
                                <div className="relative w-20 h-20 rounded-full bg-brand-500 text-white flex items-center justify-center shadow-xl shadow-brand-500/30">
                                    <Loader2 className="w-10 h-10 animate-spin" />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <h3 className="text-lg font-bold text-slate-800 font-montserrat">
                                    Generando Documentos en Progreso...
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Por favor no cierres esta ventana mientras se procesan las emisiones
                                </p>
                            </div>

                            {/* Progress Bar */}
                            <div className="max-w-md mx-auto space-y-2">
                                <div className="flex justify-between text-xs font-bold text-slate-600 px-1">
                                    <span>Documento {progress.current} de {progress.total}</span>
                                    <span className="text-brand-600">{progress.percent}%</span>
                                </div>
                                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/80 p-0.5">
                                    <div 
                                        className="h-full bg-gradient-to-r from-brand-500 via-indigo-500 to-emerald-500 rounded-full transition-all duration-300 shadow-xs"
                                        style={{ width: `${Math.max(5, progress.percent)}%` }}
                                    ></div>
                                </div>
                                <div className="text-[11px] text-slate-500 font-medium truncate pt-1 bg-slate-50 py-1.5 px-3 rounded-xl border border-slate-100">
                                    <span className="text-slate-400">Procesando:</span> <span className="font-bold text-slate-800">{progress.currentName || 'Iniciando...'}</span>
                                </div>
                            </div>
                        </div>
                    ) : result ? (
                        /* Result Summary View */
                        <div className="space-y-6 text-center py-4">
                            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center mx-auto">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>

                            <div>
                                <h3 className="text-lg font-bold text-slate-800 font-montserrat">
                                    ¡Generación Masiva Finalizada!
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">
                                    Los documentos generados ya están disponibles en los perfiles de los inversionistas
                                </p>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                    <div className="text-2xl font-black text-slate-800">{result.total_candidates}</div>
                                    <div className="text-[11px] font-bold text-slate-400 mt-0.5">Total Evaluados</div>
                                </div>
                                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                                    <div className="text-2xl font-black text-emerald-600">{result.generated_count}</div>
                                    <div className="text-[11px] font-bold text-emerald-600/80 mt-0.5">Generados Exitosamente</div>
                                </div>
                                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100">
                                    <div className="text-2xl font-black text-amber-600">{result.skipped_count}</div>
                                    <div className="text-[11px] font-bold text-amber-600/80 mt-0.5">Omitidos (Ya existían)</div>
                                </div>
                            </div>

                            {result.errors.length > 0 && (
                                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-left">
                                    <div className="text-xs font-bold text-rose-700 mb-2 flex items-center gap-1">
                                        <AlertCircle className="w-4 h-4" /> Errores detectados ({result.errors.length}):
                                    </div>
                                    <ul className="text-[11px] text-rose-600 space-y-1 list-disc list-inside max-h-32 overflow-y-auto">
                                        {result.errors.map((err, i) => (
                                            <li key={i}>{err}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    onClick={onClose}
                                    className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer"
                                >
                                    Cerrar y Ver Inversionistas
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Configuration Form View */
                        <>
                            {/* Document Package Info Banner */}
                            <div className="p-4 rounded-2xl bg-brand-50/70 border border-brand-100 flex items-start gap-3">
                                <div className="p-2 rounded-xl bg-brand-500 text-white shrink-0 mt-0.5">
                                    <FileText className="w-4 h-4" />
                                </div>
                                <div className="text-xs text-brand-900">
                                    <span className="font-bold block mb-0.5">Emisión Automática de Todos los Documentos</span>
                                    Se generarán todos los documentos legales configurados en el sistema (Certificados de Acciones, Contratos, Pagarés) para cada inversionista.
                                </div>
                            </div>

                            {/* 1. Alcance / Destinatarios */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 font-montserrat">
                                    1. Destinatarios de la Emisión
                                </label>
                                <div className="space-y-2">
                                    <label className={`p-3.5 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all ${
                                        targetType === 'all' 
                                            ? 'border-brand-500 bg-brand-500/5 ring-1 ring-brand-500/20' 
                                            : 'border-slate-200 hover:bg-slate-50/50'
                                    }`}>
                                        <input 
                                            type="radio" 
                                            name="targetType" 
                                            value="all" 
                                            checked={targetType === 'all'} 
                                            onChange={() => setTargetType('all')} 
                                            className="w-4 h-4 text-brand-500 focus:ring-brand-500 border-slate-300"
                                        />
                                        <div className="flex-1">
                                            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                                <Users className="w-3.5 h-3.5 text-brand-500" /> Todos los Inversionistas
                                            </div>
                                            <div className="text-[11px] text-slate-400">
                                                Generar para todas las inversiones activas del sistema {totalInvestorsCount > 0 && `(aprox. ${totalInvestorsCount})`}
                                            </div>
                                        </div>
                                    </label>

                                    <label className={`p-3.5 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all ${
                                        targetType === 'without_document' 
                                            ? 'border-brand-500 bg-brand-500/5 ring-1 ring-brand-500/20' 
                                            : 'border-slate-200 hover:bg-slate-50/50'
                                    }`}>
                                        <input 
                                            type="radio" 
                                            name="targetType" 
                                            value="without_document" 
                                            checked={targetType === 'without_document'} 
                                            onChange={() => setTargetType('without_document')} 
                                            className="w-4 h-4 text-brand-500 focus:ring-brand-500 border-slate-300"
                                        />
                                        <div className="flex-1">
                                            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                                <Filter className="w-3.5 h-3.5 text-amber-500" /> Solo quienes NO tengan los documentos
                                            </div>
                                            <div className="text-[11px] text-slate-400">
                                                Omite aquellos documentos que el inversionista ya tenga generados
                                            </div>
                                        </div>
                                    </label>

                                    {preselectedInvestorIds.length > 0 && (
                                        <label className={`p-3.5 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all ${
                                            targetType === 'selected' 
                                                ? 'border-brand-500 bg-brand-500/5 ring-1 ring-brand-500/20' 
                                                : 'border-slate-200 hover:bg-slate-50/50'
                                        }`}>
                                            <input 
                                                type="radio" 
                                                name="targetType" 
                                                value="selected" 
                                                checked={targetType === 'selected'} 
                                                onChange={() => setTargetType('selected')} 
                                                className="w-4 h-4 text-brand-500 focus:ring-brand-500 border-slate-300"
                                            />
                                            <div className="flex-1">
                                                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Solo inversionistas seleccionados ({preselectedInvestorIds.length})
                                                </div>
                                                <div className="text-[11px] text-slate-400">
                                                    Generar únicamente para las {preselectedInvestorIds.length} filas marcadas en la tabla
                                                </div>
                                            </div>
                                        </label>
                                    )}
                                </div>
                            </div>

                            {/* 2. Opciones de Membrete */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 font-montserrat">
                                    2. Membrete de Impresión
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setBgMode('template')}
                                        className={`p-3 rounded-2xl border text-xs font-medium flex items-center gap-2.5 transition-all cursor-pointer ${
                                            bgMode === 'template'
                                                ? 'border-brand-500 bg-brand-50 text-brand-700 font-bold shadow-2xs'
                                                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        <Image className="w-4 h-4 text-brand-500 shrink-0" />
                                        <div className="text-left">
                                            <span className="block font-bold">Membrete de la Plantilla</span>
                                            <span className="text-[10px] text-slate-400 font-normal">Fondo configurado en cada documento</span>
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setBgMode('blank')}
                                        className={`p-3 rounded-2xl border text-xs font-medium flex items-center gap-2.5 transition-all cursor-pointer ${
                                            bgMode === 'blank'
                                                ? 'border-slate-800 bg-slate-800 text-white font-bold shadow-2xs'
                                                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                                        <div className="text-left">
                                            <span className="block font-bold">Hoja en Blanco</span>
                                            <span className="text-[10px] opacity-75 font-normal">Sin membrete ni fondo de imagen</span>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={isProcessing}
                                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleExecute}
                                    disabled={isProcessing}
                                    className={`px-6 py-2.5 rounded-xl text-white text-xs font-bold flex items-center gap-2 transition-all shadow-lg cursor-pointer ${
                                        isProcessing ? 'bg-slate-400 opacity-60 cursor-not-allowed' : 'bg-brand-500 hover:bg-brand-600 shadow-brand-500/25'
                                    }`}
                                >
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Procesando Emisión Masiva...
                                        </>
                                    ) : (
                                        <>
                                            Generar Todos los Documentos
                                            <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </div>

            </div>
        </div>,
        document.body
    );
};
