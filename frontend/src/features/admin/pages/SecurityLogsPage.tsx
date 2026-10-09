import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Search, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  X, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  Filter,
  User,
  Globe,
  Clock,
  Code
} from 'lucide-react';
import { auditService, SecurityAuditLog } from '../../../services/audit';

export const SecurityLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<SecurityAuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [modules, setModules] = useState<string[]>([]);
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedLog, setSelectedLog] = useState<SecurityAuditLog | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const response = await auditService.getSecurityLogs({
        page,
        limit,
        module: selectedModule,
        status: selectedStatus,
        search: searchTerm.trim() || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });

      setLogs(response.data || []);
      setTotal(response.total || 0);
      if (response.modules && response.modules.length > 0) {
        setModules(response.modules);
      }
    } catch (error) {
      console.error('Error al cargar logs de seguridad:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, selectedModule, selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const handleResetFilters = () => {
    setSelectedModule('all');
    setSelectedStatus('all');
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'SUCCESS') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
          <CheckCircle2 className="w-3.5 h-3.5" /> Éxito
        </span>
      );
    }
    if (s === 'WARNING') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
          <AlertTriangle className="w-3.5 h-3.5" /> Alerta
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/20">
        <XCircle className="w-3.5 h-3.5" /> Fallido
      </span>
    );
  };

  const getModuleBadge = (moduleName: string) => {
    const colors: Record<string, string> = {
      withdrawals: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      users: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
      roles: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
      auth: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
      commercial: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
      investments: 'bg-teal-500/10 text-teal-600 border-teal-500/20',
      audit: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
    };
    const cls = colors[moduleName] || 'bg-slate-500/10 text-slate-600 border-slate-500/20';
    return (
      <span className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-bold uppercase tracking-wider border ${cls}`}>
        {moduleName}
      </span>
    );
  };

  const successCount = logs.filter(l => (l.status || '').toUpperCase() === 'SUCCESS').length;
  const warningCount = logs.filter(l => (l.status || '').toUpperCase() === 'WARNING').length;
  const failedCount = logs.filter(l => (l.status || '').toUpperCase() === 'FAILED').length;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in duration-300 font-inter">
      {/* Header Ejecutivo Estandarizado */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-montserrat flex items-center gap-2.5 whitespace-nowrap sm:whitespace-normal">
              <div className="p-2.5 bg-brand-50 border border-brand-200/80 rounded-2xl text-brand-700 shadow-2xs">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <span>Logs de Seguridad</span>
            </h1>
            <button
              onClick={fetchLogs}
              disabled={isLoading}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              title="Actualizar datos"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-brand-600' : ''}`} />
            </button>
          </div>
          <p className="text-slate-500 text-sm mt-1 font-normal">
            Pista inmutable de auditoría (audit trail): trazabilidad de accesos, aprobación de pagos, roles y cambios críticos.
          </p>
        </div>
      </div>

      {/* KPI Cards Summary (4 Métricas Clave Estandarizadas) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Eventos */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block font-montserrat">
              Total Registros
            </span>
            <div className="p-2 bg-brand-50 text-brand-600 rounded-xl shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-black text-slate-900 block tracking-tight font-mono">
            {total}
          </span>
          <span className="text-[11px] text-slate-500 font-medium block truncate">
            {logs.length} en la página actual
          </span>
        </div>

        {/* Exitosos */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-emerald-700 font-bold uppercase tracking-wider block font-montserrat">
              Operaciones Exitosas
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-black text-emerald-600 block tracking-tight font-mono">
            {successCount}
          </span>
          <span className="text-[11px] text-emerald-600 font-medium block truncate">
            Eventos validados correctamente
          </span>
        </div>

        {/* Alertas */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-amber-700 font-bold uppercase tracking-wider block font-montserrat">
              Alertas del Sistema
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-black text-amber-600 block tracking-tight font-mono">
            {warningCount}
          </span>
          <span className="text-[11px] text-amber-600 font-medium block truncate">
            Atención o intervención requerida
          </span>
        </div>

        {/* Fallidos */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-rose-700 font-bold uppercase tracking-wider block font-montserrat">
              Eventos Fallidos
            </span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl shrink-0">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-black text-rose-600 block tracking-tight font-mono">
            {failedCount}
          </span>
          <span className="text-[11px] text-rose-600 font-medium block truncate">
            Operaciones denegadas o errores
          </span>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-4 sm:p-5 space-y-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Búsqueda por texto */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            <input
              type="text"
              placeholder="Buscar por usuario, IP, acción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
            />
          </div>

          {/* Filtro por Módulo */}
          <div className="relative">
            <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            <select
              value={selectedModule}
              onChange={(e) => {
                setSelectedModule(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all appearance-none cursor-pointer"
            >
              <option value="all">Todos los módulos</option>
              {modules.map((m) => (
                <option key={m} value={m}>
                  Módulo: {m.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Estado */}
          <div className="relative">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all appearance-none cursor-pointer"
            >
              <option value="all">Todos los estados</option>
              <option value="SUCCESS">Solo Éxito (SUCCESS)</option>
              <option value="WARNING">Alertas (WARNING)</option>
              <option value="FAILED">Fallidos (FAILED)</option>
            </select>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="flex-1 bg-brand-500 text-white font-semibold py-2.5 px-4 rounded-xl text-sm hover:bg-brand-600 transition-all shadow-sm cursor-pointer"
            >
              Filtrar
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-2.5 text-xs text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer font-medium"
            >
              Limpiar
            </button>
          </div>
        </form>

        {/* Fechas */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs text-slate-600">
          <span className="flex items-center gap-1 font-semibold text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-400" /> Rango de fechas:
          </span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-brand-500"
            />
            <span className="text-slate-400">a</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-brand-500"
            />
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                  setPage(1);
                  fetchLogs();
                }}
                className="text-brand-600 hover:underline cursor-pointer font-semibold ml-1"
              >
                Quitar fechas
              </button>
            )}
          </div>
          <div className="ml-auto font-medium text-slate-500">
            Total registros auditados: <strong className="text-slate-800">{total}</strong>
          </div>
        </div>
      </div>

      {/* Tabla de Logs */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-400 font-bold text-[10px] uppercase tracking-wider font-montserrat">
              <tr>
                <th className="py-4 px-5">Fecha / Hora</th>
                <th className="py-4 px-5">Actor (Usuario / IP)</th>
                <th className="py-4 px-5">Módulo & Acción</th>
                <th className="py-4 px-5">Descripción del Evento</th>
                <th className="py-4 px-5 text-center">Estado</th>
                <th className="py-4 px-5 text-center">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-500" />
                    <span>Consultando registros de auditoría...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <ShieldAlert className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600 text-base font-montserrat">No hay registros de auditoría que coincidan</p>
                    <p className="text-xs text-slate-400 mt-1">Ajusta los filtros o realiza acciones en el panel administrativo.</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Fecha */}
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-slate-700 font-mono text-xs">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{formatDateTime(log.created_at)}</span>
                      </div>
                    </td>

                    {/* Actor */}
                    <td className="py-3.5 px-5">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs font-montserrat">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{log.user_name || 'Sistema Automático'}</span>
                        </div>
                        {log.user_email && (
                          <div className="text-[11px] text-slate-400 font-mono truncate max-w-[200px]">
                            {log.user_email}
                          </div>
                        )}
                        {log.ip_address && (
                          <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
                            <Globe className="w-3 h-3 text-slate-400" />
                            <span>{log.ip_address}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Módulo & Acción */}
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      <div className="space-y-1">
                        <div>{getModuleBadge(log.module)}</div>
                        <div className="font-mono text-xs font-bold text-slate-700">
                          {log.action}
                        </div>
                      </div>
                    </td>

                    {/* Descripción */}
                    <td className="py-3.5 px-5">
                      <p className="text-xs text-slate-700 leading-relaxed line-clamp-2 max-w-md">
                        {log.description || '-'}
                      </p>
                      {log.entity_type && log.entity_id && (
                        <span className="inline-block mt-1 font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          {log.entity_type} #{log.entity_id}
                        </span>
                      )}
                    </td>

                    {/* Estado */}
                    <td className="py-3.5 px-5 text-center whitespace-nowrap">
                      {getStatusBadge(log.status)}
                    </td>

                    {/* Acción / Ver Detalle */}
                    <td className="py-3.5 px-5 text-center whitespace-nowrap">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-50/70 hover:bg-brand-100/70 text-brand-700 transition-all text-xs font-semibold cursor-pointer border border-brand-200/80 shadow-2xs font-montserrat"
                        title="Ver payload y detalles del evento"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Detalles</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginador */}
        <div className="py-4 px-6 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white text-xs text-slate-600">
          <div className="font-medium text-slate-500">
            Mostrando página <strong className="text-slate-800 font-bold">{page}</strong> de <strong className="text-slate-800 font-bold">{totalPages}</strong> <span className="text-slate-400 font-normal">({total} registros en total)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
              className="flex items-center gap-1 px-3.5 py-1.5 bg-white border border-slate-200/90 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-slate-700 transition-all cursor-pointer shadow-2xs font-montserrat"
            >
              <ChevronLeft className="w-4 h-4" /> Anterior
            </button>
            <span className="px-2 font-mono text-slate-500 font-semibold text-xs">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isLoading}
              className="flex items-center gap-1 px-3.5 py-1.5 bg-white border border-slate-200/90 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-slate-700 transition-all cursor-pointer shadow-2xs font-montserrat"
            >
              Siguiente <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Detalle Técnico (JSON / Contexto) */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header del Modal */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400">
                  <Code className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-montserrat">Detalles de Auditoría #{selectedLog.id}</h3>
                  <p className="text-xs text-slate-300 font-mono">{selectedLog.action} · {selectedLog.module}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contenido */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px] font-semibold uppercase">Actor</span>
                  <span className="font-semibold text-slate-800">{selectedLog.user_name || 'Sistema'}</span>
                  <span className="block text-slate-500">{selectedLog.user_email || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-semibold uppercase">Dirección IP</span>
                  <span className="font-mono text-slate-800">{selectedLog.ip_address || 'No registrada'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-semibold uppercase">Fecha y Hora</span>
                  <span className="font-mono text-slate-800">{formatDateTime(selectedLog.created_at)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-semibold uppercase">Entidad Afectada</span>
                  <span className="font-mono text-slate-800">
                    {selectedLog.entity_type ? `${selectedLog.entity_type} #${selectedLog.entity_id}` : 'General / Sin entidad'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-500 font-bold block mb-1">Descripción:</span>
                <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 leading-relaxed">
                  {selectedLog.description || 'Sin descripción adicional.'}
                </p>
              </div>

              {selectedLog.user_agent && (
                <div>
                  <span className="text-slate-500 font-bold block mb-1">User Agent:</span>
                  <p className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 font-mono text-[11px] break-all">
                    {selectedLog.user_agent}
                  </p>
                </div>
              )}

              <div>
                <span className="text-slate-500 font-bold block mb-1">Payload Técnico / Modificaciones (JSON):</span>
                <pre className="p-4 bg-slate-900 text-emerald-400 rounded-2xl overflow-x-auto text-[11px] font-mono leading-relaxed border border-slate-800">
                  {selectedLog.details 
                    ? JSON.stringify(selectedLog.details, null, 2) 
                    : '// No se registraron metadatos adicionales para este evento.'}
                </pre>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
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
export default SecurityLogsPage;
