import React, { useEffect, useState } from 'react';
import { Briefcase, Search, Loader2, AlertCircle, User as UserIcon, Calendar, Package } from 'lucide-react';
import { auditService, AuditUser } from '../../../../services/audit';

export const AdminInvestmentsPage: React.FC = () => {
  const [users, setUsers] = useState<AuditUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-brand-600" />
            Auditoría (Cruce de Datos)
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Revisión manual de los registros y validación de integridad.
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
        <div className="flex-1 w-full relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input 
            type="text" 
            placeholder="Buscar por nombre, correo o documento..." 
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
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
                    <th className="px-6 py-4">Usuario</th>
                    <th className="px-6 py-4">Billetera</th>
                    <th className="px-6 py-4">Inversiones (Cruces)</th>
                    <th className="px-6 py-4 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {users.map(user => (
                    <React.Fragment key={user.id}>
                      {/* Fila principal del Usuario */}
                      <tr className="bg-white hover:bg-slate-50/50 transition-colors">
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
                            <span className="text-xs text-slate-400 italic">Sin billetera</span>
                          )}
                        </td>
                        <td className="px-6 py-4 align-top">
                          {user.investments && user.investments.length > 0 ? (
                            <div className="space-y-3">
                              {user.investments.map((inv: any) => (
                                <div key={inv.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3 shadow-sm mb-3 last:mb-0">
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                                      {inv.assigned_code}
                                    </div>
                                    <div className="text-[10px] text-slate-400 text-right">
                                      <div>Creado: {new Date(inv.created_at).toLocaleDateString()}</div>
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs text-slate-600 mt-2 bg-white p-2 rounded border border-slate-100">
                                    <div className="flex flex-col">
                                      <span className="text-[10px] text-slate-400 font-semibold uppercase">Paquete</span>
                                      <span className="font-medium text-slate-800">
                                        {inv.package ? Number(inv.package.value).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }) : 'N/A'}
                                      </span>
                                      {inv.package?.granted_shares > 0 && <span className="text-[10px] text-brand-600">+{inv.package.granted_shares} acciones</span>}
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-[10px] text-slate-400 font-semibold uppercase">Periodo</span>
                                      <span className="font-medium text-slate-800">
                                        {inv.period ? `${inv.period.days} días (${inv.period.percentage}%)` : 'N/A'}
                                      </span>
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-[10px] text-slate-400 font-semibold uppercase">Inicio</span>
                                      <span className="font-medium text-slate-800">
                                        {inv.start_date ? new Date(inv.start_date).toLocaleDateString() : 'N/A'}
                                      </span>
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-[10px] text-slate-400 font-semibold uppercase">Fin (Estimado)</span>
                                      <span className="font-medium text-slate-800">
                                        {inv.end_date ? new Date(inv.end_date).toLocaleDateString() : 'N/A'}
                                      </span>
                                    </div>
                                    {inv.referred_by && (
                                      <div className="flex flex-col col-span-2">
                                        <span className="text-[10px] text-slate-400 font-semibold uppercase">Referido por</span>
                                        <span className="font-medium text-slate-800">{inv.referred_by}</span>
                                      </div>
                                    )}
                                    {inv.observations && (
                                      <div className="flex flex-col col-span-2 mt-1 pt-1 border-t border-slate-100">
                                        <span className="text-[10px] text-slate-400 font-semibold uppercase">Observaciones</span>
                                        <span className="font-medium italic">{inv.observations}</span>
                                      </div>
                                    )}
                                    {inv.contract_histories && inv.contract_histories.length > 0 && (
                                      <div className="flex flex-col col-span-2 mt-1 pt-1 border-t border-slate-100">
                                        <span className="text-[10px] text-brand-600 font-semibold uppercase">Historiales de Contrato: {inv.contract_histories.length}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs text-slate-400 italic py-2">
                              No registra inversiones
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center align-top">
                          <button className="text-xs font-medium text-brand-600 hover:text-white px-4 py-2 border border-brand-200 bg-brand-50 hover:bg-brand-600 rounded-lg transition-all shadow-sm">
                            Auditar a Fondo
                          </button>
                        </td>
                      </tr>
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
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
              <div className="text-sm text-slate-500">
                Mostrando <span className="font-medium text-slate-700">{users.length}</span> de <span className="font-medium text-slate-700">{total}</span> usuarios
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
          </>
        )}
      </div>
    </div>
  );
};
