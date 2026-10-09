import React, { useState, useEffect } from 'react';
import { periodsService, Period } from '../../../../services/periods';
import { PeriodModal } from '../components/PeriodModal';
import { 
  Plus, 
  Edit2, 
  CalendarDays, 
  Loader2, 
  Trash2, 
  AlertCircle, 
  CheckCircle, 
  X, 
  RefreshCw, 
  TrendingUp, 
  Percent, 
  Clock 
} from 'lucide-react';
import { Can } from '../../../../components/security/Can';
import { ConfirmationModal } from '../../../../components/common/ConfirmationModal';

export const AdminPeriodsPage = () => {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<Period | null>(null);
  
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const data = await periodsService.getPeriods();
      const sorted = Array.isArray(data) 
        ? [...data].sort((a, b) => (Number(a.months) || 0) - (Number(b.months) || 0) || (Number(a.days) || 0) - (Number(b.days) || 0)) 
        : [];
      setPeriods(sorted);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los periodos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = () => {
    setEditingPeriod(null);
    setIsModalOpen(true);
  };

  const handleEdit = (period: Period) => {
    setEditingPeriod(period);
    setIsModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      setIsDeleting(true);
      setError(null);
      await periodsService.deletePeriod(deletingId);
      setSuccess('Periodo eliminado correctamente.');
      setTimeout(() => setSuccess(null), 5000);
      setDeletingId(null);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar el periodo');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingPeriod(null);
  };

  const handleSaved = () => {
    setSuccess(editingPeriod ? 'Periodo actualizado con éxito.' : 'Nuevo periodo creado con éxito.');
    setTimeout(() => setSuccess(null), 5000);
    fetchData();
  };

  const totalPeriods = periods.length;
  const activePeriods = periods.filter(p => p.is_active).length;
  const maxYield = periods.length > 0 ? Math.max(...periods.map(p => Number(p.percentage) || 0)) : 0;
  const minYield = periods.length > 0 ? Math.min(...periods.map(p => Number(p.percentage) || 0)) : 0;

  const longestPeriodObj = periods.length > 0 
    ? [...periods].sort((a, b) => (Number(b.days) || 0) - (Number(a.days) || 0))[0] 
    : null;
  const longestPeriodLabel = longestPeriodObj 
    ? (longestPeriodObj.months > 0 ? `${longestPeriodObj.months} Meses` : `${longestPeriodObj.days} Días`) 
    : 'N/A';

  if (isLoading) {
    return (
      <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 animate-pulse font-inter">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-slate-200 rounded-xl"></div>
            <div className="h-4 w-96 bg-slate-100 rounded-lg"></div>
          </div>
          <div className="h-10 w-36 bg-slate-200 rounded-xl"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-slate-200/90 rounded-2xl p-5 h-28 space-y-3">
              <div className="h-4 w-24 bg-slate-100 rounded"></div>
              <div className="h-6 w-32 bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 h-96 space-y-4">
          <div className="h-6 w-48 bg-slate-200 rounded"></div>
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-xl w-full"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-7xl mx-auto p-6 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-4 text-rose-700 shadow-xs">
        <AlertCircle className="w-6 h-6 shrink-0 mt-0.5 text-rose-600" />
        <div>
          <h3 className="font-bold font-montserrat text-base text-rose-900">Error al cargar datos</h3>
          <p className="text-sm mt-1 text-rose-700">{error}</p>
          <button 
            onClick={fetchData} 
            className="mt-3 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer font-montserrat shadow-xs"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in duration-300 font-inter">
      
      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-emerald-800 shadow-xs font-medium text-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="p-1 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer">
            <X className="w-4 h-4 text-emerald-700" />
          </button>
        </div>
      )}

      {/* Header Ejecutivo Estandarizado */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-montserrat flex items-center gap-2.5 whitespace-nowrap sm:whitespace-normal">
              <div className="p-2.5 bg-brand-50 border border-brand-200/80 rounded-2xl text-brand-700 shadow-2xs">
                <CalendarDays className="w-6 h-6" />
              </div>
              <span>Gestión de Periodos</span>
            </h1>
            <button
              onClick={fetchData}
              disabled={isLoading}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              title="Actualizar datos"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-brand-600' : ''}`} />
            </button>
          </div>
          <p className="text-slate-500 text-sm mt-1 font-normal">
            Administra los plazos de inversión habilitados, porcentajes de rentabilidad mensual y disponibilidad comercial.
          </p>
        </div>
        
        <Can permission="admin.periods.manage">
          <div className="flex items-center gap-2.5 shrink-0">
            <button 
              onClick={handleCreate}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-brand-600 to-amber-600 hover:from-brand-700 hover:to-amber-700 rounded-xl transition-all shadow-md shadow-brand-500/20 cursor-pointer font-montserrat"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Periodo</span>
            </button>
          </div>
        </Can>
      </div>

      {/* KPI Cards Summary (4 Métricas Clave Estandarizadas) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Periodos */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block font-montserrat">
              Total Periodos
            </span>
            <div className="p-2 bg-brand-50 text-brand-600 rounded-xl shrink-0">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-black text-slate-900 block tracking-tight font-mono">
            {totalPeriods}
          </span>
          <span className="text-[11px] text-slate-500 font-medium block truncate">
            {activePeriods} plazos activos en plataforma
          </span>
        </div>

        {/* Rentabilidad Máxima */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-emerald-700 font-bold uppercase tracking-wider block font-montserrat">
              Rendimiento Top
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-black text-emerald-600 block tracking-tight font-mono">
            {maxYield}% <span className="text-xs font-normal text-slate-400 font-sans">M.V.</span>
          </span>
          <span className="text-[11px] text-emerald-600 font-medium block truncate">
            Rentabilidad mensual superior
          </span>
        </div>

        {/* Rentabilidad Mínima */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-amber-700 font-bold uppercase tracking-wider block font-montserrat">
              Rendimiento Base
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl shrink-0">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-black text-amber-600 block tracking-tight font-mono">
            {minYield}% <span className="text-xs font-normal text-slate-400 font-sans">M.V.</span>
          </span>
          <span className="text-[11px] text-amber-600 font-medium block truncate">
            Rentabilidad mensual de entrada
          </span>
        </div>

        {/* Plazo Máximo */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block font-montserrat">
              Plazo Máximo
            </span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl shrink-0">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-black text-purple-700 block tracking-tight font-mono">
            {longestPeriodLabel}
          </span>
          <span className="text-[11px] text-slate-500 font-medium block truncate">
            {longestPeriodObj ? `${longestPeriodObj.days} días calendario` : 'Vigencia contractual'}
          </span>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-slate-400 font-bold border-b border-slate-200/80 uppercase text-[10px] tracking-wider font-montserrat">
              <tr>
                <th className="px-6 py-4">Duración & Plazo</th>
                <th className="px-6 py-4">Rentabilidad Mensual</th>
                <th className="px-6 py-4">Estado</th>
                <Can permission="admin.periods.manage">
                  <th className="px-6 py-4 text-center">Acciones</th>
                </Can>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {periods.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <CalendarDays className="w-8 h-8 text-slate-300" />
                      <p className="font-semibold text-slate-700">No hay periodos configurados.</p>
                      <button onClick={handleCreate} className="text-brand-600 font-bold hover:underline text-xs mt-1 cursor-pointer font-montserrat">
                        + Crea tu primer periodo
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                periods.map((period) => (
                  <tr key={period.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-brand-50 border border-brand-100/80 flex items-center justify-center text-brand-600 shrink-0">
                          <CalendarDays className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900 text-sm font-montserrat">
                            {period.months > 0 
                              ? `${period.months} ${period.months === 1 ? 'Mes' : 'Meses'} (${period.days} días)`
                              : `${period.days} Días`}
                          </div>
                          <div className="text-slate-400 text-xs font-mono mt-0.5">Plazo de vigencia: {period.days} días calendario</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-montserrat">
                        {period.percentage}% mensual
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${
                        period.is_active 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${period.is_active ? 'bg-emerald-600' : 'bg-slate-400'}`}></span>
                        {period.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <Can permission="admin.periods.manage">
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => handleEdit(period)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:text-brand-800 hover:bg-brand-100/70 bg-brand-50/70 rounded-xl transition-all border border-brand-200/80 shadow-2xs cursor-pointer font-montserrat"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>
                          <button 
                            onClick={() => setDeletingId(period.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:text-rose-800 hover:bg-rose-100/70 bg-rose-50/70 rounded-xl transition-all border border-rose-200/80 shadow-2xs cursor-pointer font-montserrat"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Eliminar</span>
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

      {/* Modal Confirmación Eliminar */}
      <ConfirmationModal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={confirmDelete}
        title="¿Eliminar Periodo?"
        description="Esta acción deshabilitará el plazo configurado para futuras solicitudes de inversión."
        confirmText="Sí, Eliminar"
        cancelText="Cancelar"
        variant="danger"
        isLoading={isDeleting}
      />

      <PeriodModal 
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSaved={handleSaved}
        period={editingPeriod}
      />
    </div>
  );
};
