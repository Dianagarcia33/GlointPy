import React, { useState, useEffect } from 'react';
import { getInvestmentRequests, InvestmentRequest } from '../../../../services/investment_requests';
import { Loader2, Users } from 'lucide-react';
import { Can } from '../../../../components/security/Can';

const InvestmentRequestsTableSkeleton = () => {
  return (
    <>
      {[...Array(5)].map((_, i) => (
        <tr key={i} className="animate-pulse">
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
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
      setTotal(response.total);
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
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Usuario</th>
                <th className="px-6 py-4">Paquete</th>
                <th className="px-6 py-4">Monto</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Fecha Solicitud</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <InvestmentRequestsTableSkeleton />
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="w-8 h-8 text-slate-300" />
                      <p>No hay solicitudes de inversión registradas.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                requests.map((request) => (
                  <tr key={request.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">
                      #{request.id}
                    </td>
                    <td className="px-6 py-4">
                      {request.user ? (
                        <div className="space-y-0.5">
                          <div className="font-semibold text-slate-800">{request.user.name}</div>
                          <div className="text-xs text-slate-500">{request.user.email}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400">Usuario #{request.user_id}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">
                      {request.package ? request.package.name : `Paquete #${request.paquete_inversion_id}`}
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
                  </tr>
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
    </div>
  );
};
