// Tipos de comprobante aceptados (H-190): imágenes PNG/JPG/WEBP o PDF. El backend vuelve a validarlos.
export const RECEIPT_ACCEPT = 'image/png,image/jpeg,image/webp,application/pdf,.png,.jpg,.jpeg,.webp,.pdf';
export const RECEIPT_FORMATS_LABEL = 'imágenes PNG, JPG, WEBP o PDF';

const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.pdf'];
const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];

export const isAllowedReceiptFile = (file: File): boolean => {
  const name = file.name.toLowerCase();
  const extOk = ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
  // Algunos navegadores no informan el tipo: si viene vacío se confía en la extensión
  const mimeOk = !file.type || ALLOWED_MIME.includes(file.type);
  return extOk && mimeOk;
};
