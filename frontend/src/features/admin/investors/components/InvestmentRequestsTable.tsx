import React, { useState, useEffect } from 'react';
import { getInvestmentRequests, approveInvestmentRequest, rejectInvestmentRequest, InvestmentRequest } from '../../../../services/investment_requests';
import { periodsService, Period } from '../../../../services/periods';
import { Loader2, Users, ChevronDown, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import { Can } from '../../../../components/security/Can';

const InvestmentRequestsTableSkeleton = () => {
  return (
    <>
      {[...Array(5)].map((_, i) => (
        <tr key={i} className="animate-pulse">
          <td className="px-4 py-4 w-10">
            <div className="h-4 w-4 bg-slate-200 rounded"></div>
          </td>
          <td className="px-6 py-4 w-20">
            <div className="h-3 w-8 bg-slate-200 rounded font-mono"></div>
          </td>
          <td className="px-6 py-4">
            <div className="space-y-2">
              <div className="h-4 w-32 bg-slate-200 rounded"></div>
              <div className="h-3 w-40 bg-slate-100 rounded"></div>
            </div>
          </td>
          <td className="px-6 py-4">
            <div className="h-4 w-24 bg-slate-200 rounded"></div>
          </td>
          <td className="px-6 py-4">
            <div className="h-5 w-24 bg-slate-200 rounded-md"></div>
          </td>
          <td className="px-6 py-4">
            <div className="h-5 w-20 bg-slate-200 rounded-full"></div>
          </td>
          <td className="px-6 py-4">
            <div className="h-3 w-20 bg-slate-200 rounded"></div>
          </td>
        </tr>
      ))}
    </>
  );
};

export const InvestmentRequestsTable = () => {
  const [requests, setRequests] = useState<InvestmentRequest[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedRequestToReview, setSelectedRequestToReview] = useState<InvestmentRequest | null>(null);

  const handleApproveConfirm = async () => {
    if (!selectedRequestToReview) return;
    try {
      setIsProcessing(true);
      await approveInvestmentRequest(selectedRequestToReview.id);
      setSelectedRequestToReview(null);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Error al aprobar');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectingId || !rejectionReason.trim()) return;
    try {
      setIsProcessing(true);
      await rejectInvestmentRequest(rejectingId, rejectionReason);
      setRejectingId(null);
      setRejectionReason('');
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Error al rechazar');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleRow = (id: number) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Pagination & Search state
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await getInvestmentRequests({
        page,
        limit,
        search: search || undefined
      });
      setRequests(response.data);
      setTotal(response.total || 0);

      if (periods.length === 0) {
        const periodsData = await periodsService.getPeriods();
        setPeriods(periodsData);
      }
      setError(null);
    } catch (err: any) {
      console.error("Error cargando solicitudes:", err);
      setRequests([]);
      setTotal(0);
      setError(err.message || 'Error al cargar las solicitudes');
    } finally {
      setIsLoading(false);
    }
  };

  // Debounce search input changes
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 500);

    return () => clearTimeout(handler);
  }, [searchInput]);

  useEffect(() => {
    fetchData();
  }, [page, search]);

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pendiente</span>;
      case 'approved':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Aprobado</span>;
      case 'rejected':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Rechazado</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">{status}</span>;
    }
  };

  if (error) {
    return (
      <div className="p-6 bg-red-50 rounded-xl border border-red-100 flex items-start gap-3">
        <div className="text-red-600 font-medium">
          <p>Error al cargar los datos</p>
          <p className="text-sm mt-1">{error}</p>
          <button onClick={fetchData} className="mt-2 text-sm font-semibold hover:underline">Reintentar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 w-full relative">
          <input 
            type="text" 
            placeholder="Buscar por nombre o correo del usuario..." 
            className="w-full pl-4 pr-10 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 uppercase text-xs tracking-wider">
              <tr>
                <th className="px-4 py-4 w-10"></th>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Usuario</th>
                <th className="px-6 py-4">Paquete</th>
                <th className="px-6 py-4">Monto</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Fecha Solicitud</th>
                <Can permission="admin.investments.manage">
                  <th className="px-6 py-4 text-right">Acciones</th>
                </Can>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <InvestmentRequestsTableSkeleton />
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="w-8 h-8 text-slate-300" />
                      <p>No hay solicitudes de inversión registradas.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                requests.map((request) => (
                  <React.Fragment key={request.id}>
                    <tr className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-4">
                        <button
                          onClick={() => toggleRow(request.id)}
                          className="p-1 hover:bg-slate-200 rounded-md transition-colors text-slate-400 hover:text-slate-600"
                        >
                          {expandedRows[request.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">
                        #{request.id}
                      </td>
                      <td className="px-6 py-4">
                        {request.user ? (
                          <div className="space-y-0.5">
                            <div className="font-semibold text-slate-800">{request.user.name}</div>
                            <div className="text-xs text-slate-500">{request.user.email}</div>
                            {request.user.document_id && (
                              <div className="text-xs text-slate-500">Doc: {request.user.document_id}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">Usuario #{request.user_id}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-700">
                        <div className="flex flex-col gap-1 items-start">
                            <span>{request.package?.value ? `Paquete $${request.package.value.toLocaleString('es-CO')}` : `Paquete #${request.paquete_inversion_id}`}</span>
                            {request.extra_data?.es_aumento_capital && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-800">
                                Aumento de Capital
                              </span>
                            )}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-brand-700">
                        ${request.monto.toLocaleString('es-CO')} COP
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(request.status)}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {request.created_at ? new Date(request.created_at).toLocaleDateString() : '-'}
                      </td>
                      <Can permission="admin.investments.manage">
                        <td className="px-6 py-4 text-right">
                          {request.status === 'pending' && (
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => setSelectedRequestToReview(request)}
                                disabled={isProcessing}
                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="Aprobar"
                              >
                                <CheckCircle className="w-5 h-5" />
                              </button>
                              <button 
                                onClick={() => setRejectingId(request.id)}
                                disabled={isProcessing}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Rechazar"
                              >
                                <XCircle className="w-5 h-5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </Can>
                    </tr>
                    
                    {/* Expanded Details Row */}
                    {expandedRows[request.id] && (
                      <tr className="bg-slate-50/50">
                        <td colSpan={8} className="px-6 py-4 border-t border-slate-100">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
                            
                            {/* Usuario */}
                            <div className="space-y-3">
                              <h4 className="font-semibold text-slate-700 border-b border-slate-200 pb-2">Información del Usuario</h4>
                              <div className="grid grid-cols-2 gap-2 text-slate-600">
                                <span className="text-slate-400">Nombre:</span>
                                <span>{request.user?.name || 'N/A'}</span>
                                <span className="text-slate-400">Correo:</span>
                                <span>{request.user?.email || 'N/A'}</span>
                                <span className="text-slate-400">Documento:</span>
                                <span>{request.user?.document_id || 'N/A'}</span>
                              </div>
                            </div>

                            {/* Fechas */}
                            <div className="space-y-3">
                              <h4 className="font-semibold text-slate-700 border-b border-slate-200 pb-2">Seguimiento</h4>
                              <div className="grid grid-cols-2 gap-2 text-slate-600">
                                <span className="text-slate-400">Actualizado:</span>
                                <span>{request.updated_at ? new Date(request.updated_at).toLocaleDateString() : '-'}</span>
                                <span className="text-slate-400">Revisado Por:</span>
                                <span>{request.reviewed_by ? `Admin #${request.reviewed_by}` : 'N/A'}</span>
                                <span className="text-slate-400">Fecha Revisión:</span>
                                <span>{request.reviewed_at ? new Date(request.reviewed_at).toLocaleDateString() : 'N/A'}</span>
                              </div>
                            </div>

                            {/* Referencias */}
                            <div className="space-y-3">
                              <h4 className="font-semibold text-slate-700 border-b border-slate-200 pb-2">Referencias</h4>
                              <div className="grid grid-cols-2 gap-2 text-slate-600">
                                <span className="text-slate-400">ID Inversionista:</span>
                                <span>{request.investor_id ? `#${request.investor_id}` : 'N/A'}</span>
                                <span className="text-slate-400">ID Prospecto:</span>
                                <span>{request.prospecto_id ? `#${request.prospecto_id}` : 'N/A'}</span>
                                <span className="text-slate-400">Comprobante:</span>
                                <span>
                                  {request.comprobante_path ? (
                                    <a href={request.comprobante_path} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">Ver Archivo</a>
                                  ) : 'Sin adjunto'}
                                </span>
                              </div>
                            </div>

                            {/* Datos Extra y Rechazo */}
                            <div className="space-y-3">
                              <h4 className="font-semibold text-slate-700 border-b border-slate-200 pb-2">Información Adicional</h4>
                              {request.rejection_reason && (
                                <div className="mb-2 p-2 bg-red-50 text-red-700 rounded-lg text-xs border border-red-100">
                                  <strong>Motivo Rechazo:</strong> {request.rejection_reason}
                                </div>
                              )}
                              
                              <div className="text-slate-600">
                                <span className="text-slate-400 block mb-1">Datos Extra (JSON):</span>
                                <div className="bg-white border border-slate-200 p-2 rounded-lg text-xs font-mono break-all text-slate-700 max-h-32 overflow-y-auto">
                                  {request.extra_data ? (
                                    typeof request.extra_data === 'object' 
                                      ? JSON.stringify(request.extra_data, null, 2)
                                      : request.extra_data
                                  ) : (
                                    <span className="text-slate-400 italic">Sin datos extra</span>
                                  )}
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

        {/* Pagination Controls */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <div className="text-sm text-slate-500">
            Mostrando <span className="font-medium text-slate-700">{requests.length}</span> de <span className="font-medium text-slate-700">{total}</span> solicitudes
          </div>
          <div className="flex gap-2">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
            >
              Anterior
            </button>
            <button 
              disabled={page * limit >= total}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {/* Rejection Modal */}
      {rejectingId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Rechazar Solicitud</h3>
            <p className="text-sm text-slate-500 mb-4">Ingresa el motivo por el cual rechazas esta solicitud. El usuario podrá ver este motivo.</p>
            <textarea
              className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none resize-none h-24 mb-4"
              placeholder="Ej: El comprobante no es legible"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setRejectingId(null); setRejectionReason(''); }}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleReject}
                disabled={isProcessing || !rejectionReason.trim()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar Rechazo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {selectedRequestToReview && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-800">Aprobar Solicitud #{selectedRequestToReview.id}</h3>
              <button onClick={() => setSelectedRequestToReview(null)} className="p-1 hover:bg-slate-100 rounded-full">
                <XCircle className="w-6 h-6 text-slate-400" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <span className="text-xs text-slate-500 block">Usuario</span>
                  <span className="font-semibold text-slate-800">{selectedRequestToReview.user?.name || `ID: ${selectedRequestToReview.user_id}`}</span>
                  {selectedRequestToReview.user?.document_id && (
                    <span className="text-xs text-slate-500 block mt-1">Doc: {selectedRequestToReview.user.document_id}</span>
                  )}
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Monto Solicitado</span>
                  <span className="font-semibold text-brand-700">${selectedRequestToReview.monto.toLocaleString('es-CO')} COP</span>
                </div>
              </div>

              {selectedRequestToReview.extra_data && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <h4 className="text-sm font-semibold text-slate-800 mb-3 border-b border-slate-200 pb-2">Información Adicional</h4>
                    <div className="space-y-2 text-sm">
                      {selectedRequestToReview.extra_data.tipo_documento && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Tipo Documento:</span>
                          <span className="font-medium">{selectedRequestToReview.extra_data.tipo_documento}</span>
                        </div>
                      )}
                      {(selectedRequestToReview.extra_data.numero_documento || selectedRequestToReview.extra_data.documento || selectedRequestToReview.user?.document_id) && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Documento:</span>
                          <span className="font-medium">{selectedRequestToReview.extra_data.numero_documento || selectedRequestToReview.extra_data.documento || selectedRequestToReview.user?.document_id}</span>
                        </div>
                      )}
                      {selectedRequestToReview.extra_data.ciudad && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Ciudad:</span>
                          <span className="font-medium">{selectedRequestToReview.extra_data.ciudad}</span>
                        </div>
                      )}
                      {selectedRequestToReview.extra_data.fecha_nacimiento && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Fecha Nacimiento:</span>
                          <span className="font-medium">{selectedRequestToReview.extra_data.fecha_nacimiento}</span>
                        </div>
                      )}
                      {selectedRequestToReview.extra_data.contract_period_id && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Periodo de Contrato:</span>
                          <span className="font-medium">
                            {(() => {
                              const p = periods.find(p => p.id === Number(selectedRequestToReview.extra_data?.contract_period_id));
                              return p ? `${p.months} meses y ${p.days} días (${p.percentage}%)` : `ID: ${selectedRequestToReview.extra_data?.contract_period_id}`;
                            })()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedRequestToReview.extra_data.kyc_docs && Array.isArray(selectedRequestToReview.extra_data.kyc_docs) && selectedRequestToReview.extra_data.kyc_docs.length > 0 && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <h4 className="text-sm font-semibold text-slate-800 mb-3 border-b border-slate-200 pb-2">Documentos KYC Adjuntos</h4>
                      <div className="flex flex-col gap-2">
                        {selectedRequestToReview.extra_data.kyc_docs.map((path: string, index: number) => (
                          <a 
                            key={index} 
                            href={`${import.meta.env.VITE_API_URL?.replace('/api/v1', '') || ''}${path.startsWith('/') ? path : '/' + path}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs bg-white hover:bg-brand-50 text-brand-700 px-3 py-2 rounded-lg font-medium transition-colors border border-slate-200 hover:border-brand-300 flex items-center justify-between"
                          >
                            <span className="truncate max-w-[200px]">Documento {index + 1}</span>
                            <span className="text-[10px] text-slate-400">Ver</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selectedRequestToReview.comprobante_path ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                    <span className="text-sm font-semibold text-slate-700">Comprobante de Pago</span>
                  </div>
                  <div className="p-4 flex justify-center bg-slate-100 min-h-[200px]">
                    <img 
                      src={`${import.meta.env.VITE_API_URL?.replace('/api/v1', '') || ''}/${selectedRequestToReview.comprobante_path}`} 
                      alt="Comprobante" 
                      className="max-h-[400px] object-contain rounded shadow-sm border border-slate-200"
                      onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400?text=No+se+pudo+cargar+la+imagen'; }}
                    />
                  </div>
                  <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-right">
                    <a 
                      href={`${import.meta.env.VITE_API_URL?.replace('/api/v1', '') || ''}/${selectedRequestToReview.comprobante_path}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-brand-600 font-medium hover:underline"
                    >
                      Abrir en nueva pestaña
                    </a>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl">
                  <p className="text-slate-500 font-medium">No se adjuntó comprobante de pago.</p>
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setSelectedRequestToReview(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleApproveConfirm}
                disabled={isProcessing}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm shadow-emerald-600/20"
              >
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                Confirmar Aprobación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
