import React, { useState, useEffect } from 'react';
import { PotentialReferral, potentialReferralsService } from '../../../../services/potential_referrals';
import { ReferralModal } from '../../../referrals/components/ReferralModal';
import { Edit2, Trash2, UserPlus, Loader2, AlertCircle, CheckCircle, X, Search, Filter, Calendar } from 'lucide-react';

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, referralName, isDeleting }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl border border-slate-100">
        <div className="p-6">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-rose-100 mb-4 mx-auto">
            <Trash2 className="w-6 h-6 text-rose-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 text-center mb-2 font-montserrat">Eliminar Referido</h2>
          <p className="text-slate-500 text-center text-xs mb-6">
            ¿Estás seguro de que deseas eliminar a <span className="font-bold text-slate-700">{referralName}</span> de la gestión de referidos?
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-rose-600/20"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Eliminar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ReferralTableSkeleton = () => {
  return (
    <>
      {[...Array(5)].map((_, i) => (
        <tr key={i} className="animate-pulse">
          <td className="px-6 py-4"><div className="h-4 w-36 bg-slate-200 rounded"></div></td>
          <td className="px-6 py-4"><div className="h-4 w-32 bg-slate-200 rounded"></div></td>
          <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-200 rounded"></div></td>
          <td className="px-6 py-4"><div className="h-5 w-20 bg-slate-200 rounded-md"></div></td>
          <td className="px-6 py-4"><div className="h-4 w-28 bg-slate-200 rounded"></div></td>
          <td className="px-6 py-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <div className="h-7 w-16 bg-slate-200 rounded-xl"></div>
              <div className="h-7 w-16 bg-slate-200 rounded-xl"></div>
            </div>
          </td>
        </tr>
      ))}
    </>
  );
};

export const AdminReferralsPage = () => {
  const [referrals, setReferrals] = useState<PotentialReferral[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReferral, setEditingReferral] = useState<PotentialReferral | null>(null);
  const [referralToDelete, setReferralToDelete] = useState<PotentialReferral | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await potentialReferralsService.getAllAdmin({ search, estado: estadoFilter, page, limit: 20 });
      setReferrals(res.data || []);
      setTotalItems(res.total || 0);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Error al cargar referidos potenciales');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, estadoFilter, page]);

  const handleEdit = (r: PotentialReferral) => {
    setEditingReferral(r);
    setIsModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!referralToDelete) return;
    setIsDeleting(true);
    try {
      await potentialReferralsService.deleteReferral(referralToDelete.id);
      setToast({ message: `Referido "${referralToDelete.nombre}" eliminado correctamente`, type: 'success' });
      setReferralToDelete(null);
      await fetchData();
    } catch (err: any) {
      setToast({ message: err.response?.data?.detail || err.message || 'Error al eliminar referido', type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (statusStr: string) => {
    switch (statusStr) {
      case 'contactado':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200 font-montserrat">Contactado</span>;
      case 'registrado':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 font-montserrat">Registrado</span>;
      case 'rechazado':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 font-montserrat">Rechazado</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 font-montserrat">Pendiente</span>;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in duration-300">
      
      {/* Toast Notification Banner */}
      {toast && (
        <div className={`p-4 rounded-2xl flex items-center justify-between shadow-lg animate-in slide-in-from-top duration-300 ${
          toast.type === 'success' 
            ? 'bg-emerald-500 text-white shadow-emerald-500/20' 
            : 'bg-rose-500 text-white shadow-rose-500/20'
        }`}>
          <div className="flex items-center gap-3">
            {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="font-bold text-xs">{toast.message}</span>
          </div>
          <button onClick={() => setToast(null)} className="p-1 hover:bg-white/20 rounded-lg cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Ejecutivo Principal */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute right-0 top-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-bold text-brand-300 backdrop-blur-sm">
            <UserPlus className="w-4 h-4 text-brand-400" /> Administración Comercial
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight font-montserrat">
            Gestión de Referidos Potenciales
          </h1>
          <p className="text-slate-300 text-sm max-w-xl">
            Revisa, actualiza el estado comercial y haz seguimiento a todos los referidos registrados por los inversionistas.
          </p>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="bg-white p-4 rounded-3xl shadow-xs border border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-96">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por nombre, teléfono, correo o código..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none text-xs font-semibold text-slate-900"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={estadoFilter}
              onChange={(e) => { setEstadoFilter(e.target.value); setPage(1); }}
              className="px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none text-xs font-bold text-slate-700 cursor-pointer font-montserrat"
            >
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="contactado">Contactado</option>
              <option value="registrado">Registrado</option>
              <option value="rechazado">Rechazado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla Principal */}
      <div className="bg-white rounded-3xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider font-montserrat">
              <tr>
                <th className="px-6 py-4">Referido</th>
                <th className="px-6 py-4">Contacto</th>
                <th className="px-6 py-4">Código Inversionista</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Registro</th>
                <th className="px-6 py-4">Notas</th>
                <th className="px-6 py-4 text-center whitespace-nowrap min-w-[200px]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-xs">
              {isLoading ? (
                <ReferralTableSkeleton />
              ) : referrals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-medium">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <UserPlus className="w-8 h-8 text-slate-300" />
                      <p>No se encontraron referidos potenciales con los criterios seleccionados.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                referrals.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800 text-sm">{r.nombre}</div>
                    </td>
                    <td className="px-6 py-4 space-y-0.5 text-[11px]">
                      <div className="font-mono text-slate-800 font-bold">Tel: {r.telefono}</div>
                      {r.email && <div className="text-slate-500">{r.email}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-bold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-200">
                        {r.codigo_referido}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(r.estado)}
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {r.created_at ? new Date(r.created_at).toLocaleDateString('es-CO') : 'Sin fecha'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 max-w-xs truncate">
                      {r.notas || <span className="text-slate-400 italic">Sin notas</span>}
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap min-w-[200px]">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(r)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-xl transition-all border border-brand-200 cursor-pointer"
                          title="Gestionar Estado y Notas"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Gestionar</span>
                        </button>
                        <button
                          onClick={() => setReferralToDelete(r)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all border border-rose-200 cursor-pointer"
                          title="Eliminar Referido"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Eliminar</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Editar Estado / Notas */}
      <ReferralModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={fetchData}
        referral={editingReferral}
        isAdmin={true}
      />

      {/* Modal de Confirmación de Eliminación */}
      <DeleteConfirmationModal 
        isOpen={!!referralToDelete}
        onClose={() => setReferralToDelete(null)}
        onConfirm={handleDeleteConfirm}
        referralName={referralToDelete?.nombre}
        isDeleting={isDeleting}
      />
    </div>
  );
};
