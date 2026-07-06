import React, { useEffect, useState, useMemo } from 'react';
import { investmentsService, AdminInvestmentRequest } from '../../../../services/investments';
import { Loader2, AlertCircle, FileText, CheckCircle, XCircle, Search } from 'lucide-react';
import { formatCurrency } from '../../../../utils/format';
import { ReviewInvestmentRequestModal } from './ReviewInvestmentRequestModal';

export const AdminInvestmentRequestsTable = () => {
    const [requests, setRequests] = useState<AdminInvestmentRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [selectedRequest, setSelectedRequest] = useState<AdminInvestmentRequest | null>(null);

    const fetchRequests = async () => {
        try {
            setIsLoading(true);
            const res = await investmentsService.getAllInvestmentRequests();
            setRequests(res);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Error al cargar las solicitudes');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const filteredRequests = useMemo(() => {
        let result = requests;
        
        if (statusFilter !== 'all') {
            result = result.filter(req => req.status === statusFilter);
        }
        
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(req => 
                req.usuario_nombre?.toLowerCase().includes(q) ||
                req.usuario_correo?.toLowerCase().includes(q) ||
                req.id.toString().includes(q)
            );
        }
        
        return result;
    }, [requests, searchQuery, statusFilter]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <span className="px-2.5 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full border border-amber-200">Pendiente</span>;
            case 'approved':
                return <span className="px-2.5 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full border border-emerald-200">Aprobada</span>;
            case 'rejected':
                return <span className="px-2.5 py-1 text-xs font-medium bg-rose-100 text-rose-700 rounded-full border border-rose-200">Rechazada</span>;
            default:
                return <span className="px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded-full">{status}</span>;
        }
    };

    const handleViewReceipt = (path: string) => {
        // En producción el endpoint de archivos estáticos suele estar en la API
        const baseUrl = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || '';
        window.open(`${baseUrl}/${path}`, '_blank');
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-sm border border-slate-200">
                <Loader2 className="w-8 h-8 text-brand-600 animate-spin mb-4" />
                <p className="text-slate-500 font-medium">Cargando solicitudes...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                    <h3 className="font-semibold text-rose-800">Error</h3>
                    <p className="text-rose-600 text-sm">{error}</p>
                    <button 
                        onClick={fetchRequests}
                        className="mt-3 text-sm font-medium text-rose-700 hover:text-rose-800 underline"
                    >
                        Intentar nuevamente
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="font-semibold text-slate-800">Solicitudes Pendientes</h2>
                    <p className="text-sm text-slate-500">Revisa y gestiona las nuevas inversiones</p>
                </div>
                
                <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
                    >
                        <option value="all">Todos los estados</option>
                        <option value="pending">Pendientes</option>
                        <option value="approved">Aprobadas</option>
                        <option value="rejected">Rechazadas</option>
                    </select>

                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar usuario o ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                        />
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4">ID</th>
                            <th className="px-6 py-4">Usuario</th>
                            <th className="px-6 py-4">Paquete / Inversión</th>
                            <th className="px-6 py-4">Monto</th>
                            <th className="px-6 py-4">Fecha</th>
                            <th className="px-6 py-4">Comprobante</th>
                            <th className="px-6 py-4">Estado</th>
                            <th className="px-6 py-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredRequests.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                                    No se encontraron solicitudes.
                                </td>
                            </tr>
                        ) : (
                            filteredRequests.map((req) => (
                                <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 text-sm font-mono text-slate-500">
                                        #{req.id}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-slate-800">{req.usuario_nombre || 'Desconocido'}</div>
                                        <div className="text-xs text-slate-500">{req.usuario_correo}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-brand-600">
                                            {req.paquete_nombre ? formatCurrency(parseFloat(req.paquete_nombre)) : 'N/A'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-slate-800">
                                            {formatCurrency(req.monto)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-slate-600">
                                            {new Date(req.created_at).toLocaleDateString()}
                                        </div>
                                        <div className="text-xs text-slate-400">
                                            {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {req.comprobante_path ? (
                                            <button 
                                                onClick={() => handleViewReceipt(req.comprobante_path!)}
                                                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                                            >
                                                <FileText className="w-4 h-4" />
                                                Ver
                                            </button>
                                        ) : (
                                            <span className="text-xs text-slate-400 italic">Sin comprobante</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {getStatusBadge(req.status)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {req.status === 'pending' && (
                                                <>
                                                    <button 
                                                        onClick={() => setSelectedRequest(req)}
                                                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                        title="Aprobar Inversión"
                                                    >
                                                        <CheckCircle className="w-5 h-5" />
                                                    </button>
                                                    <button 
                                                        onClick={() => setSelectedRequest(req)}
                                                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                        title="Rechazar Inversión"
                                                    >
                                                        <XCircle className="w-5 h-5" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <ReviewInvestmentRequestModal
                isOpen={!!selectedRequest}
                onClose={() => setSelectedRequest(null)}
                request={selectedRequest}
                onSuccess={() => {
                    setSelectedRequest(null);
                    fetchRequests();
                }}
            />
        </div>
    );
};
