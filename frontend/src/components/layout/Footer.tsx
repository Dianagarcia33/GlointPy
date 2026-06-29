import React from 'react';

export const Footer = () => {
    return (
        <footer className="sticky bottom-4 z-40 mx-4 lg:mx-8 mt-auto pb-4 pointer-events-none">
            {/* Contenedor del footer (pointer-events-auto para que los links funcionen) */}
            <div className="pointer-events-auto bg-white/85 backdrop-blur-xl border border-slate-200 shadow-xl rounded-2xl px-6 py-3 flex flex-col md:flex-row justify-between items-center gap-4 transition-all">
                <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-slate-500">© {new Date().getFullYear()} GLOINT. Todos los derechos reservados.</span>
                </div>
                
                <div className="flex flex-wrap justify-center items-center gap-4 md:gap-6 text-[13px] font-medium text-slate-500">
                    <a href="#" className="hover:text-brand-500 transition-colors">Soporte</a>
                    <a href="#" className="hover:text-brand-500 transition-colors">Términos</a>
                    <a href="#" className="hover:text-brand-500 transition-colors">Privacidad</a>
                    
                    <div className="hidden md:block h-4 w-px bg-slate-300"></div>
                    
                    <span className="bg-brand-50 text-brand-600 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest border border-brand-100 uppercase">
                        GLOINT 2.0.0.1
                    </span>
                </div>
            </div>
        </footer>
    );
};
