import React, { useState } from 'react';
import { PlusCircle, ArrowDownToLine, FileText, History, HelpCircle, Terminal } from 'lucide-react';
import { NewInvestmentModal } from './NewInvestmentModal';
import { AutoTransferModal } from './AutoTransferModal';
import { useAuthStore } from '../../../store/authStore';

interface ActionProps {
    icon: React.ReactNode;
    label: string;
    primary?: boolean;
    isAdmin?: boolean;
}

const ActionButton = ({ icon, label, primary, isAdmin, onClick }: ActionProps & { onClick?: () => void }) => (
    <button 
        onClick={onClick}
        className={`flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all duration-300 hover:-translate-y-0.5 active:scale-95 ${
            isAdmin ? 'bg-slate-900 text-white shadow-md hover:bg-slate-800' :
            primary 
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20 hover:bg-brand-600 hover:shadow-lg hover:shadow-brand-500/30' 
                : 'bg-white text-slate-700 border border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md hover:text-slate-900'
        }`}>
        {icon}
        {label}
    </button>
);

export const QuickActions = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
    const { user } = useAuthStore();

    return (
        <div className="mb-10">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 ml-1">Acciones Rápidas</h3>
            <div className="flex flex-wrap gap-3">
                <ActionButton 
                    primary 
                    icon={<PlusCircle className="w-4 h-4" />} 
                    label="Nueva Inversión" 
                    onClick={() => setIsModalOpen(true)}
                />
                <ActionButton icon={<ArrowDownToLine className="w-4 h-4" />} label="Solicitar Retiro" />
                <ActionButton icon={<FileText className="w-4 h-4" />} label="Certificados" />
                <ActionButton icon={<History className="w-4 h-4" />} label="Historial" />
                <ActionButton icon={<HelpCircle className="w-4 h-4" />} label="Soporte" />
                
                {user?.email === 'superadmin@gloint.com' && (
                    <ActionButton 
                        isAdmin
                        icon={<Terminal className="w-4 h-4" />} 
                        label="[ADMIN] Transferencias" 
                        onClick={() => setIsAdminModalOpen(true)}
                    />
                )}
            </div>

            <NewInvestmentModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
            />
            
            <AutoTransferModal 
                isOpen={isAdminModalOpen}
                onClose={() => setIsAdminModalOpen(false)}
            />
        </div>
    );
};
