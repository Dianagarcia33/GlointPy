import React, { useState, useEffect } from 'react';
import { PotentialReferral, potentialReferralsService } from '../../../../services/potential_referrals';
import { ReferralModal } from '../../../referrals/components/ReferralModal';
import { ConvertReferralModal } from '../components/ConvertReferralModal';
import { 
  Edit2, 
  Trash2, 
  UserPlus, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  X, 
  Search, 
  Filter, 
  Calendar, 
  ArrowRightLeft,
  RefreshCw,
  Clock,
  Users
} from 'lucide-react';

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, referralName, isDeleting }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100">
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 mb-4 mx-auto border border-rose-200/80">
            <Trash2 className="w-6 h-6 text-rose-600" />
          </div>
          <h2 className="text-xl font-black text-slate-900 text-center mb-2 font-montserrat">Eliminar Referido</h2>
          <p className="text-slate-500 text-center text-xs leading-relaxed mb-6 font-medium">
            ¿Estás seguro de que deseas eliminar a <span className="font-bold text-slate-800">{referralName}</span> de la gestión de referidos?
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all disabled:opacity-50 cursor-pointer font-montserrat"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-rose-600/20 font-montserrat"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sí, Eliminar'}
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
          <td className="px-6 py-4"><div className="h-4 w-36 bg-slate-100 rounded-lg"></div></td>
          <td className="px-6 py-4"><div className="h-4 w-32 bg-slate-100 rounded-lg"></div></td>
          <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-100 rounded-lg"></div></td>
          <td className="px-6 py-4"><div className="h-5 w-20 bg-slate-100 rounded-lg"></div></td>
          <td className="px-6 py-4"><div className="h-4 w-28 bg-slate-100 rounded-lg"></div></td>
          <td className="px-6 py-4 text-right pr-6">
            <div className="flex items-center justify-end gap-2">
              <div className="h-7 w-16 bg-slate-100 rounded-xl"></div>
              <div className="h-7 w-16 bg-slate-100 rounded-xl"></div>
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
  
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [convertingReferral, setConvertingReferral] = useState<PotentialReferral | null>(null);

  const [referralToDelete, setReferralToDelete] = useState<PotentialReferral | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
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
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-sky-50 text-sky-700 border border-sky-200">Contactado</span>;
      case 'registrado':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">Registrado</span>;
      case 'rechazado':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-50 text-rose-700 border border-rose-200">Rechazado</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-50 text-amber-700 border border-amber-200">Pendiente</span>;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in duration-300">
      
      {/* 🏛️ 1. Encabezado de Página (Estándar Soporte en Tickets) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight font-montserrat flex items-center gap-2.5">
            <span className="p-2 bg-brand-50 text-brand-600 border border-brand-200 rounded-2xl inline-flex shadow-xs">
              <UserPlus className="w-6 h-6" />
            </span>
            Gestión de Referidos
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Supervisa, contacta y gestiona el flujo de prospectos registrados por todos los inversionistas
          </p>
        </div>

        {/* Acciones del Header */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={fetchData}
            className="p-2.5 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 rounded-2xl hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
            title="Actualizar datos"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Alerta de Error si ocurre */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 📊 2. Cuadrícula de Métricas KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Referidos</span>
            <Users className="w-4 h-4 text-brand-600" />
          </div>
          <span className="text-2xl font-black text-slate-900 font-mono block">
            {totalItems || referrals.length}
          </span>
          <span className="text-[11px] text-slate-500 font-medium block">
            Prospectos en plataforma
          </span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Inversionistas Vinculados</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-2xl font-black text-emerald-600 font-mono block">
            {referrals.filter(r => r.estado === 'registrado').length}
          </span>
          <span className="text-[11px] text-slate-500 font-medium block">
            Convertidos formalmente
          </span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">En Gestión Activa</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <span className="text-2xl font-black text-blue-600 font-mono block">
            {referrals.filter(r => r.estado === 'contactado').length}
          </span>
          <span className="text-[11px] text-slate-500 font-medium block">
            Contactados en seguimiento
          </span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Pendientes de Contacto</span>
            <AlertCircle className="w-4 h-4 text-amber-600" />
          </div>
          <span className="text-2xl font-black text-amber-600 font-mono block">
            {referrals.filter(r => !r.estado || r.estado === 'pendiente').length}
          </span>
          <span className="text-[11px] text-slate-500 font-medium block">
            Por contactar inicialmente
          </span>
        </div>
      </div>

      {/* 🔍 Barra de Búsqueda y Filtros */}
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

      {/* 📑 Tabla Principal */}
      <div className="bg-white rounded-3xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/75 text-slate-400 font-bold border-b border-slate-100 uppercase text-[10px] tracking-wider font-montserrat">
              <tr>
                <th className="px-6 py-4">Referido / Prospecto</th>
                <th className="px-6 py-4">Contacto</th>
                <th className="px-6 py-4">Código Inversionista</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Fecha Registro</th>
                <th className="px-6 py-4 text-right pr-6 whitespace-nowrap min-w-[200px]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {isLoading ? (
                <ReferralTableSkeleton />
              ) : referrals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-14 h-14 rounded-3xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto">
                        <UserPlus className="w-7 h-7" />
                      </div>
                      <h3 className="text-base font-bold text-slate-800 font-montserrat">
                        No se encontraron referidos
                      </h3>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
                        No hay registros que coincidan con los criterios de búsqueda o filtros seleccionados.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                referrals.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 text-sm font-montserrat">{r.nombre}</div>
                    </td>
                    <td className="px-6 py-4 space-y-0.5 text-xs">
                      <div className="font-mono text-slate-800 font-bold">{r.telefono}</div>
                      {r.email && <div className="text-slate-500 text-[11px]">{r.email}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-bold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-xl border border-brand-200/80">
                        {r.codigo_referido}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(r.estado)}
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {r.created_at ? new Date(r.created_at).toLocaleDateString('es-CO') : 'Sin fecha'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right pr-6 whitespace-nowrap min-w-[200px]">
                      <div className="flex items-center justify-end gap-2">
                        {r.estado !== 'registrado' && (
                          <button
                            onClick={() => { setConvertingReferral(r); setIsConvertModalOpen(true); }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-all border border-emerald-200 hover:border-emerald-300 cursor-pointer font-montserrat"
                            title="Convertir en Solicitud de Inversión"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            <span>Convertir</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(r)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-all border border-slate-200 hover:border-brand-200 cursor-pointer font-montserrat"
                          title="Gestionar Estado y Notas"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Gestionar</span>
                        </button>
                        <button
                          onClick={() => setReferralToDelete(r)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all border border-rose-200 hover:border-rose-300 cursor-pointer font-montserrat"
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
        onTriggerConvert={(r) => {
          setConvertingReferral(r);
          setIsConvertModalOpen(true);
        }}
      />

      {/* Modal Convertir en Solicitud de Inversión */}
      <ConvertReferralModal
        isOpen={isConvertModalOpen}
        onClose={() => setIsConvertModalOpen(false)}
        onConverted={() => {
          setToast({ message: `Referido "${convertingReferral?.nombre}" convertido exitosamente en Solicitud de Inversión.`, type: 'success' });
          fetchData();
        }}
        referral={convertingReferral}
      />

      {/* Modal de Confirmación de Eliminación */}
      <DeleteConfirmationModal 
        isOpen={!!referralToDelete}
        onClose={() => setReferralToDelete(null)}
        onConfirm={handleDeleteConfirm}
        referralName={referralToDelete?.nombre}
        isDeleting={isDeleting}
      />

      {/* Notificación Toast Estandarizada */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[60] flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border ${
            toast.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
              : 'bg-rose-50 border-rose-200 text-rose-900'
          } animate-in slide-in-from-bottom-2 text-xs font-bold`}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

    </div>
  );
};

