import React, { useState, useEffect } from 'react';
import { X, Loader2, DollarSign, Calendar, TrendingUp, Package, RefreshCw } from 'lucide-react';
import { auditService } from '../services/auditService';
import { AuditUserHistory } from '../types';

interface UserAuditDrawerProps {
  userId: number;
  userName: string;
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'investments' | 'withdrawals' | 'requests' | 'accelerations';

export const UserAuditDrawer: React.FC<UserAuditDrawerProps> = ({ userId, userName, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('investments');
  const [data, setData] = useState<AuditUserHistory | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      loadHistory();
    } else {
      setData(null);
      setActiveTab('investments');
    }
  }, [isOpen, userId]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const history = await auditService.getUserHistory(userId);
      setData(history);
    } catch (error) {
      console.error('Error fetching audit history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const formatCurrency = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(num);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />
      
      <div className="fixed inset-y-0 right-0 w-full md:w-[600px] lg:w-[800px] bg-white shadow-2xl z-50 transform transition-transform duration-300 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Auditoría: {userName}</h2>
            <p className="text-sm text-gray-500">Historial financiero completo</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Loading State */}
        {loading && !data ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-4" />
            <p className="text-gray-500">Cargando historial del usuario...</p>
          </div>
        ) : data ? (
          <>
            {/* Tabs */}
            <div className="flex border-b border-gray-100 px-6 pt-4 space-x-6 overflow-x-auto">
              <button
                onClick={() => setActiveTab('investments')}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'investments' 
                    ? 'border-indigo-600 text-indigo-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Inversiones ({data.investments.length})
              </button>
              <button
                onClick={() => setActiveTab('requests')}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'requests' 
                    ? 'border-indigo-600 text-indigo-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Solicitudes ({data.requests.length})
              </button>
              <button
                onClick={() => setActiveTab('withdrawals')}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'withdrawals' 
                    ? 'border-indigo-600 text-indigo-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Retiros ({data.withdrawals.length})
              </button>
              <button
                onClick={() => setActiveTab('accelerations')}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'accelerations' 
                    ? 'border-indigo-600 text-indigo-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Aceleraciones ({data.accelerations.length})
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              
              {/* INVESTMENTS TAB */}
              {activeTab === 'investments' && (
                <div className="space-y-4">
                  {data.investments.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
                      <p className="text-gray-500">No hay inversiones registradas.</p>
                    </div>
                  ) : (
                    data.investments.map(inv => (
                      <div key={inv.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:flex-row justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Package className="w-4 h-4 text-indigo-500" />
                            <h4 className="font-medium text-gray-900">{inv.package?.name || 'Paquete Desconocido'}</h4>
                          </div>
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Inicio: {formatDate(inv.start_date)}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            Periodo: {inv.period?.name || 'Desconocido'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500 mb-1">ID Contrato</p>
                          <p className="font-mono text-sm font-medium text-gray-900">#{inv.id}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* REQUESTS TAB */}
              {activeTab === 'requests' && (
                <div className="space-y-4">
                  {data.requests.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
                      <p className="text-gray-500">No hay solicitudes registradas.</p>
                    </div>
                  ) : (
                    data.requests.map(req => (
                      <div key={req.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:flex-row justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-4 h-4 text-blue-500" />
                            <h4 className="font-medium text-gray-900">{req.package?.name || 'Paquete Personalizado'}</h4>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              req.status === 'approved' ? 'bg-green-50 text-green-700 border border-green-200' :
                              req.status === 'rejected' ? 'bg-red-50 text-red-700 border border-red-200' :
                              'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {req.status}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-900 mb-1">
                            Monto: {formatCurrency(req.monto)}
                          </p>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Solicitado: {formatDate(req.created_at)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500 mb-1">ID Solicitud</p>
                          <p className="font-mono text-sm font-medium text-gray-900">#{req.id}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* WITHDRAWALS TAB */}
              {activeTab === 'withdrawals' && (
                <div className="space-y-4">
                  {data.withdrawals.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
                      <p className="text-gray-500">No hay retiros registrados.</p>
                    </div>
                  ) : (
                    data.withdrawals.map(wd => (
                      <div key={wd.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:flex-row justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="w-4 h-4 text-rose-500" />
                            <h4 className="font-medium text-gray-900 capitalize">{wd.tipo}</h4>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              wd.estado === 'procesado' || wd.estado === 'aprobado' ? 'bg-green-50 text-green-700 border border-green-200' :
                              wd.estado === 'rechazado' || wd.estado === 'cancelado' ? 'bg-red-50 text-red-700 border border-red-200' :
                              'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {wd.estado}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-900 mb-1">
                            Neto: {formatCurrency(wd.monto_neto)} <span className="text-xs text-gray-500 font-normal">(Bruto: {formatCurrency(wd.monto)})</span>
                          </p>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Solicitado: {formatDate(wd.fecha_solicitud)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500 mb-1">Origen</p>
                          <p className="text-sm font-medium text-gray-900 capitalize">{wd.origen}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ACCELERATIONS TAB */}
              {activeTab === 'accelerations' && (
                <div className="space-y-4">
                  {data.accelerations.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
                      <p className="text-gray-500">No hay aceleraciones registradas.</p>
                      <p className="text-xs text-gray-400 mt-2">Módulo de aceleraciones en construcción.</p>
                    </div>
                  ) : (
                    <div>{/* To be implemented */}</div>
                  )}
                </div>
              )}

            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center">
            <p className="text-gray-500">Error al cargar datos.</p>
          </div>
        )}
      </div>
    </>
  );
};
