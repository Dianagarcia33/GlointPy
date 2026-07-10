import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { fetchApi } from '../../../services/api';
import { LockKeyhole, Loader2, ArrowRight, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { PasswordStrengthIndicator, isValidPassword } from '../components/PasswordStrengthIndicator';

export const ResetPasswordPage = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const resetPasswordMutation = useMutation({
        mutationFn: async (resetData: any) => {
            return await fetchApi('/auth/reset-password', {
                method: 'POST',
                body: JSON.stringify(resetData),
            });
        },
        onSuccess: () => {
            setIsSuccess(true);
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) return;
        if (!isValidPassword(password)) return;
        if (password && token) {
            resetPasswordMutation.mutate({ token, new_password: password });
        }
    };

    if (!token) {
        return (
            <AuthLayout title="Enlace Inválido" subtitle="Falta el token de seguridad.">
                <div className="text-center p-6 bg-red-50 text-red-600 rounded-xl font-medium mb-6">
                    No se proporcionó un token de recuperación en la URL. 
                    Por favor, intenta solicitar un nuevo enlace.
                </div>
                <Link to="/forgot-password" className="block text-center text-brand-500 font-bold hover:underline">
                    Solicitar un nuevo enlace
                </Link>
            </AuthLayout>
        );
    }

    if (isSuccess) {
        return (
            <AuthLayout 
                title="¡Contraseña Cambiada!" 
                subtitle="Tu contraseña se ha restablecido exitosamente."
                icon={<CheckCircle2 className="w-8 h-8 text-green-500" />}
            >
                <div className="text-center mt-6">
                    <p className="text-slate-600 mb-8">
                        Ahora puedes ingresar a tu cuenta con tu nueva contraseña.
                    </p>
                    <Link
                        to="/login"
                        className="inline-flex items-center justify-center py-3.5 px-6 rounded-xl font-bold text-white bg-brand-500 hover:bg-brand-600 transition-colors shadow-md shadow-brand-500/20"
                    >
                        Ir al inicio de sesión <ArrowRight className="w-5 h-5 ml-2" />
                    </Link>
                </div>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout 
            title="Nueva Contraseña" 
            subtitle="Crea una nueva contraseña segura para tu cuenta de GLOINT."
            icon={<LockKeyhole className="w-7 h-7" />}
        >
            <form onSubmit={handleSubmit} method="post" className="space-y-5">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Nueva Contraseña</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <LockKeyhole className="h-5 w-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                        </div>
                        <input
                            type={showPassword ? "text" : "password"}
                            id="password"
                            name="password"
                            autoComplete="new-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="block w-full pl-12 pr-12 py-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                            placeholder="Mínimo 8 caracteres, etc."
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Confirmar Contraseña</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <LockKeyhole className="h-5 w-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                        </div>
                        <input
                            type={showConfirmPassword ? "text" : "password"}
                            id="confirmPassword"
                            name="confirmPassword"
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className={`block w-full pl-12 pr-12 py-3.5 bg-slate-50 hover:bg-slate-100 border rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all ${confirmPassword && password !== confirmPassword ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                            placeholder="Debe coincidir con la de arriba"
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                    </div>
                    {confirmPassword && password !== confirmPassword && (
                        <p className="text-xs text-red-500 mt-2 font-semibold">Las contraseñas no coinciden.</p>
                    )}
                </div>

                {password.length > 0 && (
                    <PasswordStrengthIndicator password={password} confirmPassword={confirmPassword} />
                )}

                {resetPasswordMutation.isError && (
                    <div className="p-4 bg-red-50 rounded-xl text-red-600 text-sm font-medium border border-red-100 flex items-start gap-3">
                        <span>⚠️</span>
                        <span>{resetPasswordMutation.error instanceof Error ? resetPasswordMutation.error.message : 'El token expiró o es inválido'}</span>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={resetPasswordMutation.isPending || !isValidPassword(password) || password !== confirmPassword}
                    className="group w-full flex items-center justify-center py-4 px-4 rounded-xl shadow-md shadow-brand-500/20 text-base font-bold text-white bg-brand-500 hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all mt-4 active:scale-[0.98]"
                >
                    {resetPasswordMutation.isPending ? (
                        <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                    ) : null}
                    {resetPasswordMutation.isPending ? 'Guardando...' : 'Cambiar Contraseña'}
                    {!resetPasswordMutation.isPending && (
                        <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    )}
                </button>
            </form>
        </AuthLayout>
    );
};
