import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScanLine, Download, Camera } from 'lucide-react';
import {
  CheckInResult,
  UnifiedAttendance,
  UnifiedAttendeeRow,
  checkInAttendee,
  checkInByCode,
  getUnifiedAttendance,
  undoCheckIn,
} from '../../../../services/events';
import { QrScanner } from './QrScanner';

const GROUPS: { key: string; label: string }[] = [
  { key: 'investor:in_person', label: 'Inversionistas presenciales' },
  { key: 'investor:virtual', label: 'Inversionistas virtuales' },
  { key: 'external:in_person', label: 'Externos presenciales' },
  { key: 'external:virtual', label: 'Externos virtuales' },
];

function time(value?: string | null): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '—';
  }
}

type Banner = { kind: 'ok' | 'warn' | 'error'; text: string };

function describe(res: CheckInResult): Banner {
  const a = res.attendee;
  const seats = a.seats_reserved > 1 ? ` · ${a.seats_reserved} cupos${a.companion_name ? ` (acompañante: ${a.companion_name})` : ''}` : '';
  const who = `${a.full_name} (${a.attendee_type === 'investor' ? 'inversionista' : 'externo'})${seats}`;
  return res.result === 'checked_in'
    ? { kind: 'ok', text: `Entrada registrada: ${who}` }
    : { kind: 'warn', text: `Ya había ingresado a las ${time(a.checked_in_at)}: ${who}` };
}

