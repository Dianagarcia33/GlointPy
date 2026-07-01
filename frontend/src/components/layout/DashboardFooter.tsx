import React from 'react';

export const DashboardFooter = () => {
    return (
        <footer className="sticky bottom-0 z-40 w-full mt-auto bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-6 py-3 transition-all">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-slate-400">© {new Date().getFullYear()} GLOINT. Todos los derechos reservados.</span>
                </div>
                
                <div className="flex flex-wrap justify-center items-center gap-4 md:gap-6 text-[13px] font-medium text-slate-400">
                    <a href="#" className="hover:text-white transition-colors">Soporte</a>
                    <a href="#" className="hover:text-white transition-colors">Términos</a>
                    <a href="#" className="hover:text-white transition-colors">Privacidad</a>
                    
                    <div className="hidden md:block h-4 w-px bg-slate-700"></div>
                    
                    <span className="bg-slate-800 text-brand-400 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest border border-slate-700 uppercase">
                        GLOINT 2.0.0.1
                    </span>
                </div>
            </div>
        </footer>
    );
};
