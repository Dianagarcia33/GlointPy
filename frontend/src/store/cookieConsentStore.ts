import { create } from 'zustand';
import { ConsentState, readConsent, writeConsent, purgePreferenceStorage } from '../utils/cookieConsent';

interface CookieConsentStore {
  consent: ConsentState | null;
  isPreferencesOpen: boolean;
  acceptAll: () => void;
  acceptNecessary: () => void;
  save: (preferences: boolean) => void;
  openPreferences: () => void;
  closePreferences: () => void;
}

export const useCookieConsentStore = create<CookieConsentStore>((set) => {
  const decide = (preferences: boolean) => {
    if (!preferences) purgePreferenceStorage();
    set({ consent: writeConsent(preferences), isPreferencesOpen: false });
  };
  return {
    consent: readConsent(),
    isPreferencesOpen: false,
    acceptAll: () => decide(true),
    acceptNecessary: () => decide(false),
    save: (preferences) => decide(preferences),
    openPreferences: () => set({ isPreferencesOpen: true }),
    closePreferences: () => set({ isPreferencesOpen: false }),
  };
});
