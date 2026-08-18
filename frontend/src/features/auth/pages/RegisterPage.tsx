import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, LockKeyhole } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { InvestorRegistrationFlow } from '../components/InvestorRegistrationFlow';

export const RegisterPage = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <AuthLayout 
            title="Crear Cuenta de Inversionista" 
            subtitle="Únete al ecosistema empresarial de inversión y gestiona tu capital de forma segura."
            icon={<User className="w-7 h-7" />}
        >
            <div className="mb-6 flex justify-center">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-brand-50 text-brand-600 border border-brand-100">
                    Registro de Inversionista
                </span>
            </div>
            
            <InvestorRegistrationFlow />

            <div className="mt-8 text-center">
                <p className="text-sm text-slate-500">
                    ¿Ya tienes una cuenta?{' '}
                    <Link to="/login" className="font-bold text-brand-500 hover:text-brand-600 transition-colors">
                        Iniciar Sesión
                    </Link>
                </p>
                <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
                    <LockKeyhole className="w-3 h-3 text-slate-400" />
                    Conexión segura y cifrado de datos SSL
                </div>
            </div>
        </AuthLayout>
    );
};
