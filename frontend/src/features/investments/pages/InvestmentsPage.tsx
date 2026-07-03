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
                                <th className="px-6 py-3 font-medium">Fecha Ingreso</th>
                                <th className="px-6 py-3 font-medium">Fecha Finalización</th>
                                <th className="px-6 py-3 font-medium">Fecha de Creación</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {respaldoData.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
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
                                            <td colSpan={6} className="px-6 py-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-slate-800">{user.user_name}</span>
                                                    <span className="text-sm text-slate-500">({user.user_email})</span>
                                                </div>
                                            </td>
                                        </tr>
                                        {/* Nested Section Container */}
                                        <tr>
                                            <td colSpan={6} className="p-0 border-b border-slate-300 bg-white">
                                                <div className="p-4 space-y-6">
                                                    {/* Inversiones */}
                                                    {user.inversiones && user.inversiones.length > 0 && (
                                                        <div>
                                                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Inversiones</h4>
                                                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                                                                <table className="w-full text-sm text-left">
                                                                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                                                                        <tr>
                                                                            <th className="px-4 py-2 font-medium">ID</th>
                                                                            <th className="px-4 py-2 font-medium">Código</th>
                                                                            <th className="px-4 py-2 font-medium">Paquete & Periodo</th>
                                                                            <th className="px-4 py-2 font-medium">Monto</th>
                                                                            <th className="px-4 py-2 font-medium">Fechas</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-100">
                                                                        {user.inversiones.map(inv => (
                                                                            <tr key={inv.id} className="hover:bg-slate-50">
                                                                                <td className="px-4 py-2 font-mono text-xs text-slate-500">#{inv.id}</td>
                                                                                <td className="px-4 py-2 font-medium text-slate-900">{inv.codigo_asignado}</td>
                                                                                <td className="px-4 py-2">
                                                                                    <div className="font-medium">{inv.nombre_paquete !== 'N/A' ? formatCOP(parseInt(inv.nombre_paquete, 10)) : 'N/A'}</div>
                                                                                    <div className="text-xs text-slate-500">{inv.nombre_periodo !== 'N/A' ? `${inv.nombre_periodo} (${inv.meses_periodo}m, ${inv.dias_periodo}d)` : 'N/A'}</div>
                                                                                </td>
                                                                                <td className="px-4 py-2 font-medium text-slate-900">{formatCOP(inv.monto)}</td>
                                                                                <td className="px-4 py-2 text-xs text-slate-500">
                                                                                    <div><span className="font-medium text-slate-700">Inicio:</span> {inv.fecha_ingreso || 'N/A'}</div>
                                                                                    <div><span className="font-medium text-slate-700">Fin:</span> {inv.fecha_finalizacion || 'N/A'}</div>
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Retiros */}
                                                    {user.retiros && user.retiros.length > 0 && (
                                                        <div>
                                                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Retiros</h4>
                                                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                                                                <table className="w-full text-sm text-left">
                                                                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                                                                        <tr>
                                                                            <th className="px-4 py-2 font-medium">ID</th>
                                                                            <th className="px-4 py-2 font-medium">Tipo</th>
                                                                            <th className="px-4 py-2 font-medium">Monto / Neto</th>
                                                                            <th className="px-4 py-2 font-medium">Estado</th>
                                                                            <th className="px-4 py-2 font-medium">Fecha Solicitud</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-100">
                                                                        {user.retiros.map(ret => (
                                                                            <tr key={ret.id} className="hover:bg-slate-50">
                                                                                <td className="px-4 py-2 font-mono text-xs text-slate-500">#{ret.id}</td>
                                                                                <td className="px-4 py-2 capitalize font-medium">{ret.tipo}</td>
                                                                                <td className="px-4 py-2">
                                                                                    <div className="text-slate-500 text-xs line-through">{formatCOP(ret.monto)}</div>
                                                                                    <div className="font-medium text-emerald-600">{formatCOP(ret.monto_neto)}</div>
                                                                                </td>
                                                                                <td className="px-4 py-2 capitalize"><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">{ret.estado}</span></td>
                                                                                <td className="px-4 py-2 text-xs text-slate-500">{new Date(ret.fecha_solicitud).toLocaleDateString()}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Solicitudes */}
                                                    {user.requests && user.requests.length > 0 && (
                                                        <div>
                                                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Solicitudes de Inversión</h4>
                                                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                                                                <table className="w-full text-sm text-left">
                                                                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                                                                        <tr>
                                                                            <th className="px-4 py-2 font-medium">ID</th>
                                                                            <th className="px-4 py-2 font-medium">Monto</th>
                                                                            <th className="px-4 py-2 font-medium">Estado</th>
                                                                            <th className="px-4 py-2 font-medium">Fecha Creación</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-100">
                                                                        {user.requests.map(req => (
                                                                            <tr key={req.id} className="hover:bg-slate-50">
                                                                                <td className="px-4 py-2 font-mono text-xs text-slate-500">#{req.id}</td>
                                                                                <td className="px-4 py-2 font-medium text-slate-900">{formatCOP(req.monto)}</td>
                                                                                <td className="px-4 py-2 capitalize"><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">{req.status}</span></td>
                                                                                <td className="px-4 py-2 text-xs text-slate-500">{new Date(req.created_at).toLocaleString()}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Aceleraciones */}
                                                    {user.accelerations && user.accelerations.length > 0 && (
                                                        <div>
                                                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Aceleraciones</h4>
                                                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                                                                <table className="w-full text-sm text-left">
                                                                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                                                                        <tr>
                                                                            <th className="px-4 py-2 font-medium">ID</th>
                                                                            <th className="px-4 py-2 font-medium">Aceleración</th>
                                                                            <th className="px-4 py-2 font-medium">Reducción (Días)</th>
                                                                            <th className="px-4 py-2 font-medium">Duración (Orig/Nva)</th>
                                                                            <th className="px-4 py-2 font-medium">Aplicado</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-100">
                                                                        {user.accelerations.map(acc => (
                                                                            <tr key={acc.id} className="hover:bg-slate-50">
                                                                                <td className="px-4 py-2 font-mono text-xs text-slate-500">#{acc.id}</td>
                                                                                <td className="px-4 py-2 font-medium text-brand-600">{acc.acceleration_percentage}%</td>
                                                                                <td className="px-4 py-2 font-medium text-red-500">-{acc.days_to_reduce}</td>
                                                                                <td className="px-4 py-2 text-xs">
                                                                                    <span className="text-slate-500 line-through">{acc.original_days}</span> -> <span className="font-medium text-slate-900">{acc.new_duration}</span>
                                                                                </td>
                                                                                <td className="px-4 py-2">
                                                                                    {acc.applied ? <span className="text-emerald-600 font-medium text-xs">Sí</span> : <span className="text-amber-500 font-medium text-xs">No</span>}
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Historiales */}
                                                    {user.histories && user.histories.length > 0 && (
                                                        <div>
                                                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Historiales de Contrato</h4>
                                                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                                                                <table className="w-full text-sm text-left">
                                                                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                                                                        <tr>
                                                                            <th className="px-4 py-2 font-medium">ID</th>
                                                                            <th className="px-4 py-2 font-medium">Monto</th>
                                                                            <th className="px-4 py-2 font-medium">Rend. / Acciones</th>
                                                                            <th className="px-4 py-2 font-medium">Tasa</th>
                                                                            <th className="px-4 py-2 font-medium">Fechas</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-100">
                                                                        {user.histories.map(hist => (
                                                                            <tr key={hist.id} className="hover:bg-slate-50">
                                                                                <td className="px-4 py-2 font-mono text-xs text-slate-500">#{hist.id}</td>
                                                                                <td className="px-4 py-2 font-medium text-slate-900">{formatCOP(hist.total_contrato)}</td>
                                                                                <td className="px-4 py-2 text-xs">
                                                                                    <div className="text-emerald-600 font-medium">R: {formatCOP(hist.rendimiento_total_generado)}</div>
                                                                                    <div className="text-blue-600 font-medium">A: {hist.acciones_otorgadas}</div>
                                                                                </td>
                                                                                <td className="px-4 py-2 font-medium text-slate-700">{hist.tasa_interes}</td>
                                                                                <td className="px-4 py-2 text-xs text-slate-500">
                                                                                    {new Date(hist.fecha_inicio).toLocaleDateString()} - {new Date(hist.fecha_fin).toLocaleDateString()}
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
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

