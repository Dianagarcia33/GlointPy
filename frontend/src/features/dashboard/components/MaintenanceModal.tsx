import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Info } from 'lucide-react';

export const MaintenanceModal = () => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        // Mostrar siempre el modal al cargar el componente
        const timer = setTimeout(() => setIsOpen(true), 500);
        return () => clearTimeout(timer);
    }, []);

    const handleClose = () => {
        setIsOpen(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-in fade-in duration-300">
            {/* Backdrop con Blur */}
            <div 
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={handleClose}
            ></div>

            {/* Modal Content */}
            <div className="relative bg-white rounded-3xl w-full max-w-md shadow-2xl shadow-brand-500/10 overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header Decorativo */}
                <div className="bg-brand-50 p-6 flex flex-col items-center text-center border-b border-brand-100 relative">
                    <button 
                        onClick={handleClose}
                        className="absolute top-4 right-4 p-2 text-brand-400 hover:text-brand-600 hover:bg-brand-100/50 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-brand-100 flex items-center justify-center mb-4">
                        <Info className="w-8 h-8 text-brand-500" />
                    </div>
                    <h3 className="text-xl font-bold font-montserrat text-slate-900">Aviso Importante</h3>
                </div>

                {/* Body */}
                <div className="p-6 md:p-8 text-center">
                    <p className="text-slate-600 font-medium mb-4">
                        En este momento nos encontramos restableciendo y optimizando nuestros servicios.
                    </p>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
                        <p className="text-sm text-slate-700 font-semibold">
                            El día de mañana podrán solicitar sus retiros con total normalidad.
                        </p>
                    </div>
                    <p className="text-sm text-slate-500 mb-8">
                        Agradecemos su paciencia y confianza en GLOINT.
                    </p>

                    <button 
                        onClick={handleClose}
                        className="w-full py-3.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl shadow-md shadow-brand-500/20 transition-all active:scale-95"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
};
