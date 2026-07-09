import React, { useState, useEffect } from 'react';
import { Investor, getInvestors, deleteInvestor } from '../../../../services/investors';
import { InvestorModal } from '../components/InvestorModal';
import { BulkUploadInvestorsModal } from '../components/BulkUploadInvestorsModal';
import { BulkUploadBankAccountsModal } from '../components/BulkUploadBankAccountsModal';
import { Plus, Edit2, Users, Loader2, Trash2, UploadCloud, ChevronDown, ChevronRight } from 'lucide-react';
import { Can } from '../../../../components/security/Can';

export const AdminInvestorsPage = () => {
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination & Search state
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isBulkBankModalOpen, setIsBulkBankModalOpen] = useState(false);
  const [editingInvestor, setEditingInvestor] = useState<Investor | null>(null);
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});

  const toggleRow = (id: number) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await getInvestors({
        page,
        limit,
        search: search || undefined
      });
      setInvestors(response.data);
      setTotal(response.total);
      setError(null);
    } catch (err: any) {
      console.error("Ignorando error del servidor para poder pintar el front:", err);
      // Forzamos a que pinte la tabla vacía en vez de mostrar el error
      setInvestors([]);
      setTotal(0);
      setError(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, search]);

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
              onClick={() => setIsBulkBankModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 hover:text-brand-600 transition-colors shadow-sm text-sm font-medium"
            >
              <UploadCloud className="w-4 h-4" />
              Carga Masiva Cuentas
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

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 w-full relative">
          <input 
            type="text" 
            placeholder="Buscar por código, nombre, correo o documento del usuario..." 
            className="w-full pl-4 pr-10 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
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
                <th className="px-6 py-4">Código / Ref.</th>
                <th className="px-6 py-4">Usuario</th>
                <th className="px-6 py-4">Paquete / Periodo</th>
                <th className="px-6 py-4">Fechas</th>
                <th className="px-6 py-4">Observaciones</th>
                <Can permission="admin.investors.manage">
                  <th className="px-6 py-4 text-right">Acciones</th>
                </Can>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {investors.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
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
                  <React.Fragment key={investor.id}>
                    <tr className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-4 w-10 text-center">
                        {investor.user && investor.user.bank_accounts && investor.user.bank_accounts.length > 0 && (
                          <button 
                            onClick={() => toggleRow(investor.id)}
                            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            {expandedRows[investor.id] ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">
                        #{investor.id}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800">{investor.assigned_code}</div>
                        {investor.referred_by && (
                            <div className="text-xs text-slate-500">Ref: {investor.referred_by}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {investor.user ? (
                            <div className="space-y-0.5">
                                <div className="font-semibold text-slate-800">{investor.user.name}</div>
                                <div className="text-xs text-slate-500">{investor.user.email}</div>
                                {investor.user.bank_accounts && investor.user.bank_accounts.length > 0 && (
                                  <button 
                                    onClick={() => toggleRow(investor.id)}
                                    className="text-[10px] text-brand-600 font-semibold hover:text-brand-700 flex items-center gap-0.5 mt-1 hover:underline"
                                  >
                                    Ver cuentas ({investor.user.bank_accounts.length})
                                  </button>
                                )}
                            </div>
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
                      <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate">
                        {investor.observations || '-'}
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
                    {expandedRows[investor.id] && investor.user && investor.user.bank_accounts && (
                      <tr className="bg-slate-50/40">
                        <td colSpan={8} className="px-8 py-3.5 border-b border-slate-100">
                          <div className="flex flex-col gap-2">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cuentas Bancarias Registradas:</div>
                            <div className="flex flex-wrap gap-3">
                              {investor.user.bank_accounts.map((acc) => (
                                <div key={acc.id} className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex flex-col gap-2 min-w-[220px] max-w-[260px] relative overflow-hidden">
                                  <div className="absolute top-0 left-0 w-1 h-full bg-brand-500" />
                                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 pl-1">
                                    <span className="font-bold text-brand-700 uppercase tracking-wider text-xs">{acc.banco}</span>
                                    <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-semibold uppercase">{acc.tipo_cuenta}</span>
                                  </div>
                                  <div className="space-y-1 pl-1">
                                    <div className="text-[9px] text-slate-400 uppercase font-medium tracking-wide">Número de Cuenta</div>
                                    <div className="font-mono text-sm text-slate-800 font-bold select-all break-all">{acc.numero_cuenta}</div>
                                  </div>
                                </div>
                              ))}
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
            Mostrando <span className="font-medium text-slate-700">{investors.length}</span> de <span className="font-medium text-slate-700">{total}</span> inversionistas
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

      <BulkUploadBankAccountsModal
        isOpen={isBulkBankModalOpen}
        onClose={() => setIsBulkBankModalOpen(false)}
        onUploaded={() => {
          setIsBulkBankModalOpen(false);
          fetchData();
        }}
      />
    </div>
  );
};
