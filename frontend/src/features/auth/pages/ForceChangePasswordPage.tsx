import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { fetchApi } from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';
import { Loader2, ArrowRight, LockKeyhole, EyeOff, Eye, ShieldAlert } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { PasswordStrengthIndicator, isValidPassword } from '../components/PasswordStrengthIndicator';

export const ForceChangePasswordPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const loginAction = useAuthStore((state) => state.login);
    
    // El email y el currentPassword deben venir del estado de navegación desde el login
    const email = location.state?.email;
    const currentPasswordFromState = location.state?.currentPassword;

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPasswords, setShowPasswords] = useState(false);
    const [passwordError, setPasswordError] = useState('');

    useEffect(() => {
        window.scrollTo(0, 0);
        if (!email) {
            navigate('/login');
        }
    }, [email, navigate]);

    const changePasswordMutation = useMutation({
        mutationFn: async (credentials: any) => {
            return await fetchApi('/auth/force-change-password', {
                method: 'POST',
                body: JSON.stringify(credentials),
            });
        },
        onSuccess: (data) => {
            const user = data.user;
            if (user) {
                const perms = new Set<string>();
                if (user.roles) {
                    user.roles.forEach((r: any) => {
                        if (r.permissions) {
                            r.permissions.forEach((p: any) => perms.add(p.name));
                        }
                    });
                }
                user.permissions = Array.from(perms);
            }

            loginAction(
                user || { id: 1, name: email.split('@')[0], email, is_active: true }, 
                data.access_token
            );
            navigate('/dashboard');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError('');

        if (newPassword !== confirmPassword) {
            setPasswordError('Las contraseñas nuevas no coinciden');
            return;
        }

        if (!isValidPassword(newPassword)) {
            setPasswordError('La nueva contraseña no cumple con los requisitos de seguridad');
            return;
        }

        changePasswordMutation.mutate({ 
            email, 
            current_password: currentPasswordFromState, 
            new_password: newPassword 
        });
    };

    if (!email || !currentPasswordFromState) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
                <p className="text-slate-600 mb-4">Error: Falta información de autenticación.</p>
                <button onClick={() => navigate('/login')} className="text-brand-500 font-bold hover:underline">Volver al inicio de sesión</button>
            </div>
        );
    }

    return (
        <AuthLayout 
            title="Cambio Obligatorio" 
            subtitle={`Tu cuenta requiere un cambio de contraseña por seguridad para continuar.`}
            icon={<ShieldAlert className="w-7 h-7 text-orange-500" />}
        >
            <form onSubmit={handleSubmit} method="post" className="space-y-5">

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Nueva Contraseña</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <LockKeyhole className="h-5 w-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                        </div>
                        <input
                            type={showPasswords ? "text" : "password"}
                            id="newPassword"
                            name="newPassword"
                            autoComplete="new-password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="block w-full pl-12 pr-12 py-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                            placeholder="Mínimo 8 caracteres, etc."
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPasswords(!showPasswords)}
                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-brand-500 transition-colors focus:outline-none"
                            tabIndex={-1}
                        >
                            {showPasswords ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Confirmar Nueva Contraseña</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <LockKeyhole className="h-5 w-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                        </div>
                        <input
                            type={showPasswords ? "text" : "password"}
                            id="confirmPassword"
                            name="confirmPassword"
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className={`block w-full pl-12 pr-12 py-3.5 bg-slate-50 hover:bg-slate-100 border rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all ${confirmPassword && newPassword !== confirmPassword ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                            placeholder="Repite tu nueva contraseña"
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPasswords(!showPasswords)}
                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-brand-500 transition-colors focus:outline-none"
                            tabIndex={-1}
                        >
                            {showPasswords ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                    </div>
                    {confirmPassword && newPassword !== confirmPassword && (
                        <p className="text-xs text-red-500 mt-2 font-semibold">Las contraseñas no coinciden.</p>
                    )}
                </div>

                {newPassword.length > 0 && (
                    <PasswordStrengthIndicator password={newPassword} confirmPassword={confirmPassword} />
                )}

                {(passwordError || changePasswordMutation.isError) && (
                    <div className="p-4 bg-red-50 rounded-xl text-red-600 text-sm font-medium border border-red-100 flex items-start gap-3">
                        <span>⚠️</span>
                        <span>
                            {passwordError || (changePasswordMutation.error instanceof Error ? changePasswordMutation.error.message : 'Error al cambiar la contraseña')}
                        </span>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={changePasswordMutation.isPending || !isValidPassword(newPassword) || newPassword !== confirmPassword}
                    className="group w-full flex items-center justify-center py-4 px-4 rounded-xl shadow-md shadow-brand-500/20 text-base font-bold text-white bg-brand-500 hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all mt-4 active:scale-[0.98]"
                >
                    {changePasswordMutation.isPending ? (
                        <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                    ) : null}
                    {changePasswordMutation.isPending ? 'Actualizando...' : 'Actualizar Contraseña y Entrar'}
                    {!changePasswordMutation.isPending && (
                        <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    )}
                </button>
            </form>
        </AuthLayout>
    );
};
