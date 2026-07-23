import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, XCircle, User, CreditCard, Banknote, Calendar, Phone, Mail, Loader2, FileText, AlertCircle } from 'lucide-react';
import { AdminInvestmentRequest, investmentsService } from '../../../../services/investments';
import { API_URL } from '../../../../services/api';
import { formatCurrency } from '../../../../utils/format';

interface ReviewInvestmentRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    request: AdminInvestmentRequest | null;
    onSuccess: () => void;
}

export const ReviewInvestmentRequestModal: React.FC<ReviewInvestmentRequestModalProps> = ({ isOpen, onClose, request, onSuccess }) => {
    if (!isOpen || !request) return null;
    const [isLoading, setIsLoading] = useState(false);
    const [suggestedCode, setSuggestedCode] = useState('');
    const [formData, setFormData] = useState({
        fecha_ingreso: new Date().toISOString().split('T')[0],
        banco: '',
        tipo_cuenta: '',
        numero_cuenta: '',
        referido_por: '',
    });
    
    const [isRejecting, setIsRejecting] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && request) {
            // Pre-fill form from extra_data if available
            const extra = request.extra_data || {};
            const bank = extra.bank_info || {};
            const personal = extra.personal_info || {};
            
            setFormData(prev => ({
                ...prev,
                banco: bank.banco || '',
                tipo_cuenta: bank.tipo_cuenta || '',
                numero_cuenta: bank.numero_cuenta || '',
                referido_por: personal.referido_por || ''
            }));
            
            setError(null);
            setIsRejecting(false);
            setRejectionReason('');
        }
    }, [isOpen, request]);

    if (!isOpen || !request) return null;

    const extra = request.extra_data || {};
    const personalInfo = extra.personal_info || {};
    const bankInfo = extra.bank_info || {};
    const kycDocs = extra.kyc_docs || {};
    
    // Usamos el dominio del backend directamente. FastAPI ya está configurado para 
    // servir la carpeta uploads nativamente, así evitamos problemas de permisos con el symlink en Linux.
    const baseUrl = API_URL.replace('/api/v1', '');

    const handleApprove = async () => {
        try {
            setIsLoading(true);
            setError(null);
            await investmentsService.approveInvestmentRequest(request.id, formData);
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Error al aprobar la solicitud');
        } finally {
            setIsLoading(false);
        }
    };

    const handleReject = async () => {
        if (!rejectionReason.trim()) {
            setError("Debes ingresar el motivo del rechazo.");
            return;
        }
        
        try {
            setIsLoading(true);
            setError(null);
            await investmentsService.rejectInvestmentRequest(request.id, rejectionReason);
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Error al rechazar la solicitud');
        } finally {
            setIsLoading(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pt-20 bg-slate-900/50 backdrop-blur-sm overflow-y-auto" style={{ margin: 0 }}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col my-8">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">
                            Revisar Solicitud de Inversión <span className="text-brand-600">#{request.id}</span>
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">Valida la información del usuario antes de aprobar</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                            <p className="text-sm">{error}</p>
                        </div>
                    )}
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Columna Izquierda: Información del Usuario */}
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <User className="w-4 h-4 text-brand-500" />
                                    Datos del Usuario
                                </h3>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <span className="text-xs text-slate-500 block mb-1">Nombre Completo</span>
                                            <span className="text-sm font-semibold text-slate-800">{personalInfo.nombre_completo || request.usuario_nombre || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-slate-500 block mb-1">Documento ({personalInfo.tipo_documento || 'CC'})</span>
                                            <span className="text-sm font-semibold text-slate-800">{personalInfo.documento || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-slate-500 block mb-1 flex items-center gap-1"><Mail className="w-3 h-3"/> Correo</span>
                                            <span className="text-sm font-medium text-slate-700">{personalInfo.correo_electronico || request.usuario_correo || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-slate-500 block mb-1 flex items-center gap-1"><Phone className="w-3 h-3"/> Celular</span>
                                            <span className="text-sm font-medium text-slate-700">{personalInfo.numero_celular || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-slate-500 block mb-1">Ciudad</span>
                                            <span className="text-sm font-medium text-slate-700">{personalInfo.ciudad || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-slate-500 block mb-1">Fecha Nacimiento</span>
                                            <span className="text-sm font-medium text-slate-700">{personalInfo.fecha_nacimiento || 'N/A'}</span>
                                        </div>
                                    </div>
                                    
                                    {Object.keys(kycDocs).length > 0 && (
                                        <div className="pt-3 mt-3 border-t border-slate-200">
                                            <span className="text-xs text-slate-500 block mb-2">Documentos KYC Adjuntos</span>
                                            <div className="flex flex-wrap gap-2">
                                                {Object.entries(kycDocs).map(([key, path]) => (
                                                    <a 
                                                        key={key} 
                                                        href={`${baseUrl}/${path}`} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="text-xs bg-brand-50 hover:bg-brand-100 text-brand-700 px-2.5 py-1.5 rounded-lg font-medium transition-colors border border-brand-200 flex items-center gap-1.5"
                                                    >
                                                        <FileText className="w-3.5 h-3.5" />
                                                        {key}
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Banknote className="w-4 h-4 text-brand-500" />
                                    Detalles de la Inversión
                                </h3>
                                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-emerald-200/50">
                                        <div>
                                            <span className="text-xs text-emerald-600/80 font-medium block mb-1">Monto Solicitado</span>
                                            <span className="text-2xl font-bold text-emerald-700">{formatCurrency(request.monto)}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs text-emerald-600/80 font-medium block mb-1">Paquete / Prospecto</span>
                                            <span className="text-sm font-bold text-emerald-700">{request.paquete_nombre || 'Personalizado'}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="text-xs text-emerald-600/80 font-medium block mb-1">Comprobante de Pago</span>
                                            {request.comprobante_path ? (
                                                <a 
                                                    href={`${baseUrl}/${request.comprobante_path}`} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 text-sm text-emerald-700 bg-white hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors font-medium shadow-sm"
                                                >
                                                    <FileText className="w-4 h-4" />
                                                    Ver Comprobante
                                                </a>
                                            ) : (
                                                <span className="text-sm text-slate-500 italic">No adjunto</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Columna Derecha: Formulario de Aprobación */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                            {!isRejecting ? (
                                <>
                                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                                        Formulario de Aprobación
                                    </h3>
                                    <div className="space-y-5">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Fecha de Ingreso</label>
                                                <input 
                                                    type="date" 
                                                    value={formData.fecha_ingreso}
                                                    onChange={e => setFormData(prev => ({...prev, fecha_ingreso: e.target.value}))}
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
                                                />
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-slate-100">
                                            <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-4">
                                                <CreditCard className="w-4 h-4 text-slate-400" />
                                                Datos Bancarios
                                            </h4>
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-600 mb-1">Banco</label>
                                                    <input 
                                                        type="text" 
                                                        placeholder="Ej: Bancolombia"
                                                        value={formData.banco}
                                                        onChange={e => setFormData(prev => ({...prev, banco: e.target.value}))}
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-600 mb-1">Tipo de Cuenta</label>
                                                        <select
                                                            value={formData.tipo_cuenta}
                                                            onChange={e => setFormData(prev => ({...prev, tipo_cuenta: e.target.value}))}
                                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm bg-white"
                                                        >
                                                            <option value="">Seleccione...</option>
                                                            <option value="ahorros">Ahorros</option>
                                                            <option value="corriente">Corriente</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-600 mb-1">Número de Cuenta</label>
                                                        <input 
                                                            type="text" 
                                                            value={formData.numero_cuenta}
                                                            onChange={e => setFormData(prev => ({...prev, numero_cuenta: e.target.value}))}
                                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-slate-100">
                                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Referido Por (Opcional)</label>
                                            <input 
                                                type="text" 
                                                value={formData.referido_por}
                                                onChange={e => setFormData(prev => ({...prev, referido_por: e.target.value}))}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
                                            />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                    <h3 className="text-lg font-bold text-rose-700 mb-4 flex items-center gap-2">
                                        <XCircle className="w-5 h-5" />
                                        Motivo del Rechazo
                                    </h3>
                                    <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 mb-6">
                                        <p className="text-sm text-rose-600">
                                            Al rechazar la solicitud, el usuario verá este motivo en su panel. La solicitud quedará marcada como rechazada permanentemente.
                                        </p>
                                    </div>
                                    <textarea
                                        value={rejectionReason}
                                        onChange={e => setRejectionReason(e.target.value)}
                                        placeholder="Escribe el motivo detallado del rechazo (ej. Comprobante ilegible, monto no coincide...)"
                                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-sm h-32 resize-none bg-white"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex items-center justify-between shrink-0">
                    {!isRejecting ? (
                        <button
                            type="button"
                            onClick={() => setIsRejecting(true)}
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-4 py-2 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2"
                        >
                            <XCircle className="w-4 h-4" />
                            Rechazar Solicitud
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setIsRejecting(false)}
                            className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                        >
                            Volver a Aprobación
                        </button>
                    )}
                    
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg font-medium text-sm transition-colors"
                        >
                            Cancelar
                        </button>
                        
                        {!isRejecting ? (
                            <button
                                onClick={handleApprove}
                                disabled={isLoading}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-emerald-500/20"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                Aprobar Inversión
                            </button>
                        ) : (
                            <button
                                onClick={handleReject}
                                disabled={isLoading}
                                className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-2 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-rose-500/20"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                Confirmar Rechazo
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
