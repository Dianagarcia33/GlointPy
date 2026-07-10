import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { fetchApi } from '../../../services/api';
import { Mail, Loader2, ArrowRight, KeyRound, CheckCircle2 } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';

export const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const forgotPasswordMutation = useMutation({
        mutationFn: async (emailData: { email: string }) => {
            return await fetchApi('/auth/forgot-password', {
                method: 'POST',
                body: JSON.stringify(emailData),
            });
        },
        onSuccess: () => {
            setIsSuccess(true);
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (email) {
            forgotPasswordMutation.mutate({ email });
        }
    };

    if (isSuccess) {
        return (
            <AuthLayout 
                title="Correo Enviado" 
                subtitle="Revisa tu bandeja de entrada o carpeta de spam para encontrar el enlace de recuperación."
                icon={<CheckCircle2 className="w-8 h-8 text-green-500" />}
            >
                <div className="text-center mt-6">
                    <p className="text-slate-600 mb-8">
                        Hemos enviado un mensaje a <span className="font-semibold text-slate-900">{email}</span> con las instrucciones para restablecer tu contraseña.
                    </p>
                    <Link
                        to="/login"
                        className="inline-flex items-center justify-center py-3.5 px-6 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                    >
                        Volver al inicio de sesión
                    </Link>
                </div>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout 
            title="Recuperar Contraseña" 
            subtitle="Ingresa el correo electrónico asociado a tu cuenta y te enviaremos un enlace para restablecerla."
            icon={<KeyRound className="w-7 h-7" />}
        >
            <form onSubmit={handleSubmit} method="post" className="space-y-6">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Correo Electrónico</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                        </div>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="block w-full pl-12 pr-4 py-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                            placeholder="nombre@empresa.com"
                            required
                        />
                    </div>
                </div>

                {forgotPasswordMutation.isError && (
                    <div className="p-4 bg-red-50 rounded-xl text-red-600 text-sm font-medium border border-red-100 flex items-start gap-3">
                        <span>⚠️</span>
                        <span>{forgotPasswordMutation.error instanceof Error ? forgotPasswordMutation.error.message : 'Error al procesar la solicitud'}</span>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={forgotPasswordMutation.isPending || !email}
                    className="group w-full flex items-center justify-center py-4 px-4 rounded-xl shadow-md shadow-brand-500/20 text-base font-bold text-white bg-brand-500 hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                >
                    {forgotPasswordMutation.isPending ? (
                        <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                    ) : null}
                    {forgotPasswordMutation.isPending ? 'Enviando...' : 'Enviar enlace de recuperación'}
                    {!forgotPasswordMutation.isPending && (
                        <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    )}
                </button>
            </form>

            <div className="mt-8 text-center">
                <Link to="/login" className="text-sm font-bold text-slate-500 hover:text-brand-500 transition-colors">
                    Volver a Inicio de Sesión
                </Link>
            </div>
        </AuthLayout>
    );
};
