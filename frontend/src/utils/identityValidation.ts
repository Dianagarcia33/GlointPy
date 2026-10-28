// Validación de datos de identidad del perfil (H-198). El backend aplica las mismas reglas.

/** Devuelve un mensaje de error, o null si el documento es válido (solo números, 5 a 15 dígitos). */
export const validateDocumentId = (value: string): string | null => {
  const clean = value.trim().replace(/[\s.\-]/g, '');
  return /^\d{5,15}$/.test(clean) ? null : 'El documento de identidad debe contener solo números (entre 5 y 15 dígitos).';
};

/** Celular colombiano de 10 dígitos que empieza por 3, o número internacional con prefijo +. */
export const validatePhoneNumber = (value: string): string | null => {
  const raw = value.trim().replace(/[\s\-().]/g, '');
  let local = raw;
  if (local.startsWith('+57')) local = local.slice(3);
  else if (/^57\d{10}$/.test(local)) local = local.slice(2);
  if (/^3\d{9}$/.test(local) || /^\+[1-9]\d{7,14}$/.test(raw)) return null;
  return 'El teléfono debe ser un celular colombiano de 10 dígitos que empiece por 3 (ej. 3001234567) o un número internacional con el prefijo +.';
};

/** La fecha de nacimiento (AAAA-MM-DD) debe ser anterior a hoy (hora de Colombia) y razonable. */
export const validateBirthDate = (value: string, todayColombia: string): string | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Indica una fecha de nacimiento válida.';
  if (value >= todayColombia) return 'La fecha de nacimiento debe ser anterior a hoy.';
  const minYear = Number(todayColombia.slice(0, 4)) - 110;
  if (Number(value.slice(0, 4)) < minYear) return 'Por favor verifica la fecha de nacimiento ingresada.';
  return null;
};
