import React, { useEffect, useState, useMemo } from 'react';
import { auditoriaService, RespaldoInvestment, InversionDetail } from '../../../services/auditoria';
import { Loader2, AlertCircle, Search, ChevronDown, ChevronUp, User, Building, Briefcase, FileText, Calendar, ShieldCheck, DollarSign } from 'lucide-react';

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
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

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

    const toggleRow = (id: number) => {
        setExpandedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
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
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold text-slate-800 mb-6">Módulo de Inversiones (Admin)</h1>
            
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <h2 className="font-semibold text-slate-800">Inversiones Activas</h2>
                        <div className="relative w-full md:w-72">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar usuario, email, código, doc..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">ID / Código</th>
                                <th className="px-6 py-4">Usuario</th>
                                <th className="px-6 py-4">Paquete & Periodo</th>
                                <th className="px-6 py-4">Estado</th>
                                <th className="px-6 py-4 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {flatInvestments.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                        No se encontraron inversiones.
                                    </td>
                                </tr>
                            ) : (
                                flatInvestments.map((inv) => {
                                    const isExpanded = expandedRows.has(inv.id);
                                    
                                    return (
                                        <React.Fragment key={inv.id}>
                                            <tr 
                                                className={`hover:bg-slate-50 transition-colors cursor-pointer ${isExpanded ? 'bg-slate-50' : ''}`}
                                                onClick={() => toggleRow(inv.id)}
                                            >
                                                <td className="px-6 py-4 align-middle">
                                                    <div className="font-mono text-xs text-slate-500 mb-1">#{inv.id}</div>
                                                    <span className="font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded-md text-xs">{inv.codigo_asignado}</span>
                                                </td>
                                                <td className="px-6 py-4 align-middle">
                                                    <div className="font-medium text-slate-900 truncate max-w-[200px]">{inv.nombre_completo || inv.user_name}</div>
                                                    <div className="text-xs text-slate-500 truncate max-w-[200px]">{inv.user_email}</div>
                                                </td>
                                                <td className="px-6 py-4 align-middle">
                                                    <div className="font-medium text-slate-800">
                                                        {inv.nombre_paquete !== 'N/A' && !isNaN(parseInt(inv.nombre_paquete)) 
                                                            ? formatCOP(parseInt(inv.nombre_paquete, 10)) 
                                                            : inv.nombre_paquete}
                                                    </div>
                                                    <div className="text-xs text-emerald-600 font-medium">Inv. Base: {formatCOP(inv.monto)}</div>
                                                </td>
                                                <td className="px-6 py-4 align-middle capitalize">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                        inv.estado === 'active' ? 'bg-emerald-100 text-emerald-700' :
                                                        inv.estado === 'completed' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-slate-100 text-slate-700'
                                                    }`}>
                                                        {inv.estado || 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 align-middle text-center">
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); toggleRow(inv.id); }}
                                                        className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
                                                    >
                                                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                                    </button>
                                                </td>
                                            </tr>
                                            {/* EXPANDED AREA */}
                                            {isExpanded && (
                                                <tr className="bg-slate-50 border-b border-slate-200 shadow-inner">
                                                    <td colSpan={5} className="px-6 py-6">
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                                            
                                                            {/* Columna 1: Info Personal y Bancaria */}
                                                            <div className="space-y-4">
                                                                <div>
                                                                    <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3 border-b border-slate-200 pb-1">
                                                                        <User className="w-4 h-4 text-brand-500" />
                                                                        Información Personal
                                                                    </h4>
                                                                    <div className="space-y-2 text-sm">
                                                                        <div className="flex justify-between"><span className="text-slate-500">Documento:</span> <span className="font-medium text-slate-800">{inv.tipo_documento} {inv.documento || 'N/A'}</span></div>
                                                                        <div className="flex justify-between"><span className="text-slate-500">Celular:</span> <span className="font-medium text-slate-800">{inv.numero_celular || 'N/A'}</span></div>
                                                                        <div className="flex justify-between"><span className="text-slate-500">Ciudad:</span> <span className="font-medium text-slate-800">{inv.ciudad || 'N/A'}</span></div>
                                                                        <div className="flex justify-between"><span className="text-slate-500">Referido por:</span> <span className="font-medium text-slate-800">{inv.referido_por || 'N/A'}</span></div>
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3 border-b border-slate-200 pb-1">
                                                                        <Building className="w-4 h-4 text-brand-500" />
                                                                        Cuenta Bancaria
                                                                    </h4>
                                                                    {inv.banco ? (
                                                                        <div className="space-y-2 text-sm bg-white p-3 rounded-lg border border-slate-200">
                                                                            <div className="flex justify-between"><span className="text-slate-500">Banco:</span> <span className="font-medium text-slate-800">{inv.banco}</span></div>
                                                                            <div className="flex justify-between"><span className="text-slate-500">Tipo:</span> <span className="font-medium text-slate-800">{inv.tipo_cuenta}</span></div>
                                                                            <div className="flex justify-between"><span className="text-slate-500">Número:</span> <span className="font-medium text-slate-800">{inv.numero_cuenta}</span></div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                                                                            El usuario no tiene una cuenta bancaria registrada.
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Columna 2: Finanzas del Contrato */}
                                                            <div className="space-y-4">
                                                                <div>
                                                                    <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3 border-b border-slate-200 pb-1">
                                                                        <DollarSign className="w-4 h-4 text-emerald-500" />
                                                                        Finanzas del Contrato
                                                                    </h4>
                                                                    <div className="space-y-2 text-sm">
                                                                        <div className="flex justify-between"><span className="text-slate-500">Inversión Base:</span> <span className="font-medium text-emerald-600">{formatCOP(inv.monto)}</span></div>
                                                                        <div className="flex justify-between"><span className="text-slate-500">Total Contrato:</span> <span className="font-medium text-slate-800">{formatCOP(inv.total_contrato)}</span></div>
                                                                        <div className="flex justify-between"><span className="text-slate-500">Aprobado Mensual:</span> <span className="font-medium text-slate-800">{inv.rendimiento_aprobado_mensual ? `${inv.rendimiento_aprobado_mensual}%` : '-'}</span></div>
                                                                        <div className="flex justify-between"><span className="text-slate-500">Rentabilidad Contrato:</span> <span className="font-medium text-slate-800">{inv.rentabilidad_contrato ? `${inv.rentabilidad_contrato}%` : '-'}</span></div>
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3 border-b border-slate-200 pb-1">
                                                                        <Briefcase className="w-4 h-4 text-emerald-500" />
                                                                        Liquidación Diaria
                                                                    </h4>
                                                                    <div className="space-y-2 text-sm bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                                                                        <div className="flex justify-between"><span className="text-emerald-700">A Capital:</span> <span className="font-medium text-emerald-800">{formatCOP(inv.liquidacion_diaria_capital)}</span></div>
                                                                        <div className="flex justify-between"><span className="text-emerald-700">A Rendimiento:</span> <span className="font-medium text-emerald-800">{formatCOP(inv.liquidacion_diaria_rendimiento)}</span></div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Columna 3: Detalles Legales y Fechas */}
                                                            <div className="space-y-4">
                                                                <div>
                                                                    <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3 border-b border-slate-200 pb-1">
                                                                        <Calendar className="w-4 h-4 text-blue-500" />
                                                                        Periodo de Contrato
                                                                    </h4>
                                                                    <div className="space-y-2 text-sm">
                                                                        <div className="flex justify-between"><span className="text-slate-500">Nombre:</span> <span className="font-medium text-slate-800">{inv.nombre_periodo}</span></div>
                                                                        <div className="flex justify-between"><span className="text-slate-500">Duración:</span> <span className="font-medium text-slate-800">{inv.meses_periodo} meses, {inv.dias_periodo} días</span></div>
                                                                        <div className="flex justify-between"><span className="text-slate-500">Fecha Inicio:</span> <span className="font-medium text-slate-800">{inv.fecha_ingreso || 'N/A'}</span></div>
                                                                        <div className="flex justify-between"><span className="text-slate-500">Fecha Fin:</span> <span className="font-medium text-slate-800">{inv.fecha_finalizacion || 'N/A'}</span></div>
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3 border-b border-slate-200 pb-1">
                                                                        <ShieldCheck className="w-4 h-4 text-blue-500" />
                                                                        Seguridad y Acciones
                                                                    </h4>
                                                                    <div className="space-y-2 text-sm">
                                                                        <div className="flex justify-between items-center">
                                                                            <span className="text-slate-500">Validación TusDatos:</span> 
                                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                                                inv.tusdatos_status === 'APROBADO' ? 'bg-emerald-100 text-emerald-700' : 
                                                                                inv.tusdatos_status === 'RECHAZADO' ? 'bg-red-100 text-red-700' : 
                                                                                'bg-slate-200 text-slate-700'
                                                                            }`}>
                                                                                {inv.tusdatos_status || 'PENDIENTE'}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex justify-between"><span className="text-slate-500">Acciones Otorgadas:</span> <span className="font-medium text-brand-600">{inv.acciones_otorgadas || 0}</span></div>
                                                                        <div className="flex justify-between"><span className="text-slate-500">% Participación:</span> <span className="font-medium text-brand-600">{inv.porcentaje_participacion_accionista ? `${inv.porcentaje_participacion_accionista}%` : '0%'}</span></div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

