import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { fetchApi } from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';
import { Loader2, ArrowRight, Eye, EyeOff, LockKeyhole, AlertCircle } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';

export const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    
    const navigate = useNavigate();
    const loginAction = useAuthStore((state) => state.login);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const loginMutation = useMutation({
        mutationFn: async (credentials: any) => {
            return await fetchApi('/auth/login', {
                method: 'POST',
                body: JSON.stringify(credentials),
            });
        },
        onSuccess: (data) => {
            const user = data.user;
            if (user) {
                // Map nested roles -> permissions to a flat array of strings
                const perms = new Set<string>();
                const rolesList = new Set<string>();
                if (user.roles) {
                    user.roles.forEach((r: any) => {
                        rolesList.add(r.name);
                        if (r.permissions) {
                            r.permissions.forEach((p: any) => perms.add(p.name));
                        }
                    });
                }
                user.permissions = Array.from(perms);
                user.roles_list = Array.from(rolesList);
            }

            loginAction(
                user || { id: 1, name: email.split('@')[0], email, is_active: true }, 
                data.access_token
            );
            navigate('/dashboard');
        },
        onError: (error: any) => {
            if (error.message === 'MUST_CHANGE_PASSWORD') {
                navigate('/force-change-password', { state: { email, currentPassword: password } });
            }
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (email && password) {
            loginMutation.mutate({ email, password });
        }
    };

    return (
        <AuthLayout 
            variant="split"
            title="Hola de nuevo" 
            subtitle="Accede a tu cuenta en el ecosistema GLOINT y descubre nuevas oportunidades para tu negocio."
            maxWidthClass="max-w-md"
        >
            <form onSubmit={handleSubmit} method="post" className="space-y-5">
                <div>
                    <label htmlFor="email" className="block text-[13px] font-semibold text-slate-600 mb-2">Correo electrónico</label>
                    <div className="relative group">
                        <input
                            type="email"
                            id="email"
                            name="email"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="block w-full px-4 h-12 bg-[#F3F3F5] hover:bg-[#EEEEF1] border border-transparent rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-500 transition-all"
                            placeholder="nombre@empresa.com"
                            required
                        />
                    </div>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label htmlFor="password" className="block text-[13px] font-semibold text-slate-600">Contraseña</label>
                        <Link to="/forgot-password" className="text-[13px] font-medium text-brand-500 hover:text-brand-600 transition-colors">
                            ¿Olvidaste tu contraseña?
                        </Link>
                    </div>
                    <div className="relative group">
                        <input
                            type={showPassword ? "text" : "password"}
                            id="password"
                            name="password"
                            autoComplete="current-password"
                            spellCheck={false}
                            autoCapitalize="off"
                            autoCorrect="off"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="block w-full pl-4 pr-12 h-12 bg-[#F3F3F5] hover:bg-[#EEEEF1] border border-transparent rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-500 transition-all"
                            placeholder="••••••••"
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                        >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>

                    </div>
                </div>

                {loginMutation.isError && loginMutation.error.message !== 'MUST_CHANGE_PASSWORD' && (
                    <div role="alert" className="p-4 bg-red-50 rounded-xl text-red-700 text-sm font-medium border border-red-100 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 shrink-0 mt-px" aria-hidden="true" />
                        <span>{loginMutation.error instanceof Error ? loginMutation.error.message : 'Error al iniciar sesión'}</span>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loginMutation.isPending}
                    className="group w-full flex items-center justify-center h-12 px-4 rounded-xl text-[15px] font-semibold bg-[#0E0D0C] hover:bg-[#1C1A17] text-[#F6CB62] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all mt-6 active:scale-[0.98]"
                >
                    {loginMutation.isPending ? (
                        <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                    ) : null}
                    {loginMutation.isPending ? 'Verificando...' : 'Acceder a mi cuenta'}
                    {!loginMutation.isPending && (
                        <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    )}
                </button>
            </form>



            <div className="mt-10 text-center">
                <p className="text-sm text-slate-500">
                    ¿No tienes una cuenta?{' '}
                    <Link to="/onboarding" className="font-semibold text-brand-500 hover:text-brand-600 transition-colors">
                        Regístrate aquí
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
