import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { DocumentTemplate, DocumentTemplateCreate, DocumentTemplateUpdate, templatesService } from '../../../../services/templates';
import { X, Loader2, FileText, Code, Eye, Sparkles, Image as ImageIcon, Check } from 'lucide-react';

interface TemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
    template?: DocumentTemplate | null;
}

const TEMPLATE_VARIABLES = [
    { label: 'Nombre', tag: '{nombre}' },
    { label: 'Apellido', tag: '{apellido}' },
    { label: 'Nombre Completo', tag: '{NOMBRE_INVERSIONISTA}' },
    { label: 'Documento / Cédula', tag: '{documento}' },
    { label: 'Ciudad / Domicilio', tag: '{ciudad}' },
    { label: 'Acciones Otorgadas', tag: '{acciones_otorgadas}' },
    { label: 'Valor Total Acciones', tag: '{valor_total_acciones_formato}' },
    { label: 'Fecha Ingreso / Inicio', tag: '{fecha_ingreso}' },
    { label: 'Fecha Finalización / Fin', tag: '{FECHA_FIN}' },
    { label: 'Monto Inversión', tag: '{MONTO_INVERSION}' },
    { label: 'Periodo (Meses)', tag: '{PERIODOS_MESES}' },
    { label: 'Código Inversión', tag: '{CODIGO_INVERSION}' },
    { label: 'Correo Electrónico', tag: '{CORREO}' },
    { label: 'Teléfono', tag: '{TELEFONO}' },
    { label: 'Firma Digital', tag: '{FIRMA_DIGITAL}' },
];

