import { useEffect, useRef } from 'react';

const CHECK_INTERVAL = 3 * 60 * 1000; // Verificar cada 3 minutos

export const useVersionChecker = () => {
  const isReloading = useRef(false);

  const forceReload = async () => {
    if (isReloading.current) return;
    isReloading.current = true;

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
          console.info(`[GLOINT VersionChecker] Nueva versión detectada (${data.version} != ${__APP_VERSION__}). Actualizando...`);
          forceReload();
        }
      }
    } catch (_) {
      // Si falla la red, no interrumpir la experiencia del usuario
    }
  };

  useEffect(() => {
    // 1. Verificación inicial
    checkVersion();

    // 2. Intervalo periódico (cada 3 minutos)
    const intervalId = setInterval(checkVersion, CHECK_INTERVAL);

    // 3. Al reanudar la pestaña o desbloquear el móvil
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkVersion();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', checkVersion);

    // 4. Captura de errores de carga de chunks desactualizados (Vite preload error)
    const handlePreloadError = () => {
      console.warn('[GLOINT VersionChecker] Error cargando chunk desactualizado. Forzando recarga...');
      forceReload();
    };
    window.addEventListener('vite:preloadError', handlePreloadError);

    // 5. Captura genérica de error por módulo dinámico faltante
    const handleWindowError = (event: ErrorEvent) => {
      const msg = event?.message || '';
      if (
        msg.includes('Failed to fetch dynamically imported module') ||
        msg.includes('Importing a module script failed') ||
        msg.includes('error loading dynamically imported module')
      ) {
        console.warn('[GLOINT VersionChecker] Error de módulo dinámico. Forzando recarga...');
        forceReload();
      }
    };
    window.addEventListener('error', handleWindowError);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', checkVersion);
      window.removeEventListener('vite:preloadError', handlePreloadError);
      window.removeEventListener('error', handleWindowError);
    };
  }, []);
};
