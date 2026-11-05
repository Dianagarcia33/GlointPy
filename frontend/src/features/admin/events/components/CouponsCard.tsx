import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ticket, Download } from 'lucide-react';
import { API_URL } from '../../../../services/api';
import {
  AdminCoupons,
  AdminCouponRow,
  CouponStatus,
  getAdminCoupons,
  setCouponsActive,
  updateCouponConfig,
} from '../../../../services/events';

const STATUS: Record<CouponStatus, { label: string; cls: string }> = {
  valid: { label: 'Disponible', cls: 'bg-green-100 text-green-700' },
  redeemed: { label: 'Usado', cls: 'bg-blue-100 text-blue-700' },
  expired: { label: 'Vencido', cls: 'bg-slate-200 text-slate-600' },
  inactive: { label: 'Desactivado', cls: 'bg-amber-100 text-amber-800' },
};

function dateTime(value?: string | null): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  } catch {
    return '—';
  }
}

const group = (r: AdminCouponRow) => `${r.attendee_type === 'investor' ? 'Inversionista' : 'Externo'} · ${r.attendance_mode === 'in_person' ? 'presencial' : 'virtual'}`;

/**
 * Cupones de descuento para Gloint Place: el equipo los activa durante la presentación (arranca la vigencia)
 * y ve a quién se le dio cada código y si ya lo usó. La tienda valida y canjea con su API key.
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
  const [statusFilter, setStatusFilter] = useState<'all' | CouponStatus>('all');

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

  const run = async (action: () => Promise<AdminCoupons>, success: string) => {
    setBusy(true);
    setMessage(null);
    try {
      setData(await action());
      setMessage({ type: 'success', text: success });
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'No se pudo completar la acción.' });
    } finally {
      setBusy(false);
    }
  };

  const saveConfig = () => run(() => updateCouponConfig(Number(percent), Number(hours), storeUrl.trim()), 'Configuración guardada.');

  const toggle = () => {
    if (!data) return;
    const msg = data.active
      ? '¿Desactivar los cupones? Los asistentes dejarán de verlos y la tienda los rechazará.'
      : `Se generará un cupón para cada asistente y empezará a correr la vigencia de ${data.hours} horas. ¿Activar ahora?`;
    if (!window.confirm(msg)) return;
    run(() => setCouponsActive(!data.active), data.active ? 'Cupones desactivados.' : 'Cupones activados: los asistentes ya los ven.');
  };

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.coupons ?? []).filter((r) =>
      (statusFilter === 'all' || r.status === statusFilter) &&
      (!q || r.full_name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q) || r.code.toLowerCase().includes(q)));
  }, [data, search, statusFilter]);

  const exportCsv = () => {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [['Nombre', 'Correo', 'Grupo', 'Código', 'Estado', 'Usado el', 'Compra'].join(',')];
    (data?.coupons ?? []).forEach((r) => lines.push([
      r.full_name, r.email, group(r), r.code, STATUS[r.status].label,
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

  return (
    <section className="bg-white border border-slate-200 rounded-2xl shadow-xs p-5 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Ticket className={`w-5 h-5 ${data?.live ? 'text-orange-500' : 'text-slate-400'}`} />
          <div>
            <h2 className="text-sm font-bold text-slate-900">Cupones de descuento en Gloint Place</h2>
            <p className="text-xs text-slate-500">Un código personal por asistente. Al activarlos corre la vigencia y los asistentes los ven al instante.</p>
          </div>
        </div>
        <button onClick={toggle} disabled={busy || !data}
          className={`rounded-xl px-4 py-2 text-xs font-bold text-white disabled:opacity-50 ${locked ? 'bg-slate-800 hover:bg-slate-900' : 'bg-orange-500 hover:bg-orange-600'}`}>
          {locked ? 'Desactivar cupones' : 'Activar cupones'}
        </button>
      </div>

      {message && (
        <p role="status" className={`text-xs rounded-lg p-2.5 border ${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-700'}`}>{message.text}</p>
      )}

      {data?.active && (
        <p className={`text-xs rounded-lg p-2.5 border ${data.live ? 'bg-green-50 border-green-200 text-green-800' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
          {data.live ? 'Activos' : 'La vigencia terminó'}: del {dateTime(data.starts_at)} al <strong>{dateTime(data.expires_at)}</strong>.
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          {([['Entregados', data.total], ['Disponibles', data.counts.valid], ['Usados', data.counts.redeemed], ['Vencidos', data.counts.expired]] as const).map(([label, value]) => (
            <div key={label} className="rounded-xl bg-slate-50 border border-slate-200 py-3">
              <p className="text-xl font-bold text-slate-900">{value}</p>
              <p className="text-[11px] text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre, correo o código" aria-label="Buscar cupón"
          className="flex-1 min-w-[200px] rounded-lg border border-slate-300 px-3 py-2 text-xs" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | CouponStatus)} aria-label="Filtrar por estado" className="rounded-lg border border-slate-300 px-2 py-2 text-xs">
          <option value="all">Todos los estados</option>
          <option value="valid">Disponibles</option>
          <option value="redeemed">Usados</option>
          <option value="expired">Vencidos</option>
        </select>
        <button onClick={exportCsv} disabled={!data?.total}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 hover:bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50">
          <Download className="w-4 h-4" />CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="text-slate-500 border-b border-slate-200">
              <th className="py-2 pr-3 font-semibold">A quién se le dio</th>
              <th className="py-2 pr-3 font-semibold">Grupo</th>
              <th className="py-2 pr-3 font-semibold">Código</th>
              <th className="py-2 pr-3 font-semibold">Estado</th>
              <th className="py-2 pr-3 font-semibold">Uso</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.attendee_id} className="border-b border-slate-100">
                <td className="py-2 pr-3"><p className="font-semibold text-slate-900">{r.full_name}</p><p className="text-slate-500">{r.email}</p></td>
                <td className="py-2 pr-3">{group(r)}</td>
                <td className="py-2 pr-3 font-mono font-bold text-slate-800">{r.code}</td>
                <td className="py-2 pr-3"><span className={`rounded-full px-2 py-0.5 font-bold ${STATUS[r.status].cls}`}>{STATUS[r.status].label}</span></td>
                <td className="py-2 pr-3 text-slate-600">{r.redeemed_at ? `${dateTime(r.redeemed_at)}${r.redeemed_order_ref ? ` · ${r.redeemed_order_ref}` : ''}` : '—'}</td>
              </tr>
            ))}
            {data && rows.length === 0 && (
              <tr><td colSpan={5} className="py-4 text-slate-500">{data.total === 0 ? 'Aún no se ha entregado ningún cupón: se generan al activarlos.' : 'No hay cupones con esos filtros.'}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <details className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
        <summary className="cursor-pointer font-bold text-slate-800">Cómo lo usa Gloint Place (para quien integra la tienda)</summary>
        <div className="mt-3 space-y-2">
          <p>La tienda se autentica con la API key de su app externa en el encabezado <code className="bg-white px-1 rounded">X-API-Key</code> y usa dos endpoints. El enlace del asistente llega con <code className="bg-white px-1 rounded">?cupon=CÓDIGO</code>.</p>
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
