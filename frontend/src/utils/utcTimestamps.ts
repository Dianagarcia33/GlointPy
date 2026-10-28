// El backend guarda las marcas de tiempo en UTC (datetime.utcnow) y las serializa sin zona
// ('2026-09-24T21:50:33'). El navegador las leía como hora local y en Colombia salían 5 horas
// adelantadas, a veces con el día siguiente (H-152). Aquí se les añade la 'Z' para que
// new Date() las interprete como UTC y las muestre en la hora local del usuario.
//
// Solo se tocan los campos que son marcas de tiempo (created_at, updated_at, *_at, fecha de
// aprobación/procesamiento, statement_date...). Las fechas de negocio (start_date, end_date,
// fecha_ingreso, fecha_nacimiento...) representan días o la hora local elegida por el usuario
// y se dejan como llegan.
const UTC_TIMESTAMP_KEY = /(_at|^statement_date|^fecha_aprobacion|^fecha_procesamiento|^timestamp)$/;
const NAIVE_ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;

export function markUtcTimestamps<T>(value: T): T {
  if (Array.isArray(value)) {
    value.forEach(markUtcTimestamps);
  } else if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    for (const key of Object.keys(obj)) {
      const v = obj[key];
      if (typeof v === 'string') {
        if (UTC_TIMESTAMP_KEY.test(key) && NAIVE_ISO_DATETIME.test(v)) obj[key] = `${v}Z`;
      } else if (v && typeof v === 'object') {
        markUtcTimestamps(v);
      }
    }
  }
  return value;
}
