import { useState } from 'react';
import { QrCode, Loader2, Send, Eye } from 'lucide-react';
import { sendAccessQrEmails, AttendanceEmailsResult } from '../../../../services/events';

/**
 * Reenvío del QR de acceso («Tu QR de acceso») a todos los inscritos presenciales vigentes, hayan confirmado o no.
 * Es un correo corto con el QR y los datos para entrar: no pide confirmar ni cambiar a virtual.
 * Siempre se muestra primero la lista de destinatarios; el envío real exige una segunda confirmación.
 */
export function AccessQrEmailsCard({ onSent }: { onSent?: () => void }) {
  const [preview, setPreview] = useState<AttendanceEmailsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadPreview = async () => {
    setLoading(true);
    setMessage(null);
    try {
      setPreview(await sendAccessQrEmails(false));
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'No se pudo calcular la lista de destinatarios.' });
    } finally {
      setLoading(false);
    }
  };

  const send = async () => {
    if (!preview || preview.recipients === 0) return;
    if (!window.confirm(`Se reenviará el QR de acceso a ${preview.recipients} inscrito(s) presenciales. ¿Continuar?`)) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await sendAccessQrEmails(true);
      setMessage({ type: 'success', text: `Reenvío iniciado para ${res.recipients} inscrito(s). Los correos salen en segundo plano.` });
      setPreview(null);
      onSent?.();
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'No se pudo iniciar el reenvío.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <QrCode className="w-4 h-4 text-brand-600" /> Reenviar QR de acceso
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Reenvía a todos los inscritos presenciales (hayan confirmado o no) un correo corto con su QR personal para entrar al evento.
            No les pide confirmar ni cambiar a virtual. También puedes reenviarlo a una sola persona desde la tabla de inscritos.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button type="button" onClick={loadPreview} disabled={loading}
            className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50 cursor-pointer">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />} Ver destinatarios
          </button>
          <button type="button" onClick={send} disabled={loading || !preview || preview.recipients === 0}
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold disabled:opacity-40 cursor-pointer">
            <Send className="w-4 h-4" /> Reenviar QR
          </button>
        </div>
      </div>

      {preview && (
        <div className="mt-4 text-xs text-slate-600">
          <p className="font-bold text-slate-800">{preview.recipients} destinatario(s) presenciales.</p>
          {preview.recipients > 0 && (
            <p className="mt-1 max-h-24 overflow-auto break-words">{preview.emails.join(', ')}</p>
          )}
        </div>
      )}
      {message && (
        <p role="status" className={`mt-3 text-xs font-medium ${message.type === 'success' ? 'text-emerald-700' : 'text-rose-700'}`}>{message.text}</p>
      )}
    </div>
  );
}
