import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, ShieldCheck, AlertTriangle, CheckCircle2, XCircle, IdCard } from 'lucide-react';
import { sarlaftService, IdentityReview, SarlaftCheckResponse } from '../../../services/sarlaft';
import { getMediaUrl } from '../../../services/api';

const FALLBACK_DOC_SVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'/%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'/%3E%3Cpolyline points='21 15 16 10 5 21'/%3E%3C/svg%3E";
const DOC_LABELS = ['Frente de la cédula', 'Reverso de la cédula', 'Selfie'];

export const IDENTITY_BADGES: Record<string, { label: string; cls: string }> = {
    verified: { label: 'Identidad verificada', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    rejected: { label: 'Identidad rechazada', cls: 'bg-red-100 text-red-800 border-red-200' },
    pending: { label: 'Identidad sin revisar', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
};

interface IdentityReviewModalProps {
    userId: number;
    userName: string;
    onClose: () => void;
    onSaved?: (review: IdentityReview) => void;
}

/**
 * Revisión manual de identidad: muestra la cédula, la selfie y el resultado biométrico del registro
 * para que el administrador decida si la identidad queda verificada o rechazada.
 */
export const IdentityReviewModal: React.FC<IdentityReviewModalProps> = ({ userId, userName, onClose, onSaved }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<SarlaftCheckResponse | null>(null);
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState<'verified' | 'rejected' | null>(null);

    useEffect(() => {
        let cancelled = false;
        sarlaftService.getCheckByUser(userId)
            .then((res) => {
                if (cancelled) return;
                setData(res);
                setNote(res.check?.details?.identity_review?.note || '');
            })
            .catch((e) => !cancelled && setError(e?.message || 'No se pudo cargar la información del usuario'))
            .finally(() => !cancelled && setLoading(false));
        return () => { cancelled = true; };
    }, [userId]);

    const details = data?.check?.details;
    const docs = Array.isArray(details?.kyc_docs) ? details!.kyc_docs! : [];
    const bio = details?.biometrics;
    const review = details?.identity_review;

    const save = async (status: 'verified' | 'rejected') => {
        if (status === 'rejected' && !note.trim()) {
            setError('Indica el motivo del rechazo.');
            return;
        }
        setError(null);
        setSaving(status);
        try {
            const res = await sarlaftService.reviewIdentity({ user_id: userId, status, note: note.trim() || undefined });
            onSaved?.(res.identity_review);
            onClose();
        } catch (e: any) {
            setError(e?.message || 'No se pudo guardar la revisión');
        } finally {
            setSaving(null);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6">
                <div className="flex items-start justify-between pb-3 mb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <IdCard className="w-5 h-5 text-brand-500" />
                        <div>
                            <h2 className="text-base font-bold text-slate-900">Validar identidad</h2>
                            <p className="text-xs text-slate-500">{userName}</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700" title="Cerrar">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {loading ? (
                    <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
                ) : (
                    <div className="space-y-4">
                        {review && (
                            <div className={`text-xs rounded-xl border px-3 py-2 ${(IDENTITY_BADGES[review.status] || IDENTITY_BADGES.pending).cls}`}>
                                <span className="font-bold">{(IDENTITY_BADGES[review.status] || IDENTITY_BADGES.pending).label}</span>
                                {review.reviewed_by_name ? ` por ${review.reviewed_by_name}` : ''}
                                {review.reviewed_at ? ` · ${new Date(review.reviewed_at + 'Z').toLocaleString('es-CO')}` : ''}
                                {review.note ? <p className="mt-1 font-normal">{review.note}</p> : null}
                            </div>
                        )}

                        {docs.length === 0 ? (
                            <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                Este usuario no tiene documentos de identidad cargados (cédula y selfie). Pídele que los envíe antes de verificar su identidad.
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {docs.map((path, idx) => {
                                        const label = DOC_LABELS[idx] || `Documento ${idx + 1}`;
                                        const url = getMediaUrl(path);
                                        return (
                                            <a key={idx} href={url} target="_blank" rel="noreferrer" className="group block bg-slate-50 border border-slate-200 hover:border-brand-500 rounded-xl p-2 transition-colors" title="Abrir en grande">
                                                <div className="h-40 bg-white rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center">
                                                    <img
                                                        src={url}
                                                        alt={label}
                                                        className="w-full h-full object-contain"
                                                        onError={(e) => {
                                                            const t = e.target as HTMLImageElement;
                                                            if (t.src !== FALLBACK_DOC_SVG) t.src = FALLBACK_DOC_SVG;
                                                        }}
                                                    />
                                                </div>
                                                <p className="text-[11px] font-bold text-slate-700 text-center mt-1.5">{label}</p>
                                            </a>
                                        );
                                    })}
                                </div>

                                <div className="text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-start gap-2">
                                    {bio?.verified ? (
                                        <>
                                            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                            <span>Coincidencia facial automática aprobada{bio.similarity != null ? ` (${bio.similarity}%)` : ''}. Confirma visualmente que la selfie y la cédula son de la misma persona.</span>
                                        </>
                                    ) : (
                                        <>
                                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                            <span>
                                                La coincidencia facial automática no se pudo confirmar{bio?.attempts ? ` tras ${bio.attempts} intento(s)` : ''}. Esta revisión manual decide si la identidad queda verificada.
                                            </span>
                                        </>
                                    )}
                                </div>
                            </>
                        )}

                        <div>
                            <label htmlFor="identity-note" className="block text-xs font-bold text-slate-700 mb-1">Nota de la revisión</label>
                            <textarea
                                id="identity-note"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                rows={3}
                                maxLength={500}
                                placeholder="Obligatoria si rechazas. Ej: la selfie no corresponde a la cédula."
                                className="w-full text-xs border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-brand-500"
                            />
                        </div>

                        {error && <p className="text-xs text-red-600" role="alert">{error}</p>}

                        <div className="flex justify-end gap-2 pt-1">
                            <button type="button" onClick={onClose} className="px-4 py-2 text-xs text-slate-500 hover:text-slate-700">Cancelar</button>
                            <button
                                type="button"
                                disabled={saving !== null}
                                onClick={() => save('rejected')}
                                className="px-4 py-2 text-xs font-bold text-red-700 border border-red-200 hover:bg-red-50 rounded-xl flex items-center gap-1.5 disabled:opacity-50"
                            >
                                {saving === 'rejected' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                                Rechazar identidad
                            </button>
                            <button
                                type="button"
                                disabled={saving !== null || docs.length === 0}
                                onClick={() => save('verified')}
                                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center gap-1.5 disabled:opacity-50"
                            >
                                {saving === 'verified' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                Verificar identidad
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};
