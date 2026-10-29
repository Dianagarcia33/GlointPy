/**
 * Consentimiento de cookies y almacenamiento local.
 *
 * - Necesario (siempre activo): sesión y seguridad. No requiere consentimiento.
 * - Preferencias (opcional): recordar la última sala de chat. Solo se guarda si la persona lo acepta.
 *
 * La decisión se guarda en el navegador, caduca a los 12 meses y se vuelve a pedir si cambian las categorías
 * (CONSENT_VERSION).
 */
export const CONSENT_KEY = 'gloint_cookie_consent';
export const CONSENT_VERSION = 1;
const MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

/** Claves de almacenamiento local que dependen del consentimiento de preferencias. */
export const PREFERENCE_KEYS = ['gloint_active_chat_room_id'];

export interface ConsentState {
  version: number;
  preferences: boolean;
  decidedAt: string;
}

export const readConsent = (): ConsentState | null => {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentState;
    if (parsed.version !== CONSENT_VERSION) return null;
    const age = Date.now() - new Date(parsed.decidedAt).getTime();
    if (!Number.isFinite(age) || age < 0 || age > MAX_AGE_MS) return null;
    return { version: parsed.version, preferences: Boolean(parsed.preferences), decidedAt: parsed.decidedAt };
  } catch {
    return null;
  }
};

export const writeConsent = (preferences: boolean): ConsentState => {
  const state: ConsentState = { version: CONSENT_VERSION, preferences, decidedAt: new Date().toISOString() };
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(state));
  } catch {
    /* sin almacenamiento disponible: la decisión vale solo para esta visita */
  }
  return state;
};

export const hasPreferencesConsent = (): boolean => readConsent()?.preferences === true;

/** Borra lo que se guardó con el consentimiento de preferencias (al rechazarlo o retirarlo). */
export const purgePreferenceStorage = () => {
  try {
    PREFERENCE_KEYS.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* nada que borrar */
  }
};

/** Almacenamiento de preferencias: solo guarda si hay consentimiento; leer y borrar siempre son seguros. */
export const preferenceStorage = {
  getItem: (key: string): string | null => {
    try {
      return hasPreferencesConsent() ? localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      if (hasPreferencesConsent()) localStorage.setItem(key, value);
    } catch {
      /* sin almacenamiento disponible */
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch {
      /* nada que borrar */
    }
  },
};
