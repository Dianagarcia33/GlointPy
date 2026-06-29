import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { fetchApi } from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';
import { Mail, Loader2, ArrowRight, Eye, EyeOff, LockKeyhole } from 'lucide-react';
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
            loginAction(
                data.user || { id: 1, name: email.split('@')[0], email, is_active: true }, 
                data.access_token
            );
            navigate('/dashboard');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (email && password) {
            loginMutation.mutate({ email, password });
        }
    };

    return (
        <AuthLayout 
            title="Iniciar Sesión" 
            subtitle="Accede a tu cuenta para gestionar tu liquidez y hacer crecer tu negocio."
            icon={<LockKeyhole className="w-7 h-7" />}
        >
            <form onSubmit={handleSubmit} className="space-y-5">
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

                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-bold text-slate-700">Contraseña</label>
                        <a href="#" className="text-xs font-semibold text-brand-500 hover:text-brand-600 transition-colors">
                            ¿Olvidaste tu contraseña?
                        </a>
                    </div>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <LockKeyhole className="h-5 w-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                        </div>
                        <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="block w-full pl-12 pr-12 py-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                            placeholder="••••••••"
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

                {loginMutation.isError && (
                    <div className="p-4 bg-red-50 rounded-xl text-red-600 text-sm font-medium border border-red-100 flex items-start gap-3">
                        <span>⚠️</span>
                        <span>{loginMutation.error instanceof Error ? loginMutation.error.message : 'Error al iniciar sesión'}</span>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loginMutation.isPending}
                    className="group w-full flex items-center justify-center py-4 px-4 rounded-xl shadow-md shadow-brand-500/20 text-base font-bold text-white bg-brand-500 hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all mt-4 active:scale-[0.98]"
                >
                    {loginMutation.isPending ? (
                        <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
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
                    <Link to="/register" className="font-bold text-brand-500 hover:text-brand-600 transition-colors">
                        Regístrate aquí
                    </Link>
                </p>
                <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
                    <LockKeyhole className="w-3 h-3" />
                    Encriptación AES-256 de grado bancario
                </div>
            </div>
        </AuthLayout>
    );
};
