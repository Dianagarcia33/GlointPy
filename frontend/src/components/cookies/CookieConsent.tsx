import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, X } from 'lucide-react';
import { useCookieConsentStore } from '../../store/cookieConsentStore';

type Item = { name: string; kind: string; purpose: string; duration: string };

/** Lo que la aplicación realmente guarda en el navegador. Si se agrega algo nuevo, debe aparecer aquí. */
const NECESSARY: Item[] = [
  { name: 'access_token', kind: 'Cookie HttpOnly de GLOINT', purpose: 'Mantiene tu sesión iniciada y autenticada.', duration: 'Mientras dure tu sesión' },
  { name: 'auth-storage', kind: 'Almacenamiento local', purpose: 'Datos de tu sesión para mostrar la interfaz y tus permisos.', duration: 'Hasta que cierres sesión' },
  { name: 'gloint_last_activity_time', kind: 'Almacenamiento local', purpose: 'Cierra tu sesión tras 5 minutos de inactividad, por seguridad.', duration: 'Mientras dure tu sesión' },
  { name: 'gloint_fcm_token', kind: 'Almacenamiento local', purpose: 'Identifica tu navegador para enviarte notificaciones. Solo se crea si aceptas el permiso de notificaciones del navegador.', duration: 'Hasta que las desactives' },
  { name: 'gloint_eval_pin', kind: 'Almacenamiento local', purpose: 'Guarda el PIN de acceso de quienes presentan la evaluación técnica.', duration: 'Hasta terminar la evaluación' },
  { name: 'gloint_event_countdown_dismissed, gloint_open_rsvp', kind: 'Almacenamiento de sesión', purpose: 'Recuerdan que cerraste el aviso del evento durante tu visita.', duration: 'Hasta cerrar la pestaña' },
];

const PREFERENCES: Item[] = [
  { name: 'gloint_active_chat_room_id', kind: 'Almacenamiento local', purpose: 'Reabre la última sala de chat que tenías abierta.', duration: 'Hasta que lo borres o retires el permiso' },
];

const THIRD_PARTIES = [
  { name: 'Google Fonts', purpose: 'Carga las tipografías del sitio. Google recibe tu dirección IP al cargarlas; no usamos ninguna cookie suya.' },
  { name: 'Firebase (Google)', purpose: 'Entrega de notificaciones push. Solo se activa si aceptas el permiso de notificaciones del navegador.' },
];

const GOLD_BUTTON = 'linear-gradient(135deg, #F3D27A, #D4A537 55%, #B8861B)';

const ItemList: React.FC<{ items: Item[] }> = ({ items }) => (
  <ul className="mt-3 space-y-2.5">
    {items.map((it) => (
      <li key={it.name} className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
        <p className="font-mono text-[12px] font-semibold text-slate-900 break-all">{it.name}</p>
        <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {it.kind} · {it.duration}
        </p>
        <p className="mt-1 text-[13px] leading-snug text-slate-600">{it.purpose}</p>
      </li>
    ))}
  </ul>
);

