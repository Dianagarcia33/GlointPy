import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ticket, Download } from 'lucide-react';
import { API_URL } from '../../../../services/api';
import {
  AdminCouponCandidate,
  AdminCoupons,
  CouponStatus,
  assignCoupons,
  getAdminCoupons,
  revokeCoupons,
  setCouponsActive,
  updateCouponConfig,
} from '../../../../services/events';

const STATUS: Record<CouponStatus, { label: string; cls: string }> = {
  valid: { label: 'Disponible', cls: 'bg-green-100 text-green-700' },
  redeemed: { label: 'Usado', cls: 'bg-blue-100 text-blue-700' },
  expired: { label: 'Vencido', cls: 'bg-slate-200 text-slate-600' },
  inactive: { label: 'Sin activar', cls: 'bg-amber-100 text-amber-800' },
};

const GROUPS: { key: string; label: string }[] = [
  { key: 'investor:in_person', label: 'Inversionistas presenciales' },
  { key: 'investor:virtual', label: 'Inversionistas virtuales' },
  { key: 'external:in_person', label: 'Externos presenciales' },
  { key: 'external:virtual', label: 'Externos virtuales' },
];

type CouponFilter = 'all' | 'none' | 'given' | CouponStatus;

function dateTime(value?: string | null): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  } catch {
    return '—';
  }
}

const groupOf = (r: AdminCouponCandidate) => `${r.attendee_type === 'investor' ? 'Inversionista' : 'Externo'} · ${r.attendance_mode === 'in_person' ? 'presencial' : 'virtual'}`;

/**
 * Cupones de descuento para Gloint Place. NO son para todos: el equipo elige a quién se le da cada uno (casillas),
 * activa los cupones durante la presentación (arranca la vigencia) y ve quién tiene cupón y si ya lo usó.
 * La tienda valida y canjea con su API key.
 */
