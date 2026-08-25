import React, { useState, useEffect } from 'react';
import { periodsService, Period } from '../../../../services/periods';
import { PeriodModal } from '../components/PeriodModal';
import { Plus, Edit2, CalendarDays, Loader2, Trash2, AlertCircle, CheckCircle, X } from 'lucide-react';
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

  if (isLoading) {
      return (
          <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 animate-pulse">
              <div className="bg-slate-900/90 rounded-3xl p-8 h-40 shadow-xl relative overflow-hidden flex flex-col justify-center space-y-3">
                  <div className="h-5 w-48 bg-slate-800 rounded-full"></div>
                  <div className="h-8 w-64 bg-slate-800 rounded-xl"></div>
              </div>
              <div className="bg-white rounded-3xl border border-slate-200 p-6 h-96 space-y-4">
                  <div className="h-6 w-48 bg-slate-200 rounded"></div>
                  <div className="space-y-3 pt-2">
                      {[1, 2, 3, 4, 5].map(i => (
                          <div key={i} className="h-12 bg-slate-100 rounded-2xl w-full"></div>
                      ))}
                  </div>
              </div>
          </div>
      );
  }

  if (error) {
      return (
          <div className="w-full max-w-7xl mx-auto p-6 bg-red-50 border border-red-200 rounded-3xl flex items-start gap-4 text-red-700 shadow-xs">
              <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
              <div>
                  <h3 className="font-bold font-montserrat text-base">Error al cargar datos</h3>
                  <p className="text-sm mt-1">{error}</p>
                  <button onClick={fetchData} className="mt-3 px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 transition-all cursor-pointer">Reintentar</button>
              </div>
          </div>
      );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in duration-300">
      
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

      {/* Header Ejecutivo Principal */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute right-0 top-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-bold text-brand-300 backdrop-blur-sm">
            <CalendarDays className="w-4 h-4 text-emerald-400" /> Configuración de Tasas & Plazos
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight font-montserrat">
            Gestión de Periodos
          </h1>
          <p className="text-slate-300 text-sm max-w-xl">
            Administra los plazos de inversión habilitados, porcentajes de rentabilidad mensual y disponibilidad.
          </p>
        </div>
        
        <Can permission="admin.periods.manage">
          <button 
            onClick={handleCreate}
            className="relative z-10 flex items-center gap-2 px-6 py-3 bg-brand-500 text-white rounded-2xl hover:bg-brand-600 transition-all shadow-lg shadow-brand-500/30 text-sm font-bold cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Periodo</span>
          </button>
        </Can>
      </div>

      <div className="bg-white rounded-3xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider font-montserrat">
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
                      <button onClick={handleCreate} className="text-brand-600 font-bold hover:underline text-xs mt-1 cursor-pointer">
                        + Crea tu primer periodo
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                periods.map((period) => (
                  <tr key={period.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 shrink-0">
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
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 font-montserrat">
                        {period.percentage}% mensual
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${
                        period.is_active 
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
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
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-xl transition-all border border-brand-200 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>
                          <button 
                            onClick={() => setDeletingId(period.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all border border-rose-200 cursor-pointer"
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
