import React from 'react';

interface WelcomeCardProps {
    userName: string;
}

/**
 * Bienvenida simple para usuarios que no tienen permisos de contenido en el dashboard
 * (por ejemplo, personal interno que solo debe ver el saludo).
 */
export const WelcomeCard: React.FC<WelcomeCardProps> = ({ userName }) => (
    <div className="bg-slate-900 rounded-3xl p-8 md:p-10 text-white relative overflow-hidden shadow-2xl shadow-brand-900/20 mb-8">
        <div className="absolute top-0 right-0 w-full h-full pointer-events-none overflow-hidden">
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-brand-500/20 rounded-full blur-[100px]"></div>
        </div>
        <div className="relative z-10">
            <h1 className="text-2xl md:text-3xl font-montserrat tracking-tight text-slate-300">
                ¡Bienvenido{userName ? ',' : ''} <span className="text-white font-bold">{userName}</span> 👋
            </h1>
            <p className="mt-3 text-sm text-slate-400 max-w-xl">
                Usa el menú lateral para acceder a los módulos habilitados para tu cuenta.
            </p>
        </div>
    </div>
);
