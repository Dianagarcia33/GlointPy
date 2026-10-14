import React from "react";

declare global {
  interface Window {
    google?: any;
  }
}

export interface GoogleUserData {
  name: string;
  email: string;
  picture?: string;
}

interface GoogleAutofillButtonProps {
  onAutofill: (user: GoogleUserData) => void;
  autofilledUser?: GoogleUserData | null;
  onClear?: () => void;
}

export function decodeGoogleJwt(token: string): any {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    console.error("Error decodificando token de Google:", err);
    return null;
  }
}

export const GoogleAutofillButton: React.FC<GoogleAutofillButtonProps> = () => {
  // Deshabilitado temporalmente a petición del usuario para evitar popups o errores 401 de Google
  return null;
};
