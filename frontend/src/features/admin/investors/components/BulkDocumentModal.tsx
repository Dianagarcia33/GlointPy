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
    Check,
    ArrowRight
} from 'lucide-react';
import { templatesService, DocumentTemplate } from '../../../../services/templates';
import { investorDocumentsService, InvestorDocumentBulkGenerateResponse } from '../../../../services/investorDocuments';

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
    const [selectedTemplateId, setSelectedTemplateId] = useState<number | ''>('');
    const [targetType, setTargetType] = useState<'all' | 'without_document' | 'selected'>('all');
    const [customTitle, setCustomTitle] = useState('');
    const [selectedBgOption, setSelectedBgOption] = useState<string>('/uploads/templates/gloint_membrete_oficial.png');
    const [overwriteExisting, setOverwriteExisting] = useState(false);

    // Processing & Result State
    const [isProcessing, setIsProcessing] = useState(false);
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
            setTemplates(data);
            if (data.length > 0 && !selectedTemplateId) {
                setSelectedTemplateId(data[0].id);
            }
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
            if (preselectedInvestorIds.length > 0) {
                setTargetType('selected');
            } else {
                setTargetType('all');
            }
        }
    }, [isOpen, preselectedInvestorIds]);

    const handleExecute = async () => {
        if (!selectedTemplateId) {
            setToast({ message: "Por favor selecciona una plantilla de documento", type: "error" });
            return;
        }

        setIsProcessing(true);
        setResult(null);

        try {
            const res = await investorDocumentsService.bulkGenerateDocuments({
                template_id: Number(selectedTemplateId),
                target_type: targetType,
                investor_ids: targetType === 'selected' ? preselectedInvestorIds : undefined,
                custom_title: customTitle.trim() || undefined,
                background_image: selectedBgOption || undefined,
                overwrite_existing: overwriteExisting
            });

            setResult(res);
            setToast({ 
                message: `¡Proceso completado! Se generaron ${res.generated_count} documentos.`, 
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
                                    <Sparkles className="w-3 h-3" /> Batch
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Emite certificados, pagarés y contratos para múltiples inversionistas en 1 clic
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
                    {result ? (
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
                                    className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all"
                                >
                                    Cerrar y Ver Inversionistas
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Configuration Form View */
                        <>
                            {/* 1. Seleccionar Plantilla */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 font-montserrat">
                                    1. Selecciona la Plantilla a Emitir
                                </label>
                                {loadingTemplates ? (
                                    <div className="flex items-center gap-2 text-xs text-slate-400 py-3">
                                        <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
                                        Cargando plantillas configuradas...
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                        {templates.map(tpl => (
                                            <button
                                                key={tpl.id}
                                                type="button"
                                                onClick={() => setSelectedTemplateId(tpl.id)}
                                                className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                                                    selectedTemplateId === tpl.id
                                                        ? 'border-brand-500 bg-brand-500/5 ring-2 ring-brand-500/20'
                                                        : 'border-slate-200 hover:border-slate-300 bg-white'
                                                }`}
                                            >
                                                <div className={`p-2 rounded-xl mt-0.5 ${
                                                    selectedTemplateId === tpl.id ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                    <FileText className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-xs font-bold text-slate-800 truncate">{tpl.name}</div>
                                                    <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">
                                                        Tipo: {tpl.type || 'Contrato'}
                                                    </div>
                                                </div>
                                                {selectedTemplateId === tpl.id && (
                                                    <Check className="w-4 h-4 text-brand-500 flex-shrink-0" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* 2. Alcance / Destinatarios */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 font-montserrat">
                                    2. Destinatarios de la Emisión
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
                                                <Filter className="w-3.5 h-3.5 text-amber-500" /> Solo quienes NO tengan este documento
                                            </div>
                                            <div className="text-[11px] text-slate-400">
                                                Omite a quienes ya se les haya generado esta plantilla anteriormente
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

                            {/* 3. Opciones de Membrete */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 font-montserrat">
                                    3. Membrete de Impresión
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedBgOption('/uploads/templates/gloint_membrete_oficial.png')}
                                        className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 transition-all ${
                                            selectedBgOption === '/uploads/templates/gloint_membrete_oficial.png'
                                                ? 'border-brand-500 bg-brand-50 text-brand-700 font-bold'
                                                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        <Image className="w-4 h-4" /> Membrete Oficial Gloint
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedBgOption('')}
                                        className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 transition-all ${
                                            selectedBgOption === ''
                                                ? 'border-brand-500 bg-brand-50 text-brand-700 font-bold'
                                                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        <FileText className="w-4 h-4" /> Hoja en Blanco
                                    </button>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={isProcessing}
                                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-all disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleExecute}
                                    disabled={isProcessing || !selectedTemplateId}
                                    className="px-6 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-brand-500/25 disabled:opacity-50 cursor-pointer"
                                >
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Procesando Emisión Masiva...
                                        </>
                                    ) : (
                                        <>
                                            Generar Documentos
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