export const TemplateModal: React.FC<TemplateModalProps> = ({ isOpen, onClose, onSaved, template }) => {
    const [name, setName] = useState('');
    const [type, setType] = useState('contract');
    const [roleId, setRoleId] = useState<number | ''>('');
    const [filePath, setFilePath] = useState('');
    const [backgroundImage, setBackgroundImage] = useState('');
    const [htmlContent, setHtmlContent] = useState('');
    
    const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (template) {
            setName(template.name || '');
            setType(template.type || 'contract');
            setRoleId(template.role_id || '');
            setFilePath(template.file_path || '');
            setBackgroundImage(template.background_image || '');
            setHtmlContent(template.html_content || '');
        } else {
            setName('');
            setType('contract');
            setRoleId('');
            setFilePath('');
            setBackgroundImage('');
            setHtmlContent('<div style="font-family: Arial, sans-serif; padding: 30px; line-height: 1.6;">\n  <h1 style="color: #0f172a; text-align: center;">CONTRATO DE INVERSIÓN</h1>\n  <p>Por medio del presente documento, se certifica la inversión realizada por <strong>{NOMBRE_INVERSIONISTA}</strong> identificado con CC <strong>{DOCUMENTO}</strong>.</p>\n  <p>Monto Invertido: <strong>${MONTO_INVERSION} COP</strong></p>\n</div>');
        }
        setError(null);
        setActiveTab('editor');
    }, [template, isOpen]);

    if (!isOpen) return null;

    const insertVariable = (tag: string) => {
        if (!textareaRef.current) {
            setHtmlContent(prev => prev + tag);
            return;
        }
        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        const text = htmlContent;
        const newText = text.substring(0, start) + tag + text.substring(end);
        setHtmlContent(newText);
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + tag.length;
                textareaRef.current.focus();
            }
        }, 50);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!name.trim()) {
            setError('El nombre de la plantilla es obligatorio');
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            const payload = {
                name: name.trim(),
                type: type.trim(),
                role_id: roleId !== '' ? Number(roleId) : null,
                file_path: filePath.trim() || null,
                background_image: backgroundImage.trim() || null,
                html_content: htmlContent,
            };

            if (template) {
                await templatesService.updateTemplate(template.id, payload as DocumentTemplateUpdate);
            } else {
                await templatesService.createTemplate(payload as DocumentTemplateCreate);
            }
            onSaved();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.detail || err.message || 'Error al guardar la plantilla');
        } finally {
            setIsSaving(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200" style={{ margin: 0 }}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh]">
                
                {/* Header Estandarizado */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-brand-100 text-brand-700 rounded-xl">
                            <FileText className="w-5 h-5 text-brand-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 font-montserrat">
                                {template ? 'Editar Plantilla de Documento' : 'Nueva Plantilla de Documento'}
                            </h3>
                            <p className="text-xs text-slate-500">Diseña y edita el contenido HTML y las variables dinámicas del contrato</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form id="template-form" onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
                    {error && (
                        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-600">
                            {error}
                        </div>
                    )}

                    {/* Fila Principal de Datos */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700">Nombre de la Plantilla <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ej. Contrato de Inversión Estándar"
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none text-xs font-bold text-slate-900"
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700">Tipo de Documento <span className="text-red-500">*</span></label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none text-xs font-bold text-slate-900"
                            >
                                <option value="contract">Contrato de Inversión</option>
                                <option value="certificate">Certificado de Participación</option>
                                <option value="receipt">Comprobante / Recibo</option>
                                <option value="general">Documento General</option>
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700">Ruta Archivo (Opcional)</label>
                            <input
                                type="text"
                                value={filePath}
                                onChange={(e) => setFilePath(e.target.value)}
                                placeholder="Ej. templates/contrato_v1.pdf"
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none text-xs font-semibold text-slate-900"
                            />
                        </div>
                    </div>

                    {/* Barra de Insertar Variables Dinámicas */}
                    <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-brand-300 font-montserrat">
                            <Sparkles className="w-4 h-4 text-emerald-400" />
                            <span>Variables Dinámicas Disponibles (Haz clic para insertar en la posición del cursor):</span>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                            {TEMPLATE_VARIABLES.map(v => (
                                <button
                                    key={v.tag}
                                    type="button"
                                    onClick={() => insertVariable(v.tag)}
                                    className="px-2.5 py-1 bg-white/10 hover:bg-brand-500 hover:text-white rounded-lg text-[11px] font-mono transition-all border border-white/10 cursor-pointer"
                                    title={`Insertar ${v.label}`}
                                >
                                    + {v.tag}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Editor / Vista Previa Selector de Pestañas */}
                    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
                        <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('editor')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                        activeTab === 'editor' 
                                            ? 'bg-white text-brand-600 shadow-xs' 
                                            : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    <Code className="w-3.5 h-3.5" /> Editor HTML
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('preview')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                        activeTab === 'preview' 
                                            ? 'bg-white text-brand-600 shadow-xs' 
                                            : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    <Eye className="w-3.5 h-3.5" /> Vista Previa en Vivo
                                </button>
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono">Formato HTML / CSS</span>
                        </div>

                        {activeTab === 'editor' ? (
                            <textarea
                                ref={textareaRef}
                                value={htmlContent}
                                onChange={(e) => setHtmlContent(e.target.value)}
                                rows={14}
                                placeholder="Escribe o pega aquí el código HTML de la plantilla..."
                                className="w-full p-4 font-mono text-xs text-slate-800 bg-white border-0 focus:outline-none resize-y min-h-[300px]"
                            />
                        ) : (
                            <div className="p-6 bg-white min-h-[300px] max-h-[500px] overflow-y-auto border-t border-slate-100">
                                <div 
                                    className="prose prose-slate max-w-none"
                                    dangerouslySetInnerHTML={{ __html: htmlContent || '<p class="text-slate-400 italic">Sin contenido HTML para previsualizar</p>' }} 
                                />
                            </div>
                        )}
                    </div>
                </form>

                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSaving}
                        className="px-5 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-200 transition-all text-sm cursor-pointer"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="template-form"
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-brand-500 hover:bg-brand-600 rounded-xl shadow-md shadow-brand-500/20 transition-all disabled:opacity-50 cursor-pointer"
                    >
                        {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                        Guardar Plantilla
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
