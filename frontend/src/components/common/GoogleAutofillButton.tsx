import React, { useEffect, useState, useRef } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

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

export const GoogleAutofillButton: React.FC<GoogleAutofillButtonProps> = ({
  onAutofill,
  autofilledUser,
  onClear,
}) => {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [showHelperModal, setShowHelperModal] = useState(false);
  const googleBtnContainerRef = useRef<HTMLDivElement>(null);

  const clientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim();

  // Cargar SDK de Google Identity Services de forma dinámica
  useEffect(() => {
    if (window.google?.accounts?.id) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => console.warn("No se pudo cargar Google Identity Services");
    document.head.appendChild(script);
  }, []);

  // Inicializar Google Identity Services cuando el script y el client ID estén disponibles
  useEffect(() => {
    if (!scriptLoaded || !clientId || !window.google?.accounts?.id) return;

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: any) => {
          if (response?.credential) {
            const decoded = decodeGoogleJwt(response.credential);
            if (decoded?.email) {
              onAutofill({
                name: decoded.name || `${decoded.given_name || ""} ${decoded.family_name || ""}`.trim(),
                email: decoded.email,
                picture: decoded.picture,
              });
            }
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      // Renderizar botón oficial oculto si se desea disparar el prompt
      if (googleBtnContainerRef.current) {
        window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
          theme: "outline",
          size: "large",
          type: "standard",
          shape: "rectangular",
          text: "continue_with",
          width: "100%",
        });
      }

      // Activar Google One-Tap flotante
      window.google.accounts.id.prompt();
    } catch (err) {
      console.warn("Error al inicializar Google One-Tap:", err);
    }
  }, [scriptLoaded, clientId, onAutofill]);

  const handleButtonClick = () => {
    if (clientId && window.google?.accounts?.id) {
      // Intentar abrir el selector de Google One-Tap
      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // Si One-Tap no se muestra, clicar el botón renderizado
          const btn = googleBtnContainerRef.current?.querySelector("div[role=button]") as HTMLElement;
          if (btn) btn.click();
        }
      });
    } else {
      // Si aún no han configurado el Client ID en .env, mostrar modal informativo y opción de prueba
      setShowHelperModal(true);
    }
  };

  const handleSimulateFill = () => {
    onAutofill({
      name: "Juan Rodríguez",
      email: "juan.rodriguez@gmail.com",
    });
    setShowHelperModal(false);
  };

  return (
    <div className="space-y-2">
      {/* Contenedor del botón oficial de Google para cuando haya Client ID */}
      <div ref={googleBtnContainerRef} className="hidden" />

      {autofilledUser ? (
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold">Datos autocompletados desde Google</p>
              <p className="text-[11px] text-emerald-700">
                {autofilledUser.name} &bull; {autofilledUser.email}
              </p>
            </div>
          </div>
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              className="text-emerald-600 hover:text-emerald-900 p-1 cursor-pointer"
              title="Borrar autocompletado"
            >
              <X size={14} />
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={handleButtonClick}
          className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs border border-slate-300 hover:border-amber-400 rounded-xl shadow-xs transition-all cursor-pointer group"
        >
          {/* Logo oficial de Google en SVG */}
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span className="group-hover:text-amber-600 transition-colors">
            Autocompletar con cuenta de Google
          </span>
        </button>
      )}

      {/* Modal / Notificación explicativa si falta VITE_GOOGLE_CLIENT_ID */}
      {showHelperModal && (
        <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2 animate-in fade-in">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-1.5 font-bold">
              <Info size={15} className="text-amber-600 shrink-0" />
              <span>Configuración de Google OAuth</span>
            </div>
            <button
              type="button"
              onClick={() => setShowHelperModal(false)}
              className="text-amber-700 hover:text-amber-950 p-0.5 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            Para que este botón abra la ventana oficial de Google, se requiere configurar tu{" "}
            <code className="bg-amber-100 px-1 py-0.5 rounded text-[10px] font-mono">
              VITE_GOOGLE_CLIENT_ID
            </code>{" "}
            en <code className="bg-amber-100 px-1 py-0.5 rounded text-[10px] font-mono">frontend/.env</code>.
          </p>
          <p className="text-[11px] text-amber-800">
            <strong>Tip:</strong> El <em>autocompletado nativo de Chrome</em> ya está activo: al tocar los campos Nombre y Correo, el navegador te sugerirá tus datos de Google.
          </p>
          <div className="pt-1 flex items-center justify-between gap-2 border-t border-amber-200/60">
            <button
              type="button"
              onClick={handleSimulateFill}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
            >
              Simular autocompletado de prueba
            </button>
            <button
              type="button"
              onClick={() => setShowHelperModal(false)}
              className="text-[11px] text-amber-700 hover:underline cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
