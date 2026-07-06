import React, { useEffect, useState, useMemo } from 'react';
import { investmentsService, AdminInvestment } from '../../../../services/investments';
import { Loader2, AlertCircle, Search, ChevronDown, ChevronRight, CheckCircle } from 'lucide-react';
import { ExpandedInvestmentCard } from '../components/ExpandedInvestmentCard';
import { Can } from '../../../../components/security/Can';
import { usePermissions } from '../../../../hooks/usePermissions';

export const AdminInvestmentsPage = () => {
    const { hasPermission } = usePermissions();
    const [activeTab, setActiveTab] = useState<'inversiones' | 'solicitudes'>(
        hasPermission('admin.investments.reales') ? 'inversiones' : 'solicitudes'
    );
    const [data, setData] = useState<AdminInvestment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'Todas' | 'Activa' | 'Finalizada'>('Todas');
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

    const getEstadoReal = (inv: AdminInvestment) => {
        if (!inv.fecha_finalizacion) return inv.estado || 'Activa';
        
        let diasReducidos = 0;
        if (inv.detalles_bonos) {
            inv.detalles_bonos.forEach(bono => {
                diasReducidos += bono.dias_reducidos || 0;
            });
        }
        
        const fechaFin = new Date(inv.fecha_finalizacion.includes('T') ? inv.fecha_finalizacion : `${inv.fecha_finalizacion}T12:00:00`);
        fechaFin.setDate(fechaFin.getDate() - diasReducidos);
        
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        fechaFin.setHours(0, 0, 0, 0);
        
        if (fechaFin <= hoy) {
            return 'Finalizada';
        }
        return 'Activa';
    };

    const filteredData = useMemo(() => {
        let result = data;
        
        if (statusFilter !== 'Todas') {
            result = result.filter(inv => getEstadoReal(inv) === statusFilter);
        }

        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(inv => 
                (inv.personal_info?.nombre_completo && inv.personal_info.nombre_completo.toLowerCase().includes(lowerQuery)) ||
                (inv.personal_info?.correo_electronico && inv.personal_info.correo_electronico.toLowerCase().includes(lowerQuery)) ||
                (inv.codigo_asignado && inv.codigo_asignado.toLowerCase().includes(lowerQuery)) ||
                (inv.personal_info?.documento && inv.personal_info.documento.includes(lowerQuery))
            );
        }
        
        return result;
    }, [data, searchQuery, statusFilter]);

    const formatCOP = (value: number | undefined) => {
        if (value === undefined || value === null) return '$0';
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
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
            <h1 className="text-2xl font-bold text-slate-800 mb-6">Administración de Inversiones</h1>
            
            {/* Tabs */}
            <div className="flex space-x-4 border-b border-slate-200 mb-6">
                {hasPermission('admin.investments.reales') && (
                    <button
                        onClick={() => setActiveTab('inversiones')}
                        className={`pb-4 px-2 text-sm font-medium transition-colors ${
                            activeTab === 'inversiones'
                                ? 'border-b-2 border-brand-600 text-brand-600'
                                : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        Inversiones Activas
                    </button>
                )}
                {hasPermission('admin.investments.requests') && (
                    <button
                        onClick={() => setActiveTab('solicitudes')}
                        className={`pb-4 px-2 text-sm font-medium transition-colors ${
                            activeTab === 'solicitudes'
                                ? 'border-b-2 border-brand-600 text-brand-600'
                                : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        Solicitudes Pendientes
                    </button>
                )}
            </div>
            
            {activeTab === 'inversiones' && (
                <Can permission="admin.investments.reales">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h2 className="font-semibold text-slate-800">Inversiones Activas</h2>
                            <p className="text-sm text-slate-500">
                                Viendo {filteredData.length} inversiones en el sistema.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as any)}
                                className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white"
                            >
                                <option value="Todas">Todas las Inversiones</option>
                                <option value="Activa">Solo Activas</option>
                                <option value="Finalizada">Solo Finalizadas</option>
                            </select>
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
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4 w-12 text-center"></th>
                                <th className="px-6 py-4">Usuario</th>
                                <th className="px-6 py-4">Inversión</th>
                                <th className="px-6 py-4">Wallet</th>
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
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1">
                                                        <div className="font-semibold text-slate-800">{inv.personal_info?.nombre_completo || 'Usuario'}</div>
                                                        <div className="text-xs text-slate-500">{inv.personal_info?.correo_electronico}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-mono text-xs text-slate-400">#{inv.id}</div>
                                                        <div className="text-xs font-medium text-slate-600">{inv.codigo_asignado || 'N/A'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-brand-600">
                                                    {inv.financial_info?.paquete_nombre !== 'N/A' && inv.financial_info?.paquete_nombre 
                                                        ? formatCOP(parseInt(inv.financial_info.paquete_nombre, 10)) 
                                                        : 'N/A'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-slate-800">
                                                    {formatCOP(inv.financial_info?.wallet_balance_actual || 0)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {(() => {
                                                    const estadoReal = getEstadoReal(inv);
                                                    return (
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${estadoReal === 'Activa' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                                                            <CheckCircle className="w-3 h-3" />
                                                            {estadoReal}
                                                        </span>
                                                    );
                                                })()}
                                            </td>
                                        </tr>
                                        
                                        {/* Expanded Details Row */}
                                        {expandedRows.has(inv.id) && (
                                            <tr>
                                                <td colSpan={5} className="p-0 border-b-2 border-brand-100">
                                                    <ExpandedInvestmentCard inv={inv} />
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
            </Can>
            )}

            {activeTab === 'solicitudes' && (
                <Can permission="admin.investments.requests">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                        <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="w-8 h-8 text-brand-600" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 mb-2">Solicitudes en Construcción</h2>
                        <p className="text-slate-500 max-w-md mx-auto">
                            El módulo de administración de solicitudes está siendo desarrollado. Pronto podrás revisar, aprobar y rechazar solicitudes de inversión desde aquí.
                        </p>
                    </div>
                </Can>
            )}
        </div>
    );
};
