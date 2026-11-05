import { useCallback, useEffect, useState } from 'react';
import { Radio, Loader2, Send, Eye, Users, Mail } from 'lucide-react';
import {
  AttendanceEmailsResult,
  LiveOverview,
  getLiveOverview,
  sendLiveInvitations,
  sendLiveInvitationToAttendee,
  updateLiveConfig,
} from '../../../../services/events';

const REFRESH_MS = 5000;

function formatTime(value?: string | null): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '—';
  }
}

/**
 * Sala en vivo del evento: Playback ID de Mux, abrir/cerrar la sala, invitar a los virtuales
 * y ver en vivo quién está conectado, quién entró y cuánto tiempo estuvo.
 */
export function LiveRoomCard() {
  const [data, setData] = useState<LiveOverview | null>(null);
  const [playbackId, setPlaybackId] = useState('');
  const [preview, setPreview] = useState<AttendanceEmailsResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [rowBusy, setRowBusy] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const refresh = useCallback(async () => {
    try {
      setData(await getLiveOverview());
    } catch {
      // el siguiente refresco lo reintenta
    }
  }, []);

  useEffect(() => {
    getLiveOverview().then((d) => { setData(d); setPlaybackId(d.live_playback_id || ''); }).catch(() => {});
    const id = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setMessage(null);
    try {
      await action();
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'No se pudo completar la acción.' });
    } finally {
      setBusy(false);
    }
  };

  const savePlaybackId = () => run(async () => {
    const d = await updateLiveConfig({ live_playback_id: playbackId });
    setData(d);
    setMessage({ type: 'success', text: 'Playback ID guardado.' });
  });

  const toggleOpen = () => run(async () => {
    if (!data) return;
    if (data.live_open && !window.confirm('¿Cerrar la sala? Los asistentes conectados verán que la transmisión finalizó.')) return;
    setData(await updateLiveConfig({ live_open: !data.live_open }));
  });

  const loadPreview = () => run(async () => setPreview(await sendLiveInvitations(false)));

  const sendAll = () => run(async () => {
    if (!preview || preview.recipients === 0) return;
    if (!window.confirm(`Se enviará la invitación a la sala en vivo a ${preview.recipients} inscrito(s) virtuales. ¿Continuar?`)) return;
    const res = await sendLiveInvitations(true);
    setMessage({ type: 'success', text: `Envío iniciado para ${res.recipients} inscrito(s). Los correos salen en segundo plano.` });
    setPreview(null);
    refresh();
  });

  const sendOne = async (attendeeId: number) => {
    setRowBusy(attendeeId);
    setMessage(null);
    try {
      const res = await sendLiveInvitationToAttendee(attendeeId);
      setMessage({ type: 'success', text: `Invitación enviada a ${res.email}.` });
      refresh();
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'No se pudo enviar la invitación.' });
    } finally {
      setRowBusy(null);
    }
  };

  return (
    <section className="bg-white border border-slate-200 rounded-2xl shadow-xs p-5 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Radio className={`w-5 h-5 ${data?.live_open ? 'text-red-500' : 'text-slate-400'}`} />
          <div>
            <h2 className="text-sm font-bold text-slate-900">Sala en vivo (virtuales)</h2>
            <p className="text-xs text-slate-500">Transmisión Mux incrustada. Cada virtual entra con su enlace personal.</p>
          </div>
        </div>
        <button onClick={toggleOpen} disabled={busy || !data || (!data.live_open && !data.live_playback_id)}
          title={data && !data.live_open && !data.live_playback_id ? 'Guarda primero un Playback ID (o escribe «simulado» para probar)' : undefined}
          className={`rounded-xl px-4 py-2 text-xs font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed ${data?.live_open ? 'bg-slate-800 hover:bg-slate-900' : 'bg-red-500 hover:bg-red-600'}`}>
          {data?.live_open ? 'Cerrar sala' : 'Abrir sala'}
        </button>
      </div>

      {message && (
        <p role="status" className={`text-xs rounded-lg p-2.5 border ${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {message.text}
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <input value={playbackId} onChange={(e) => setPlaybackId(e.target.value)} placeholder="Playback ID de Mux"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" aria-label="Playback ID de Mux" />
        <button onClick={savePlaybackId} disabled={busy}
          className="rounded-lg border border-slate-300 hover:bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 disabled:opacity-50">
          Guardar
        </button>
      </div>
      {data && !data.live_open && !data.live_playback_id && (
        <p className="text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-700 p-2.5">
          Para abrir la sala primero escribe un Playback ID y pulsa <strong>Guardar</strong>.
        </p>
      )}
      <p className="text-xs text-slate-500">Para probar sin Mux escribe <code className="font-mono bg-slate-100 px-1 rounded">simulado</code> como Playback ID: la sala mostrará un reproductor de prueba.</p>
      {data && !data.signing_configured && data.live_playback_id !== 'simulado' && (
        <p className="text-xs rounded-lg bg-amber-50 border border-amber-200 text-amber-800 p-2.5">
          El servidor no tiene la clave de firma de Mux (MUX_SIGNING_KEY_ID / MUX_SIGNING_PRIVATE_KEY): el video solo reproducirá
          si su política de reproducción en Mux es pública.
        </p>
      )}

      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          {[
            ['Virtuales', data.total_virtual],
            ['Invitados', data.invited],
            ['Han entrado', data.joined],
            ['Conectados ahora', data.online_now],
          ].map(([label, value]) => (
            <div key={label as string} className="rounded-xl bg-slate-50 border border-slate-200 py-3">
              <p className="text-xl font-bold text-slate-900">{value}</p>
              <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
                {label === 'Conectados ahora' && <Users className="w-3 h-3" />}{label}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={loadPreview} disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 hover:bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 disabled:opacity-50">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}Ver a quién invitar
        </button>
        {preview && preview.recipients > 0 && (
          <button onClick={sendAll} disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 hover:bg-orange-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
            <Send className="w-4 h-4" />Enviar a {preview.recipients}
          </button>
        )}
        {preview && preview.recipients === 0 && <span className="text-xs text-slate-500">Todos los virtuales ya fueron invitados.</span>}
      </div>
      {preview && preview.recipients > 0 && (
        <p className="text-xs text-slate-500 break-words">Destinatarios: {preview.emails.join(', ')}</p>
      )}

      {data && data.attendees.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="text-slate-500 border-b border-slate-200">
                <th className="py-2 pr-3 font-semibold">Asistente</th>
                <th className="py-2 pr-3 font-semibold">Estado</th>
                <th className="py-2 pr-3 font-semibold">Entró</th>
                <th className="py-2 pr-3 font-semibold">Min. viendo</th>
                <th className="py-2 pr-3 font-semibold">Invitación</th>
              </tr>
            </thead>
            <tbody>
              {data.attendees.map((a) => (
                <tr key={a.attendee_id} className="border-b border-slate-100">
                  <td className="py-2 pr-3">
                    <p className="font-semibold text-slate-900">{a.full_name}</p>
                    <p className="text-slate-500">{a.email} · {a.attendee_type === 'investor' ? 'Inversionista' : 'Externo'}</p>
                  </td>
                  <td className="py-2 pr-3">
                    {a.online
                      ? <span className="rounded-full bg-green-100 text-green-700 px-2 py-0.5 font-bold">Conectado</span>
                      : a.first_joined_at
                        ? <span className="rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 font-bold">Salió {formatTime(a.last_seen_at)}</span>
                        : <span className="text-slate-400">No ha entrado</span>}
                  </td>
                  <td className="py-2 pr-3">{formatTime(a.first_joined_at)}{a.joins > 1 ? ` (${a.joins} veces)` : ''}</td>
                  <td className="py-2 pr-3">{a.first_joined_at ? a.watch_minutes : '—'}</td>
                  <td className="py-2 pr-3">
                    <button onClick={() => sendOne(a.attendee_id)} disabled={rowBusy === a.attendee_id}
                      className="inline-flex items-center gap-1 text-orange-600 hover:text-orange-700 font-semibold disabled:opacity-50">
                      {rowBusy === a.attendee_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
                      {a.invited_at ? 'Reenviar' : 'Enviar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
