import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, AlertTriangle, Loader2, CheckCircle2, AlertCircle, FileText, Layers } from 'lucide-react';
import { templatesService, DocumentTemplate } from '../../../../services/templates';
import { investorDocumentsService } from '../../../../services/investorDocuments';

interface DeleteAllDocumentsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (deletedCount: number) => void;
}

export const DeleteAllDocumentsModal: React.FC<DeleteAllDocumentsModalProps> = ({
    isOpen,
    onClose,
    onSuccess
}) => {
    const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('all');
    const [confirmText, setConfirmText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        if (toast) {
            const t = setTimeout(() => setToast(null), 3500);
            return () => clearTimeout(t);
        }
    }, [toast]);

    useEffect(() => {
        if (isOpen) {
            setConfirmText('');
            setSelectedTemplateId('all');
            fetchTemplates();
        }
    }, [isOpen]);

    const fetchTemplates = async () => {
        setLoadingTemplates(true);
        try {
            const data = await templatesService.getTemplates();
            setTemplates(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Error al cargar plantillas", err);
        } finally {
            setLoadingTemplates(false);
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const tplId = selectedTemplateId === 'all' ? undefined : Number(selectedTemplateId);
            const res = await investorDocumentsService.deleteAllDocuments(tplId);
            
            setToast({
                message: res.message || `Se eliminaron ${res.deleted_count} documentos exitosamente.`,
                type: 'success'
            });

            if (onSuccess) {
                onSuccess(res.deleted_count);
            }

            setTimeout(() => {
                onClose();
            }, 1200);
        } catch (err: any) {
            console.error("Error al eliminar documentos", err);
            setToast({
                message: err.message || "Error al eliminar los documentos",
                type: 'error'
            });
        } finally {
            setIsDeleting(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-lg flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
                
                {/* Header */}
                <div className="p-6 bg-slate-900 text-white flex justify-between items-center relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="relative z-10 flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                            <Trash2 className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold font-montserrat text-white">Eliminar Documentos Generados</h2>
                            <p className="text-xs text-slate-400">Vacía los contratos emitidos para regenerarlos</p>
                        </div>
                    </div>
                    
                    <button 
                        onClick={onClose}
                        disabled={isDeleting}
                        className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Toast Notification */}
                {toast && (
                    <div className={`px-6 py-3 text-xs font-bold flex items-center gap-2 ${
                        toast.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-b border-emerald-200' : 'bg-rose-50 text-rose-700 border-b border-rose-200'
                    }`}>
                        {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        {toast.message}
                    </div>
                )}

                {/* Body Content */}
                <div className="p-6 space-y-5">
                    
                    {/* Alert Warning Box */}
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                        <div className="text-xs text-rose-900 leading-relaxed">
                            <span className="font-bold block mb-1">¡Advertencia de Acción Irreversible!</span>
                            Esta acción eliminará todos los documentos y contratos generados actualmente en la base de datos para los inversionistas. Esto te permitirá volver a generarlos masivamente desde cero.
                        </div>
                    </div>

                    {/* Filter by Template */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 font-montserrat">
                            Selecciona el Alcance a Eliminar
                        </label>
                        <div className="space-y-2">
                            <label className={`p-3 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all ${
                                selectedTemplateId === 'all' 
                                    ? 'border-rose-500 bg-rose-50/40 ring-1 ring-rose-500/20' 
                                    : 'border-slate-200 hover:bg-slate-50/50'
                            }`}>
                                <input 
                                    type="radio" 
                                    name="deleteScope" 
                                    value="all" 
                                    checked={selectedTemplateId === 'all'} 
                                    onChange={() => setSelectedTemplateId('all')} 
                                    className="w-4 h-4 text-rose-600 focus:ring-rose-500 border-slate-300"
                                />
                                <div className="flex-1">
                                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                        <Layers className="w-3.5 h-3.5 text-rose-600" /> Todos los Documentos y Contratos
                                    </div>
                                    <div className="text-[11px] text-slate-400">
                                        Elimina los certificados, contratos y pagarés de todos los inversionistas
                                    </div>
                                </div>
                            </label>

                            {templates.map(tpl => (
                                <label 
                                    key={tpl.id} 
                                    className={`p-3 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all ${
                                        selectedTemplateId === String(tpl.id) 
                                            ? 'border-rose-500 bg-rose-50/40 ring-1 ring-rose-500/20' 
                                            : 'border-slate-200 hover:bg-slate-50/50'
                                    }`}
                                >
                                    <input 
                                        type="radio" 
                                        name="deleteScope" 
                                        value={String(tpl.id)} 
                                        checked={selectedTemplateId === String(tpl.id)} 
                                        onChange={() => setSelectedTemplateId(String(tpl.id))} 
                                        className="w-4 h-4 text-rose-600 focus:ring-rose-500 border-slate-300"
                                    />
                                    <div className="flex-1">
                                        <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                            <FileText className="w-3.5 h-3.5 text-slate-500" /> Solo: {tpl.name}
                                        </div>
                                        <div className="text-[11px] text-slate-400">
                                            Elimina únicamente los documentos emitidos bajo esta plantilla
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Confirmation Input */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            Para confirmar, escribe <span className="font-mono font-bold text-rose-600">ELIMINAR</span> a continuación:
                        </label>
                        <input
                            type="text"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                            placeholder="Escribe ELIMINAR"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-xs font-mono font-bold uppercase"
                        />
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isDeleting}
                            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={isDeleting || confirmText !== 'ELIMINAR'}
                            className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold flex items-center gap-2 transition-all shadow-lg cursor-pointer ${
                                isDeleting || confirmText !== 'ELIMINAR'
                                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' 
                                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
                            }`}
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Eliminando Documentos...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="w-4 h-4" />
                                    Confirmar y Eliminar
                                </>
                            )}
                        </button>
                    </div>

                </div>
            </div>
        </div>,
        document.body
    );
};
