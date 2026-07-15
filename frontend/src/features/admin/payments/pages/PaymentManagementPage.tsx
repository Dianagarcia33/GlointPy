import React, { useState, useEffect } from 'react';
import { Search, Loader2, DollarSign, Filter, RefreshCw, FileText } from 'lucide-react';
import { paymentService } from '../services/paymentService';
import { Withdrawal, PaginatedWithdrawals } from '../types';
import { WithdrawalApprovalModal } from '../components/WithdrawalApprovalModal';
import { Can } from '../../../../components/security/Can';

export const PaymentManagementPage: React.FC = () => {
  const [data, setData] = useState<PaginatedWithdrawals | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const limit = 20;

  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      const res = await paymentService.getWithdrawals(page, limit, search);
      setData(res);
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWithdrawals();
  }, [page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchWithdrawals();
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(num);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pendiente: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      aprobado: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      procesado: 'bg-blue-100 text-blue-800 border-blue-200',
      rechazado: 'bg-red-100 text-red-800 border-red-200',
    };
    
    return (
      <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Pagos</h1>
          <p className="text-gray-500 text-sm mt-1">Administra los retiros y pagos solicitados por los usuarios.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={fetchWithdrawals}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
            title="Refrescar"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <form onSubmit={handleSearch} className="w-full md:w-96 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por nombre, documento o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
          />
        </form>
        
        <div className="flex gap-2 w-full md:w-auto">
          <button className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            <Filter className="w-4 h-4" />
            <span>Filtrar</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-4">ID / Fecha</th>
                <th className="px-6 py-4">Usuario</th>
                <th className="px-6 py-4">Detalle</th>
                <th className="px-6 py-4 text-right">Monto a Pagar</th>
                <th className="px-6 py-4 text-center">Estado</th>
                <Can permission="admin.withdrawals.manage">
                  <th className="px-6 py-4 text-center">Acciones</th>
                </Can>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && !data ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
                    <p className="mt-2 text-gray-500">Cargando pagos...</p>
                  </td>
                </tr>
              ) : data?.data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <FileText className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-900 font-medium">No se encontraron pagos</p>
                    <p className="text-gray-500 mt-1">Ajusta los filtros de búsqueda o intenta de nuevo.</p>
                  </td>
                </tr>
              ) : (
                data?.data.map((withdrawal) => (
                  <tr 
                    key={withdrawal.id} 
                    className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                    onClick={() => withdrawal.estado === 'pendiente' && setSelectedWithdrawal(withdrawal)}
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">#{withdrawal.id}</div>
                      <div className="text-gray-500 text-xs mt-1">{withdrawal.fecha_solicitud}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{withdrawal.user?.name || 'N/A'}</div>
                      <div className="text-gray-500 text-xs">{withdrawal.user?.document_id || ''}</div>
                      <div className="text-gray-400 text-xs">{withdrawal.user?.email || ''}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-medium">
                        {withdrawal.tipo.charAt(0).toUpperCase() + withdrawal.tipo.slice(1)}
                      </div>
                      <div className="text-gray-500 text-xs mt-1 capitalize">{withdrawal.origen}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="font-semibold text-gray-900">{formatCurrency(withdrawal.monto_neto)}</div>
                      <div className="text-gray-400 text-xs mt-0.5" title="Monto Bruto">B: {formatCurrency(withdrawal.monto)}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getStatusBadge(withdrawal.estado)}
                    </td>
                    <Can permission="admin.withdrawals.manage">
                      <td className="px-6 py-4 text-center">
                        {withdrawal.estado === 'pendiente' ? (
                          <button 
                            onClick={(e) => { e.stopPropagation(); setSelectedWithdrawal(withdrawal); }}
                            className="px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                          >
                            Revisar
                          </button>
                        ) : (withdrawal.estado === 'aprobado' || withdrawal.estado === 'procesado') && withdrawal.receipt_path ? (
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              const baseUrl = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || '';
                              const fullUrl = `${baseUrl}/${withdrawal.receipt_path}`.replace(/([^:]\/)\/+/g, "$1");
                              window.open(fullUrl, '_blank');
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                            title="Ver Comprobante"
                          >
                            <FileText size={14} />
                            Recibo
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                    </Can>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {data && data.total > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
            <span className="text-sm text-gray-500">
              Mostrando <span className="font-medium text-gray-900">{(page - 1) * limit + 1}</span> a{' '}
              <span className="font-medium text-gray-900">{Math.min(page * limit, data.total)}</span> de{' '}
              <span className="font-medium text-gray-900">{data.total}</span> resultados
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * limit >= data.total}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Approval Modal */}
      {selectedWithdrawal && (
        <WithdrawalApprovalModal
          withdrawal={selectedWithdrawal}
          onClose={() => setSelectedWithdrawal(null)}
          onUpdate={() => {
            fetchWithdrawals();
          }}
        />
      )}
    </div>
  );
};

