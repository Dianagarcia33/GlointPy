import React, { useState, useEffect } from 'react';
import { Search, Loader2, RefreshCw, Briefcase, ChevronRight } from 'lucide-react';
import { auditService } from '../services/auditService';
import { PaginatedAuditUsers, AuditUserSummary } from '../types';
import { UserAuditDrawer } from '../components/UserAuditDrawer';

export const AdminInvestmentsPage: React.FC = () => {
  const [data, setData] = useState<PaginatedAuditUsers | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUserName, setSelectedUserName] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await auditService.getAuditUsers(page, limit, search);
      setData(res);
    } catch (error) {
      console.error('Error fetching audit users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value);
  };

  const handleUserClick = (user: AuditUserSummary) => {
    setSelectedUserId(user.user_id);
    setSelectedUserName(user.name);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-indigo-600" />
            Auditoría
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Historial consolidado de inversiones, retiros y operaciones por usuario.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchUsers()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <form onSubmit={handleSearch} className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, documento o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm"
          />
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-4">Usuario</th>
                <th className="px-6 py-4 text-center">Inversiones Activas</th>
                <th className="px-6 py-4 text-right">Total Invertido</th>
                <th className="px-6 py-4 text-right">Total Retirado</th>
                <th className="px-6 py-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && !data ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
                    <p className="mt-2 text-gray-500">Cargando datos de auditoría...</p>
                  </td>
                </tr>
              ) : data?.data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Briefcase className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 font-medium">No se encontraron registros de auditoría</p>
                  </td>
                </tr>
              ) : (
                data?.data.map((user) => (
                  <tr 
                    key={user.user_id} 
                    className="hover:bg-indigo-50/50 cursor-pointer transition-colors group"
                    onClick={() => handleUserClick(user)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-600 font-bold">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.name}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{user.document_id || 'Sin Doc'}</span>
                            <span>•</span>
                            <span>{user.email}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-medium">
                        {user.active_packages_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-medium text-gray-900">{formatCurrency(user.total_investments)}</p>
                      {user.pending_requests_count > 0 && (
                        <p className="text-xs text-amber-600 font-medium">+{user.pending_requests_count} solicitudes pendientes</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">
                      {formatCurrency(user.total_withdrawals)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button className="p-2 text-gray-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 rounded-lg transition-colors">
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.total > data.limit && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
            <span className="text-sm text-gray-500">
              Mostrando {((data.page - 1) * data.limit) + 1} a {Math.min(data.page * data.limit, data.total)} de {data.total} usuarios
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={data.page === 1}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={data.page * data.limit >= data.total}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Drawer */}
      <UserAuditDrawer 
        userId={selectedUserId!}
        userName={selectedUserName}
        isOpen={!!selectedUserId}
        onClose={() => {
          setSelectedUserId(null);
          setSelectedUserName('');
        }}
      />
    </div>
  );
};
