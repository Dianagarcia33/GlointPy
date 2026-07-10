import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Nav as Navbar } from '../../landing_v2/components/Nav';
import { Footer } from '../../landing_v2/components/Footer';
import { ShieldCheck } from 'lucide-react';

export const LegalNoticePage = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 font-inter text-slate-900 selection:bg-brand-500/20">
            <Navbar />
            
            {/* Hero Section */}
            <div className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden">
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-brand-500/5 to-transparent rounded-full blur-3xl"></div>
                </div>
                <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-100 text-brand-600 text-sm font-semibold tracking-wide mb-6">
                        <ShieldCheck className="w-4 h-4" />
                        Legal
                    </div>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight mb-6">
                        Aviso Legal
                    </h1>
                    <p className="text-lg md:text-xl text-slate-500 leading-relaxed max-w-3xl mx-auto">
                        Términos de uso y consideraciones legales. Documento en preparación.
                    </p>
                </div>
            </div>

            {/* Content Section */}
            <div className="max-w-4xl mx-auto px-6 pb-24 relative z-10">
                <div className="bg-white border border-slate-200 shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden p-8 md:p-12 text-center text-slate-500">
                    Estamos actualizando nuestro Aviso Legal. Vuelve pronto para leer el documento completo.
                </div>
                
                {/* Page Footer */}
                <div className="bg-slate-50 border-t border-slate-100 p-8 text-center mt-8">
                    <Link to="/" className="inline-flex items-center gap-2 text-brand-600 hover:text-brand-700 font-semibold transition-colors bg-white px-6 py-2.5 rounded-full border border-brand-100 shadow-sm hover:shadow">
                        Volver al inicio
                    </Link>
                </div>
            </div>

            <Footer />
        </div>
    );
};
