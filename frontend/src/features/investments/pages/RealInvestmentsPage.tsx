import React, { useEffect, useState, useMemo } from 'react';
import { investmentsService, AdminInvestment } from '../../../services/investments';
import { Loader2, AlertCircle, Search, User, CreditCard, ShieldCheck, ChevronDown, ChevronRight, Banknote, Calendar, CheckCircle, Smartphone, MapPin, Percent } from 'lucide-react';

export const RealInvestmentsPage = () => {
    const [data, setData] = useState<AdminInvestment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const res = await investmentsService.getAllInvestments();
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

    const filteredData = useMemo(() => {
        if (!searchQuery) return data;
        const lowerQuery = searchQuery.toLowerCase();
        return data.filter(inv => 
            (inv.nombre_completo && inv.nombre_completo.toLowerCase().includes(lowerQuery)) ||
            (inv.correo_electronico && inv.correo_electronico.toLowerCase().includes(lowerQuery)) ||
            (inv.codigo_asignado && inv.codigo_asignado.toLowerCase().includes(lowerQuery)) ||
            (inv.documento && inv.documento.includes(lowerQuery))
        );
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
        const newSet = new Set(expandedRows);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setExpandedRows(newSet);
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
                        <div>
                            <h2 className="font-semibold text-slate-800">Inversiones Activas (Tabla 'investors')</h2>
                            <p className="text-sm text-slate-500">
                                Viendo {filteredData.length} inversiones en tiempo real.
                            </p>
                        </div>
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar inversión..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent w-64"
                            />
                        </div>
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4 w-12 text-center">Detalles</th>
                                <th className="px-6 py-4">ID / Código</th>
                                <th className="px-6 py-4">Usuario</th>
                                <th className="px-6 py-4">Paquete Base</th>
                                <th className="px-6 py-4 text-center">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                        No se encontraron inversiones.
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((inv) => (
                                    <React.Fragment key={inv.id}>
                                        <tr 
                                            className={`hover:bg-slate-50 cursor-pointer transition-colors ${expandedRows.has(inv.id) ? 'bg-slate-50' : ''}`}
                                            onClick={() => toggleRow(inv.id)}
                                        >
                                            <td className="px-6 py-4 text-center text-slate-400">
                                                {expandedRows.has(inv.id) ? <ChevronDown className="w-5 h-5 mx-auto" /> : <ChevronRight className="w-5 h-5 mx-auto" />}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-mono text-sm text-slate-500">#{inv.id}</div>
                                                <div className="font-medium text-slate-900">{inv.codigo_asignado || 'N/A'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-slate-800">{inv.nombre_completo || 'Usuario'}</div>
                                                <div className="text-sm text-slate-500">{inv.correo_electronico}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-brand-600">
                                                    {inv.paquete_nombre !== 'N/A' && inv.paquete_nombre ? formatCOP(parseInt(inv.paquete_nombre, 10)) : 'N/A'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${inv.estado?.toLowerCase() === 'activo' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                                                    <CheckCircle className="w-3 h-3" />
                                                    {inv.estado || 'N/A'}
                                                </span>
                                            </td>
                                        </tr>
                                        
                                        {/* Expanded Details Row */}
                                        {expandedRows.has(inv.id) && (
                                            <tr>
                                                <td colSpan={5} className="p-0 border-b-2 border-brand-100">
                                                    <div className="bg-slate-50 p-6 shadow-inner flex flex-col gap-6">
                                                        
                                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                                            {/* COL 1: Información Personal y Bancaria */}
                                                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                                                                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                                                                    <User className="w-5 h-5 text-brand-500" />
                                                                    <h3 className="font-semibold text-slate-800">Información Personal</h3>
                                                                </div>
                                                                <div className="space-y-3 text-sm">
                                                                    <div><span className="text-slate-500 text-xs uppercase tracking-wider block">ID de Usuario</span><span className="font-medium text-slate-800">{inv.user_id}</span></div>
                                                                    <div><span className="text-slate-500 text-xs uppercase tracking-wider block">Documento</span><span className="font-medium text-slate-800">{inv.tipo_documento} {inv.documento}</span></div>
                                                                    <div><span className="text-slate-500 text-xs uppercase tracking-wider block">Referido Por</span><span className="font-medium text-slate-800">{inv.referido_por || 'Ninguno'}</span></div>
                                                                    
                                                                    <div className="grid grid-cols-2 gap-4">
                                                                        <div className="flex items-center gap-2"><Smartphone className="w-4 h-4 text-slate-400" /><span className="font-medium text-slate-800">{inv.numero_celular || 'N/A'}</span></div>
                                                                        <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-slate-400" /><span className="font-medium text-slate-800">{inv.ciudad || 'N/A'}</span></div>
                                                                    </div>
                                                                    <div><span className="text-slate-500 text-xs uppercase tracking-wider block">Fecha de Nacimiento</span><span className="font-medium text-slate-800">{inv.fecha_nacimiento || 'N/A'}</span></div>
                                                                    
                                                                    <div className="mt-4 pt-4 border-t border-slate-100">
                                                                        <div className="flex items-center gap-2 mb-2">
                                                                            <CreditCard className="w-4 h-4 text-brand-500" />
                                                                            <h4 className="font-semibold text-slate-700 text-xs uppercase">Cuenta Bancaria</h4>
                                                                        </div>
                                                                        {inv.banco ? (
                                                                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                                                <div className="font-medium text-brand-700">{inv.banco}</div>
                                                                                <div className="text-slate-600 capitalize">{inv.tipo_cuenta}</div>
                                                                                <div className="font-mono text-slate-800 tracking-wider mt-1">{inv.numero_cuenta}</div>
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-slate-400 italic">No registrada</span>
                                                                        )}
                                                                    </div>
                                                                    
                                                                    <div className="mt-4 pt-4 border-t border-slate-100">
                                                                        <div className="flex items-center gap-2 mb-2">
                                                                            <User className="w-4 h-4 text-brand-500" />
                                                                            <h4 className="font-semibold text-slate-700 text-xs uppercase">Rep. Legal</h4>
                                                                        </div>
                                                                        {inv.representante_legal_nombre ? (
                                                                            <div className="space-y-1">
                                                                                <div className="font-medium text-slate-800">{inv.representante_legal_nombre}</div>
                                                                                <div className="text-slate-600">Doc: {inv.representante_legal_documento}</div>
                                                                                <div className="text-slate-600">{inv.representante_legal_email}</div>
                                                                                <div className="text-slate-600">{inv.representante_legal_telefono}</div>
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-slate-400 italic">No registrado</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            
                                                            {/* COL 2: Finanzas */}
                                                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                                                                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                                                                    <Banknote className="w-5 h-5 text-emerald-500" />
                                                                    <h3 className="font-semibold text-slate-800">Finanzas del Contrato</h3>
                                                                </div>
                                                                <div className="space-y-3 text-sm">
                                                                    <div className="flex justify-between items-center bg-emerald-50 p-2 rounded border border-emerald-100">
                                                                        <span className="text-emerald-700 font-medium">Total Contrato</span>
                                                                        <span className="font-bold text-emerald-800">{formatCOP(inv.total_contrato)}</span>
                                                                    </div>
                                                                    <div className="flex justify-between items-center bg-blue-50 p-2 rounded border border-blue-100">
                                                                        <span className="text-blue-700 font-medium">Rendimiento Total (Proyectado)</span>
                                                                        <span className="font-bold text-blue-800">{formatCOP(inv.rendimiento_total_contrato)}</span>
                                                                    </div>
                                                                    
                                                                    <div className="grid grid-cols-2 gap-4 mt-2">
                                                                        <div><span className="text-slate-500 text-xs uppercase tracking-wider block">Liq. Diaria Cap.</span><span className="font-medium text-slate-800">{formatCOP(inv.liquidacion_diaria_capital)}</span></div>
                                                                        <div><span className="text-slate-500 text-xs uppercase tracking-wider block">Liq. Diaria Rend.</span><span className="font-medium text-slate-800">{formatCOP(inv.liquidacion_diaria_rendimiento)}</span></div>
                                                                    </div>
                                                                    
                                                                    <div className="grid grid-cols-2 gap-4 mt-2">
                                                                        <div><span className="text-slate-500 text-xs uppercase tracking-wider block">Rend. Aprob. Mensual</span><span className="font-medium text-slate-800">{formatCOP(inv.rendimiento_aprobado_mensual)}</span></div>
                                                                        <div><span className="text-slate-500 text-xs uppercase tracking-wider block">Rentabilidad Contrato</span><span className="font-medium text-slate-800">{formatCOP(inv.rentabilidad_contrato)}</span></div>
                                                                    </div>

                                                                    <div className="mt-4 pt-4 border-t border-slate-100">
                                                                        <h4 className="font-semibold text-slate-700 text-xs uppercase mb-2">Acciones</h4>
                                                                        <div className="grid grid-cols-2 gap-4">
                                                                            <div><span className="text-slate-500 text-xs block">Acciones Otorgadas</span><span className="font-medium text-brand-600">{inv.acciones_otorgadas || 0}</span></div>
                                                                            <div><span className="text-slate-500 text-xs block">Participación</span><span className="font-medium text-brand-600 flex items-center gap-1"><Percent className="w-3 h-3"/> {inv.porcentaje_participacion_accionista || 0}</span></div>
                                                                        </div>
                                                                        <div className="mt-2"><span className="text-slate-500 text-xs block">Valor Total Acciones</span><span className="font-medium text-slate-800">{formatCOP(inv.valor_total_acciones)}</span></div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            
                                                            {/* COL 3: Auditoría y Seguridad */}
                                                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                                                                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                                                                    <ShieldCheck className="w-5 h-5 text-indigo-500" />
                                                                    <h3 className="font-semibold text-slate-800">Auditoría y Tiempos</h3>
                                                                </div>
                                                                
                                                                <div className="space-y-3 text-sm">
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="text-slate-500 font-medium flex items-center gap-1"><Calendar className="w-4 h-4"/> Fecha Ingreso</span>
                                                                        <span className="font-medium text-slate-800">{inv.fecha_ingreso || 'N/A'}</span>
                                                                    </div>
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="text-slate-500 font-medium flex items-center gap-1"><Calendar className="w-4 h-4"/> Fecha Fin</span>
                                                                        <span className="font-medium text-slate-800">{inv.fecha_finalizacion || 'N/A'}</span>
                                                                    </div>
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="text-slate-500 font-medium">Días Contrato</span>
                                                                        <span className="font-medium text-slate-800">{inv.dias_contrato || 'N/A'}</span>
                                                                    </div>
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="text-slate-500 font-medium">Paquete Adquirido ID</span>
                                                                        <span className="font-medium text-slate-800">{inv.paquete_inversion_adquirido || 'N/A'}</span>
                                                                    </div>

                                                                    <div className="mt-4 pt-4 border-t border-slate-100">
                                                                        <h4 className="font-semibold text-slate-700 text-xs uppercase mb-2">TusDatos (KYC)</h4>
                                                                        <div><span className="text-slate-500 text-xs uppercase tracking-wider block">Status</span>
                                                                            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${inv.tusdatos_status?.toLowerCase() === 'aprobado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                                                {inv.tusdatos_status || 'Pendiente'}
                                                                            </span>
                                                                        </div>
                                                                        <div className="mt-2"><span className="text-slate-500 text-xs uppercase tracking-wider block">Job ID</span><span className="font-mono text-xs text-slate-600 break-all">{inv.tusdatos_job_id || 'N/A'}</span></div>
                                                                        <div className="mt-2"><span className="text-slate-500 text-xs uppercase tracking-wider block">Report ID</span><span className="font-mono text-xs text-slate-600 break-all">{inv.tusdatos_report_id || 'N/A'}</span></div>
                                                                        {inv.tusdatos_hallazgos && <div className="mt-2 p-2 bg-slate-50 rounded text-xs text-slate-600 border border-slate-200"><strong>Hallazgos:</strong> {inv.tusdatos_hallazgos}</div>}
                                                                        {inv.tusdatos_justificacion && <div className="mt-2 p-2 bg-slate-50 rounded text-xs text-slate-600 border border-slate-200"><strong>Justificación:</strong> {inv.tusdatos_justificacion}</div>}
                                                                        <div className="mt-2"><span className="text-slate-500 text-xs block">Fecha Último Check: {inv.tusdatos_last_check || 'N/A'}</span></div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* RAW TIMESTAMPS & OBSERVACIONES */}
                                                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-sm">
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                <div>
                                                                    <span className="text-slate-500 font-medium">Observaciones Adicionales:</span>
                                                                    <p className="mt-1 text-slate-700 italic">{inv.observaciones || 'Ninguna'}</p>
                                                                </div>
                                                                <div className="text-right text-xs text-slate-400 space-y-1">
                                                                    <div>Creado: {inv.created_at ? new Date(inv.created_at).toLocaleString() : 'N/A'}</div>
                                                                    <div>Actualizado: {inv.updated_at ? new Date(inv.updated_at).toLocaleString() : 'N/A'}</div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                    </div>
                                                </td>
                                            </tr>
                                        )}
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
