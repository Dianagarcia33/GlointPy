import React, { useEffect, useState } from 'react';
import { Briefcase, Search, Loader2, AlertCircle, User as UserIcon, Calendar, Package, ChevronDown, ChevronRight, ChevronUp, Eye, FileText, Calculator, Send } from 'lucide-react';
import { auditService, AuditUser } from '../../../../services/audit';
import { UserYieldAuditBox } from '../components/UserYieldAuditBox';
import { UserWalletHistoryBox } from '../components/UserWalletHistoryBox';
import { BulkTransferModal } from '../components/BulkTransferModal';

export const AdminInvestmentsPage: React.FC = () => {
  const [users, setUsers] = useState<AuditUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Bulk Transfer Modal State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  // Expanded rows state
  const [expandedUsers, setExpandedUsers] = useState<Set<number>>(new Set());
  const [isCreatingWallet, setIsCreatingWallet] = useState<number | null>(null);

  // Global Cycle Filters
  const [cycleStartDate, setCycleStartDate] = useState('');
  const [cycleEndDate, setCycleEndDate] = useState('');

  // Pagination & Filters
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const usersData = await auditService.getUsers({
        page,
        limit,
        search: search || undefined,
      });
      setUsers(usersData.data);
      setTotal(usersData.total);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los usuarios.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, search]);

  const toggleExpand = (userId: number) => {
    const newSet = new Set(expandedUsers);
    if (newSet.has(userId)) newSet.delete(userId);
    else newSet.add(userId);
    setExpandedUsers(newSet);
  };

  const handleCreateWallet = async (userId: number) => {
    setIsCreatingWallet(userId);
    try {
      await (auditService as any).createWallet(userId);
      await fetchData(); // Refresh the data to show the new wallet
    } catch (err: any) {
      alert(err.message || 'Error al crear la billetera');
    } finally {
      setIsCreatingWallet(null);
    }
  };

  return (
    <div className="space-y-6">
      <BulkTransferModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        defaultStartDate={cycleStartDate}
        defaultEndDate={cycleEndDate}
        onSuccess={() => fetchData()}
      />

      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2 font-montserrat">
            <Briefcase className="w-8 h-8 text-brand-600" />
            Auditoría Financiera y Rendimientos
          </h1>
          <p className="text-slate-500 mt-1 text-xs sm:text-sm">Supervisión integral de contratos, balances en billeteras y transferencias masivas a inversionistas.</p>
        </div>

        <button
          onClick={() => setIsBulkModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 text-sm cursor-pointer shrink-0"
        >
          <Send className="w-4 h-4" />
          Transferencia Masiva General
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 relative w-full">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, email o documento..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-4 w-full md:w-auto bg-slate-50 p-2 rounded-lg border border-slate-100">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 ml-1">Inicio Ciclo</label>
                <input
              type="date"
              value={cycleStartDate}
              onChange={(e) => setCycleStartDate(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded md:w-36 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 ml-1">Fin Ciclo</label>
            <input
              type="date"
              value={cycleEndDate}
              onChange={(e) => setCycleEndDate(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded md:w-36 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
          </div>
        ) : error ? (
          <div className="p-12 text-center text-red-600">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
              <p>{error}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 border-collapse">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 uppercase text-xs tracking-wider">
                  <tr>
                    <th className="px-4 py-4 w-10"></th>
                    <th className="px-6 py-4">Usuario</th>
                    <th className="px-6 py-4">Billetera</th>
                    <th className="px-6 py-4">Capital Disponible (Retiro)</th>
                    <th className="px-6 py-4">Resumen Inversiones</th>
                    <th className="px-6 py-4 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {users.map(user => (
                    <React.Fragment key={user.id}>
                      {/* Fila principal del Usuario */}
                      <tr 
                        className={`bg-white hover:bg-slate-50/50 transition-colors cursor-pointer ${expandedUsers.has(user.id) ? 'bg-slate-50' : ''}`}
                        onClick={() => toggleExpand(user.id)}
                      >
                        <td className="px-4 py-4 text-slate-400">
                          {expandedUsers.has(user.id) ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                        </td>
                        <td className="px-6 py-4 align-top">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center shrink-0 mt-1">
                                <UserIcon className="w-4 h-4 text-brand-600" />
                            </div>
                            <div>
                              <div className="font-semibold text-slate-800">{user.name}</div>
                              <div className="text-xs text-slate-500 font-mono mt-0.5">{user.email}</div>
                              {user.document_id && <div className="text-[11px] text-slate-400 mt-0.5">Doc: {user.document_id}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top">
                          {user.wallet ? (
                            <div>
                              <div className="font-semibold text-slate-800">
                                {Number(user.wallet.balance).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
                              </div>
                              <div className={`text-[10px] mt-1 font-semibold uppercase ${user.wallet.status === 'active' ? 'text-emerald-600' : 'text-red-600'}`}>
                                {user.wallet.status}
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-start">
                              <span className="text-xs text-slate-400 italic mb-2">Sin billetera</span>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCreateWallet(user.id);
                                }}
                                disabled={isCreatingWallet === user.id}
                                className="text-[10px] font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 px-2 py-1 rounded transition-colors disabled:opacity-50 flex items-center gap-1"
                              >
                                {isCreatingWallet === user.id && <Loader2 className="w-3 h-3 animate-spin" />}
                                Crear Billetera
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 align-top">
                          <div>
                            <div className="font-extrabold text-emerald-700 text-sm font-mono">
                              {Number((user as any).total_capital_disponible || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
                              Liberado: {Number((user as any).total_capital_liberado || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
                            </div>
                            {(user as any).total_capital_retirado > 0 && (
                              <div className="text-[10px] text-amber-600 font-semibold mt-0.5">
                                Retirado: -{Number((user as any).total_capital_retirado || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <div className="flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-brand-500" />
                            <span className="text-sm font-medium text-slate-700">
                              {user.investments ? user.investments.length : 0} {user.investments?.length === 1 ? 'Inversión' : 'Inversiones'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center align-top" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={() => toggleExpand(user.id)}
                            className={`text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1.5 mx-auto ${
                              expandedUsers.has(user.id)
                                ? 'bg-slate-800 text-white hover:bg-slate-900 border border-slate-800'
                                : 'text-brand-700 bg-brand-50 hover:bg-brand-600 hover:text-white border border-brand-200'
                            }`}
                          >
                            {expandedUsers.has(user.id) ? (
                              <>
                                <ChevronUp className="w-3.5 h-3.5" />
                                <span>Ocultar Auditoría</span>
                              </>
                            ) : (
                              <>
                                <Eye className="w-3.5 h-3.5" />
                                <span>Auditar Usuario</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* Fila expandida con las inversiones y auditoría */}
                      {expandedUsers.has(user.id) && (
                        <tr>
                          <td colSpan={6} className="p-0 bg-slate-50/80 border-b border-slate-200">
                            <div className="px-10 py-6">
                              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-brand-600" />
                                Detalle de Inversiones y Liberación de Capital por Ciclos (60 días)
                              </h3>
                              {user.investments && user.investments.length > 0 ? (
                                <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
                                  <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-100 text-slate-600 uppercase tracking-wider font-semibold">
                                      <tr>
                                        <th className="px-4 py-3 border-b">Código</th>
                                        <th className="px-4 py-3 border-b">Capital Total</th>
                                        <th className="px-4 py-3 border-b">Liberación Capital (Ciclos 60d)</th>
                                        <th className="px-4 py-3 border-b">Capital Disponible (Retiro)</th>
                                      <th className="px-4 py-3 border-b">Periodo / Tasa</th>
                                      <th className="px-4 py-3 border-b">Fechas</th>
                                      <th className="px-4 py-3 border-b">Extras</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {user.investments.map(inv => {
                                      const capTotal = Number(inv.capital_total || inv.package?.value || 0);
                                      const capLiberado = Number(inv.capital_liberado || 0);
                                      const capDisponible = Number(inv.capital_disponible || 0);
                                      const capRetirado = Number(inv.capital_retirado || 0);
                                      const capDiario = Number(inv.capital_diario || 0);
                                      const diasTranscurridos = Number(inv.dias_transcurridos || 0);
                                      const bloques60d = Number(inv.bloques_60_dias_cumplidos || 0);
                                      const diasProxima = Number(inv.dias_proxima_liberacion || 0);
                                      const diasTotales = Number(inv.dias_totales || inv.period?.days || 547);
                                      const pctLiberado = capTotal > 0 ? Math.min(100, Math.round((capLiberado / capTotal) * 100)) : 0;

                                      return (
                                        <React.Fragment key={inv.id}>
                                          <tr className="hover:bg-slate-50/50">
                                            <td className="px-4 py-3 align-top border-b border-slate-100">
                                              <div className="font-bold text-slate-800">{inv.assigned_code}</div>
                                              <div className="text-[10px] text-slate-400 mt-0.5">ID: #{inv.id}</div>
                                            </td>
                                            <td className="px-4 py-3 align-top border-b border-slate-100">
                                              <div className="font-bold text-slate-900 font-mono text-sm">
                                                {capTotal.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
                                              </div>
                                              {inv.package?.granted_shares > 0 && (
                                                <div className="text-[10px] text-brand-600 mt-0.5 font-medium">+{inv.package.granted_shares} acciones</div>
                                              )}
                                            </td>
                                            <td className="px-4 py-3 align-top border-b border-slate-100 min-w-[220px]">
                                              <div className="space-y-1">
                                                <div className="flex justify-between items-center text-[11px]">
                                                  <span className="text-slate-500 font-medium">Rend. Diario Capital:</span>
                                                  <span className="font-bold text-slate-800 font-mono">
                                                    {capDiario.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })} / día
                                                  </span>
                                                </div>
                                                <div className="flex justify-between items-center text-[11px]">
                                                  <span className="text-slate-500 font-medium">Tiempo Transcurrido:</span>
                                                  <span className="font-semibold text-slate-700">
                                                    {diasTranscurridos}d ({bloques60d} {bloques60d === 1 ? 'ciclo' : 'ciclos'} de 60d)
                                                  </span>
                                                </div>
                                                <div className="flex justify-between items-center text-[11px] pt-0.5">
                                                  <span className="text-slate-600 font-bold">Capital Liberado ({pctLiberado}%):</span>
                                                  <span className="font-bold text-emerald-700 font-mono">
                                                    {capLiberado.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
                                                  </span>
                                                </div>
                                                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${pctLiberado}%` }}></div>
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-medium">
                                                  {diasProxima > 0 ? `Próxima liberación en ${diasProxima} días` : '100% de capital liberado'}
                                                </div>
                                              </div>
                                            </td>
                                            <td className="px-4 py-3 align-top border-b border-slate-100">
                                              <div className="font-extrabold text-emerald-700 text-sm font-mono">
                                                {capDisponible.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
                                              </div>
                                              {capRetirado > 0 && (
                                                <div className="text-[10px] text-amber-600 font-semibold mt-0.5">
                                                  Retirado: -{capRetirado.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
                                                </div>
                                              )}
                                              <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                capDisponible > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                                              }`}>
                                                {capDisponible > 0 ? 'Disponible' : 'Sin saldo disponible'}
                                              </span>
                                            </td>
                                            <td className="px-4 py-3 align-top border-b border-slate-100">
                                              <div className="font-medium text-slate-800">
                                                {diasTotales} días
                                              </div>
                                              {inv.period && (
                                                <div className="text-[10px] text-slate-500 mt-0.5 font-medium">{inv.period.percentage}% mensual</div>
                                              )}
                                            </td>
                                            <td className="px-4 py-3 align-top border-b border-slate-100">
                                              <div className="text-[10px] text-slate-500"><span className="font-semibold">Inicio:</span> {inv.start_date ? new Date(inv.start_date).toLocaleDateString('es-CO') : 'N/A'}</div>
                                              <div className="text-[10px] text-slate-500 mt-0.5"><span className="font-semibold">Fin (Est.):</span> {inv.end_date ? new Date(inv.end_date).toLocaleDateString('es-CO') : 'N/A'}</div>
                                            </td>
                                            <td className="px-4 py-3 align-top max-w-[180px] border-b border-slate-100">
                                              {inv.referred_by && <div className="text-[10px] text-slate-500"><span className="font-semibold">Ref:</span> {inv.referred_by}</div>}
                                              {inv.observations && <div className="text-[10px] text-slate-500 mt-0.5 italic truncate" title={inv.observations}><span className="font-semibold not-italic">Obs:</span> {inv.observations}</div>}
                                              <div className="text-[10px] text-brand-600 font-semibold mt-1">Historiales: {inv.contract_histories ? inv.contract_histories.length : 0}</div>
                                            </td>
                                          </tr>
                                        {/* Retiros de Capital para esta inversión */}
                                        {inv.withdrawals && inv.withdrawals.filter((w: any) => w.tipo === 'capital').length > 0 && (
                                          <tr className="bg-slate-50/30">
                                            <td colSpan={6} className="px-4 py-3 border-b border-slate-100">
                                              <div className="pl-4 border-l-2 border-amber-300">
                                                <h4 className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                                                  Retiros de Capital ({inv.withdrawals.filter((w: any) => w.tipo === 'capital').length})
                                                </h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                  {inv.withdrawals.filter((w: any) => w.tipo === 'capital').map((w: any) => (
                                                    <div key={w.id} className="bg-white border border-slate-200 rounded p-2.5 text-[10px] shadow-sm hover:shadow transition-shadow">
                                                      <div className="flex justify-between items-center mb-1.5">
                                                        <span className="font-semibold text-slate-700">{new Date(w.fecha_solicitud).toLocaleDateString()}</span>
                                                        <span className={`px-1.5 py-0.5 rounded font-medium uppercase text-[9px] ${w.estado === 'procesado' || w.estado === 'aprobado' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : w.estado === 'rechazado' || w.estado === 'cancelado' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                                                          {w.estado}
                                                        </span>
                                                      </div>
                                                      <div className="flex justify-between items-end">
                                                        <div className="text-slate-500">
                                                          <div className="font-semibold text-slate-800 text-xs">{Number(w.monto_neto).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}</div>
                                                          <div className="mt-0.5 truncate max-w-[120px]" title={w.metodo_pago ? `${w.metodo_pago} - ${w.banco || ''} ${w.numero_cuenta || ''}` : ''}>
                                                            {w.metodo_pago ? `${w.metodo_pago} - ${w.banco || ''}` : 'Sin método de pago'}
                                                          </div>
                                                        </div>
                                                        <button className="text-brand-600 hover:text-brand-700 font-medium bg-brand-50 hover:bg-brand-100 px-2 py-1 rounded transition-colors">
                                                          Ver
                                                        </button>
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            </td>
                                          </tr>
                                        )}
                                      </React.Fragment>
                                    );
                                  })}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs text-slate-500 flex items-center gap-2 mb-4">
                                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                                <span>Este usuario no registra contratos de inversión asociados.</span>
                              </div>
                            )}

                            <UserYieldAuditBox 
                              userId={user.id}
                              userName={user.name}
                              startDate={cycleStartDate}
                              endDate={cycleEndDate}
                              onSuccess={() => fetchData()}
                            />
                            
                            <UserWalletHistoryBox userId={user.id} />
                          </div>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                        No se encontraron registros para auditar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-xs gap-3 text-xs">
              <div className="text-slate-500">
                {total > 0 ? (
                  <span>
                    Mostrando <strong className="font-bold text-slate-800">{(page - 1) * limit + 1}</strong> a <strong className="font-bold text-slate-800">{Math.min(page * limit, total)}</strong> de <strong className="font-bold text-slate-800">{total}</strong> usuarios <span className="text-slate-400 font-normal ml-1">(Página {page} de {Math.max(1, Math.ceil(total / limit))})</span>
                  </span>
                ) : (
                  <span>0 usuarios</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3.5 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  Anterior
                </button>
                <span className="px-2 font-mono text-slate-400 text-[11px]">
                  {page} / {Math.max(1, Math.ceil(total / limit))}
                </span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page * limit >= total}
                  className="px-3.5 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
