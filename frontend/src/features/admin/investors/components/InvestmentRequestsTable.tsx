import React, { useState, useEffect } from 'react';
import { getInvestmentRequests, approveInvestmentRequest, rejectInvestmentRequest, InvestmentRequest } from '../../../../services/investment_requests';
import { periodsService, Period } from '../../../../services/periods';
import { Loader2, Users, ChevronDown, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import { Can } from '../../../../components/security/Can';
import { formatCurrency } from '../../../../utils/format';
import { getMediaUrl } from '../../../../services/api';
import { sarlaftService } from '../../../../services/sarlaft';

const FALLBACK_DOC_SVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'/%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'/%3E%3Cpolyline points='21 15 16 10 5 21'/%3E%3C/svg%3E";

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

  const [sarlaftData, setSarlaftData] = useState<Record<number, any>>({});
  const [sarlaftLoading, setSarlaftLoading] = useState<Record<number, boolean>>({});

  const toggleRow = (req: InvestmentRequest) => {
    const isExpanding = !expandedRows[req.id];
    setExpandedRows(prev => ({ ...prev, [req.id]: isExpanding }));

    if (isExpanding && req.user_id && !sarlaftData[req.id]) {
      sarlaftService.getCheckByUser(req.user_id).then(res => {
        if (res.check) {
          setSarlaftData(prev => ({ ...prev, [req.id]: res.check }));
        }
      }).catch(err => console.error("Error cargando SARLAFT", err));
    }
  };

  const handleRunSarlaftCheck = async (req: InvestmentRequest) => {
    if (!req.user_id) return;
    const docNum = req.extra_data?.numero_documento || req.extra_data?.documento || req.user?.document_id;
    const docType = req.extra_data?.tipo_documento || 'CC';

    if (!docNum) {
      alert("No se encontró el número de documento para este usuario");
      return;
    }

    try {
      setSarlaftLoading(prev => ({ ...prev, [req.id]: true }));
      const result = await sarlaftService.triggerCheck({
        user_id: req.user_id,
        document_number: String(docNum),
        document_type: docType,
        investment_request_id: req.id
      });
      setSarlaftData(prev => ({ ...prev, [req.id]: result.check || result }));
    } catch (err: any) {
      alert(err.message || "Error consultando antecedentes SARLAFT");
    } finally {
      setSarlaftLoading(prev => ({ ...prev, [req.id]: false }));
    }
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
                          onClick={() => toggleRow(request)}
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
                      <tr className="bg-slate-50/70">
                        <td colSpan={8} className="px-6 py-5 border-t border-slate-200">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-sm">
                            
                            {/* Columna 1: Información Adicional y Parámetros */}
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider border-b border-slate-100 pb-2">
                                Detalles de la Solicitud
                              </h4>
                              <div className="space-y-2 text-xs">
                                {request.extra_data && typeof request.extra_data === 'object' && Object.keys(request.extra_data).length > 0 ? (
                                  Object.entries(request.extra_data).map(([key, val]) => {
                                    if (val === null || val === undefined || val === '' || (Array.isArray(val) && val.length === 0)) return null;

                                    const labels: Record<string, string> = {
                                      referred_by: 'Código Referido',
                                      referral_code: 'Código Referido',
                                      codigo_referido: 'Código Referido',
                                      ciudad: 'Ciudad',
                                      fecha_nacimiento: 'Fecha Nacimiento',
                                      tipo_documento: 'Tipo Documento',
                                      numero_documento: 'Número Documento',
                                      contract_period_id: 'ID Periodo Contrato',
                                      es_aumento_capital: 'Aumento de Capital',
                                      monto_billetera_usado: 'Billetera Usada',
                                      kyc_docs: 'Documentos KYC',
                                      comprobantes_adicionales: 'Comprobantes Extra'
                                    };

                                    const labelName = labels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

                                    let displayVal: React.ReactNode = String(val);
                                    if (typeof val === 'boolean') {
                                      displayVal = val ? <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded">Sí</span> : 'No';
                                    } else if (Array.isArray(val)) {
                                      displayVal = <span className="text-brand-600 font-bold">{val.length} archivo(s) adjunto(s)</span>;
                                    } else if (['referred_by', 'referral_code', 'codigo_referido'].includes(key)) {
                                      displayVal = (
                                        <span className="px-2.5 py-1 bg-purple-100 text-purple-900 font-bold rounded-lg border border-purple-200 inline-flex items-center gap-1">
                                          <span>✨</span> {String(val)}
                                        </span>
                                      );
                                    }

                                    return (
                                      <div key={key} className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0">
                                        <span className="text-slate-500 font-medium">{labelName}:</span>
                                        <span className="font-semibold text-slate-800 break-all text-right">{displayVal}</span>
                                      </div>
                                    );
                                  })
                                ) : (
                                  <p className="text-slate-400 italic py-2">Sin datos adicionales registrados</p>
                                )}
                              </div>
                            </div>

                            {/* Columna 2: Adjuntos y Registro de Revisión */}
                            <div className="space-y-4">
                              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider border-b border-slate-100 pb-2">
                                  Archivos y Adjuntos
                                </h4>
                                <div className="space-y-3 text-xs">
                                  <div className="flex justify-between items-center py-1">
                                    <span className="text-slate-500 font-medium">Comprobante de Pago:</span>
                                    {request.comprobante_path ? (
                                      <a 
                                        href={getMediaUrl(request.comprobante_path)} 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        className="px-3 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold rounded-lg transition-colors border border-brand-200 inline-flex items-center gap-1"
                                      >
                                        <span>📄</span> Ver Comprobante
                                      </a>
                                    ) : (
                                      <span className="text-slate-400 italic">Sin comprobante</span>
                                    )}
                                  </div>

                                  {/* Documentos KYC con Vista Previa */}
                                  {request.extra_data?.kyc_docs && Array.isArray(request.extra_data.kyc_docs) && request.extra_data.kyc_docs.length > 0 && (
                                    <div className="pt-2 border-t border-slate-100 space-y-2">
                                      <span className="text-slate-500 font-medium block">Documentos de Identidad (KYC):</span>
                                      <div className="grid grid-cols-3 gap-2">
                                        {request.extra_data.kyc_docs.map((path: string, idx: number) => {
                                          const kycLabels = ["Frontal Cédula", "Reverso Cédula", "Foto Selfie"];
                                          const label = kycLabels[idx] || `Doc ${idx + 1}`;
                                          const fullUrl = getMediaUrl(path);
                                          return (
                                            <a 
                                              key={idx} 
                                              href={fullUrl} 
                                              target="_blank" 
                                              rel="noreferrer"
                                              className="group flex flex-col items-center bg-slate-50 p-1.5 rounded-lg border border-slate-200 hover:border-brand-500 transition-all text-center"
                                              title={label}
                                            >
                                              <div className="w-full h-16 bg-white rounded overflow-hidden mb-1 flex items-center justify-center border border-slate-200">
                                                <img 
                                                  src={fullUrl} 
                                                  alt={label} 
                                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                                                  onError={(e) => {
                                                    const target = e.target as HTMLImageElement;
                                                    if (target.src !== FALLBACK_DOC_SVG) {
                                                      target.src = FALLBACK_DOC_SVG;
                                                    }
                                                  }}
                                                />
                                              </div>
                                              <span className="text-[10px] font-bold text-slate-700 truncate w-full group-hover:text-brand-600">{label}</span>
                                            </a>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {request.investor_id && (
                                    <div className="flex justify-between items-center py-1 border-t border-slate-100">
                                      <span className="text-slate-500 font-medium">ID Inversionista Creado:</span>
                                      <span className="font-mono font-bold text-slate-800">#{request.investor_id}</span>
                                    </div>
                                  )}

                                  {request.prospecto_id && (
                                    <div className="flex justify-between items-center py-1 border-t border-slate-100">
                                      <span className="text-slate-500 font-medium">ID Prospecto:</span>
                                      <span className="font-mono font-bold text-slate-800">#{request.prospecto_id}</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                               {/* Verificación SARLAFT (Tusdatos.co) */}
                               <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                                 <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                   <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                                     <span>🛡️</span> Verificación SARLAFT (Tusdatos.co)
                                   </h4>
                                   <button 
                                     onClick={() => handleRunSarlaftCheck(request)}
                                     disabled={sarlaftLoading[request.id]}
                                     className="text-xs px-2.5 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold rounded-lg transition-colors border border-brand-200 inline-flex items-center gap-1"
                                   >
                                     {sarlaftLoading[request.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <span>🔍</span>}
                                     {sarlaftLoading[request.id] ? 'Consultando...' : sarlaftData[request.id] ? 'Re-Consultar' : 'Consultar'}
                                   </button>
                                 </div>
                                 <div className="text-xs space-y-2">
                                   {sarlaftData[request.id] ? (
                                     <>
                                       <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                                         <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                                           <span className="text-emerald-600 font-bold">✓</span>
                                           <span>Usuario Ya Validado Previamente</span>
                                         </div>
                                         {sarlaftData[request.id].created_at && (
                                           <span className="text-[11px] text-slate-400 font-mono">
                                             {new Date(sarlaftData[request.id].created_at).toLocaleDateString()}
                                           </span>
                                         )}
                                       </div>

                                       <div className="flex justify-between items-center pt-1">
                                         <span className="text-slate-500 font-medium">Resultado / Nivel de Riesgo:</span>
                                         {sarlaftData[request.id].risk_level === 'CLEAN' ? (
                                           <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-md flex items-center gap-1">
                                             ✓ Sin Hallazgos (Limpio)
                                           </span>
                                         ) : sarlaftData[request.id].risk_level === 'HIGH' ? (
                                           <span className="px-2.5 py-0.5 bg-red-100 text-red-800 font-bold rounded-md flex items-center gap-1">
                                             ⚠ ALERTA ALTO RIESGO
                                           </span>
                                         ) : (
                                           <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 font-bold rounded-md flex items-center gap-1">
                                             ℹ Hallazgos Informativos / Revisar
                                           </span>
                                         )}
                                       </div>
                                       
                                       {sarlaftData[request.id].pdf_path && (
                                         <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                                           <span className="text-slate-400 text-[11px]">Informe PDF disponible</span>
                                           <a 
                                             href={getMediaUrl(sarlaftData[request.id].pdf_path)} 
                                             target="_blank" 
                                             rel="noreferrer" 
                                             className="px-3 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-lg transition-colors border border-purple-200 inline-flex items-center gap-1"
                                           >
                                             <span>📄</span> Ver Reporte PDF SARLAFT
                                           </a>
                                         </div>
                                       )}
                                     </>
                                   ) : (
                                     <p className="text-slate-400 italic py-1">No se ha ejecutado la consulta SARLAFT en Tusdatos.co para esta cédula.</p>
                                   )}
                                 </div>
                               </div>

                              {/* Registro de Revisión (Solo en Aprobadas o Rechazadas) */}
                              {request.status !== 'pending' && (
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider border-b border-slate-100 pb-2">
                                    Seguimiento de Revisión
                                  </h4>
                                  <div className="space-y-2 text-xs">
                                    <div className="flex justify-between items-center">
                                      <span className="text-slate-500 font-medium">Revisado Por:</span>
                                      <span className="font-semibold text-slate-800">{request.reviewed_by ? `Admin #${request.reviewed_by}` : 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-slate-500 font-medium">Fecha Revisión:</span>
                                      <span className="font-semibold text-slate-800">{request.reviewed_at ? new Date(request.reviewed_at).toLocaleDateString('es-CO') : 'N/A'}</span>
                                    </div>
                                    {request.rejection_reason && (
                                      <div className="mt-2 p-2.5 bg-red-50 text-red-700 rounded-lg text-xs border border-red-100">
                                        <strong>Motivo Rechazo:</strong> {request.rejection_reason}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
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
                      {(selectedRequestToReview.extra_data.referred_by || selectedRequestToReview.extra_data.referral_code || selectedRequestToReview.extra_data.codigo_referido) && (
                        <div className="flex justify-between items-center bg-purple-50 p-2 rounded-lg border border-purple-100">
                          <span className="text-purple-700 font-medium text-xs">Código Referido (Bono 5%):</span>
                          <span className="font-bold text-purple-900 text-xs px-2 py-0.5 bg-purple-200 rounded">
                            {selectedRequestToReview.extra_data.referred_by || selectedRequestToReview.extra_data.referral_code || selectedRequestToReview.extra_data.codigo_referido}
                          </span>
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
                      <h4 className="text-sm font-semibold text-slate-800 mb-3 border-b border-slate-200 pb-2">Documentos de Identidad (KYC)</h4>
                      <div className="grid grid-cols-3 gap-3">
                        {selectedRequestToReview.extra_data.kyc_docs.map((path: string, index: number) => {
                          const kycLabels = ["Frontal Cédula", "Reverso Cédula", "Foto Selfie"];
                          const label = kycLabels[index] || `Documento ${index + 1}`;
                          const fullUrl = getMediaUrl(path);
                          return (
                            <a 
                              key={index} 
                              href={fullUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="group flex flex-col items-center bg-white p-2 rounded-xl border border-slate-200 hover:border-brand-500 hover:shadow-md transition-all text-center"
                            >
                              <div className="w-full h-24 bg-slate-100 rounded-lg overflow-hidden mb-2 relative flex items-center justify-center border border-slate-100">
                                <img 
                                  src={fullUrl} 
                                  alt={label} 
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    if (target.src !== FALLBACK_DOC_SVG) {
                                      target.src = FALLBACK_DOC_SVG;
                                    }
                                  }}
                                />
                              </div>
                              <span className="text-xs font-bold text-slate-800 group-hover:text-brand-600 truncate w-full">{label}</span>
                              <span className="text-[10px] text-slate-400 mt-0.5">Ver Grande ↗</span>
                            </a>
                          );
                        })}
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
                      src={getMediaUrl(selectedRequestToReview.comprobante_path)} 
                      alt="Comprobante" 
                      className="max-h-[400px] object-contain rounded shadow-sm border border-slate-200"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (target.src !== FALLBACK_DOC_SVG) {
                          target.src = FALLBACK_DOC_SVG;
                        }
                      }}
                    />
                  </div>
                  <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-right">
                    <a 
                      href={getMediaUrl(selectedRequestToReview.comprobante_path)} 
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
