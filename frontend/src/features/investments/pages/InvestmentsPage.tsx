import React, { useEffect, useState } from 'react';
import { investmentsService, AdminInvestment } from '../../../services/investments';
import { Briefcase, Loader2, AlertCircle, User, Calendar, DollarSign } from 'lucide-react';

export const InvestmentsPage = () => {
    const [investments, setInvestments] = useState<AdminInvestment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchInvestments = async () => {
            try {
                setIsLoading(true);
                const data = await investmentsService.getAllInvestments();
                setInvestments(data);
            } catch (err: any) {
                setError(err.message || 'Error al cargar las inversiones');
            } finally {
                setIsLoading(false);
            }
        };

        fetchInvestments();
    }, []);

    // Agrupar por user_id
    const groupedInvestments = investments.reduce((acc, inv) => {
        const userId = inv.user_id || 0;
        if (!acc[userId]) acc[userId] = [];
        acc[userId].push(inv);
        return acc;
    }, {} as Record<number, AdminInvestment[]>);

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
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-brand-100 rounded-lg">
                    <Briefcase className="w-6 h-6 text-brand-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Auditoría de Inversiones</h1>
                    <p className="text-slate-500 text-sm">Listado global agrupado por usuario (Fase 1)</p>
                </div>
            </div>

            {Object.entries(groupedInvestments).map(([userId, userInvestments]) => {
                const primerInv = userInvestments[0];
                return (
                    <div key={userId} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold">
                                <User className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-800">{primerInv.nombre_completo || 'Usuario sin nombre'}</h3>
                                <p className="text-sm text-slate-500">{primerInv.correo_electronico || `ID: ${userId}`}</p>
                            </div>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-50/50">
                                    <tr>
                                        <th className="px-6 py-3 font-medium">Código</th>
                                        <th className="px-6 py-3 font-medium">Capital</th>
                                        <th className="px-6 py-3 font-medium">Rendimiento Total</th>
                                        <th className="px-6 py-3 font-medium">Rend. Diario</th>
                                        <th className="px-6 py-3 font-medium">Fechas</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {userInvestments.map((inv) => (
                                        <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-slate-700">
                                                {inv.codigo_asignado || `INV-${inv.id}`}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1 font-medium text-slate-800">
                                                    <DollarSign className="w-4 h-4 text-slate-400" />
                                                    {inv.total_contrato?.toLocaleString() || '0'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1 text-green-600 font-medium">
                                                    <DollarSign className="w-4 h-4" />
                                                    {inv.rendimiento_total_contrato?.toLocaleString() || '0'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">
                                                ${inv.liquidacion_diaria_rendimiento?.toLocaleString() || '0'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                                    <Calendar className="w-3 h-3" />
                                                    {inv.fecha_ingreso ? new Date(inv.fecha_ingreso).toLocaleDateString() : 'N/A'} 
                                                    {' - '} 
                                                    {inv.fecha_finalizacion ? new Date(inv.fecha_finalizacion).toLocaleDateString() : 'N/A'}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })}

            {investments.length === 0 && (
                <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                    <p className="text-slate-500">No hay inversiones registradas en el sistema.</p>
                </div>
            )}
        </div>
    );
};
