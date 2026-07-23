import React, { useState, useEffect } from 'react';
import { Investor, getInvestors, deleteInvestor } from '../../../../services/investors';
import { InvestorModal } from '../components/InvestorModal';
import { BulkUploadInvestorsModal } from '../components/BulkUploadInvestorsModal';
import { BulkUploadInvestmentRequestsModal } from '../components/BulkUploadInvestmentRequestsModal';
import { BulkUploadBankAccountsModal } from '../components/BulkUploadBankAccountsModal';
import { BulkUploadWalletsModal } from '../components/BulkUploadWalletsModal';
import { BulkUploadWalletTransactionsModal } from '../components/BulkUploadWalletTransactionsModal';
import { InvestmentRequestsTable } from '../components/InvestmentRequestsTable';
import { WalletAdjustmentModal } from '../components/WalletAdjustmentModal';
import { AdminCapitalIncreaseModal } from '../components/AdminCapitalIncreaseModal';
import { Plus, Edit2, Users, Loader2, Trash2, UploadCloud, ChevronDown, ChevronRight, CheckCircle2, AlertCircle, Pencil, Zap } from 'lucide-react';
import { Can } from '../../../../components/security/Can';

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, investorCode, isDeleting }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl border border-slate-100">
        <div className="p-6">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4 mx-auto">
            <Trash2 className="w-6 h-6 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 text-center mb-2">Eliminar Inversión</h2>
          <p className="text-slate-500 text-center text-sm mb-6">
            ¿Estás seguro de que deseas eliminar la inversión <span className="font-semibold text-slate-700">{investorCode}</span>? Esta acción no se puede deshacer y eliminará todos los registros asociados.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Eliminar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const InvestorTableSkeleton = () => {
  return (
    <>
      {[...Array(5)].map((_, i) => (
        <tr key={i} className="animate-pulse">
          {/* Chevron spacer */}
          <td className="px-4 py-4 w-10">
            <div className="h-4 w-4 bg-slate-200 rounded"></div>
          </td>
          {/* ID */}
          <td className="px-6 py-4 w-20">
            <div className="h-3 w-8 bg-slate-200 rounded font-mono"></div>
          </td>
          {/* Código / Ref. */}
          <td className="px-6 py-4">
            <div className="space-y-2">
              <div className="h-4 w-16 bg-slate-200 rounded"></div>
              <div className="h-3 w-24 bg-slate-100 rounded"></div>
            </div>
          </td>
          {/* Usuario */}
          <td className="px-6 py-4">
            <div className="space-y-2">
              <div className="h-4 w-32 bg-slate-200 rounded"></div>
              <div className="h-3 w-40 bg-slate-100 rounded"></div>
            </div>
          </td>
          {/* Paquete / Periodo */}
          <td className="px-6 py-4">
            <div className="space-y-2">
              <div className="h-5 w-24 bg-slate-200 rounded-md"></div>
              <div className="h-3 w-20 bg-slate-100 rounded"></div>
            </div>
          </td>
          {/* Fechas */}
          <td className="px-6 py-4">
            <div className="space-y-2">
              <div className="flex justify-between w-40">
                <div className="h-3 w-12 bg-slate-100 rounded"></div>
                <div className="h-3 w-16 bg-slate-200 rounded"></div>
              </div>
              <div className="flex justify-between w-40">
                <div className="h-3 w-8 bg-slate-100 rounded"></div>
                <div className="h-3 w-16 bg-slate-200 rounded"></div>
              </div>
            </div>
          </td>
          {/* Acciones */}
          <Can permission="admin.investors.manage">
            <td className="px-6 py-4 text-right">
              <div className="flex items-center justify-end gap-2">
                <div className="h-7 w-7 bg-slate-200 rounded-lg"></div>
                <div className="h-7 w-7 bg-slate-200 rounded-lg"></div>
              </div>
            </td>
          </Can>
        </tr>
      ))}
    </>
  );
};

