import React, { useState, useEffect } from 'react';
import { X, PlayCircle, ArrowRight, Info } from 'lucide-react';

export const PromoModal: React.FC = () => {
  const [showPromoModal, setShowPromoModal] = useState(true);

  useEffect(() => {
    // Para pruebas, puedes comentar la verificación de 'promoModalShown'
    const modalShown = sessionStorage.getItem('promoModalShown');
    if (!modalShown) {
      const timer = setTimeout(() => {
        setShowPromoModal(true);
        sessionStorage.setItem('promoModalShown', 'true');
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setShowPromoModal(false);
    }
  }, []);

  if (!showPromoModal) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-hidden">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn cursor-pointer"
        onClick={() => setShowPromoModal(false)}
      />

      {/* Modal Content */}
      <div className="relative bg-white/95 backdrop-blur-xl rounded-2xl p-6 max-w-md w-full mx-auto shadow-2xl border border-brand-200/50 animate-fadeInScale max-h-[90vh] overflow-y-auto">

        {/* Botón de cierre */}
        <button
          onClick={() => setShowPromoModal(false)}
          className="absolute top-3 right-3 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-all duration-300 z-20"
        >
          <X className="w-4 h-4 text-gray-600" />
        </button>

        <div className="text-center relative z-10 w-full pt-2">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2 px-2">
            <span className="bg-gradient-to-r from-brand-500 to-brand-600 bg-clip-text text-transparent">
              ¡Atención Inversionistas!
            </span>
          </h2>

          <div className="w-12 h-0.5 bg-gradient-to-r from-brand-400 to-brand-600 mx-auto rounded-full mb-4"></div>

          <div className="text-left mb-5 px-2">
            <p className="text-sm text-gray-700 leading-relaxed mb-4">
              <span className="text-brand-600 font-bold">Ya puedes descargar la APP de GLOINT</span> y gestionar tus solicitudes, pagos y capital en tiempo real.
            </p>

            {/* Botón de descarga de APP */}
            <div className="mb-4">
              <a
                href="https://play.google.com/store/apps/details?id=com.dianadev.gloint&hl=es"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex items-center justify-center w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold shadow-lg overflow-hidden transition-transform hover:-translate-y-0.5 active:scale-95"
              >
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
                {/* Play Store Logo Vector (Mantenido porque Lucide no lo tiene) */}
                <svg className="w-5 h-5 mr-3 z-10" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.61 3,21.09 3,20.5M16.81,15.12L18.66,17.03L5.67,21.06L14.88,12L16.81,15.12M18.66,6.97L16.81,8.88L14.88,12L5.67,2.94L18.66,6.97M17.5,12L19.58,13.14C20.15,13.45 20.15,14.55 19.58,14.86L17.5,16V8L17.5,12Z" />
                </svg>
                <div className="text-left z-10">
                  <p className="text-[9px] uppercase leading-none opacity-80">Descarga nuestra App</p>
                  <p className="text-sm leading-none">Google Play Store</p>
                </div>
              </a>
            </div>

            {/* NUEVO AVISO DE ACTUALIZACIONES */}
            <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
              <p className="text-xs text-blue-800 leading-relaxed">
                Estamos realizando <strong>mejoras constantes</strong> en nuestra aplicación. Próximamente informaremos sobre las <strong>nuevas funciones</strong> que estarán disponibles para optimizar tu experiencia.
              </p>
            </div>

            <div className="bg-brand-50 border-l-4 border-brand-500 rounded-r-lg p-3 mb-1">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-brand-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-brand-900 mb-0.5">¿Necesitas ayuda?</p>
                  <p className="text-xs text-brand-800">Contacta a soporte para asistencia inmediata.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Acciones principales */}
          <div className="space-y-3 w-full">
            <a
              href="https://youtu.be/NXO2XXj2qkk"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-bold text-sm rounded-xl transition-all duration-300 shadow-md hover:shadow-lg"
            >
              <PlayCircle className="w-4 h-4" />
              <span>Ver Tutorial</span>
            </a>

            <a
              href="https://old.gloint.com.co"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-2 px-4 text-gray-500 hover:text-brand-600 text-xs font-medium transition-colors duration-300"
            >
              <span>Acceder a Plataforma Anterior</span>
              <ArrowRight className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
