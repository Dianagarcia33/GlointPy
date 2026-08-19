import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
    X, 
    FileText, 
    Plus, 
    Trash2, 
    Eye, 
    Printer, 
    Loader2, 
    AlertCircle, 
    CheckCircle2, 
    Sparkles, 
    Calendar, 
    Layers,
    Download
} from 'lucide-react';
import { templatesService, DocumentTemplate } from '../../../../services/templates';
import { getMediaUrl } from '../../../../services/api';
import { 
    investorDocumentsService, 
    InvestorDocument, 
    InvestorDocumentPreview 
} from '../../../../services/investorDocuments';

interface InvestorDocumentsModalProps {
    isOpen: boolean;
    onClose: () => void;
    investor: any;
}

export const InvestorDocumentsModal: React.FC<InvestorDocumentsModalProps> = ({
    isOpen,
    onClose,
    investor
}) => {
    const [activeTab, setActiveTab] = useState<'list' | 'generate'>('list');
    const [documents, setDocuments] = useState<InvestorDocument[]>([]);
    const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
    const [loadingDocs, setLoadingDocs] = useState(false);
    const [loadingTemplates, setLoadingTemplates] = useState(false);

    // Generation state
    const [selectedTemplateId, setSelectedTemplateId] = useState<number | ''>('');
    const [customTitle, setCustomTitle] = useState('');
    const [selectedBgOption, setSelectedBgOption] = useState<string>('/uploads/templates/gloint_membrete_oficial.png');
    const [previewData, setPreviewData] = useState<InvestorDocumentPreview | null>(null);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    // View / Print state
    const [viewingDoc, setViewingDoc] = useState<InvestorDocument | InvestorDocumentPreview | null>(null);
    const [deletingDocId, setDeletingDocId] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        if (toast) {
            const t = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(t);
        }
    }, [toast]);

    const fetchDocuments = async () => {
        if (!investor?.id) return;
        setLoadingDocs(true);
        try {
            const docs = await investorDocumentsService.getDocumentsByInvestor(investor.id);
            setDocuments(docs);
        } catch (err: any) {
            console.error("Error cargando documentos", err);
            setToast({ message: "Error al cargar documentos del inversionista", type: "error" });
        } finally {
            setLoadingDocs(false);
        }
    };

    const fetchTemplates = async () => {
        setLoadingTemplates(true);
        try {
            const data = await templatesService.getTemplates();
            setTemplates(data);
        } catch (err: any) {
            console.error("Error cargando plantillas", err);
        } finally {
            setLoadingTemplates(false);
        }
    };

    useEffect(() => {
        if (isOpen && investor?.id) {
            fetchDocuments();
            fetchTemplates();
            setActiveTab('list');
            setSelectedTemplateId('');
            setCustomTitle('');
            setSelectedBgOption('/uploads/templates/gloint_membrete_oficial.png');
            setPreviewData(null);
            setViewingDoc(null);
        }
    }, [isOpen, investor?.id]);

    const handleTemplateChange = async (templateIdNum: number, bgOverride?: string) => {
        setSelectedTemplateId(templateIdNum);
        if (!templateIdNum) {
            setPreviewData(null);
            return;
        }

        const tpl = templates.find(t => t.id === templateIdNum);
        const effectiveBg = bgOverride !== undefined 
            ? bgOverride 
            : (tpl?.background_image || selectedBgOption || '/uploads/templates/gloint_membrete_oficial.png');
        
        setSelectedBgOption(effectiveBg);

        setLoadingPreview(true);
        try {
            const preview = await investorDocumentsService.previewDocument(investor.id, templateIdNum, effectiveBg);
            setPreviewData(preview);
            if (!customTitle) {
                setCustomTitle(preview.title);
            }
        } catch (err: any) {
            console.error("Error generando vista previa", err);
            setToast({ message: "Error al generar vista previa", type: "error" });
        } finally {
            setLoadingPreview(false);
        }
    };

    const handleBgChange = async (newBg: string) => {
        setSelectedBgOption(newBg);
        if (selectedTemplateId) {
            setLoadingPreview(true);
            try {
                const preview = await investorDocumentsService.previewDocument(investor.id, Number(selectedTemplateId), newBg);
                setPreviewData(preview);
            } catch (err: any) {
                console.error("Error actualizando fondo", err);
            } finally {
                setLoadingPreview(false);
            }
        }
    };

    const handleGenerate = async () => {
        if (!selectedTemplateId) {
            setToast({ message: "Selecciona una plantilla primero", type: "error" });
            return;
        }

        setIsGenerating(true);
        try {
            await investorDocumentsService.generateDocument(
                investor.id, 
                Number(selectedTemplateId), 
                customTitle.trim() || undefined,
                selectedBgOption || undefined
            );
            setToast({ message: "¡Documento emitido y guardado con éxito!", type: "success" });
            await fetchDocuments();
            setActiveTab('list');
            setSelectedTemplateId('');
            setCustomTitle('');
            setPreviewData(null);
        } catch (err: any) {
            console.error("Error al emitir documento", err);
            setToast({ message: err.message || "Error al emitir documento", type: "error" });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDelete = async (docId: number) => {
        setIsDeleting(true);
        try {
            await investorDocumentsService.deleteDocument(docId);
            setToast({ message: "Documento eliminado con éxito", type: "success" });
            setDocuments(prev => prev.filter(d => d.id !== docId));
            setDeletingDocId(null);
        } catch (err: any) {
            console.error("Error eliminando documento", err);
            setToast({ message: "Error al eliminar documento", type: "error" });
        } finally {
            setIsDeleting(false);
        }
    };

    const handlePrint = (html: string, bgImg?: string | null) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const resolvedBg = bgImg ? getMediaUrl(bgImg) : '';
        const backgroundStyle = resolvedBg ? `
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
                <title>Documento - ${investor?.user?.name || 'Inversión'}</title>
                <style>
                    @page {
                        size: letter;
                        margin: 0;
                    }
                    body {
                        font-family: 'Helvetica Neue', Arial, sans-serif;
                        color: #1e293b;
                        margin: 0;
                        box-sizing: border-box;
                        min-height: 100vh;
                        ${backgroundStyle}
                    }
                    @media print {
                        body {
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="document-content">
                    ${html}
                </div>
                <script>
                    window.onload = function() {
                        window.print();
                        window.onafterprint = function() {
                            window.close();
                        };
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    if (!isOpen || !investor) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
                
                {/* Header */}
                <div className="p-6 bg-slate-900 text-white flex justify-between items-center relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="relative z-10 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-bold font-montserrat">Documentos & Contratos</h2>
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-500/20 text-brand-300 border border-brand-500/30">
                                    {investor.assigned_code || `ID #${investor.id}`}
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Inversionista: <strong className="text-white">{investor.user?.name}</strong> • CC: {investor.user?.document_id || 'N/A'}
                            </p>
                        </div>
                    </div>
                    
                    <button 
                        onClick={onClose}
                        className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer relative z-10"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-4 px-6 pt-4 border-b border-slate-100 bg-slate-50/50">
                    <button
                        onClick={() => setActiveTab('list')}
                        className={`pb-3 text-xs font-bold font-montserrat transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                            activeTab === 'list' 
                                ? 'border-brand-500 text-brand-600' 
                                : 'border-transparent text-slate-400 hover:text-slate-700'
                        }`}
                    >
                        <Layers className="w-4 h-4" />
                        Documentos Emitidos ({documents.length})
                    </button>

                    <button
                        onClick={() => setActiveTab('generate')}
                        className={`pb-3 text-xs font-bold font-montserrat transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                            activeTab === 'generate' 
                                ? 'border-brand-500 text-brand-600' 
                                : 'border-transparent text-slate-400 hover:text-slate-700'
                        }`}
                    >
                        <Sparkles className="w-4 h-4" />
                        Generar Nuevo Documento
                    </button>
                </div>

                {/* Toast Notification */}
                {toast && (
                    <div className={`mx-6 mt-4 p-3 rounded-xl flex items-center gap-2 text-xs font-semibold ${
                        toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}>
                        {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                        <span>{toast.message}</span>
                    </div>
                )}

                {/* Body Content */}
                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                    
                    {/* TAB 1: LIST */}
                    {activeTab === 'list' && (
                        <div className="space-y-4">
                            {loadingDocs ? (
                                <div className="py-16 text-center text-slate-400">
                                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-brand-500" />
                                    <span className="text-xs font-medium">Cargando documentos emitidos...</span>
                                </div>
                            ) : documents.length === 0 ? (
                                <div className="py-16 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-8">
                                    <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                    <h3 className="text-sm font-bold text-slate-700">No hay documentos emitidos</h3>
                                    <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                                        Aún no se ha generado ningún contrato o documento para esta inversión.
                                    </p>
                                    <button
                                        onClick={() => setActiveTab('generate')}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 transition-all cursor-pointer"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Generar Primer Documento
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {documents.map((doc) => (
                                        <div 
                                            key={doc.id}
                                            className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-brand-200 hover:shadow-md transition-all flex flex-col justify-between"
                                        >
                                            <div>
                                                <div className="flex items-start justify-between gap-2 mb-2">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-brand-50 text-brand-700 border border-brand-200">
                                                        {doc.document_type || 'Documento'}
                                                    </span>
                                                    <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                                                        <Calendar className="w-3 h-3" />
                                                        {new Date(doc.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </span>
                                                </div>
                                                <h4 className="text-sm font-bold text-slate-800 line-clamp-2">{doc.title}</h4>
                                            </div>

                                            <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-slate-100">
                                                <button
                                                    onClick={() => setViewingDoc(doc)}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
                                                    title="Ver documento"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                    <span>Ver</span>
                                                </button>

                                                <button
                                                    onClick={() => handlePrint(doc.html_content, doc.background_image)}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 transition-all cursor-pointer"
                                                    title="Imprimir o Exportar PDF"
                                                >
                                                    <Printer className="w-3.5 h-3.5" />
                                                    <span>Imprimir / PDF</span>
                                                </button>

                                                <button
                                                    onClick={() => setDeletingDocId(doc.id)}
                                                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-all cursor-pointer"
                                                    title="Eliminar documento"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 2: GENERATE */}
                    {activeTab === 'generate' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Template Selector */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                        Selecciona la Plantilla a Generar
                                    </label>
                                    {loadingTemplates ? (
                                        <div className="py-2 text-slate-400 text-xs flex items-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin" /> Cargando plantillas...
                                        </div>
                                    ) : (
                                        <select
                                            value={selectedTemplateId}
                                            onChange={(e) => handleTemplateChange(Number(e.target.value))}
                                            className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-2.5 px-4 text-xs font-bold text-slate-800 focus:outline-none focus:border-brand-500 transition-all cursor-pointer"
                                        >
                                            <option value="">-- Elige una plantilla disponible --</option>
                                            {templates.map(t => (
                                                <option key={t.id} value={t.id}>
                                                    {t.name} ({t.type || 'Documento'})
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                {/* Custom Title */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                        Título del Documento Guardado
                                    </label>
                                    <input
                                        type="text"
                                        value={customTitle}
                                        onChange={(e) => setCustomTitle(e.target.value)}
                                        placeholder="Ej: Contrato de Inversión - IG1001"
                                        className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-2.5 px-4 text-xs font-bold text-slate-800 focus:outline-none focus:border-brand-500 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Background Letterhead Selector */}
                            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-700">Fondo / Membrete:</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleBgChange('/uploads/templates/gloint_membrete_oficial.png')}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer border ${
                                            selectedBgOption === '/uploads/templates/gloint_membrete_oficial.png'
                                                ? 'bg-brand-500 text-white border-brand-600 shadow-xs'
                                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                        }`}
                                    >
                                        📄 Hoja Membretada Oficial Gloint
                                    </button>

                                    {templates.find(t => t.id === Number(selectedTemplateId))?.background_image && 
                                     templates.find(t => t.id === Number(selectedTemplateId))?.background_image !== '/uploads/templates/gloint_membrete_oficial.png' && (
                                        <button
                                            type="button"
                                            onClick={() => handleBgChange(templates.find(t => t.id === Number(selectedTemplateId))!.background_image!)}
                                            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer border ${
                                                selectedBgOption === templates.find(t => t.id === Number(selectedTemplateId))?.background_image
                                                    ? 'bg-brand-500 text-white border-brand-600 shadow-xs'
                                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                            }`}
                                        >
                                            📁 Fondo de Plantilla
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => handleBgChange('')}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer border ${
                                            !selectedBgOption
                                                ? 'bg-slate-800 text-white border-slate-900 shadow-xs'
                                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                        }`}
                                    >
                                        🚫 Sin Fondo (Blanco)
                                    </button>
                                </div>
                            </div>

                            {/* Preview Area */}
                            {loadingPreview ? (
                                <div className="py-16 text-center text-slate-400">
                                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-brand-500" />
                                    <span className="text-xs font-medium">Sustituyendo variables y generando vista previa...</span>
                                </div>
                            ) : previewData ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                                            <Eye className="w-4 h-4 text-brand-500" />
                                            Vista Previa con Datos Reales del Inversionista
                                        </span>
                                        <button
                                            onClick={() => handlePrint(previewData.html_content, previewData.background_image)}
                                            className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 hover:underline cursor-pointer"
                                        >
                                            <Printer className="w-3.5 h-3.5" />
                                            Probar Impresión
                                        </button>
                                    </div>

                                    {/* Document Simulation Box (Realistic Sheet Proportions) */}
                                    <div className="bg-slate-200/80 p-6 rounded-2xl flex justify-center max-h-[480px] overflow-y-auto custom-scrollbar border border-slate-200">
                                        <div 
                                            className="bg-white shadow-2xl rounded-sm text-slate-800 relative mx-auto shrink-0"
                                            style={{
                                                width: '100%',
                                                maxWidth: '780px',
                                                minHeight: '1100px',
                                                backgroundImage: previewData.background_image ? `url('${getMediaUrl(previewData.background_image)}')` : undefined,
                                                backgroundSize: '100% 100%',
                                                backgroundPosition: 'top center',
                                                backgroundRepeat: 'no-repeat',
                                                padding: previewData.background_image ? '160px 75px 100px 105px' : '50px 60px',
                                                boxSizing: 'border-box'
                                            }}
                                        >
                                            <div 
                                                className="prose prose-slate max-w-none text-xs leading-relaxed text-slate-800"
                                                dangerouslySetInnerHTML={{ __html: previewData.html_content }}
                                            />
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex justify-end gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('list')}
                                            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                                        >
                                            Cancelar
                                        </button>
                                        
                                        <button
                                            type="button"
                                            onClick={handleGenerate}
                                            disabled={isGenerating}
                                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-500/20 transition-all disabled:opacity-50 cursor-pointer"
                                        >
                                            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                            Guardar y Emitir Documento
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-12 text-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                    <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                    <span className="text-xs font-medium">Selecciona una plantilla arriba para visualizar los datos sustituidos.</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400 px-6">
                    <span>Módulo de Generación de Documentos Dinámicos</span>
                    <button
                        onClick={onClose}
                        className="font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                    >
                        Cerrar
                    </button>
                </div>
            </div>

            {/* Document Viewer Modal Overlay */}
            {viewingDoc && (
                <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-150">
                    <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                        <div className="p-5 bg-slate-900 text-white flex justify-between items-center">
                            <div>
                                <h3 className="text-base font-bold font-montserrat">{viewingDoc.title}</h3>
                                <span className="text-xs text-slate-400">{investor?.user?.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => handlePrint(viewingDoc.html_content, viewingDoc.background_image)}
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

            {/* Delete Confirmation Modal */}
            {deletingDocId && (
                <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100 text-center space-y-4">
                        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                            <Trash2 className="w-6 h-6" />
                        </div>
                        <h3 className="text-base font-bold text-slate-900">¿Eliminar Documento?</h3>
                        <p className="text-xs text-slate-500">
                            Esta acción eliminará el documento guardado para este contrato de forma permanente.
                        </p>
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setDeletingDocId(null)}
                                disabled={isDeleting}
                                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleDelete(deletingDocId)}
                                disabled={isDeleting}
                                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-md shadow-rose-600/20 cursor-pointer"
                            >
                                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>,
        document.body
    );
};
