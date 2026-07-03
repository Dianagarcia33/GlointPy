import React, { useEffect, useState } from 'react';
import { auditoriaService, RespaldoInvestment } from '../../../services/auditoria';
import { Loader2, AlertCircle } from 'lucide-react';

export const InvestmentsPage = () => {
    const [respaldoData, setRespaldoData] = useState<RespaldoInvestment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <h2 className="font-semibold text-slate-800">Inversiones de Respaldo (Migración)</h2>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3 font-medium">ID Respaldo</th>
                                <th className="px-6 py-3 font-medium">Usuario</th>
                                <th className="px-6 py-3 font-medium">Monto</th>
                                <th className="px-6 py-3 font-medium">Estado</th>
                                <th className="px-6 py-3 font-medium">Fecha de Creación</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {respaldoData.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                        No hay datos de respaldo disponibles.
                                    </td>
                                </tr>
                            ) : (
                                respaldoData.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-xs text-slate-500">#{item.id}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-900">
                                                {item.user_nombre} {item.user_apellido}
                                            </div>
                                            <div className="text-xs text-slate-500">{item.correo_electronico}</div>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-900">
                                            {formatCOP(item.monto)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                                                item.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                                item.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-red-100 text-red-700'
                                            }`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 text-xs">
                                            {item.created_at ? new Date(item.created_at).toLocaleString() : 'N/A'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

