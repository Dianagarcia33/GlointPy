import React, { useState, useEffect } from 'react';
import { Investor, getInvestors, deleteInvestor } from '../../../../services/investors';
import { InvestorModal } from '../components/InvestorModal';
import { BulkUploadInvestorsModal } from '../components/BulkUploadInvestorsModal';
import { Plus, Edit2, Users, Loader2, Trash2, UploadCloud } from 'lucide-react';
import { Can } from '../../../../components/security/Can';

export const AdminInvestorsPage = () => {
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingInvestor, setEditingInvestor] = useState<Investor | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const data = await getInvestors();
      setInvestors(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los inversionistas');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = () => {
    setEditingInvestor(null);
    setIsModalOpen(true);
  };

  const handleEdit = (investor: Investor) => {
    setEditingInvestor(investor);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este inversionista?')) {
      try {
        await deleteInvestor(id);
        fetchData();
      } catch (err: any) {
        alert(err.message || 'Error al eliminar el inversionista');
      }
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingInvestor(null);
  };

  const handleSaved = () => {
    fetchData();
  };

  if (isLoading) {
      return (
          <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-2 text-slate-500">
                  <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                  <p className="text-sm font-medium">Cargando inversionistas...</p>
              </div>
          </div>
      );
  }

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestión de Inversionistas</h1>
          <p className="text-slate-500 text-sm mt-1">Administra las inversiones y sus periodos</p>
        </div>
        
        <Can permission="admin.investors.manage">
          <div className="flex gap-2">
            <button 
              onClick={() => setIsBulkModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 hover:text-brand-600 transition-colors shadow-sm text-sm font-medium"
            >
              <UploadCloud className="w-4 h-4" />
              Carga Masiva
            </button>
            <button 
              onClick={handleCreate}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors shadow-sm text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Crear Inversionista
            </button>
          </div>
        </Can>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 uppercase text-xs tracking-wider">
              <tr>
                <th className="px-6 py-4">Código</th>
                <th className="px-6 py-4">Usuario</th>
                <th className="px-6 py-4">Paquete</th>
                <th className="px-6 py-4">Fechas</th>
                <Can permission="admin.investors.manage">
                  <th className="px-6 py-4 text-right">Acciones</th>
                </Can>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {investors.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="w-8 h-8 text-slate-300" />
                      <p>No hay inversionistas registrados.</p>
                      <button onClick={handleCreate} className="text-brand-600 font-medium hover:underline text-sm mt-1">
                        Crea el primer inversionista
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                investors.map((investor) => (
                  <tr key={investor.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800">{investor.assigned_code}</div>
                      {investor.referred_by && (
                          <div className="text-xs text-slate-500">Ref: {investor.referred_by}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {investor.user ? (
                          <>
                              <div className="font-medium text-slate-700">{investor.user.name}</div>
                              <div className="text-xs text-slate-500">{investor.user.email}</div>
                          </>
                      ) : (
                          <span className="text-slate-400">Desconocido</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-brand-50 text-brand-700">
                        {investor.package ? `$${investor.package.value.toLocaleString('es-CO')} COP` : 'Desconocido'}
                      </span>
                      <div className="text-xs text-slate-500 mt-1">
                          {investor.period ? `${investor.period.months}m ${investor.period.days}d (${investor.period.percentage}%)` : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs space-y-1">
                        <div className="flex justify-between w-40">
                            <span className="text-slate-500">Ingreso:</span>
                            <span className="font-medium text-slate-700">
                                {new Date(investor.start_date).toLocaleDateString()}
                            </span>
                        </div>
                        <div className="flex justify-between w-40">
                            <span className="text-slate-500">Fin:</span>
                            <span className="font-medium text-emerald-700">
                                {new Date(investor.end_date).toLocaleDateString()}
                            </span>
                        </div>
                    </td>
                    <Can permission="admin.investors.manage">
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleEdit(investor)}
                            className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(investor.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </Can>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <InvestorModal 
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSaved={handleSaved}
        investor={editingInvestor}
      />
      
      <BulkUploadInvestorsModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onUploaded={() => {
          setIsBulkModalOpen(false);
          fetchData();
        }}
      />
    </div>
  );
};
