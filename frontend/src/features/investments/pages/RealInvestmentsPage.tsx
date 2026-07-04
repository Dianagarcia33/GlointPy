import React, { useEffect, useState, useMemo } from 'react';
import { auditoriaService, RespaldoInvestment, InversionDetail } from '../../../services/auditoria';
import { Loader2, AlertCircle, Search } from 'lucide-react';

interface FlatInvestment extends InversionDetail {
    user_name: string;
    user_email: string;
    user_id: string | number;
    banco?: string;
    tipo_cuenta?: string;
    numero_cuenta?: string;
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
            const primaryBank = user.bank_accounts && user.bank_accounts.length > 0 ? user.bank_accounts[0] : null;
            
            if (user.inversiones && user.inversiones.length > 0) {
                user.inversiones.forEach(inv => {
                    flats.push({
                        ...inv,
                        user_name: user.user_name,
                        user_email: user.user_email,
                        user_id: user.user_id,
                        banco: primaryBank?.banco,
                        tipo_cuenta: primaryBank?.tipo_cuenta,
                        numero_cuenta: primaryBank?.numero_cuenta,
                    });
                });
            }
        });

        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            return flats.filter(inv => 
                inv.user_name.toLowerCase().includes(lowerQuery) || 
                inv.user_email.toLowerCase().includes(lowerQuery) ||
                (inv.codigo_asignado && inv.codigo_asignado.toLowerCase().includes(lowerQuery)) ||
                (inv.documento && inv.documento.includes(lowerQuery))
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
        <div className="p-8 max-w-full mx-auto">
            <h1 className="text-2xl font-bold text-slate-800 mb-6">Módulo de Inversiones (Admin)</h1>
            
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <h2 className="font-semibold text-slate-800">Inversiones Activas (Tabla 'investors')</h2>
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar usuario, email, código, doc..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent w-72"
                            />
                        </div>
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap min-w-[1500px]">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3 border-r border-slate-200">ID / Código</th>
                                <th className="px-4 py-3 border-r border-slate-200">Info Usuario</th>
                                <th className="px-4 py-3 border-r border-slate-200">Cuenta Bancaria</th>
                                <th className="px-4 py-3 border-r border-slate-200">Paquete & Periodo</th>
                                <th className="px-4 py-3 border-r border-slate-200">Inversión Base</th>
                                <th className="px-4 py-3 border-r border-slate-200">Rendimientos</th>
                                <th className="px-4 py-3 border-r border-slate-200">Acciones / T. Datos</th>
                                <th className="px-4 py-3">Estado & Fechas</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {flatInvestments.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                                        No se encontraron inversiones.
                                    </td>
                                </tr>
                            ) : (
                                flatInvestments.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors text-sm">
                                        <td className="px-4 py-3 border-r border-slate-100 align-top">
                                            <div className="font-mono text-xs text-slate-500 mb-1">#{inv.id}</div>
                                            <span className="font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded-md text-xs">{inv.codigo_asignado}</span>
                                        </td>
                                        <td className="px-4 py-3 border-r border-slate-100 align-top max-w-[250px] truncate">
                                            <div className="font-medium text-slate-900">{inv.nombre_completo || inv.user_name}</div>
                                            <div className="text-xs text-slate-500">{inv.user_email} (ID: {inv.user_id})</div>
                                            {(inv.documento || inv.numero_celular) && (
                                                <div className="text-xs text-slate-500 mt-1">
                                                    {inv.tipo_documento} {inv.documento} • {inv.numero_celular}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 border-r border-slate-100 align-top">
                                            {inv.banco ? (
                                                <>
                                                    <div className="font-medium text-slate-800">{inv.banco}</div>
                                                    <div className="text-xs text-slate-500">{inv.tipo_cuenta}: {inv.numero_cuenta}</div>
                                                </>
                                            ) : (
                                                <span className="text-xs text-amber-500 font-medium">Sin cuenta</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 border-r border-slate-100 align-top">
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
                                        <td className="px-4 py-3 border-r border-slate-100 align-top">
                                            <div className="text-xs text-slate-500">Monto Invertido</div>
                                            <div className="font-medium text-emerald-600 mb-1">{formatCOP(inv.monto)}</div>
                                            <div className="text-xs text-slate-500">Total Contrato</div>
                                            <div className="font-medium text-slate-800">{formatCOP(inv.total_contrato)}</div>
                                        </td>
                                        <td className="px-4 py-3 border-r border-slate-100 align-top">
                                            <div className="text-xs text-slate-500 flex justify-between gap-4">
                                                <span>Aprobado Mensual:</span>
                                                <span className="font-medium text-slate-700">{inv.rendimiento_aprobado_mensual ? `${inv.rendimiento_aprobado_mensual}%` : '-'}</span>
                                            </div>
                                            <div className="text-xs text-slate-500 flex justify-between gap-4">
                                                <span>Rentabilidad Cont.:</span>
                                                <span className="font-medium text-slate-700">{inv.rentabilidad_contrato ? `${inv.rentabilidad_contrato}%` : '-'}</span>
                                            </div>
                                            <div className="text-xs text-slate-500 flex justify-between gap-4 mt-1 border-t border-slate-100 pt-1">
                                                <span>Liq. Capital:</span>
                                                <span className="font-medium text-blue-600">{formatCOP(inv.liquidacion_diaria_capital)}</span>
                                            </div>
                                            <div className="text-xs text-slate-500 flex justify-between gap-4">
                                                <span>Liq. Rendimiento:</span>
                                                <span className="font-medium text-emerald-600">{formatCOP(inv.liquidacion_diaria_rendimiento)}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 border-r border-slate-100 align-top">
                                            <div className="text-xs text-slate-500 flex justify-between gap-4">
                                                <span>Acciones Otor.:</span>
                                                <span className="font-medium text-brand-600">{inv.acciones_otorgadas || 0}</span>
                                            </div>
                                            <div className="text-xs text-slate-500 flex justify-between gap-4">
                                                <span>% Partic.:</span>
                                                <span className="font-medium text-brand-600">{inv.porcentaje_participacion_accionista ? `${inv.porcentaje_participacion_accionista}%` : '0%'}</span>
                                            </div>
                                            <div className="text-xs text-slate-500 flex justify-between gap-4 mt-1 border-t border-slate-100 pt-1">
                                                <span>TusDatos:</span>
                                                <span className={`font-medium ${inv.tusdatos_status === 'APROBADO' ? 'text-emerald-500' : inv.tusdatos_status === 'RECHAZADO' ? 'text-red-500' : 'text-slate-500'}`}>
                                                    {inv.tusdatos_status || 'Pendiente'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 align-top">
                                            <span className={`inline-block mb-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                                                inv.estado === 'active' ? 'bg-emerald-100 text-emerald-700' :
                                                inv.estado === 'completed' ? 'bg-blue-100 text-blue-700' :
                                                'bg-slate-100 text-slate-700'
                                            }`}>
                                                {inv.estado || 'N/A'}
                                            </span>
                                            <div className="text-xs text-slate-500">
                                                <div><span className="font-medium text-slate-700">Inicio:</span> {inv.fecha_ingreso || 'N/A'}</div>
                                                <div><span className="font-medium text-slate-700">Fin:</span> {inv.fecha_finalizacion || 'N/A'}</div>
                                                <div><span className="font-medium text-slate-700">Ref:</span> {inv.referido_por || 'N/A'}</div>
                                            </div>
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

