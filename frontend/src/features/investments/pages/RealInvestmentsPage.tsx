import React, { useEffect, useState, useMemo } from 'react';
import { auditoriaService, RespaldoInvestment, InversionDetail } from '../../../services/auditoria';
import { Loader2, AlertCircle, Search } from 'lucide-react';

interface FlatInvestment extends InversionDetail {
    user_name: string;
    user_email: string;
    user_id: string | number;
}

export const RealInvestmentsPage = () => {
    const [data, setData] = useState<RespaldoInvestment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const res = await auditoriaService.getRealInversiones();
            setData(res);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Error al cargar los datos');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const flatInvestments = useMemo(() => {
        const flats: FlatInvestment[] = [];
        data.forEach(user => {
            if (user.inversiones && user.inversiones.length > 0) {
                user.inversiones.forEach(inv => {
                    flats.push({
                        ...inv,
                        user_name: user.user_name,
                        user_email: user.user_email,
                        user_id: user.user_id,
                    });
                });
            }
        });

        // Filter by search query
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            return flats.filter(inv => 
                inv.user_name.toLowerCase().includes(lowerQuery) || 
                inv.user_email.toLowerCase().includes(lowerQuery) ||
                (inv.codigo_asignado && inv.codigo_asignado.toLowerCase().includes(lowerQuery))
            );
        }
        return flats;
    }, [data, searchQuery]);

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
            <h1 className="text-2xl font-bold text-slate-800 mb-6">Módulo de Inversiones (Admin)</h1>
            
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <h2 className="font-semibold text-slate-800">Inversiones Activas (Tabla 'investors')</h2>
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar usuario o código..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent w-64"
                            />
                        </div>
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap min-w-[1000px]">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">ID Inversión</th>
                                <th className="px-6 py-4">Usuario</th>
                                <th className="px-6 py-4">Código</th>
                                <th className="px-6 py-4">Paquete & Periodo</th>
                                <th className="px-6 py-4">Monto</th>
                                <th className="px-6 py-4">Estado</th>
                                <th className="px-6 py-4">Fechas (Inicio / Fin)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {flatInvestments.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                                        No se encontraron inversiones.
                                    </td>
                                </tr>
                            ) : (
                                flatInvestments.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-xs text-slate-500">
                                            #{inv.id}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-900">{inv.user_name}</div>
                                            <div className="text-xs text-slate-500">{inv.user_email} (ID: {inv.user_id})</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded-md text-xs">{inv.codigo_asignado}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-800">
                                                {inv.nombre_paquete !== 'N/A' && !isNaN(parseInt(inv.nombre_paquete)) 
                                                    ? formatCOP(parseInt(inv.nombre_paquete, 10)) 
                                                    : inv.nombre_paquete}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {inv.nombre_periodo !== 'N/A' 
                                                    ? `${inv.nombre_periodo} (${inv.meses_periodo}m, ${inv.dias_periodo}d)` 
                                                    : 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-emerald-600">
                                            {formatCOP(inv.monto)}
                                        </td>
                                        <td className="px-6 py-4 capitalize">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                inv.estado === 'active' ? 'bg-emerald-100 text-emerald-700' :
                                                inv.estado === 'completed' ? 'bg-blue-100 text-blue-700' :
                                                'bg-slate-100 text-slate-700'
                                            }`}>
                                                {inv.estado || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-slate-500">
                                            <div><span className="font-medium text-slate-700">Inicio:</span> {inv.fecha_ingreso || 'N/A'}</div>
                                            <div><span className="font-medium text-slate-700">Fin:</span> {inv.fecha_finalizacion || 'N/A'}</div>
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