/** Control de entrada presencial (QR con cámara, lector USB o lista) y lista unificada de asistencia. */
export function CheckInCard() {
  const [data, setData] = useState<UnifiedAttendance | null>(null);
  const [scanning, setScanning] = useState(false);
  const [code, setCode] = useState('');
  const [banner, setBanner] = useState<Banner | null>(null);
  const [busy, setBusy] = useState(false);
  const [group, setGroup] = useState('all');
  const [attendedFilter, setAttendedFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [search, setSearch] = useState('');

  const refresh = useCallback(async () => {
    try {
      setData(await getUnifiedAttendance());
    } catch {
      // el siguiente refresco lo reintenta
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [refresh]);

  const handle = useCallback(async (action: () => Promise<CheckInResult>) => {
    setBusy(true);
    try {
      const res = await action();
      setBanner(describe(res));
      if (res.result === 'checked_in') navigator.vibrate?.(200); // confirmación táctil en celulares
      refresh();
    } catch (e: any) {
      setBanner({ kind: 'error', text: e?.message || 'No se pudo registrar la entrada.' });
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  const scan = useCallback((raw: string) => handle(() => checkInByCode(raw)), [handle]);

  const submitCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    scan(code);
    setCode('');
  };

  const undo = async (row: UnifiedAttendeeRow) => {
    if (!window.confirm(`¿Deshacer la entrada de ${row.full_name}?`)) return;
    try {
      await undoCheckIn(row.id);
      setBanner({ kind: 'warn', text: `Entrada deshecha: ${row.full_name}` });
      refresh();
    } catch (e: any) {
      setBanner({ kind: 'error', text: e?.message || 'No se pudo deshacer.' });
    }
  };

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.attendees ?? []).filter((r) =>
      (group === 'all' || `${r.attendee_type}:${r.attendance_mode}` === group) &&
      (attendedFilter === 'all' || (attendedFilter === 'yes') === r.attended) &&
      (!q || r.full_name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)));
  }, [data, group, attendedFilter, search]);

  const exportCsv = () => {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [['Nombre', 'Correo', 'Teléfono', 'Tipo', 'Modalidad', 'Asistió', 'Hora de entrada', 'Primera conexión', 'Minutos viendo'].join(',')];
    (data?.attendees ?? []).forEach((r) => lines.push([
      r.full_name, r.email, r.phone || '', r.attendee_type === 'investor' ? 'Inversionista' : 'Externo',
      r.attendance_mode === 'in_person' ? 'Presencial' : 'Virtual', r.attended ? 'Sí' : 'No',
      r.checked_in_at ? new Date(r.checked_in_at).toLocaleString('es-CO') : '',
      r.live_first_joined_at ? new Date(r.live_first_joined_at).toLocaleString('es-CO') : '', r.live_watch_minutes || '',
    ].map(esc).join(',')));
    const url = URL.createObjectURL(new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'asistencia-gloint-power-tech.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const bannerCls = { ok: 'bg-green-50 border-green-200 text-green-800', warn: 'bg-amber-50 border-amber-200 text-amber-800', error: 'bg-red-50 border-red-200 text-red-700' };

  return (
    <section className="bg-white border border-slate-200 rounded-2xl shadow-xs p-5 sm:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <ScanLine className="w-5 h-5 text-orange-500" />
        <div>
          <h2 className="text-sm font-bold text-slate-900">Entrada y asistencia</h2>
          <p className="text-xs text-slate-500">Escanea el QR del inscrito presencial, o búscalo en la lista. Aquí ves la asistencia de los cuatro grupos.</p>
        </div>
      </div>

      {/* La respuesta va arriba, antes de la cámara: en el celular abajo quedaba fuera de pantalla */}
      {banner && <p role="status" className={`text-base rounded-xl p-4 border font-medium ${bannerCls[banner.kind]}`}>{banner.text}</p>}

      <div className="flex flex-wrap items-start gap-4">
        <div className="space-y-2">
          <button onClick={() => setScanning((s) => !s)}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 text-xs font-bold">
            <Camera className="w-4 h-4" />{scanning ? 'Apagar cámara' : 'Escanear con cámara'}
          </button>
          {scanning && <QrScanner onCode={scan} />}
        </div>
        <form onSubmit={submitCode} className="flex-1 min-w-[220px] space-y-2">
          <label htmlFor="checkin-code" className="text-xs font-semibold text-slate-600">Lector USB o código manual</label>
          <div className="flex gap-2">
            <input id="checkin-code" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off"
              placeholder="Apunta el lector aquí o pega el código"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <button type="submit" disabled={busy || !code.trim()}
              className="rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-4 py-2 text-xs font-bold">Registrar</button>
          </div>
        </form>
      </div>

      {data && (
        <>
          <p className="text-sm text-slate-700">
            Entradas presenciales: <strong>{data.in_person_checked_in}</strong> de {data.in_person_registered} inscritos ·
            cupos: <strong>{data.seats_checked_in}</strong> de {data.seats_expected}
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {GROUPS.map((g) => (
              <div key={g.key} className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                <p className="text-xl font-bold text-slate-900">{data.groups[g.key]?.attended ?? 0}<span className="text-sm font-medium text-slate-500"> / {data.groups[g.key]?.registered ?? 0}</span></p>
                <p className="text-[11px] text-slate-500">{g.label}</p>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre o correo" aria-label="Buscar asistente"
          className="flex-1 min-w-[180px] rounded-lg border border-slate-300 px-3 py-2 text-xs" />
        <select value={group} onChange={(e) => setGroup(e.target.value)} aria-label="Filtrar por grupo" className="rounded-lg border border-slate-300 px-2 py-2 text-xs">
          <option value="all">Todos los grupos</option>
          {GROUPS.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}
        </select>
        <select value={attendedFilter} onChange={(e) => setAttendedFilter(e.target.value as 'all' | 'yes' | 'no')} aria-label="Filtrar por asistencia" className="rounded-lg border border-slate-300 px-2 py-2 text-xs">
          <option value="all">Todos</option>
          <option value="yes">Asistieron</option>
          <option value="no">No han asistido</option>
        </select>
        <button onClick={exportCsv} disabled={!data}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 hover:bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50">
          <Download className="w-4 h-4" />CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="text-slate-500 border-b border-slate-200">
              <th className="py-2 pr-3 font-semibold">Asistente</th>
              <th className="py-2 pr-3 font-semibold">Grupo</th>
              <th className="py-2 pr-3 font-semibold">Asistencia</th>
              <th className="py-2 pr-3 font-semibold">Acción</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-100">
                <td className="py-2 pr-3"><p className="font-semibold text-slate-900">{r.full_name}</p><p className="text-slate-500">{r.email}</p></td>
                <td className="py-2 pr-3">{r.attendee_type === 'investor' ? 'Inversionista' : 'Externo'} · {r.attendance_mode === 'in_person' ? 'presencial' : 'virtual'}</td>
                <td className="py-2 pr-3">
                  {r.attended
                    ? <span className="rounded-full bg-green-100 text-green-700 px-2 py-0.5 font-bold">
                        {r.attendance_mode === 'in_person' ? `Entró ${time(r.checked_in_at)}` : `Conectó ${time(r.live_first_joined_at)} · ${r.live_watch_minutes} min`}
                      </span>
                    : <span className="text-slate-400">No ha asistido</span>}
                </td>
                <td className="py-2 pr-3">
                  {r.attendance_mode === 'in_person' && (r.attended
                    ? <button onClick={() => undo(r)} className="text-slate-500 hover:text-red-600 font-semibold">Deshacer</button>
                    : <button disabled={busy} onClick={() => handle(() => checkInAttendee(r.id))} className="text-orange-600 hover:text-orange-700 font-semibold disabled:opacity-50">Registrar entrada</button>)}
                </td>
              </tr>
            ))}
            {data && rows.length === 0 && <tr><td colSpan={4} className="py-4 text-slate-500">No hay asistentes con esos filtros.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
