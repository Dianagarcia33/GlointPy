import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, ShieldCheck } from 'lucide-react';

/**
 * Modal bloqueante mientras la verificación de identidad (SARLAFT) está en curso.
 * No tiene botón de cierre, no cierra con Escape ni al hacer clic fuera, y cubre toda la
 * pantalla (navbar y menú incluidos). Se quita solo cuando el estado deja de ser pendiente
 * (useSarlaftStatus consulta cada 5 s), así que quien lo monta solo debe renderizarlo
 * mientras `isPending` sea verdadero.
 */
export const SarlaftPendingModal: React.FC = () => {
    // Congelar el scroll de la página de fondo mientras el modal esté visible
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, []);

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-300"
            // Se traga cualquier clic/tecla para que nada del fondo reaccione
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
        >
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="sarlaft-pending-title"
                aria-describedby="sarlaft-pending-desc"
                className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-amber-200 p-6 sm:p-8 text-center"
            >
                <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600">
                    <ShieldCheck className="w-8 h-8" />
                </div>

                <span className="inline-block px-2.5 py-0.5 mb-3 bg-amber-500/20 text-amber-900 text-[10px] font-extrabold uppercase rounded-full border border-amber-500/30">
                    En verificación
                </span>

                <h2 id="sarlaft-pending-title" className="text-lg sm:text-xl font-extrabold text-slate-900 font-montserrat">
                    Estamos validando tu identidad
                </h2>

                <p id="sarlaft-pending-desc" className="mt-3 text-sm text-slate-600 leading-relaxed">
                    Por normativa (SARLAFT) verificamos tus antecedentes antes de habilitar tu cuenta.{' '}
                    <strong className="text-slate-900">
                        Tu inversión no puede ser creada hasta que este proceso termine.
                    </strong>
                </p>

                <p className="mt-3 text-xs text-slate-500 leading-relaxed">
                    Suele tardar pocos minutos. Mantén esta pantalla abierta: se desbloqueará sola cuando finalice
                    la validación. También te avisaremos por correo.
                </p>

                <div className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-amber-800 bg-amber-100/80 px-4 py-2 rounded-xl border border-amber-200" role="status">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-700" />
                    Consultando antecedentes...
                </div>
            </div>
        </div>,
        document.body
    );
};
