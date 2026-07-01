import React, { useEffect, useState } from 'react';
import { investmentsService, AdminInvestment } from '../../../services/investments';
import { Briefcase, Loader2, AlertCircle, User, Calendar, DollarSign } from 'lucide-react';

export const InvestmentsPage = () => {
    const [investments, setInvestments] = useState<AdminInvestment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showOnlyWithCapitalWithdrawals, setShowOnlyWithCapitalWithdrawals] = useState(false);

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

    // Filter logic
    const filteredInvestments = investments.filter(inv => {
        if (!showOnlyWithCapitalWithdrawals) return true;
        
        const initialCapitalStr = inv.paquete_nombre;
        if (!initialCapitalStr) return false;
        
        const initialCapital = parseFloat(initialCapitalStr);
        if (isNaN(initialCapital)) return false;
        
        return inv.capital_actual !== undefined && inv.capital_actual < initialCapital;
    });

    // Agrupar por user_id
    const groupedInvestments = filteredInvestments.reduce((acc, inv) => {
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

    const formatCOP = (value: number | undefined) => {
        if (value === undefined || value === null) return '$0';
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 10
        }).format(value);
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-brand-100 rounded-lg">
                        <Briefcase className="w-6 h-6 text-brand-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Auditoría de Inversiones</h1>
                        <p className="text-slate-500 text-sm">Listado global agrupado por usuario (Fase 1)</p>
                    </div>
                </div>
                
                <label className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors">
                    <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-4 h-4"
                        checked={showOnlyWithCapitalWithdrawals}
                        onChange={(e) => setShowOnlyWithCapitalWithdrawals(e.target.checked)}
                    />
                    <span className="text-sm font-medium text-slate-700">Solo retiros de capital</span>
                </label>
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
                                        <th className="px-6 py-3 font-medium">Rend. Diario (Calc)</th>
                                        <th className="px-6 py-3 font-medium">Producido (Hasta Ayer)</th>
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
                                                <div className="font-medium text-slate-800">
                                                    {isNaN(parseFloat(inv.paquete_nombre || '')) ? (inv.paquete_nombre || 'Desconocido') : formatCOP(parseFloat(inv.paquete_nombre!))}
                                                </div>
                                                {(inv.capital_actual !== undefined && !isNaN(parseFloat(inv.paquete_nombre || '')) && inv.capital_actual < parseFloat(inv.paquete_nombre!)) && (
                                                    <div className="text-xs text-red-600 font-bold mt-1">
                                                        Capital Actual: {formatCOP(inv.capital_actual)}
                                                    </div>
                                                )}
                                                <div className="text-xs text-slate-400 mt-0.5">
                                                    {inv.periodo_porcentaje !== undefined && inv.periodo_porcentaje !== null 
                                                        ? `${inv.periodo_porcentaje}% - ${inv.periodo_meses} Meses (${inv.periodo_dias} Días)` 
                                                        : 'Periodo Desconocido'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-slate-700 font-medium">
                                                    {formatCOP(inv.rendimiento_diario_calculado)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-green-600 font-bold">
                                                        {formatCOP(inv.rendimiento_producido_hasta_ayer)}
                                                    </span>
                                                    <span className="text-xs text-slate-500 mt-0.5">
                                                        {inv.dias_generando || 0} días transcurridos
                                                    </span>
                                                    {inv.tramos_desglose && inv.tramos_desglose.length > 0 && (
                                                        <div className="mt-2 space-y-1.5 min-w-[180px]">
                                                            {inv.tramos_desglose.map((tramo, idx) => (
                                                                <div key={idx} className="text-[10px] text-slate-500 bg-slate-50 p-1.5 rounded border border-slate-100 shadow-sm">
                                                                    <div className="flex justify-between items-center mb-1 border-b border-slate-200 pb-1">
                                                                        <span className="font-medium text-slate-700">Tramo {idx + 1} <span className="text-slate-400 font-normal">({tramo.dias}d)</span></span>
                                                                        <span className="text-brand-600 font-medium">{String(tramo.fecha_inicio).split('T')[0]} - {String(tramo.fecha_fin).split('T')[0]}</span>
                                                                    </div>
                                                                    <div className="space-y-0.5">
                                                                        <div className="flex justify-between items-center">
                                                                            <span className="text-slate-500">Capital Base:</span>
                                                                            <span className="text-slate-700 font-medium">{formatCOP(tramo.capital_base)}</span>
                                                                        </div>
                                                                        <div className="flex justify-between items-center">
                                                                            <span className="text-slate-500">Rend. Diario:</span>
                                                                            <span className="text-slate-700 font-medium">{formatCOP(tramo.rendimiento_diario)}/día</span>
                                                                        </div>
                                                                        <div className="flex justify-between items-center border-t border-slate-100 pt-0.5 mt-0.5">
                                                                            <span className="text-slate-500 font-medium">Producido:</span>
                                                                            <span className="text-green-600 font-bold">+{formatCOP(tramo.producido)}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                                    <Calendar className="w-3 h-3" />
                                                    {inv.fecha_ingreso ? String(inv.fecha_ingreso).split('T')[0] : 'N/A'} 
                                                    {' - '} 
                                                    {inv.fecha_finalizacion ? String(inv.fecha_finalizacion).split('T')[0] : 'N/A'}
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