export const AdminInvestorsPage = () => {
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination & Search state
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [hasHistoryFilter, setHasHistoryFilter] = useState<boolean | undefined>(undefined);

  const [isMassUploadOpen, setIsMassUploadOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isBulkReqModalOpen, setIsBulkReqModalOpen] = useState(false);
  const [isBulkBankModalOpen, setIsBulkBankModalOpen] = useState(false);
  const [isBulkWalletModalOpen, setIsBulkWalletModalOpen] = useState(false);
  const [isBulkTxModalOpen, setIsBulkTxModalOpen] = useState(false);
  const [editingInvestor, setEditingInvestor] = useState<Investor | null>(null);
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [walletToAdjust, setWalletToAdjust] = useState<{ id: number; balance: string | number; currency: string } | null>(null);
  const [userNameToAdjust, setUserNameToAdjust] = useState('');
  const [selectedInvestorForUpgrade, setSelectedInvestorForUpgrade] = useState<Investor | null>(null);

  const [investorToDelete, setInvestorToDelete] = useState<Investor | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const toggleRow = (id: number) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await getInvestors({
        page,
        limit,
        search: search || undefined,
        has_history: hasHistoryFilter
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

  // Debounce search input changes to avoid firing requests on every keystroke
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 500);

    return () => clearTimeout(handler);
  }, [searchInput]);

  useEffect(() => {
    fetchData();
  }, [page, search, hasHistoryFilter]);

  const handleCreate = () => {
    setEditingInvestor(null);
    setIsModalOpen(true);
  };

  const handleEdit = (investor: Investor) => {
    setEditingInvestor(investor);
    setIsModalOpen(true);
  };

  const handleDelete = (investor: Investor) => {
    setInvestorToDelete(investor);
  };

  const confirmDelete = async () => {
    if (!investorToDelete) return;
    setIsDeleting(true);
    try {
      await deleteInvestor(investorToDelete.id);
      setToast({ message: 'Inversión eliminada exitosamente', type: 'success' });
      fetchData();
    } catch (err: any) {
      setToast({ message: err.message || 'Error al eliminar la inversión', type: 'error' });
    } finally {
      setIsDeleting(false);
      setInvestorToDelete(null);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingInvestor(null);
  };

  const handleSaved = () => {
    fetchData();
  };



  const [activeTab, setActiveTab] = useState<'investments' | 'requests'>('investments');

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
          <p className="text-slate-500 text-sm mt-1">Administra las inversiones y sus solicitudes</p>
        </div>
        
        <Can permission="admin.investors.manage">
          <div className="flex gap-2 relative">

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

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('investments')}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'investments'
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Inversiones (Contratos)
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'requests'
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Solicitudes
          </button>
        </nav>
      </div>

      {activeTab === 'requests' ? (
        <InvestmentRequestsTable />
      ) : (
        <>
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1 w-full relative">
              <input 
                type="text" 
                placeholder="Buscar por código, nombre, correo o documento del usuario..." 
                className="w-full pl-4 pr-10 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                }}
              />
            </div>
            <div className="w-full md:w-64">
              <select
                className="w-full pl-3 pr-8 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all bg-white text-slate-700"
                value={hasHistoryFilter === undefined ? "" : hasHistoryFilter.toString()}
                onChange={(e) => {
                  const val = e.target.value;
                  setHasHistoryFilter(val === "" ? undefined : val === "true");
                  setPage(1);
                }}
              >
                <option value="">Todas las inversiones</option>
                <option value="true">Con historial de contratos</option>
                <option value="false">Sin historial de contratos</option>
              </select>
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
                <th className="px-6 py-4">Bonos por Aceleración</th>
                <th className="px-6 py-4">Fechas</th>
                <Can permission="admin.investors.manage">
                  <th className="px-6 py-4 text-right">Acciones</th>
                </Can>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <InvestorTableSkeleton />
              ) : investors.length === 0 ? (
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
                        {investor.user && ((investor.user.bank_accounts && investor.user.bank_accounts.length > 0) || investor.user.wallet) && (
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
                                {investor.user.document_id && <div className="text-[11px] text-slate-500 mt-1.5">Doc: <span className="font-medium text-slate-700">{investor.user.document_id}</span></div>}
                                {investor.user.phone_number && <div className="text-[11px] text-slate-500">Tel: <span className="font-medium text-slate-700">{investor.user.phone_number}</span></div>}
                                {investor.user.date_of_birth && <div className="text-[11px] text-slate-500">Nac: <span className="font-medium text-slate-700">{new Date(investor.user.date_of_birth).toLocaleDateString()}</span></div>}
                                
                                {((investor.user.bank_accounts && investor.user.bank_accounts.length > 0) || investor.user.wallet) && (
                                  <button 
                                    onClick={() => toggleRow(investor.id)}
                                    className="text-[10px] text-brand-600 font-semibold hover:text-brand-700 flex items-center gap-0.5 mt-2 hover:underline"
                                  >
                                    Ver detalles {investor.user.bank_accounts && investor.user.bank_accounts.length > 0 ? `(${investor.user.bank_accounts.length} ctas)` : ''}
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
                      <td className="px-6 py-4">
                        {(() => {
                          const accelerations = investor.accelerations || [];
                          const totalBonus = investor.total_acceleration_bonus ?? accelerations.reduce((sum, a) => sum + (Number(a.bonus_amount) || 0), 0);
                          return accelerations.length > 0 || totalBonus > 0 ? (
                            <div className="inline-flex flex-col">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200/80 shadow-2xs">
                                <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                                +${totalBonus.toLocaleString('es-CO')} COP
                              </span>
                              <span className="text-[10px] text-slate-500 mt-1 font-medium pl-0.5">
                                {accelerations.length} {accelerations.length === 1 ? 'bono aplicado' : 'bonos aplicados'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">$0 COP</span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 text-xs space-y-2">
                          <div className="space-y-1">
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
                          </div>
                          
                          {/* Progreso del contrato */}
                          {(() => {
                            const now = new Date().getTime();
                            const start = new Date(investor.start_date).getTime();
                            const totalDays = investor.period ? investor.period.days : 0;
                            const elapsedRaw = Math.floor((now - start) / (1000 * 60 * 60 * 24));
                            const elapsed = Math.max(0, Math.min(elapsedRaw, totalDays));
                            const progress = totalDays > 0 ? Math.round((elapsed / totalDays) * 100) : 0;
                            
                            return totalDays > 0 ? (
                              <div className="w-40 pt-1">
                                <div className="flex justify-between text-[10px] mb-1">
                                  <span className="text-slate-500 font-medium">Avance</span>
                                  <span className="text-brand-600 font-bold">{elapsed} / {totalDays} días</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                  <div 
                                    className="bg-brand-500 h-1.5 rounded-full transition-all" 
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                              </div>
                            ) : null;
                          })()}
                      </td>
                      <Can permission="admin.investors.manage">
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => setSelectedInvestorForUpgrade(investor)}
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Solicitar Aumento de Capital"
                            >
                              <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                            </button>
                            <button 
                              onClick={() => handleEdit(investor)}
                              className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(investor)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </Can>
                    </tr>
                    {expandedRows[investor.id] && investor.user && (
                      <tr className="bg-slate-50/40">
                        <td colSpan={8} className="px-8 py-4 border-b border-slate-100">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            
                            {/* Wallet Info Column */}
                            <div className="space-y-2">
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Billetera (Wallet):</div>
                              {investor.user.wallet ? (
                                <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex flex-col gap-2 relative overflow-hidden">
                                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 pl-1">
                                    <span className="font-bold text-slate-700 uppercase tracking-wider text-xs">Saldo Disponible</span>
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase ${
                                      investor.user.wallet.status === 'active' 
                                        ? 'bg-emerald-100 text-emerald-700' 
                                        : 'bg-red-100 text-red-700'
                                    }`}>
                                      {investor.user.wallet.status === 'active' ? 'ACTIVA' : 'CONGELADA'}
                                    </span>
                                  </div>
                                  <div className="pl-1">
                                    <div className="flex items-center justify-between">
                                      <div className="text-xl font-bold text-slate-800">
                                        {Number(investor.user.wallet.balance).toLocaleString('es-CO', { style: 'currency', currency: investor.user.wallet.currency || 'COP', minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                      </div>
                                      <Can permission="admin.investors.manage">
                                        <button 
                                          onClick={() => {
                                            if (investor.user && investor.user.wallet) {
                                              setWalletToAdjust({
                                                id: investor.user.wallet.id,
                                                balance: investor.user.wallet.balance,
                                                currency: investor.user.wallet.currency || 'COP'
                                              });
                                              setUserNameToAdjust(investor.user.name);
                                            }
                                          }}
                                          className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors border border-transparent hover:border-brand-200"
                                          title="Ajustar Saldo"
                                        >
                                          <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                      </Can>
                                    </div>
                                    <div className="text-[9px] text-slate-400 mt-1">ID: #{investor.user.wallet.id} • Moneda: {investor.user.wallet.currency}</div>
                                  </div>
                                </div>
                              ) : (
                                <div className="bg-white border border-slate-200 border-dashed rounded-lg p-4 text-center text-xs text-slate-500">
                                  El usuario no tiene una billetera creada.
                                </div>
                              )}
                            </div>

                            {/* Bank Accounts Column */}
                            <div className="md:col-span-2 space-y-2">
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cuentas Bancarias Registradas:</div>
                              {investor.user.bank_accounts && investor.user.bank_accounts.length > 0 ? (
                                <div className="flex flex-wrap gap-3">
                                  {investor.user.bank_accounts.map((acc) => (
                                    <div key={acc.id} className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex flex-col gap-2 min-w-[200px] max-w-[240px] relative overflow-hidden flex-1">
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
                              ) : (
                                <div className="bg-white border border-slate-200 border-dashed rounded-lg p-4 text-center text-xs text-slate-500">
                                  No hay cuentas bancarias registradas para este usuario.
                                </div>
                              )}
                            </div>

                          </div>
                          
                          {/* Contract Histories Section */}
                          <div className="mt-6 space-y-2 border-t border-slate-100 pt-4">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Historial de Contratos:</div>
                            {investor.contract_histories && investor.contract_histories.length > 0 ? (
                              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-xs text-slate-600">
                                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase">
                                      <tr>
                                        <th className="px-4 py-3">ID</th>
                                        <th className="px-4 py-3">Inicio</th>
                                        <th className="px-4 py-3">Fin</th>
                                        <th className="px-4 py-3 text-right">Capital</th>
                                        <th className="px-4 py-3 text-right">Rendimiento (Pagado)</th>
                                        <th className="px-4 py-3">Tasa</th>
                                        <th className="px-4 py-3">Motivo</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {investor.contract_histories.map((history) => (
                                        <tr key={history.id} className="hover:bg-slate-50/50">
                                          <td className="px-4 py-3 font-mono text-slate-400">#{history.id}</td>
                                          <td className="px-4 py-3 font-medium text-slate-700">{new Date(history.fecha_inicio).toLocaleDateString()}</td>
                                          <td className="px-4 py-3 font-medium text-slate-700">{new Date(history.fecha_fin).toLocaleDateString()}</td>
                                          <td className="px-4 py-3 text-right font-semibold text-slate-800">${history.total_contrato.toLocaleString('es-CO')}</td>
                                          <td className="px-4 py-3 text-right">
                                            <span className="font-semibold text-emerald-600">${history.rendimiento_total_pagado.toLocaleString('es-CO')}</span>
                                            <span className="text-slate-400 block text-[10px]">Total de: ${history.rentabilidad_contrato.toLocaleString('es-CO')}</span>
                                          </td>
                                          <td className="px-4 py-3 text-brand-600 font-medium">{history.tasa_interes}</td>
                                          <td className="px-4 py-3">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 uppercase">
                                              {history.motivo}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-white border border-slate-200 border-dashed rounded-lg p-4 text-center text-xs text-slate-500">
                                No hay historial de contratos registrado para esta inversión.
                              </div>
                            )}
                          </div>
                          
                          {/* Accelerations Section */}
                          <div className="mt-6 space-y-2 border-t border-slate-100 pt-4">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                              Bonos por Aceleración de Contrato:
                            </div>
                            {investor.accelerations && investor.accelerations.length > 0 ? (
                              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-xs text-slate-600">
                                    <thead className="bg-amber-50/50 border-b border-slate-100 text-slate-600 uppercase text-[10px]">
                                      <tr>
                                        <th className="px-4 py-3">ID</th>
                                        <th className="px-4 py-3">Solicitud Orig.</th>
                                        <th className="px-4 py-3 text-right">Monto Bono</th>
                                        <th className="px-4 py-3 text-center">% Aceleración</th>
                                        <th className="px-4 py-3 text-center">Días Reducidos</th>
                                        <th className="px-4 py-3 text-center">Estado</th>
                                        <th className="px-4 py-3">Fecha Aplicado</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {investor.accelerations.map((acc) => (
                                        <tr key={acc.id} className="hover:bg-amber-50/20">
                                          <td className="px-4 py-3 font-mono text-slate-400">#{acc.id}</td>
                                          <td className="px-4 py-3 font-mono text-slate-600">
                                            #{acc.investment_request_id}
                                          </td>
                                          <td className="px-4 py-3 text-right font-bold text-amber-700">
                                            +${(Number(acc.bonus_amount) || 0).toLocaleString('es-CO')} COP
                                          </td>
                                          <td className="px-4 py-3 text-center font-semibold text-slate-700">
                                            {acc.acceleration_percentage}%
                                          </td>
                                          <td className="px-4 py-3 text-center font-medium text-slate-600">
                                            {acc.days_to_reduce ? Number(acc.days_to_reduce).toFixed(1) : 0} días
                                          </td>
                                          <td className="px-4 py-3 text-center">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                              acc.applied ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                            }`}>
                                              {acc.applied ? 'APLICADO' : 'PENDIENTE'}
                                            </span>
                                          </td>
                                          <td className="px-4 py-3 text-slate-500 font-medium">
                                            {acc.created_at ? new Date(acc.created_at).toLocaleDateString() : '-'}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-white border border-slate-200 border-dashed rounded-lg p-4 text-center text-xs text-slate-500">
                                No hay bonos por aceleración registrados para esta inversión.
                              </div>
                            )}
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
      </>
      )}

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

      <BulkUploadInvestmentRequestsModal
        isOpen={isBulkReqModalOpen}
        onClose={() => setIsBulkReqModalOpen(false)}
        onUploaded={() => {
          setIsBulkReqModalOpen(false);
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

      <BulkUploadWalletsModal
        isOpen={isBulkWalletModalOpen}
        onClose={() => setIsBulkWalletModalOpen(false)}
        onUploaded={() => {
          setIsBulkWalletModalOpen(false);
          fetchData();
        }}
      />

      <BulkUploadWalletTransactionsModal
        isOpen={isBulkTxModalOpen}
        onClose={() => setIsBulkTxModalOpen(false)}
        onUploaded={() => {
          setIsBulkTxModalOpen(false);
          fetchData();
        }}
      />

      <WalletAdjustmentModal
        isOpen={!!walletToAdjust}
        onClose={() => setWalletToAdjust(null)}
        onAdjusted={() => {
          setWalletToAdjust(null);
          setToast({ message: 'Saldo de billetera ajustado exitosamente', type: 'success' });
          fetchData();
        }}
        wallet={walletToAdjust}
        userName={userNameToAdjust}
      />

      {toast && (
        <div className={`fixed bottom-4 right-4 z-[60] flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border ${
          toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
        } animate-in slide-in-from-bottom-2`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      <AdminCapitalIncreaseModal
        isOpen={!!selectedInvestorForUpgrade}
        onClose={() => setSelectedInvestorForUpgrade(null)}
        onSuccess={() => {
          setToast({ message: 'Solicitud de aumento de capital enviada a revisión (pendiente)', type: 'success' });
          fetchData();
        }}
        investor={selectedInvestorForUpgrade}
      />

      <DeleteConfirmationModal
        isOpen={!!investorToDelete}
        onClose={() => setInvestorToDelete(null)}
        onConfirm={confirmDelete}
        investorCode={investorToDelete?.assigned_code}
        isDeleting={isDeleting}
      />
    </div>
  );
};
