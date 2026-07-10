import React from 'react';
import { Check, X } from 'lucide-react';

interface PasswordStrengthIndicatorProps {
    password: string;
    confirmPassword?: string;
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({ password, confirmPassword }) => {
    const hasMinLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[@$!%*?&#.]/.test(password);
    const passwordsMatch = confirmPassword !== undefined ? password === confirmPassword && password.length > 0 : true;

    const requirements = [
        { label: 'Mínimo 8 caracteres', met: hasMinLength },
        { label: 'Una letra mayúscula', met: hasUppercase },
        { label: 'Una letra minúscula', met: hasLowercase },
        { label: 'Un número', met: hasNumber },
        { label: 'Un carácter especial (@$!%*?&#.)', met: hasSpecialChar },
        ...(confirmPassword !== undefined ? [{ label: 'Las contraseñas coinciden', met: passwordsMatch }] : [])
    ];

    return (
        <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <p className="text-xs font-bold text-slate-700 mb-2">Requisitos de la contraseña:</p>
            <ul className="space-y-1.5 grid grid-cols-1 md:grid-cols-2 gap-2">
                {requirements.map((req, index) => (
                    <li key={index} className={`flex items-center text-xs font-medium transition-colors ${req.met ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {req.met ? (
                            <Check className="w-3.5 h-3.5 mr-2 flex-shrink-0" />
                        ) : (
                            <X className="w-3.5 h-3.5 mr-2 flex-shrink-0 opacity-50" />
                        )}
                        {req.label}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export const isValidPassword = (password: string): boolean => {
    return (
        password.length >= 8 &&
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /[0-9]/.test(password) &&
        /[@$!%*?&#.]/.test(password)
    );
};
