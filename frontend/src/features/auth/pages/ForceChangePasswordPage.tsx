import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { fetchApi } from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';
import { Loader2, ArrowRight, LockKeyhole, EyeOff, Eye, ShieldAlert, KeyRound, Mail, RefreshCw, CheckCircle2 } from 'lucide-react';
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
    const [otpCode, setOtpCode] = useState('');
    const [showPasswords, setShowPasswords] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    
    // OTP handling
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [otpSent, setOtpSent] = useState(false);
    const [otpTimer, setOtpTimer] = useState(0);

    useEffect(() => {
        window.scrollTo(0, 0);
        if (!email) {
            navigate('/login');
        }
    }, [email, navigate]);

    useEffect(() => {
        let interval: any = null;
        if (otpTimer > 0) {
            interval = setInterval(() => {
                setOtpTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [otpTimer]);

    const handleSendOtp = async () => {
        if (!email || !currentPasswordFromState || isSendingOtp) return;
        try {
            setIsSendingOtp(true);
            setPasswordError('');
            await fetchApi('/auth/send-force-password-otp', {
                method: 'POST',
                body: JSON.stringify({
                    email,
                    current_password: currentPasswordFromState
                }),
            });
            setOtpSent(true);
            setOtpTimer(60);
        } catch (err: any) {
            setPasswordError(err.message || 'Error al enviar el código de verificación.');
        } finally {
            setIsSendingOtp(false);
        }
    };

    // Auto-envío de OTP al cargar la página
    useEffect(() => {
        if (email && currentPasswordFromState && !otpSent && !isSendingOtp) {
            handleSendOtp();
        }
    }, [email, currentPasswordFromState]);

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

        if (otpCode.trim().length !== 6) {
            setPasswordError('Por favor ingresa el código de verificación OTP de 6 dígitos enviado a tu correo.');
            return;
        }

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
            new_password: newPassword,
            code: otpCode.trim()
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
            subtitle={`Tu cuenta requiere un cambio de contraseña y verificación de seguridad para continuar.`}
            icon={<ShieldAlert className="w-7 h-7 text-orange-500" />}
        >
            <form onSubmit={handleSubmit} method="post" className="space-y-5">
                
                {/* Banner informativo de código OTP */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-3">
                    <Mail className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-blue-900 space-y-1">
                        <p className="font-bold">Verificación de Identidad requerida</p>
                        <p className="text-blue-800 leading-relaxed">
                            Hemos enviado un código OTP de 6 dígitos a <strong className="font-semibold text-blue-950">{email}</strong>. Ingrésalo a continuación para autorizar tu nueva contraseña.
                        </p>
                    </div>
                </div>

                {/* Campo Código OTP */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-bold text-slate-700">Código OTP (6 dígitos)</label>
                        <button
                            type="button"
                            disabled={isSendingOtp || otpTimer > 0}
                            onClick={handleSendOtp}
                            className="text-xs font-semibold text-brand-600 hover:text-brand-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-colors cursor-pointer"
                        >
                            {isSendingOtp ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <RefreshCw className="w-3.5 h-3.5" />
                            )}
                            {otpTimer > 0 ? `Reenviar en ${otpTimer}s` : 'Reenviar código'}
                        </button>
                    </div>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <KeyRound className="h-5 w-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                        </div>
                        <input
                            type="text"
                            id="otpCode"
                            name="otpCode"
                            maxLength={6}
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                            className="block w-full pl-12 pr-4 py-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 font-mono text-center tracking-widest text-lg font-bold focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                            placeholder="000000"
                            required
                        />
                    </div>
                </div>

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
                            placeholder="Mínimo 8 caracteres, mayúscula, minúscula, etc."
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
                    disabled={changePasswordMutation.isPending || !isValidPassword(newPassword) || newPassword !== confirmPassword || otpCode.trim().length !== 6}
                    className="group w-full flex items-center justify-center py-4 px-4 rounded-xl shadow-md shadow-brand-500/20 text-base font-bold text-white bg-brand-500 hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all mt-4 active:scale-[0.98]"
                >
                    {changePasswordMutation.isPending ? (
                        <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                    ) : null}
                    {changePasswordMutation.isPending ? 'Validando OTP y Actualizando...' : 'Confirmar con OTP y Entrar'}
                    {!changePasswordMutation.isPending && (
                        <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    )}
                </button>
            </form>
        </AuthLayout>
    );
};
