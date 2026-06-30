import React, { useEffect, useState } from 'react';
import { Wallet, ArrowDownToLine, ArrowRightLeft } from 'lucide-react';
import { Can } from '../../../components/security/Can';
import { api } from '../../../services/api';

export const WalletsPage = () => {
    const [balance, setBalance] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBalance = async () => {
            try {
                const response = await api.get('/wallets/me/balance');
                setBalance(response.data.balance || 0);
            } catch (error) {
                console.error('Error fetching balance:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchBalance();
    }, []);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(value);
    };

    return (
        <Can permission="wallets:view">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 relative pb-20">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight font-montserrat">Mi Billetera</h1>
                    <p className="text-slate-500 mt-1">Gestiona tu saldo y retiros</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* Balance Card */}
                    <div className="col-span-1 md:col-span-2 bg-gradient-to-br from-brand-600 to-brand-800 rounded-3xl p-8 text-white shadow-xl shadow-brand-500/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl"></div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                                    <Wallet className="w-6 h-6 text-white" />
                                </div>
                                <h2 className="text-lg font-medium text-brand-50">Saldo Disponible</h2>
                            </div>
                            
                            {loading ? (
                                <div className="h-14 w-48 bg-white/20 rounded-xl animate-pulse"></div>
                            ) : (
                                <p className="text-5xl font-bold font-montserrat tracking-tight">
                                    {formatCurrency(balance)}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Actions Card */}
                    <div className="col-span-1 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-center gap-4">
                        <button className="flex items-center justify-center gap-2 w-full py-3.5 px-4 bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold rounded-xl transition-colors">
                            <ArrowDownToLine className="w-5 h-5" />
                            Retirar Fondos
                        </button>
                        <button className="flex items-center justify-center gap-2 w-full py-3.5 px-4 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl transition-colors">
                            <ArrowRightLeft className="w-5 h-5" />
                            Historial
                        </button>
                    </div>
                </div>
            </div>
        </Can>
    );
};