export function CouponsCard() {
  const [data, setData] = useState<AdminCoupons | null>(null);
  const [percent, setPercent] = useState('20');
  const [hours, setHours] = useState('48');
  const [storeUrl, setStoreUrl] = useState('');
  const [formReady, setFormReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [attendedFilter, setAttendedFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [couponFilter, setCouponFilter] = useState<CouponFilter>('all');
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    try {
      const d = await getAdminCoupons();
      setData(d);
      setFormReady((ready) => {
        if (!ready) {
          setPercent(String(d.percent));
          setHours(String(d.hours));
          setStoreUrl(d.store_url);
        }
        return true;
      });
    } catch {
      // el siguiente refresco lo reintenta
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, [load]);

  const run = async (action: () => Promise<AdminCoupons>, success: (d: AdminCoupons) => string) => {
    setBusy(true);
    setMessage(null);
    try {
      const d = await action();
      setData(d);
      setMessage({ type: 'success', text: success(d) });
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'No se pudo completar la acción.' });
    } finally {
      setBusy(false);
    }
  };

  const saveConfig = () => run(() => updateCouponConfig(Number(percent), Number(hours), storeUrl.trim()), () => 'Configuración guardada.');

  const toggle = () => {
    if (!data) return;
    const msg = data.active
      ? '¿Desactivar los cupones? Dejarán de verse y la tienda los rechazará.'
      : `Se activarán los cupones de ${data.total} asistente(s) seleccionado(s) y empezará a correr la vigencia de ${data.hours} horas. ¿Activar ahora?`;
    if (!window.confirm(msg)) return;
    run(() => setCouponsActive(!data.active), () => (data.active ? 'Cupones desactivados.' : 'Cupones activados: los seleccionados ya los ven.'));
  };

  const ids = useMemo(() => Array.from(selected), [selected]);

  const give = () => run(() => assignCoupons(ids), (d) => {
    const r = d.result || {};
    setSelected(new Set());
    return `Cupón entregado a ${r.assigned ?? 0} asistente(s)${r.already_had ? ` (${r.already_had} ya lo tenían)` : ''}.`;
  });

  const take = () => {
    if (!window.confirm(`¿Quitar el cupón a ${ids.length} asistente(s)? Los que ya lo usaron en una compra lo conservan.`)) return;
    run(() => revokeCoupons(ids), (d) => {
      const r = d.result || {};
      setSelected(new Set());
      return `Cupón quitado a ${r.revoked ?? 0} asistente(s)${r.kept_used ? `; ${r.kept_used} ya lo habían usado y se conserva` : ''}.`;
    });
  };

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.candidates ?? []).filter((r) =>
      (groupFilter === 'all' || `${r.attendee_type}:${r.attendance_mode}` === groupFilter) &&
      (attendedFilter === 'all' || (attendedFilter === 'yes') === r.attended) &&
      (couponFilter === 'all' || (couponFilter === 'none' ? !r.code : couponFilter === 'given' ? !!r.code : r.status === couponFilter)) &&
      (!q || r.full_name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q) || (r.code ?? '').toLowerCase().includes(q)));
  }, [data, search, groupFilter, attendedFilter, couponFilter]);

  const allVisibleSelected = rows.length > 0 && rows.every((r) => selected.has(r.attendee_id));
  const toggleVisible = () => setSelected((prev) => {
    const next = new Set(prev);
    if (allVisibleSelected) rows.forEach((r) => next.delete(r.attendee_id));
    else rows.forEach((r) => next.add(r.attendee_id));
    return next;
  });
  const toggleOne = (id: number) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const exportCsv = () => {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [['Nombre', 'Correo', 'Grupo', 'Código', 'Estado', 'Usado el', 'Compra'].join(',')];
    (data?.candidates ?? []).filter((r) => r.code && r.status).forEach((r) => lines.push([
      r.full_name, r.email, groupOf(r), r.code as string, STATUS[r.status as CouponStatus].label,
      r.redeemed_at ? new Date(r.redeemed_at).toLocaleString('es-CO') : '', r.redeemed_order_ref || '',
    ].map(esc).join(',')));
    const url = URL.createObjectURL(new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cupones-gloint-power-tech.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const locked = !!data?.active;
  const noRecipients = (data?.total ?? 0) === 0;

  return (
    <section className="bg-white border border-slate-200 rounded-2xl shadow-xs p-5 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Ticket className={`w-5 h-5 ${data?.live ? 'text-orange-500' : 'text-slate-400'}`} />
          <div>
            <h2 className="text-sm font-bold text-slate-900">Cupones de descuento en Gloint Place</h2>
            <p className="text-xs text-slate-500">Solo para los asistentes que tú elijas. Al activarlos corre la vigencia y los seleccionados los ven al instante.</p>
          </div>
        </div>
        <button onClick={toggle} disabled={busy || !data || (!locked && noRecipients)}
          title={!locked && noRecipients ? 'Primero elige a quién darle cupón' : undefined}
          className={`rounded-xl px-4 py-2 text-xs font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed ${locked ? 'bg-slate-800 hover:bg-slate-900' : 'bg-orange-500 hover:bg-orange-600'}`}>
          {locked ? 'Desactivar cupones' : 'Activar cupones'}
        </button>
      </div>

      {message && (
        <p role="status" className={`text-xs rounded-lg p-2.5 border ${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-700'}`}>{message.text}</p>
      )}

      {data && !locked && noRecipients && (
        <p className="text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-700 p-2.5">
          Aún no has elegido a nadie. Marca a los asistentes en la lista de abajo y pulsa <strong>Dar cupón</strong>; después activa los cupones.
        </p>
      )}

      {data?.active && (
        <p className={`text-xs rounded-lg p-2.5 border ${data.live ? 'bg-green-50 border-green-200 text-green-800' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
          {data.live ? 'Activos' : 'La vigencia terminó'}: del {dateTime(data.starts_at)} al <strong>{dateTime(data.expires_at)}</strong>.
          {data.live && ' Quien elijas ahora recibe el cupón con esta misma vigencia.'}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-[110px_110px_1fr_auto] gap-3 items-end">
        <label className="text-xs font-semibold text-slate-600">Descuento (%)
          <input type="number" min={1} max={100} value={percent} onChange={(e) => setPercent(e.target.value)} disabled={locked}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100" />
        </label>
        <label className="text-xs font-semibold text-slate-600">Vigencia (horas)
          <input type="number" min={1} max={720} value={hours} onChange={(e) => setHours(e.target.value)} disabled={locked}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100" />
        </label>
        <label className="text-xs font-semibold text-slate-600">Enlace de la tienda
          <input type="url" value={storeUrl} onChange={(e) => setStoreUrl(e.target.value)} disabled={locked} placeholder="https://glointplace.com.co"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100" />
        </label>
        <button onClick={saveConfig} disabled={busy || locked}
          className="rounded-lg border border-slate-300 hover:bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 disabled:opacity-50">Guardar</button>
      </div>
      {locked && <p className="text-xs text-slate-500">Para cambiar el descuento, la vigencia o la tienda, desactiva primero los cupones.</p>}

      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
          {([['Inscritos', data.eligible], ['Con cupón', data.total], ['Disponibles', data.counts.valid], ['Usados', data.counts.redeemed], ['Vencidos', data.counts.expired]] as const).map(([label, value]) => (
            <div key={label} className="rounded-xl bg-slate-50 border border-slate-200 py-3">
              <p className="text-xl font-bold text-slate-900">{value}</p>
              <p className="text-[11px] text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Elegir a quién darle cupón */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre, correo o código" aria-label="Buscar asistente"
            className="flex-1 min-w-[200px] rounded-lg border border-slate-300 px-3 py-2 text-xs" />
          <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} aria-label="Filtrar por grupo" className="rounded-lg border border-slate-300 px-2 py-2 text-xs">
            <option value="all">Todos los grupos</option>
            {GROUPS.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}
          </select>
          <select value={attendedFilter} onChange={(e) => setAttendedFilter(e.target.value as 'all' | 'yes' | 'no')} aria-label="Filtrar por asistencia" className="rounded-lg border border-slate-300 px-2 py-2 text-xs">
            <option value="all">Asistieron o no</option>
            <option value="yes">Ya asistieron</option>
            <option value="no">Aún no asisten</option>
          </select>
          <select value={couponFilter} onChange={(e) => setCouponFilter(e.target.value as CouponFilter)} aria-label="Filtrar por cupón" className="rounded-lg border border-slate-300 px-2 py-2 text-xs">
            <option value="all">Con o sin cupón</option>
            <option value="none">Sin cupón</option>
            <option value="given">Con cupón</option>
            <option value="valid">Disponibles</option>
            <option value="redeemed">Usados</option>
            <option value="expired">Vencidos</option>
          </select>
          <button onClick={exportCsv} disabled={!data?.total}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 hover:bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50">
            <Download className="w-4 h-4" />CSV
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
          <span className="text-xs text-slate-600"><strong>{selected.size}</strong> seleccionado(s) · {rows.length} en la lista</span>
          <div className="flex-1" />
          <button onClick={give} disabled={busy || selected.size === 0}
            className="rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 px-3 py-1.5 text-xs font-bold text-white">Dar cupón a los seleccionados</button>
          <button onClick={take} disabled={busy || selected.size === 0}
            className="rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-50 px-3 py-1.5 text-xs font-bold text-slate-700">Quitar cupón</button>
          {selected.size > 0 && <button onClick={() => setSelected(new Set())} className="text-xs font-semibold text-slate-500 hover:text-slate-800">Limpiar</button>}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="text-slate-500 border-b border-slate-200">
              <th className="py-2 pr-2 w-8">
                <input type="checkbox" checked={allVisibleSelected} onChange={toggleVisible} disabled={rows.length === 0} aria-label="Seleccionar todos los de la lista" />
              </th>
              <th className="py-2 pr-3 font-semibold">Asistente</th>
              <th className="py-2 pr-3 font-semibold">Grupo</th>
              <th className="py-2 pr-3 font-semibold">Asistió</th>
              <th className="py-2 pr-3 font-semibold">Cupón</th>
              <th className="py-2 pr-3 font-semibold">Estado</th>
              <th className="py-2 pr-3 font-semibold">Uso</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.attendee_id} className={`border-b border-slate-100 ${selected.has(r.attendee_id) ? 'bg-orange-50/60' : ''}`}>
                <td className="py-2 pr-2">
                  <input type="checkbox" checked={selected.has(r.attendee_id)} onChange={() => toggleOne(r.attendee_id)} aria-label={`Seleccionar a ${r.full_name}`} />
                </td>
                <td className="py-2 pr-3"><p className="font-semibold text-slate-900">{r.full_name}</p><p className="text-slate-500">{r.email}</p></td>
                <td className="py-2 pr-3">{groupOf(r)}</td>
                <td className="py-2 pr-3">{r.attended ? <span className="font-semibold text-green-700">Sí</span> : <span className="text-slate-400">No</span>}</td>
                <td className="py-2 pr-3 font-mono font-bold text-slate-800">{r.code ?? <span className="font-sans font-normal text-slate-400">Sin cupón</span>}</td>
                <td className="py-2 pr-3">{r.status ? <span className={`rounded-full px-2 py-0.5 font-bold ${STATUS[r.status].cls}`}>{STATUS[r.status].label}</span> : <span className="text-slate-400">—</span>}</td>
                <td className="py-2 pr-3 text-slate-600">{r.redeemed_at ? `${dateTime(r.redeemed_at)}${r.redeemed_order_ref ? ` · ${r.redeemed_order_ref}` : ''}` : '—'}</td>
              </tr>
            ))}
            {data && rows.length === 0 && (
              <tr><td colSpan={7} className="py-4 text-slate-500">{data.eligible === 0 ? 'Aún no hay inscritos vigentes.' : 'No hay asistentes con esos filtros.'}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <details className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
        <summary className="cursor-pointer font-bold text-slate-800">Cómo lo usa Gloint Place (para quien integra la tienda)</summary>
        <div className="mt-3 space-y-2">
          <p>La tienda se autentica con la API key de su app externa en el encabezado <code className="bg-white px-1 rounded">X-API-Key</code> y usa dos endpoints. El enlace del asistente llega con <code className="bg-white px-1 rounded">?cupon=CÓDIGO</code>. Solo existen los códigos de los asistentes que elijas: cualquier otro se rechaza.</p>
          <p><strong>1. Validar</strong> al ingresar el código:</p>
          <pre className="overflow-x-auto rounded-lg bg-white border border-slate-200 p-3">{`POST ${API_URL}/external-pay/coupons/validate
{ "code": "GPT-ABCD2345" }
→ { "valid": true, "percent": 20, "expires_at": "..." }
→ { "valid": false, "reason": "not_found | expired | redeemed | inactive" }`}</pre>
          <p><strong>2. Canjear</strong> al confirmar la compra (un solo uso; repetir la misma <code className="bg-white px-1 rounded">order_reference</code> es seguro):</p>
          <pre className="overflow-x-auto rounded-lg bg-white border border-slate-200 p-3">{`POST ${API_URL}/external-pay/coupons/redeem
{ "code": "GPT-ABCD2345", "order_reference": "PED-123" }
→ 200 { "redeemed": true, "already": false, "percent": 20 }
→ 409 si ya se usó o venció`}</pre>
          <p>El descuento lo calcula la tienda con el <code className="bg-white px-1 rounded">percent</code> devuelto; no se confía en un porcentaje enviado por el navegador.</p>
        </div>
      </details>
    </section>
  );
}
