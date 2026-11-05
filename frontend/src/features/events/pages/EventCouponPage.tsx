import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MyCoupon, getCouponQrUrl, getMyCoupon } from '../../../services/events';

function remaining(expiresAt?: string | null): string {
  if (!expiresAt) return '';
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'Venció';
  const totalMin = Math.floor(ms / 60000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const minutes = totalMin % 60;
  return [days ? `${days} d` : '', hours || days ? `${hours} h` : '', `${minutes} min`].filter(Boolean).join(' ');
}

function formatDate(value?: string | null): string {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' });
  } catch {
    return value;
  }
}

/**
 * Cupón personal del asistente para comprar en Gloint Place. Se llega con el enlace personal (sin sesión) o desde
 * el aviso de la sala en vivo / el dashboard. El código aparece cuando el equipo activa los cupones, y la página
 * se actualiza sola (cada 15 s) para reflejar activación, vencimiento o uso.
 */
export function EventCouponPage() {
  const { token = '' } = useParams();
  const [data, setData] = useState<MyCoupon | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [, setTick] = useState(0);

  const load = useCallback(async () => {
    try {
      setData(await getMyCoupon(token));
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Este enlace no es válido o ya no está disponible.');
    }
  }, [token]);

  useEffect(() => {
    load();
    const poll = setInterval(load, 15000);
    const clock = setInterval(() => setTick((t) => t + 1), 30000); // refresca el «vence en…»
    return () => { clearInterval(poll); clearInterval(clock); };
  }, [load]);

  const copy = async () => {
    if (!data?.code) return;
    try {
      await navigator.clipboard.writeText(data.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // sin permiso de portapapeles: la persona puede seleccionar el código a mano
    }
  };

  const usable = data?.status === 'valid' && !!data.code;

  return (
    <div className="pt-24 pb-16 min-h-screen bg-slate-50 px-4">
      <div className="max-w-xl mx-auto">
        <p className="text-xs font-bold tracking-widest text-orange-600 uppercase">Gloint Power Tech</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Tu cupón de descuento</h1>

        {!data && !error && <p className="mt-6 text-slate-500">Cargando…</p>}
        {error && <p role="alert" className="mt-6 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">{error}</p>}

        {data && data.status === 'inactive' && (
          <div className="mt-6 bg-white border border-slate-200 rounded-2xl p-6 text-center">
            <p className="text-slate-900 font-semibold">Hola {data.full_name}, tu cupón aún no está disponible.</p>
            <p className="mt-2 text-sm text-slate-600">
              Durante la presentación te avisaremos cuando se habilite el <strong>{data.percent} % de descuento</strong> en Gloint Place.
              Deja esta página abierta: se actualiza sola.
            </p>
          </div>
        )}

        {data && data.status !== 'inactive' && (
          <div className="mt-6 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
            <p className="text-slate-700">Hola <strong>{data.full_name}</strong>, este es tu cupón personal para comprar en Gloint Place.</p>

            <div className={`mt-5 rounded-2xl border-2 border-dashed p-5 text-center ${usable ? 'border-orange-400 bg-orange-50' : 'border-slate-300 bg-slate-50'}`}>
              <p className="text-3xl font-extrabold text-slate-900">{data.percent} % de descuento</p>
              <p className={`mt-3 font-mono text-2xl tracking-widest font-bold ${usable ? 'text-orange-600' : 'text-slate-400 line-through'}`} data-testid="coupon-code">{data.code}</p>
              {usable && (
                <button onClick={copy} className="mt-3 rounded-lg border border-orange-300 bg-white hover:bg-orange-100 text-orange-700 text-sm font-semibold px-4 py-2">
                  {copied ? '¡Copiado!' : 'Copiar código'}
                </button>
              )}
            </div>

            {data.status === 'valid' && (
              <p className="mt-4 text-sm text-slate-600 text-center">
                Vence en <strong>{remaining(data.expires_at)}</strong> ({formatDate(data.expires_at)}). Se puede usar una sola vez.
              </p>
            )}
            {data.status === 'expired' && (
              <p role="status" className="mt-4 rounded-lg bg-slate-100 text-slate-700 text-sm p-3 text-center">Este cupón venció el {formatDate(data.expires_at)}.</p>
            )}
            {data.status === 'redeemed' && (
              <p role="status" className="mt-4 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm p-3 text-center">Ya usaste este cupón en una compra. ¡Gracias!</p>
            )}

            {usable && data.store_link && (
              <>
                <a href={data.store_link} target="_blank" rel="noopener noreferrer"
                  className="mt-5 block text-center rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3">
                  Ir a Gloint Place con mi cupón
                </a>
                <div className="mt-5 flex flex-col items-center">
                  <img src={getCouponQrUrl(token)} alt="Código QR que abre Gloint Place con tu cupón" width={180} height={180}
                    className="border border-slate-200 rounded-xl p-2 bg-white" />
                  <p className="mt-2 text-xs text-slate-500">También puedes escanear este QR desde tu celular.</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
