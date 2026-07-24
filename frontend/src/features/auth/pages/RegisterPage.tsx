import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { fetchApi } from '../../../services/api';
import { commercialService } from '../../../services/commercial';
import { useAuthStore } from '../../../store/authStore';
import { Mail, Loader2, ArrowRight, Eye, EyeOff, LockKeyhole, User, UserCheck } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { InvestorRegistrationFlow } from '../components/InvestorRegistrationFlow';
import { PasswordStrengthIndicator, isValidPassword } from '../components/PasswordStrengthIndicator';

export const RegisterPage = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [commercialId, setCommercialId] = useState<string>('');
    const [commercialUsers, setCommercialUsers] = useState<Array<{ id: number; name: string; email?: string }>>([]);
    
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const role = searchParams.get('role');
    const roleName = role === 'investor' ? 'Inversionista' : role === 'client' ? 'Cliente' : '';
    
    const loginAction = useAuthStore((state) => state.login);

    useEffect(() => {
        window.scrollTo(0, 0);
        commercialService.getPublicAdvisors()
            .then(res => setCommercialUsers(res))
            .catch(() => setCommercialUsers([]));
    }, []);

    const registerMutation = useMutation({
        mutationFn: async (userData: any) => {
            return await fetchApi('/auth/register', {
                method: 'POST',
                body: JSON.stringify(userData),
            });
        },
        onSuccess: (data: any) => {
            loginAction(data.user, data.access_token);
            navigate('/dashboard');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!acceptedTerms) return;
        if (password !== confirmPassword) return;
        if (!isValidPassword(password)) return;
        if (name && email && password) {
            registerMutation.mutate({
                name,
                email,
                password,
                role,
                commercial_id: commercialId ? parseInt(commercialId) : null
            });
        }
    };

    return (
        <AuthLayout 
            title="Crear Cuenta" 
            subtitle="Únete al ecosistema empresarial de inversión, comercio digital y tecnología."
            icon={<User className="w-7 h-7" />}
            maxWidthClass="max-w-2xl"
        >
            {roleName && (
                <div className="mb-6 flex justify-center">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-brand-50 text-brand-600 border border-brand-100">
                        Registro de {roleName}
                    </span>
                </div>
            )}
            
            {role === 'investor' ? (
                <InvestorRegistrationFlow />
            ) : (
                <form onSubmit={handleSubmit} method="post" className="space-y-5">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Nombre Completo</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <User className="h-5 w-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                            </div>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                autoComplete="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="block w-full pl-12 pr-4 py-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                                placeholder="Ana Pérez"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Correo Electrónico</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                            </div>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="block w-full pl-12 pr-4 py-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                                placeholder="nombre@empresa.com"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Contraseña</label>
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
                    </div>

                    {password.length > 0 && (
                        <PasswordStrengthIndicator password={password} confirmPassword={confirmPassword} />
                    )}

                    {registerMutation.isError && (
                        <div className="p-4 bg-red-50 rounded-xl text-red-600 text-sm font-medium border border-red-100 flex items-start gap-3">
                            <span>⚠️</span>
                            <span>{registerMutation.error instanceof Error ? registerMutation.error.message : 'Error al registrar la cuenta'}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={registerMutation.isPending || !isValidPassword(password) || password !== confirmPassword}
                        className="group w-full flex items-center justify-center py-4 px-4 rounded-xl shadow-md shadow-brand-500/20 text-base font-bold text-white bg-brand-500 hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all mt-4 active:scale-[0.98]"
                    >
                        {registerMutation.isPending ? (
                            <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                        ) : null}
                        {registerMutation.isPending ? 'Creando cuenta...' : 'Crear mi cuenta'}
                        {!registerMutation.isPending && (
                            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                        )}
                    </button>
                    <div className="flex items-start gap-3 mt-2">
                        <div className="flex items-center h-5 mt-0.5">
                            <input
                                id="terms"
                                type="checkbox"
                                checked={acceptedTerms}
                                onChange={(e) => setAcceptedTerms(e.target.checked)}
                                className="w-4 h-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500 bg-white"
                                required
                            />
                        </div>
                        <label htmlFor="terms" className="text-sm text-slate-600 leading-snug">
                            Acepto los{' '}
                            <Link to="/terminos" target="_blank" className="font-bold text-brand-500 hover:text-brand-600 transition-colors">
                                Términos y Condiciones
                            </Link>
                            {' '}y Política de Privacidad.
                        </label>
                    </div>
                </form>
            )}



            <div className="mt-8 text-center">
                <p className="text-sm text-slate-500">
                    ¿Ya tienes una cuenta?{' '}
                    <Link to="/login" className="font-bold text-brand-500 hover:text-brand-600 transition-colors">
                        Iniciar Sesión
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