const PreferencesDialog: React.FC = () => {
  const { consent, isPreferencesOpen, acceptAll, acceptNecessary, save, closePreferences } = useCookieConsentStore();
  const [prefs, setPrefs] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  // Al abrir: parte de la decisión vigente, guarda el elemento que tenía el foco y bloquea el scroll del fondo
  useEffect(() => {
    if (!isPreferencesOpen) return;
    setPrefs(consent?.preferences ?? false);
    openerRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      openerRef.current?.focus?.();
    };
  }, [isPreferencesOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isPreferencesOpen) return null;

  // Esc cierra; Tab no sale del diálogo
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      closePreferences();
      return;
    }
    if (e.key !== 'Tab' || !dialogRef.current) return;
    const focusables = dialogRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-slate-900/60 p-0 sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) closePreferences(); }}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-dialog-title"
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl outline-none"
      >
        <div className="flex items-start justify-between gap-4 px-5 py-4 sm:px-7" style={{ background: '#0d1526' }}>
          <div>
            <h2 id="cookie-dialog-title" className="text-lg font-bold text-white font-montserrat">Preferencias de cookies</h2>
            <p className="mt-0.5 text-xs text-slate-300">Elige qué podemos guardar en tu navegador. Puedes cambiarlo cuando quieras.</p>
          </div>
          <button type="button" onClick={closePreferences} aria-label="Cerrar preferencias de cookies" className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-7">
          <section aria-labelledby="cookie-necessary">
            <div className="flex items-center justify-between gap-3">
              <h3 id="cookie-necessary" className="text-sm font-bold text-slate-900">Necesarias</h3>
              <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[11px] font-semibold text-white">Siempre activas</span>
            </div>
            <p className="mt-1 text-[13px] text-slate-600">Hacen funcionar tu sesión y la mantienen segura. Sin ellas el sitio no puede operar, por eso no se pueden desactivar.</p>
            <ItemList items={NECESSARY} />
          </section>

          <section aria-labelledby="cookie-preferences">
            <div className="flex items-center justify-between gap-3">
              <h3 id="cookie-preferences" className="text-sm font-bold text-slate-900">Preferencias</h3>
              <button
                type="button"
                role="switch"
                aria-checked={prefs}
                aria-labelledby="cookie-preferences"
                onClick={() => setPrefs((p) => !p)}
                className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a6516]"
                style={{ background: prefs ? '#B8861B' : '#cbd5e1' }}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${prefs ? 'translate-x-5' : 'translate-x-0.5'}`} />
                <span className="sr-only">{prefs ? 'Activadas' : 'Desactivadas'}</span>
              </button>
            </div>
            <p className="mt-1 text-[13px] text-slate-600">Recuerdan opciones tuyas para que no tengas que repetirlas. Son opcionales: la plataforma funciona igual sin ellas.</p>
            <ItemList items={PREFERENCES} />
          </section>

          <section aria-labelledby="cookie-third">
            <h3 id="cookie-third" className="text-sm font-bold text-slate-900">Servicios de terceros</h3>
            <p className="mt-1 text-[13px] text-slate-600">No usamos cookies de publicidad ni de analítica. Estos servicios participan al cargar el sitio:</p>
            <ul className="mt-3 space-y-2.5">
              {THIRD_PARTIES.map((t) => (
                <li key={t.name} className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                  <p className="text-[13px] font-semibold text-slate-900">{t.name}</p>
                  <p className="mt-1 text-[13px] leading-snug text-slate-600">{t.purpose}</p>
                </li>
              ))}
            </ul>
          </section>

          <p className="text-xs text-slate-500">
            Más información en nuestra{' '}
            <Link to="/privacidad" onClick={closePreferences} className="font-semibold underline underline-offset-2" style={{ color: '#7a5a12' }}>Política de Privacidad</Link>.
          </p>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
          <button type="button" onClick={acceptNecessary} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-800 hover:border-slate-900">
            Solo necesarias
          </button>
          <button type="button" onClick={acceptAll} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-800 hover:border-slate-900">
            Aceptar todas
          </button>
          <button type="button" onClick={() => save(prefs)} className="rounded-xl px-4 py-2.5 text-sm font-bold" style={{ background: GOLD_BUTTON, color: '#140e02' }}>
            Guardar preferencias
          </button>
        </div>
      </div>
    </div>
  );
};

/** Aviso de cookies (hasta que la persona decide) y ventana de preferencias (también reabrible desde el pie). */
export const CookieConsent: React.FC = () => {
  const { consent, isPreferencesOpen, acceptAll, acceptNecessary, openPreferences } = useCookieConsentStore();
  const showBanner = !consent && !isPreferencesOpen;

  return (
    <>
      {showBanner && (
        <section
          role="region"
          aria-label="Aviso de cookies"
          className="fixed bottom-3 left-3 right-3 z-[70] rounded-2xl p-4 shadow-2xl sm:bottom-5 sm:left-5 sm:right-auto sm:max-w-md sm:p-5"
          style={{ background: '#0d1526', border: '1px solid rgba(212,165,55,0.4)' }}
        >
          <div className="flex items-start gap-3">
            <Cookie className="mt-0.5 h-5 w-5 shrink-0" style={{ color: '#D4A537' }} aria-hidden="true" />
            <div>
              <h2 className="text-sm font-bold text-white font-montserrat">Usamos cookies y almacenamiento local</h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-slate-300">
                Usamos lo estrictamente necesario para que tu sesión funcione y sea segura. Con tu permiso, también recordamos preferencias como tu última sala de chat. No usamos cookies de publicidad ni de analítica.{' '}
                <Link to="/privacidad" className="font-semibold underline underline-offset-2" style={{ color: '#F3D27A' }}>Más información</Link>.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <button type="button" onClick={acceptAll} className="rounded-xl px-4 py-2.5 text-sm font-bold" style={{ background: GOLD_BUTTON, color: '#140e02' }}>
              Aceptar todas
            </button>
            <button type="button" onClick={acceptNecessary} className="rounded-xl border px-4 py-2.5 text-sm font-bold text-white hover:bg-white/10" style={{ borderColor: 'rgba(245,243,238,0.5)' }}>
              Solo necesarias
            </button>
            <button type="button" onClick={openPreferences} className="rounded-xl px-3 py-2.5 text-sm font-semibold underline underline-offset-2" style={{ color: '#F3D27A' }}>
              Personalizar
            </button>
          </div>
        </section>
      )}
      <PreferencesDialog />
    </>
  );
};
