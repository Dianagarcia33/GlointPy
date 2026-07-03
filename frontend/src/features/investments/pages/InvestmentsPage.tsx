import React, { useEffect, useState } from 'react';
import { auditoriaService, RespaldoInvestment } from '../../../services/auditoria';
import { Loader2, AlertCircle, Search } from 'lucide-react';

export const InvestmentsPage = () => {
    const [respaldoData, setRespaldoData] = useState<RespaldoInvestment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                const data = await auditoriaService.getRespaldoInvestments();
                setRespaldoData(data);
            } catch (err: any) {
                setError(err.message || 'Error al cargar los datos de respaldo');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    const formatCOP = (value: number | undefined) => {
        if (value === undefined || value === null) return '$0';
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(value);
    };

    if (isLoading) {
        return (
            <div className="p-8 flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8">
                <div className="bg-red-50 text-red-500 p-4 rounded-xl flex items-center gap-3">
                    <AlertCircle className="w-5 h-5" />
                    <span>{error}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold text-slate-800 mb-6">Módulo de Auditoría</h1>
            
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <h2 className="font-semibold text-slate-800">Inversiones de Respaldo (Migración)</h2>
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar usuario..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent w-64"
                        />
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3 font-medium">ID Respaldo</th>
                                <th className="px-6 py-3 font-medium">Código</th>
                                <th className="px-6 py-3 font-medium">Paquete & Periodo</th>
                                <th className="px-6 py-3 font-medium">Fecha de Creación</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {respaldoData.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                                        No hay datos de respaldo disponibles.
                                    </td>
                                </tr>
                            ) : (
                                respaldoData
                                    .filter(user => 
                                        user.user_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                        user.user_email.toLowerCase().includes(searchQuery.toLowerCase())
                                    )
                                    .map((user) => (
                                    <React.Fragment key={user.user_id}>
                                        <tr className="bg-slate-200 border-b border-slate-300">
                                            <td colSpan={4} className="px-6 py-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-slate-800">{user.user_name}</span>
                                                    <span className="text-sm text-slate-500">({user.user_email})</span>
                                                </div>
                                            </td>
                                        </tr>
                                        {user.inversiones.map((inv) => (
                                            <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 font-mono text-xs text-slate-500">#{inv.id}</td>
                                                <td className="px-6 py-4 font-medium text-slate-900">
                                                    {inv.codigo_asignado}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-slate-900">{inv.nombre_paquete}</div>
                                                    <div className="text-xs text-slate-500">{inv.nombre_periodo && inv.nombre_periodo !== 'N/A' ? `${inv.nombre_periodo} (${inv.meses_periodo} meses)` : 'N/A'}</div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-500 text-xs">
                                                    {inv.created_at ? new Date(inv.created_at).toLocaleString() : 'N/A'}
                                                </td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

