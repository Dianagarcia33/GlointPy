import React, { useEffect, useRef, useState } from 'react';
import { Bold, Italic, Underline, ListOrdered, Quote, Link2, Eraser, ImagePlus, Loader2 } from 'lucide-react';
import { sanitizeEmailHtml } from '../../../utils/sanitizeHtml';

interface EmailRichEditorProps {
  /** HTML del contenido. Si llega texto plano, los saltos de línea se convierten en <br/>. */
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeightClass?: string;
  ariaLabel?: string;
  /** Si se define, aparece el botón de imagen: sube el archivo y devuelve su URL pública. */
  onUploadImage?: (file: File) => Promise<string>;
  /** Mensaje de error al fallar la subida de una imagen. */
  onImageError?: (message: string) => void;
}

const toHtml = (value: string) =>
  /<[a-z][\s\S]*>/i.test(value) ? value : value.replace(/\n/g, '<br/>');

/** Indica si un HTML no tiene texto ni imágenes visibles. */
export const isHtmlEmpty = (html: string) =>
  !/<img\b/i.test(html) && html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() === '';

/**
 * Editor de texto enriquecido: el usuario ve el mensaje ya formateado (negrita, listas, enlaces)
 * y nunca las etiquetas HTML. Lo que se escribe se entrega como HTML saneado.
 */
export const EmailRichEditor: React.FC<EmailRichEditorProps> = ({
  value,
  onChange,
  placeholder = 'Escribe aquí...',
  minHeightClass = 'min-h-[11rem]',
  ariaLabel = 'Editor de mensaje',
  onUploadImage,
  onImageError,
}) => {
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef<string | null>(null);

  // Sincroniza el DOM solo cuando el valor cambia desde fuera (plantilla, reenvío, limpiar)
  useEffect(() => {
    const el = ref.current;
    if (!el || value === lastEmitted.current) return;
    el.innerHTML = sanitizeEmailHtml(toHtml(value));
    lastEmitted.current = value;
  }, [value]);

  const emit = () => {
    const el = ref.current;
    if (!el) return;
    const html = isHtmlEmpty(el.innerHTML) ? '' : el.innerHTML;
    lastEmitted.current = html;
    onChange(html);
  };

  const exec = (command: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    emit();
  };

  const addLink = () => {
    const url = window.prompt('Dirección del enlace (https://...)', 'https://');
    if (!url || !/^(https?:\/\/|mailto:|tel:)/i.test(url.trim())) return;
    exec('createLink', url.trim());
  };

  const insertImage = async (file: File) => {
    if (!onUploadImage) return;
    if (!/^image\/(png|jpe?g|gif)$/i.test(file.type)) {
      onImageError?.('Usa una imagen PNG, JPG o GIF.');
      return;
    }
    setUploading(true);
    try {
      const url = await onUploadImage(file);
      ref.current?.focus();
      document.execCommand(
        'insertHTML',
        false,
        `<img src="${url}" alt="" style="max-width:260px;height:auto;" />`
      );
      emit();
    } catch (err: any) {
      onImageError?.(err?.message || 'No se pudo subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  const btn = 'p-1 hover:bg-slate-200 rounded text-xs';
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1 p-1 bg-slate-50 border border-slate-200 rounded-xl text-slate-600">
        {/* onMouseDown evita que el botón le quite la selección al editor */}
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('bold')} className={btn} title="Negrita"><Bold className="w-3.5 h-3.5" /></button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('italic')} className={btn} title="Cursiva"><Italic className="w-3.5 h-3.5" /></button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('underline')} className={btn} title="Subrayado"><Underline className="w-3.5 h-3.5" /></button>
        <div className="w-px h-3.5 bg-slate-200 mx-1" />
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('insertUnorderedList')} className={btn} title="Lista con viñetas"><ListOrdered className="w-3.5 h-3.5" /></button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('formatBlock', 'blockquote')} className={btn} title="Cita"><Quote className="w-3.5 h-3.5" /></button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={addLink} className={btn} title="Insertar enlace"><Link2 className="w-3.5 h-3.5" /></button>
        {onUploadImage && (
          <>
            <button type="button" disabled={uploading} onMouseDown={(e) => e.preventDefault()} onClick={() => fileInput.current?.click()} className={btn} title="Insertar imagen">
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/gif"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) void insertImage(f);
              }}
            />
          </>
        )}
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('removeFormat')} className={btn} title="Quitar formato"><Eraser className="w-3.5 h-3.5" /></button>
      </div>
      <div
        ref={ref}
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel}
        data-placeholder={placeholder}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
        onPaste={(e) => {
          // Pega solo texto para no arrastrar estilos ni etiquetas de otras páginas
          e.preventDefault();
          const img = Array.from(e.clipboardData.files || []).find((f) => f.type.startsWith('image/'));
          if (img && onUploadImage) {
            void insertImage(img);
            return;
          }
          document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
        }}
        className={`email-rich-editor w-full ${minHeightClass} max-h-72 overflow-y-auto bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-900 leading-relaxed focus:outline-none focus:border-brand-500`}
      />
      <style>{`.email-rich-editor:empty:before{content:attr(data-placeholder);color:#94a3b8;pointer-events:none}.email-rich-editor ul{list-style:disc;padding-left:1.25rem}.email-rich-editor blockquote{border-left:3px solid #A06A10;padding-left:10px;margin:8px 0;color:#475569}.email-rich-editor img{max-width:100%;height:auto}.email-rich-editor a{color:#A06A10;text-decoration:underline}`}</style>
    </div>
  );
};
