import { useEffect, useRef } from 'react';

const CHECK_INTERVAL = 3 * 60 * 1000; // Verificar cada 3 minutos
const RELOAD_GUARD_KEY = 'gloint_version_reloaded_target';

export const useVersionChecker = () => {
  const isReloading = useRef(false);

  const forceReload = async (targetVersion: string) => {
    if (isReloading.current) return;
    isReloading.current = true;

    try {
      sessionStorage.setItem(RELOAD_GUARD_KEY, targetVersion);
    } catch (_) {}

    if ('caches' in window) {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch (_) {}
    }

    // Recargar limpiamente la página para obtener la última versión
    window.location.reload();
  };

  const checkVersion = async () => {
    // En entorno de desarrollo (npm run dev) NUNCA se debe forzar recarga automática
    if (import.meta.env.DEV) return;
    if (isReloading.current) return;

    try {
      const response = await fetch(`/version.json?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });

      if (!response.ok) return;

      const data = await response.json();
      if (data?.version && typeof __APP_VERSION__ !== 'undefined') {
        if (data.version !== __APP_VERSION__) {
          // Prevenir bucle infinito de recargas si ya se recargó para esta versión
          const alreadyAttempted = sessionStorage.getItem(RELOAD_GUARD_KEY);
          if (alreadyAttempted === data.version) {
            console.warn(`[GLOINT VersionChecker] Ya se recargó para la versión ${data.version}. Evitando bucle de recarga.`);
            return;
          }

          console.info(`[GLOINT VersionChecker] Nueva versión detectada (${data.version} != ${__APP_VERSION__}). Actualizando...`);
          forceReload(data.version);
        } else {
          sessionStorage.removeItem(RELOAD_GUARD_KEY);
        }
      }
    } catch (_) {
      // Si falla la red, no interrumpir la experiencia del usuario
    }
  };

  useEffect(() => {
    if (import.meta.env.DEV) return;

    // 1. Verificación inicial
    checkVersion();

    // 2. Intervalo periódico (cada 5 minutos)
    const intervalId = setInterval(checkVersion, CHECK_INTERVAL);

    // 3. Captura de errores de carga de chunks desactualizados (Vite preload error)
    const handlePreloadError = () => {
      console.warn('[GLOINT VersionChecker] Error cargando chunk desactualizado. Forzando recarga...');
      forceReload('preload_error');
    };
    window.addEventListener('vite:preloadError', handlePreloadError);

    // 4. Captura genérica de error por módulo dinámico faltante
    const handleWindowError = (event: ErrorEvent) => {
      const msg = event?.message || '';
      if (
        msg.includes('Failed to fetch dynamically imported module') ||
        msg.includes('Importing a module script failed') ||
        msg.includes('error loading dynamically imported module')
      ) {
        console.warn('[GLOINT VersionChecker] Error de módulo dinámico. Forzando recarga...');
        forceReload('module_error');
      }
    };
    window.addEventListener('error', handleWindowError);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('vite:preloadError', handlePreloadError);
      window.removeEventListener('error', handleWindowError);
    };
  }, []);
};
