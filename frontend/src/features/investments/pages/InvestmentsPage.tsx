import React, { useEffect, useState, useMemo } from 'react';
import { auditoriaService, RespaldoInvestment } from '../../../services/auditoria';
import { Loader2, AlertCircle, Search } from 'lucide-react';

export const InvestmentsPage = () => {
    const [respaldoData, setRespaldoData] = useState<RespaldoInvestment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Advanced Filters
    const [filterOneInvestment, setFilterOneInvestment] = useState(false);
    const [filterNoRetiros, setFilterNoRetiros] = useState(false);
    const [filterOneRequest, setFilterOneRequest] = useState(false);

    // Selection
    const [selectedUsers, setSelectedUsers] = useState<Set<number | string>>(new Set());
    const [migrating, setMigrating] = useState(false);
    
    // Migration Modal
    const [showMigrationModal, setShowMigrationModal] = useState(false);
    const [manualWithdrawals, setManualWithdrawals] = useState<Record<string, any>>({});

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const data = await auditoriaService.getRespaldoInversiones();
            setRespaldoData(data);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Error al cargar los datos de respaldo');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredUsers = useMemo(() => {
        return respaldoData.filter(user => {
            // Text search
            if (searchQuery) {
                const searchLower = searchQuery.toLowerCase();
                const matchesName = user.user_name?.toLowerCase().includes(searchLower);
                const matchesEmail = user.user_email?.toLowerCase().includes(searchLower);
                if (!matchesName && !matchesEmail) return false;
            }

            // Advanced filters
            if (filterOneInvestment && (!user.inversiones || user.inversiones.length !== 1)) return false;
            if (filterNoRetiros && user.retiros && user.retiros.length > 0) return false;
            if (filterOneRequest && (!user.requests || user.requests.length !== 1)) return false;

            return true;
        });
    }, [respaldoData, searchQuery, filterOneInvestment, filterNoRetiros, filterOneRequest]);

    const openMigrationModal = () => {
        const initialWithdrawals: Record<string, any> = {};
        Array.from(selectedUsers).forEach(uid => {
            initialWithdrawals[uid] = { enabled: false, monto: '', fecha: new Date().toISOString().split('T')[0], metodo_pago: 'Transferencia', observaciones: '' };
        });
        setManualWithdrawals(initialWithdrawals);
        setShowMigrationModal(true);
    };

    const handleConfirmMigration = async () => {
        setMigrating(true);
        try {
            const userIdsArray = Array.from(selectedUsers).map(id => Number(id));
            const withdrawalsList = Object.entries(manualWithdrawals)
                .filter(([uid, data]) => data.enabled && data.monto > 0)
                .map(([uid, data]) => ({
                    user_id: Number(uid),
                    monto: Number(data.monto),
                    fecha: data.fecha,
                    metodo_pago: data.metodo_pago,
                    observaciones: data.observaciones
                }));

            const res = await auditoriaService.migrateBatch(userIdsArray, withdrawalsList);
            alert(`Se migraron ${res.migrated} usuarios exitosamente.`);
            setSelectedUsers(new Set());
            setShowMigrationModal(false);
            fetchData();
        } catch (error: any) {
            console.error("Error migrating:", error);
            alert(`Ocurrió un error en la migración: ${error.message || 'Error desconocido'}`);
        } finally {
            setMigrating(false);
        }
    };

    const formatCOP = (value: number | undefined) => {
        if (value === undefined || value === null) return '$0';
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
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
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                        <h2 className="font-semibold text-slate-800">Inversiones de Respaldo (Migración)</h2>
                        <div className="flex items-center gap-3">
                            {selectedUsers.size > 0 && (
                                <button
                                    onClick={openMigrationModal}
                                    disabled={migrating}
                                    className="bg-brand-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-brand-700 transition disabled:opacity-50"
                                >
                                    {migrating ? 'Migrando...' : `Migrar Seleccionados (${selectedUsers.size})`}
                                </button>
                            )}
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
                    </div>
                    
                    {/* Advanced Filters */}
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="text-sm text-slate-500 font-medium">Filtros rápidos:</span>
                        <label className="flex items-center gap-2 text-sm bg-white border border-slate-200 px-3 py-1.5 rounded-full cursor-pointer hover:bg-slate-50 transition">
                            <input type="checkbox" checked={filterOneInvestment} onChange={e => setFilterOneInvestment(e.target.checked)} className="rounded text-brand-600 focus:ring-brand-500" />
                            1 sola Inversión
                        </label>
                        <label className="flex items-center gap-2 text-sm bg-white border border-slate-200 px-3 py-1.5 rounded-full cursor-pointer hover:bg-slate-50 transition">
                            <input type="checkbox" checked={filterNoRetiros} onChange={e => setFilterNoRetiros(e.target.checked)} className="rounded text-brand-600 focus:ring-brand-500" />
                            Sin Retiros
                        </label>
                        <label className="flex items-center gap-2 text-sm bg-white border border-slate-200 px-3 py-1.5 rounded-full cursor-pointer hover:bg-slate-50 transition">
                            <input type="checkbox" checked={filterOneRequest} onChange={e => setFilterOneRequest(e.target.checked)} className="rounded text-brand-600 focus:ring-brand-500" />
                            1 sola Solicitud
                        </label>
                        <span className="text-xs text-slate-400 ml-auto">{filteredUsers.length} usuarios filtrados</span>
                    </div>
                </div>
                
                {selectedUsers.size > 0 && (
                    <div className="bg-brand-50 border-b border-brand-100 p-4">
                        <h3 className="text-sm font-semibold text-brand-800 mb-3">Resumen de Migración Seleccionada</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white p-3 rounded-lg border border-brand-100 shadow-sm">
                                <div className="text-xs text-slate-500 font-medium mb-1">Usuarios a Migrar</div>
                                <div className="text-xl font-bold text-slate-800">{selectedUsers.size}</div>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-brand-100 shadow-sm">
                                <div className="text-xs text-slate-500 font-medium mb-1">Total Ganancias (May 29 - Jun 29)</div>
                                <div className="text-xl font-bold text-emerald-600">
                                    {formatCOP(
                                        filteredUsers
                                            .filter(u => selectedUsers.has(u.user_id))
                                            .reduce((sum, u) => {
                                                return sum + (u.inversiones?.reduce((invSum, inv) => invSum + (inv.ganancia_simulada || 0), 0) || 0);
                                            }, 0)
                                    )}
                                </div>
                                <div className="text-[10px] text-slate-400 mt-1">Este valor se sumará a sus Wallets reales.</div>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-brand-100 shadow-sm">
                                <div className="text-xs text-slate-500 font-medium mb-1">Acción Siguiente</div>
                                <div className="text-sm text-slate-700 font-medium mt-1">
                                    Tras la migración, podrás registrar el Retiro Manual para descontar los pagos que ya realizaste externamente.
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap min-w-[1000px]">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4 w-12">
                                    <input 
                                        type="checkbox" 
                                        className="rounded text-brand-600 focus:ring-brand-500"
                                        checked={filteredUsers.length > 0 && selectedUsers.size === filteredUsers.length}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedUsers(new Set(filteredUsers.map(u => u.user_id)));
                                            } else {
                                                setSelectedUsers(new Set());
                                            }
                                        }}
                                    />
                                </th>
                                <th className="px-6 py-4">ID Respaldo</th>
                                <th className="px-6 py-4">Código</th>
                                <th className="px-6 py-4">Paquete & Periodo</th>
                                <th className="px-6 py-4">Fecha Ingreso</th>
                                <th className="px-6 py-4">Fecha Finalización</th>
                                <th className="px-6 py-4">Fecha de Creación</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                                        No hay datos de respaldo disponibles.
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers

                                    .map((user) => (
                                    <React.Fragment key={user.user_id}>
                                        <tr className="bg-slate-200 border-b border-slate-300">
                                            <td className="px-6 py-3 w-12 text-center">
                                                <input 
                                                    type="checkbox" 
                                                    className="rounded text-brand-600 focus:ring-brand-500"
                                                    checked={selectedUsers.has(user.user_id)}
                                                    onChange={(e) => {
                                                        const newSet = new Set(selectedUsers);
                                                        if (e.target.checked) newSet.add(user.user_id);
                                                        else newSet.delete(user.user_id);
                                                        setSelectedUsers(newSet);
                                                    }}
                                                />
                                            </td>
                                            <td colSpan={6} className="px-6 py-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-slate-800">{user.user_name}</span>
                                                    <span className="text-sm text-slate-500">({user.user_email})</span>
                                                </div>
                                            </td>
                                        </tr>
                                        {/* Nested Section Container */}
                                        <tr>
                                            <td colSpan={7} className="p-0 border-b border-slate-300 bg-white">
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
                                                                <div className="overflow-x-auto">
                                                                    <table className="w-full text-sm text-left whitespace-nowrap">
                                                                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                                                                            <tr>
                                                                                <th className="px-4 py-2 font-medium">ID</th>
                                                                                <th className="px-4 py-2 font-medium">Inv. ID / User ID</th>
                                                                                <th className="px-4 py-2 font-medium">Origen</th>
                                                                                <th className="px-4 py-2 font-medium">Tipo</th>
                                                                                <th className="px-4 py-2 font-medium">Monto</th>
                                                                                <th className="px-4 py-2 font-medium">Impuesto</th>
                                                                                <th className="px-4 py-2 font-medium">Neto</th>
                                                                                <th className="px-4 py-2 font-medium">Estado</th>
                                                                                <th className="px-4 py-2 font-medium">Fechas (Sol. / Retiro)</th>
                                                                                <th className="px-4 py-2 font-medium">Método Pago</th>
                                                                                <th className="px-4 py-2 font-medium">Banco / Cuenta</th>
                                                                                <th className="px-4 py-2 font-medium">Observaciones</th>
                                                                                <th className="px-4 py-2 font-medium">Motivo Rechazo</th>
                                                                                <th className="px-4 py-2 font-medium">Aprobación (Por / Fecha)</th>
                                                                                <th className="px-4 py-2 font-medium">Procesamiento (Por / Fecha)</th>
                                                                                <th className="px-4 py-2 font-medium">Comprobante</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-slate-100">
                                                                            {user.retiros.map(ret => (
                                                                                <tr key={ret.id} className="hover:bg-slate-50">
                                                                                    <td className="px-4 py-2 font-mono text-xs text-slate-500">#{ret.id}</td>
                                                                                    <td className="px-4 py-2 text-xs text-slate-500">{ret.investor_id || '-'} / {ret.user_id}</td>
                                                                                    <td className="px-4 py-2 capitalize">{ret.origen}</td>
                                                                                    <td className="px-4 py-2 capitalize font-medium">{ret.tipo}</td>
                                                                                    <td className="px-4 py-2 font-medium text-slate-900">{formatCOP(ret.monto)}</td>
                                                                                    <td className="px-4 py-2 font-medium text-red-500">{formatCOP(ret.impuesto)}</td>
                                                                                    <td className="px-4 py-2 font-medium text-emerald-600">{formatCOP(ret.monto_neto)}</td>
                                                                                    <td className="px-4 py-2 capitalize"><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">{ret.estado}</span></td>
                                                                                    <td className="px-4 py-2 text-xs text-slate-500">
                                                                                        <div><span className="font-medium text-slate-700">Sol:</span> {new Date(ret.fecha_solicitud).toLocaleDateString()}</div>
                                                                                        {ret.fecha_retiro && <div><span className="font-medium text-slate-700">Ret:</span> {new Date(ret.fecha_retiro).toLocaleDateString()}</div>}
                                                                                    </td>
                                                                                    <td className="px-4 py-2">{ret.metodo_pago || '-'}</td>
                                                                                    <td className="px-4 py-2 text-xs">
                                                                                        {ret.banco ? <div><span className="font-medium text-slate-700">{ret.banco}</span></div> : '-'}
                                                                                        {ret.tipo_cuenta && ret.numero_cuenta ? <div>{ret.tipo_cuenta}: {ret.numero_cuenta}</div> : null}
                                                                                    </td>
                                                                                    <td className="px-4 py-2 text-xs text-slate-500 max-w-[200px] truncate" title={ret.observaciones}>{ret.observaciones || '-'}</td>
                                                                                    <td className="px-4 py-2 text-xs text-red-500 max-w-[200px] truncate" title={ret.motivo_rechazo}>{ret.motivo_rechazo || '-'}</td>
                                                                                    <td className="px-4 py-2 text-xs text-slate-500">
                                                                                        {ret.fecha_aprobacion ? (
                                                                                            <><div><span className="font-medium text-slate-700">Por:</span> ID {ret.aprobado_por}</div>
                                                                                            <div><span className="font-medium text-slate-700">Fecha:</span> {new Date(ret.fecha_aprobacion).toLocaleString()}</div></>
                                                                                        ) : '-'}
                                                                                    </td>
                                                                                    <td className="px-4 py-2 text-xs text-slate-500">
                                                                                        {ret.fecha_procesamiento ? (
                                                                                            <><div><span className="font-medium text-slate-700">Por:</span> ID {ret.procesado_por}</div>
                                                                                            <div><span className="font-medium text-slate-700">Fecha:</span> {new Date(ret.fecha_procesamiento).toLocaleString()}</div></>
                                                                                        ) : '-'}
                                                                                    </td>
                                                                                    <td className="px-4 py-2 text-xs">
                                                                                        {ret.comprobante_pago ? (
                                                                                            <a href={ret.comprobante_pago} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">Ver</a>
                                                                                        ) : '-'}
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Solicitudes */}
                                                    {user.requests && user.requests.length > 0 && (
                                                        <div>
                                                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Solicitudes de Inversión</h4>
                                                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                                                                <div className="overflow-x-auto">
                                                                    <table className="w-full text-sm text-left whitespace-nowrap">
                                                                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                                                                            <tr>
                                                                                <th className="px-4 py-2 font-medium">ID</th>
                                                                                <th className="px-4 py-2 font-medium">User ID / Inv. ID</th>
                                                                                <th className="px-4 py-2 font-medium">Paquete / Prospecto</th>
                                                                                <th className="px-4 py-2 font-medium">Monto</th>
                                                                                <th className="px-4 py-2 font-medium">Estado</th>
                                                                                <th className="px-4 py-2 font-medium">Motivo Rechazo</th>
                                                                                <th className="px-4 py-2 font-medium">Revisión (Por / Fecha)</th>
                                                                                <th className="px-4 py-2 font-medium">Fechas (Creación / Act.)</th>
                                                                                <th className="px-4 py-2 font-medium">Comprobante</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-slate-100">
                                                                            {user.requests.map(req => (
                                                                                <tr key={req.id} className="hover:bg-slate-50">
                                                                                    <td className="px-4 py-2 font-mono text-xs text-slate-500">#{req.id}</td>
                                                                                    <td className="px-4 py-2 text-xs text-slate-500">{req.user_id} / {req.investor_id || '-'}</td>
                                                                                    <td className="px-4 py-2 text-xs text-slate-500">Paq: {req.paquete_inversion_id} {req.prospecto_id ? `/ Prosp: ${req.prospecto_id}` : ''}</td>
                                                                                    <td className="px-4 py-2 font-medium text-slate-900">{formatCOP(req.monto)}</td>
                                                                                    <td className="px-4 py-2 capitalize"><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">{req.status}</span></td>
                                                                                    <td className="px-4 py-2 text-xs text-red-500 max-w-[200px] truncate" title={req.rejection_reason}>{req.rejection_reason || '-'}</td>
                                                                                    <td className="px-4 py-2 text-xs text-slate-500">
                                                                                        {req.reviewed_at ? (
                                                                                            <><div><span className="font-medium text-slate-700">Por:</span> ID {req.reviewed_by}</div>
                                                                                            <div><span className="font-medium text-slate-700">Fecha:</span> {new Date(req.reviewed_at).toLocaleString()}</div></>
                                                                                        ) : '-'}
                                                                                    </td>
                                                                                    <td className="px-4 py-2 text-xs text-slate-500">
                                                                                        <div><span className="font-medium text-slate-700">Cre:</span> {req.created_at ? new Date(req.created_at).toLocaleString() : '-'}</div>
                                                                                        {req.updated_at && <div><span className="font-medium text-slate-700">Act:</span> {new Date(req.updated_at).toLocaleString()}</div>}
                                                                                    </td>
                                                                                    <td className="px-4 py-2 text-xs">
                                                                                        {req.comprobante_path ? (
                                                                                            <a href={req.comprobante_path} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">Ver</a>
                                                                                        ) : '-'}
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
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
                                                                                    <span className="text-slate-500 line-through">{acc.original_days}</span> &rarr; <span className="font-medium text-slate-900">{acc.new_duration}</span>
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

            {/* Migration Modal */}
            {showMigrationModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                            <h2 className="text-lg font-bold text-slate-800">Confirmar Migración y Registrar Retiros</h2>
                            <button onClick={() => setShowMigrationModal(false)} className="text-slate-400 hover:text-slate-600 transition">
                                &times;
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
                            <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-xl text-sm">
                                <strong>Importante:</strong> Al migrar, el sistema sumará la Ganancia Simulada a la Wallet real de cada usuario. Aquí puedes registrar un retiro manual para descontar los pagos que ya se hicieron de manera externa, dejando el saldo de la Wallet cuadrado.
                            </div>
                            
                            <div className="space-y-4">
                                {Array.from(selectedUsers).map(uid => {
                                    const withdrawData = manualWithdrawals[uid] || {};
                                    const user = filteredUsers.find(u => u.user_id === uid);
                                    
                                    if (!user) return null;

                                    return (
                                        <div key={uid} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                                            <div className="flex justify-between items-start mb-4 pb-4 border-b border-slate-100">
                                                <div>
                                                    <h3 className="font-bold text-slate-800 text-lg">{user.user_name}</h3>
                                                    <div className="text-sm text-slate-500">{user.user_email}</div>
                                                </div>
                                                <div className="text-right flex gap-6">
                                                    <div>
                                                        <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Saldo Wallet (Respaldo)</div>
                                                        <div className="text-xl font-black text-brand-600">
                                                            {formatCOP(user.wallet_balance || 0)}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Total Invertido (Paquetes)</div>
                                                        <div className="text-xl font-black text-slate-800">
                                                            {formatCOP(user.inversiones?.reduce((sum, inv) => {
                                                                const val = parseInt(String(inv.nombre_paquete || '').replace(/[^0-9]/g, ''), 10);
                                                                return sum + (isNaN(val) ? 0 : val);
                                                            }, 0) || 0)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-3 mb-6">
                                                <h4 className="text-sm font-semibold text-slate-700">Desglose de Inversiones</h4>
                                                {user.inversiones?.map(inv => {
                                                    // Calculo de días hasta el 29 de Mayo
                                                    const fechaIngreso = new Date(inv.fecha_ingreso || inv.created_at || Date.now());
                                                    const limitDate = new Date('2024-05-29T00:00:00');
                                                    
                                                    // Evitar diferencia horaria que afecte el conteo de días exactos usando fechas normalizadas
                                                    const limitDateNorm = new Date(limitDate.getFullYear(), limitDate.getMonth(), limitDate.getDate());
                                                    const fechaIngresoNorm = new Date(fechaIngreso.getFullYear(), fechaIngreso.getMonth(), fechaIngreso.getDate());
                                                    
                                                    let diffTime = limitDateNorm.getTime() - fechaIngresoNorm.getTime();
                                                    let diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                                                    if (diffDays < 0) diffDays = 0;
                                                    
                                                    const rendimientoHistorico = diffDays * (inv.liquidacion_diaria_rendimiento || 0);
                                                    
                                                    // Retiros de capital previos al 29 de mayo
                                                    const retirosCapitalHist = user.retiros?.filter(r => 
                                                        r.tipo === 'capital' && 
                                                        new Date(r.fecha_solicitud) <= limitDate &&
                                                        r.estado !== 'rechazado'
                                                    ).reduce((sum, r) => sum + Number(r.monto || 0), 0) || 0;

                                                    return (
                                                        <div key={inv.id} className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm">
                                                            <div className="flex justify-between font-bold text-slate-700 mb-3 border-b border-slate-200 pb-2">
                                                                <span>Paquete: {inv.nombre_paquete}</span>
                                                                <span>{formatCOP(parseInt(String(inv.nombre_paquete || '').replace(/[^0-9]/g, ''), 10) || 0)}</span>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-slate-600">
                                                                <div>Fecha de Ingreso:</div>
                                                                <div className="text-right font-medium">{fechaIngreso.toLocaleDateString()}</div>
                                                                
                                                                <div>Rendimiento Diario:</div>
                                                                <div className="text-right">{formatCOP(inv.liquidacion_diaria_rendimiento)} / día</div>
                                                                
                                                                <div>Días hasta 29 May:</div>
                                                                <div className="text-right font-medium">{diffDays} días</div>
                                                                
                                                                <div className="font-bold text-slate-800">Rend. Acumulado (hasta 29 May):</div>
                                                                <div className="text-right font-bold text-emerald-600">{formatCOP(rendimientoHistorico)}</div>
                                                                
                                                                {retirosCapitalHist > 0 && (
                                                                    <>
                                                                        <div className="font-bold text-slate-800 mt-2 pt-2 border-t border-slate-200">Retiros de Capital (Antes 29 May):</div>
                                                                        <div className="text-right font-bold text-red-500 mt-2 pt-2 border-t border-slate-200">- {formatCOP(retirosCapitalHist)}</div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            
                                            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer select-none mb-4">
                                                <input 
                                                    type="checkbox" 
                                                    className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
                                                    checked={withdrawData.enabled}
                                                    onChange={e => setManualWithdrawals(prev => ({...prev, [uid]: {...prev[uid], enabled: e.target.checked}}))}
                                                />
                                                ¿Registrar un retiro manual por pago externo ya realizado?
                                            </label>

                                            {withdrawData.enabled && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-700 mb-1">Monto Pagado</label>
                                                        <input 
                                                            type="number" 
                                                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-brand-500 focus:border-brand-500"
                                                            value={withdrawData.monto}
                                                            onChange={e => setManualWithdrawals(prev => ({...prev, [uid]: {...prev[uid], monto: e.target.value}}))}
                                                            placeholder="Ej: 500000"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-700 mb-1">Fecha del Pago</label>
                                                        <input 
                                                            type="date" 
                                                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-brand-500 focus:border-brand-500"
                                                            value={withdrawData.fecha}
                                                            onChange={e => setManualWithdrawals(prev => ({...prev, [uid]: {...prev[uid], fecha: e.target.value}}))}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-700 mb-1">Método de Pago</label>
                                                        <input 
                                                            type="text" 
                                                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-brand-500 focus:border-brand-500"
                                                            value={withdrawData.metodo_pago}
                                                            onChange={e => setManualWithdrawals(prev => ({...prev, [uid]: {...prev[uid], metodo_pago: e.target.value}}))}
                                                            placeholder="Ej: Nequi, Bancolombia..."
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-700 mb-1">Observaciones / Referencia</label>
                                                        <input 
                                                            type="text" 
                                                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-brand-500 focus:border-brand-500"
                                                            value={withdrawData.observaciones}
                                                            onChange={e => setManualWithdrawals(prev => ({...prev, [uid]: {...prev[uid], observaciones: e.target.value}}))}
                                                            placeholder="Ej: Pago de ganancia mes pasado"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3 bg-white">
                            <button 
                                onClick={() => setShowMigrationModal(false)}
                                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-medium"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleConfirmMigration}
                                disabled={migrating}
                                className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition font-medium disabled:opacity-50 flex items-center gap-2"
                            >
                                {migrating && <Loader2 className="w-4 h-4 animate-spin" />}
                                {migrating ? 'Migrando y Registrando...' : 'Confirmar y Migrar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InvestmentsPage;

