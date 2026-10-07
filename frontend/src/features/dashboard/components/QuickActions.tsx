import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, ArrowDownToLine, FileText, History, HelpCircle, Terminal } from 'lucide-react';
import { NewInvestmentModal } from './NewInvestmentModal';
import { WithdrawalModal } from '../../wallets/components/WithdrawalModal';
import { AutoTransferModal } from './AutoTransferModal';
import { useAuthStore } from '../../../store/authStore';
import { useSarlaftStatus } from '../../../hooks/useSarlaftStatus';

interface ActionProps {
    icon: React.ReactNode;
    label: string;
    primary?: boolean;
    isAdmin?: boolean;
    disabled?: boolean;
    tooltip?: string;
    badge?: string;
}

const ActionButton = ({ icon, label, primary, isAdmin, disabled, tooltip, badge, onClick }: ActionProps & { onClick?: () => void }) => (
    <button 
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        title={tooltip}
        className={`flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all duration-300 ${
            disabled
                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                : isAdmin ? 'bg-slate-900 text-white shadow-md hover:bg-slate-800 hover:-translate-y-0.5 active:scale-95 cursor-pointer' :
            primary 
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20 hover:bg-brand-600 hover:shadow-lg hover:shadow-brand-500/30 hover:-translate-y-0.5 active:scale-95 cursor-pointer' 
                : 'bg-white text-slate-700 border border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md hover:text-slate-900 hover:-translate-y-0.5 active:scale-95 cursor-pointer'
        }`}>
        {icon}
        <span>{label}</span>
        {badge && (
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                badge === 'En validación' 
                    ? 'bg-amber-100 text-amber-800 border-amber-200' 
                    : 'bg-rose-100 text-rose-800 border-rose-200'
            }`}>
                {badge}
            </span>
        )}
    </button>
);

export const QuickActions = () => {
    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
    const { user } = useAuthStore();
    const { canInvest, isPending, isRejected } = useSarlaftStatus();
    const isDirectivo = Boolean(
        !user?.is_superuser &&
        (
            user?.roles?.some((r: any) => {
                const n = (typeof r === 'string' ? r : r?.name || '').toLowerCase();
                return n.includes('directiv') || n.includes('director') || n.includes('comercial') || n.includes('asesor') || n.includes('lider');
            }) ||
            user?.roles_list?.some((r: string) => {
                const n = r.toLowerCase();
                return n.includes('directiv') || n.includes('director') || n.includes('comercial') || n.includes('asesor') || n.includes('lider');
            })
        )
    );

    return (
        <div className="mb-10">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 ml-1">Acciones Rápidas</h3>
            <div className="flex flex-wrap gap-3">
                {!isDirectivo && (
                    <ActionButton 
                        primary 
                        icon={<PlusCircle className="w-4 h-4" />} 
                        label="Nueva Inversión" 
                        disabled={!canInvest}
                        badge={isPending ? "En validación" : isRejected ? "Bloqueado" : undefined}
                        tooltip={isPending ? "Tu validación SARLAFT con Tusdatos.co está en proceso" : isRejected ? "Tu cuenta requiere revisión de cumplimiento" : undefined}
                        onClick={() => setIsModalOpen(true)}
                    />
                )}
                <ActionButton 
                    icon={<ArrowDownToLine className="w-4 h-4" />} 
                    label="Solicitar Retiro" 
                    onClick={() => setIsWithdrawalModalOpen(true)}
                />

                <ActionButton 
                    icon={<HelpCircle className="w-4 h-4 text-brand-600" />} 
                    label="Soporte" 
                    onClick={() => navigate('/dashboard/tickets')}
                />
                
            </div>

            <NewInvestmentModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
            />

            <WithdrawalModal 
                isOpen={isWithdrawalModalOpen} 
                onClose={() => setIsWithdrawalModalOpen(false)} 
            />
        </div>
    );
};
