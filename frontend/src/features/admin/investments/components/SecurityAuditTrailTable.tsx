import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, Search, Filter, Calendar, RefreshCw, Loader2, 
  CheckCircle2, XCircle, AlertTriangle, Eye, User as UserIcon, 
  Globe, Clock, Layers, ArrowUpDown, ChevronLeft, ChevronRight, X
} from 'lucide-react';
import { auditService, SecurityAuditLog } from '../../../../services/audit';

export const SecurityAuditTrailTable: React.FC = () => {
  const [logs, setLogs] = useState<SecurityAuditLog[]>([]);
  const [modules, setModules] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;
  
  const [search, setSearch] = useState('');
  const [selectedModule, setSelectedModule] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [viewingLog, setViewingLog] = useState<SecurityAuditLog | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await auditService.getSecurityLogs({
        page,
        limit,
        module: selectedModule,
        search,
        status: selectedStatus,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      setLogs(res.data || []);
      setTotal(res.total || 0);
      if (res.modules && res.modules.length > 0) {
        setModules(res.modules);
      }
    } catch (err) {
      console.error('Error fetching security audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, selectedModule, selectedStatus, startDate, endDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const getActionBadge = (action: string, moduleName: string) => {
    const act = action.toUpperCase();
    if (act.includes('APPROVE') || act.includes('SUCCESS') || act.includes('SETTLE')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (act.includes('REJECT') || act.includes('DELETE') || act.includes('CANCEL') || act.includes('FAIL')) {
      return 'bg-red-50 text-red-700 border-red-200';
    }
    if (act.includes('UPDATE') || act.includes('EDIT') || act.includes('BULK') || act.includes('PAY')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (act.includes('LOGIN') || act.includes('AUTH') || act.includes('PASSWORD')) {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const getModuleBadge = (moduleName: string) => {
    switch (moduleName.toLowerCase()) {
      case 'auth': return 'bg-purple-100 text-purple-800';
      case 'withdrawals': return 'bg-amber-100 text-amber-800';
      case 'investments': return 'bg-emerald-100 text-emerald-800';
      case 'users': return 'bg-blue-100 text-blue-800';
      case 'commercial': return 'bg-cyan-100 text-cyan-800';
      case 'audit': return 'bg-indigo-100 text-indigo-800';
      case 'documents': return 'bg-orange-100 text-orange-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Search form */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por actor, acción, email, entidad o IP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
            />
          </form>

          {/* Module Selector */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <span className="text-xs font-semibold text-slate-500 shrink-0">Módulo:</span>
            <select
              value={selectedModule}
              onChange={(e) => {
                setSelectedModule(e.target.value);
                setPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">Todos los módulos</option>
              {modules.map(m => (
                <option key={m} value={m}>{m.toUpperCase()}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">Todos los estados</option>
              <option value="SUCCESS">✅ Exitoso</option>
              <option value="FAILED">❌ Fallido</option>
              <option value="WARNING">⚠️ Advertencia</option>
            </select>
          </div>
        </div>

        {/* Date Ranges and Refresh */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-500 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-brand-600" /> Rango de Fechas:
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700"
            />
            <span className="text-slate-400">a</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700"
            />
            {(startDate || endDate || search || selectedModule !== 'all' || selectedStatus !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSelectedModule('all');
                  setSelectedStatus('all');
                  setStartDate('');
                  setEndDate('');
                  setPage(1);
                }}
                className="text-brand-600 hover:text-brand-700 font-semibold underline cursor-pointer ml-2"
              >
                Limpiar filtros
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-500">
              Total de eventos: <strong className="text-slate-800">{total}</strong>
            </span>
            <button
              onClick={fetchLogs}
              disabled={isLoading}
              className="p-2 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              title="Actualizar registro"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-brand-600' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading && logs.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-64 gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
            <p className="text-sm font-medium">Cargando pista de auditoría inmutable...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-800 mb-1">No se encontraron registros de auditoría</h4>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              No hay eventos de seguridad que coincidan con los filtros aplicados o aún no se han registrado acciones en este rango.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 border-collapse">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-5 py-4">Fecha / Hora</th>
                  <th className="px-5 py-4">Actor</th>
                  <th className="px-5 py-4">Módulo / Acción</th>
                  <th className="px-5 py-4">Entidad Afectada</th>
                  <th className="px-5 py-4">Descripción</th>
                  <th className="px-5 py-4 text-center">Estado</th>
                  <th className="px-5 py-4 text-center">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => {
                  const dateObj = new Date(log.created_at);
                  const isSuccess = log.status.toUpperCase() === 'SUCCESS';
                  const isWarning = log.status.toUpperCase() === 'WARNING';

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-4 align-top whitespace-nowrap">
                        <div className="font-semibold text-slate-800">
                          {dateObj.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {dateObj.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                      </td>

                      <td className="px-5 py-4 align-top min-w-[180px]">
                        <div className="flex items-start gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                            <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 line-clamp-1">{log.user_name || 'Sistema / Anónimo'}</div>
                            <div className="text-[10px] text-slate-400 font-mono line-clamp-1">{log.user_email || 'N/A'}</div>
                            {log.ip_address && (
                              <div className="text-[9px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                                <Globe className="w-2.5 h-2.5 text-slate-400" /> IP: {log.ip_address}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 align-top">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getModuleBadge(log.module)}`}>
                            {log.module}
                          </span>
                          <span className={`px-2 py-0.5 rounded border text-[10px] font-bold font-mono ${getActionBadge(log.action, log.module)}`}>
                            {log.action}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4 align-top">
                        {log.entity_type ? (
                          <div>
                            <span className="font-semibold text-slate-800">{log.entity_type}</span>
                            {log.entity_id && (
                              <span className="text-[10px] font-mono text-slate-400 block mt-0.5">ID: #{log.entity_id}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">-</span>
                        )}
                      </td>

                      <td className="px-5 py-4 align-top max-w-xs">
                        <p className="text-slate-700 text-xs leading-relaxed font-medium line-clamp-2" title={log.description || ''}>
                          {log.description || 'Sin descripción'}
                        </p>
                      </td>

                      <td className="px-5 py-4 align-top text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          isSuccess 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : isWarning 
                              ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                              : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          {isSuccess ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <XCircle className="w-3 h-3 text-red-600" />}
                          {log.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 align-top text-center">
                        {log.details ? (
                          <button
                            type="button"
                            onClick={() => setViewingLog(log)}
                            className="p-1.5 bg-slate-50 hover:bg-brand-50 text-slate-500 hover:text-brand-600 border border-slate-200 hover:border-brand-200 rounded-lg transition-all cursor-pointer shadow-2xs"
                            title="Ver detalles JSON / Diff"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-slate-300 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {total > limit && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-slate-500">
              Mostrando <strong className="text-slate-800">{(page - 1) * limit + 1}</strong> a <strong className="text-slate-800">{Math.min(page * limit, total)}</strong> de <strong className="text-slate-800">{total}</strong> eventos <span className="text-slate-400 font-normal ml-1">(Página {page} de {totalPages})</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all font-bold text-slate-700 flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
                <span>Anterior</span>
              </button>
              <span className="px-2 font-mono text-slate-400 text-[11px]">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all font-bold text-slate-700 flex items-center gap-1"
              >
                <span>Siguiente</span>
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {viewingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 text-brand-600 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Detalle del Registro de Auditoría #{viewingLog.id}</h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{viewingLog.action} • {viewingLog.module.toUpperCase()}</p>
                </div>
              </div>
              <button
                onClick={() => setViewingLog(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 uppercase tracking-widest text-[9px] font-bold block mb-1">Actor</span>
                  <span className="font-bold text-slate-800 text-sm block">{viewingLog.user_name || 'Sistema'}</span>
                  <span className="font-mono text-slate-500 text-[11px]">{viewingLog.user_email || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase tracking-widest text-[9px] font-bold block mb-1">Fecha y Ubicación</span>
                  <span className="font-bold text-slate-800 block">{new Date(viewingLog.created_at).toLocaleString('es-CO')}</span>
                  <span className="font-mono text-slate-500 text-[11px]">IP: {viewingLog.ip_address || 'Localhost'}</span>
                </div>
              </div>

              {viewingLog.description && (
                <div>
                  <span className="text-slate-500 font-semibold block mb-1">Descripción:</span>
                  <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 font-medium">
                    {viewingLog.description}
                  </p>
                </div>
              )}

              <div>
                <span className="text-slate-500 font-semibold block mb-1">Payload / Parámetros / Diff JSON:</span>
                <pre className="p-4 bg-slate-900 text-emerald-400 rounded-2xl overflow-x-auto text-[11px] font-mono leading-relaxed max-h-60 border border-slate-800">
                  {JSON.stringify(viewingLog.details, null, 2)}
                </pre>
              </div>

              {viewingLog.user_agent && (
                <div>
                  <span className="text-slate-400 text-[10px] block mb-0.5">User-Agent:</span>
                  <span className="text-[10px] text-slate-500 font-mono break-all">{viewingLog.user_agent}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingLog(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-all cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
