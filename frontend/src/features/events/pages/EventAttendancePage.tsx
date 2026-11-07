import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  AttendanceStatus,
  confirmAttendance,
  getAttendanceQrUrl,
  getAttendanceStatus,
  switchAttendanceToVirtual,
} from '../../../services/events';

function formatDate(value?: string | null): string {
  if (!value) return 'Próximamente';
  try {
    return new Date(value).toLocaleString('es-CO', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit',
    });
  } catch {
    return value;
  }
}

/**
 * Página pública a la que lleva el enlace personal del correo de confirmación de asistencia.
 * Funciona sin sesión: el token de la URL identifica al inscrito. Nada se ejecuta al abrir el enlace;
 * cada cambio requiere pulsar un botón.
 */
export function EventAttendancePage() {
  const { token = '' } = useParams();
  const [params] = useSearchParams();
  const accion = params.get('accion');
  const [data, setData] = useState<AttendanceStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmVirtual, setConfirmVirtual] = useState(accion === 'virtual');

  useEffect(() => {
    getAttendanceStatus(token)
      .then(setData)
      .catch(() => setError('Este enlace no es válido o ya no está disponible.'));
  }, [token]);

  const run = async (action: () => Promise<AttendanceStatus>) => {
    setBusy(true);
    setError(null);
    try {
      setData(await action());
      setConfirmVirtual(false);
    } catch (e: any) {
      setError(e?.message || 'No se pudo completar la acción. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  const isCancelled = data?.status === 'cancelled';
  const isVirtual = data?.attendance_mode === 'virtual';
  const isConfirmed = !!data?.attendance_confirmed_at;

  return (
    <div className="pt-24 pb-16 min-h-screen bg-slate-50 px-4">
      <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8">
        <p className="text-xs font-bold tracking-widest text-orange-600 uppercase">Gloint Power Tech</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Confirmación de asistencia</h1>

        {!data && !error && <p className="mt-6 text-slate-500">Cargando tu inscripción…</p>}
        {error && <p role="alert" className="mt-6 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">{error}</p>}

        {data && (
          <>
            <p className="mt-4 text-slate-700">
              Hola <strong>{data.full_name}</strong>, esta es tu inscripción a <strong>{data.event_title}</strong>.
            </p>
            <dl className="mt-4 text-sm grid grid-cols-[110px_1fr] gap-y-2 text-slate-600">
              <dt className="font-semibold text-slate-500">Fecha</dt><dd className="text-slate-900">{formatDate(data.event_date)}</dd>
              <dt className="font-semibold text-slate-500">Lugar</dt><dd className="text-slate-900">{data.location || 'Por confirmar'}</dd>
              <dt className="font-semibold text-slate-500">Modalidad</dt>
              <dd className="text-slate-900">{isVirtual ? 'Virtual' : 'Presencial'}</dd>
              {!isVirtual && (<><dt className="font-semibold text-slate-500">Reserva</dt>
                <dd className="text-slate-900">{data.seats_reserved} {data.seats_reserved === 1 ? 'cupo' : 'cupos'}{data.companion_name ? ` (acompañante: ${data.companion_name})` : ''}</dd></>)}
            </dl>

            {isCancelled && <p className="mt-6 rounded-lg bg-slate-100 text-slate-700 text-sm p-3">Tu inscripción está cancelada. Si crees que es un error, contacta a Gloint.</p>}

            {!isCancelled && isVirtual && (
              <p className="mt-6 rounded-lg bg-sky-50 border border-sky-200 text-sky-800 text-sm p-3">
                Tu asistencia quedó en modalidad <strong>virtual</strong>. Te enviaremos el enlace de la transmisión más adelante.
              </p>
            )}

            {!isCancelled && !isVirtual && (
              <>
                {isConfirmed ? (
                  <p className="mt-6 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm p-3">
                    ¡Asistencia presencial confirmada! Presenta este código QR en la entrada.
                  </p>
                ) : (
                  <p className="mt-6 text-sm text-slate-600">¿Nos acompañarás en persona? Si no respondes, tu inscripción se mantiene como está.</p>
                )}

                {data.attendance_mode === 'in_person' && (
                  <a href={`/rifa/${encodeURIComponent(token)}`}
                     className="mt-5 block text-center rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3">
                    Entrar a la rifa en vivo
                  </a>
                )}

                <a href={`/evento/preguntas/${encodeURIComponent(token)}`}
                   className="mt-5 block text-center rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold py-3">
                  Enviar una pregunta a los presentadores
                </a>

                <a href={`/evento/encuesta/${encodeURIComponent(token)}`}
                   className="mt-3 block text-center rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold py-3">
                  Responder la encuesta de satisfacción
                </a>

                <div className="mt-5 flex justify-center">
                  <img src={getAttendanceQrUrl(token)} alt="Código QR de acceso" width={200} height={200}
                       className="border border-slate-200 rounded-xl p-2 bg-white" />
                </div>

                {!confirmVirtual ? (
                  <div className="mt-6 flex flex-col sm:flex-row gap-3">
                    {!isConfirmed && (
                      <button disabled={busy} onClick={() => run(() => confirmAttendance(token))}
                        className="flex-1 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold py-3">
                        Confirmo mi asistencia
                      </button>
                    )}
                    <button disabled={busy} onClick={() => setConfirmVirtual(true)}
                      className="flex-1 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold py-3">
                      Cambiar a virtual
                    </button>
                  </div>
                ) : (
                  <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm text-amber-900">
                      Si cambias a virtual, liberarás tu cupo presencial{data.companion_name ? ' y el de tu acompañante' : ''}. ¿Confirmas el cambio?
                    </p>
                    <div className="mt-3 flex gap-3">
                      <button disabled={busy} onClick={() => run(() => switchAttendanceToVirtual(token))}
                        className="flex-1 rounded-lg bg-slate-900 text-white font-semibold py-2.5 disabled:opacity-60">Sí, cambiar a virtual</button>
                      <button disabled={busy} onClick={() => setConfirmVirtual(false)}
                        className="flex-1 rounded-lg border border-slate-300 text-slate-700 font-semibold py-2.5">Volver</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
