import DOMPurify from 'dompurify';

// Los enlaces de un correo se abren en otra pestaña y sin acceso a esta ventana
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.getAttribute('href')) {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

/**
 * Limpia el HTML de un correo antes de insertarlo en la página. El cuerpo de los correos
 * recibidos lo escribe cualquier remitente externo: sin limpiar podría ejecutar scripts con
 * la sesión del usuario del CRM. Se quitan scripts, manejadores on*, iframes, formularios y
 * bloques <style> (que cambiarían el aspecto de toda la app); se conservan formato, enlaces,
 * imágenes y estilos en línea.
 */
export const sanitizeEmailHtml = (html: string | null | undefined): string =>
  DOMPurify.sanitize(html || '', {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'form', 'input', 'button', 'textarea', 'select', 'option'],
  });
