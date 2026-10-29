import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LockKeyhole } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { InvestorRegistrationFlow } from '../components/InvestorRegistrationFlow';
import { RegistrationSideSteps } from '../components/RegistrationSteps';

export const RegisterPage = () => {
    const [step, setStep] = useState(1);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <AuthLayout
            variant="split"
            title="Crear cuenta de inversionista"
            subtitle="Únete al ecosistema empresarial de inversión y gestiona tu capital de forma segura."
            maxWidthClass="max-w-xl"
            sidePanel={<RegistrationSideSteps step={step} />}
        >
            <InvestorRegistrationFlow onStepChange={setStep} />

            <div className="mt-8 text-center">
                <p className="text-sm text-slate-500">
                    ¿Ya tienes una cuenta?{' '}
                    <Link to="/login" className="font-bold text-brand-500 hover:text-brand-600 transition-colors">
                        Iniciar sesión
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
