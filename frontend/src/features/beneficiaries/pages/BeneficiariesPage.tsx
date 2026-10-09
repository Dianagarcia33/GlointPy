import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Beneficiary, beneficiariesService } from '../../../services/beneficiaries';
import { BeneficiaryModal } from '../components/BeneficiaryModal';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  HeartHandshake, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  X, 
  Percent, 
  ShieldCheck, 
  RefreshCw,
  Users
} from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, beneficiaryName, isDeleting }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100">
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 mb-4 mx-auto border border-rose-200/80">
            <Trash2 className="w-6 h-6 text-rose-600" />
          </div>
          <h2 className="text-xl font-black text-slate-900 text-center mb-2 font-montserrat">Eliminar Beneficiario</h2>
          <p className="text-slate-500 text-center text-xs leading-relaxed mb-6 font-medium">
            ¿Estás seguro de que deseas eliminar a <span className="font-bold text-slate-800">{beneficiaryName}</span> como beneficiario legal? El porcentaje asignado quedará disponible nuevamente.
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

const BeneficiaryTableSkeleton = () => {
  return (
    <>
      {[...Array(3)].map((_, i) => (
        <tr key={i} className="animate-pulse">
          <td className="px-6 py-4"><div className="h-4 w-36 bg-slate-100 rounded-lg"></div></td>
          <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-100 rounded-lg"></div></td>
          <td className="px-6 py-4"><div className="h-4 w-20 bg-slate-100 rounded-lg"></div></td>
          <td className="px-6 py-4"><div className="h-5 w-16 bg-slate-100 rounded-lg"></div></td>
          <td className="px-6 py-4"><div className="h-4 w-32 bg-slate-100 rounded-lg"></div></td>
          <td className="px-6 py-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <div className="h-7 w-16 bg-slate-100 rounded-xl"></div>
              <div className="h-7 w-16 bg-slate-100 rounded-xl"></div>
            </div>
          </td>
        </tr>
      ))}
    </>
  );
};

export const BeneficiariesPage: React.FC = () => {
  const { user } = useAuthStore();
  const hasBeneficiariesPerm = user?.is_superuser === true || user?.permissions?.includes('beneficiaries:view') === true;

  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBeneficiary, setEditingBeneficiary] = useState<Beneficiary | null>(null);
  
  const [beneficiaryToDelete, setBeneficiaryToDelete] = useState<Beneficiary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  if (!hasBeneficiariesPerm && user) {
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const data = await beneficiariesService.getMyBeneficiaries();
      setBeneficiaries(data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Error al cargar beneficiarios');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalPercentage = beneficiaries.reduce((sum, b) => sum + Number(b.percentage || 0), 0);
  const availablePercentage = Math.max(0, 100 - totalPercentage);

  const handleCreate = () => {
    setEditingBeneficiary(null);
    setIsModalOpen(true);
  };

  const handleEdit = (b: Beneficiary) => {
    setEditingBeneficiary(b);
    setIsModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!beneficiaryToDelete) return;
    setIsDeleting(true);
    try {
      await beneficiariesService.deleteMyBeneficiary(beneficiaryToDelete.id);
      setToast({ message: `Beneficiario "${beneficiaryToDelete.name}" eliminado correctamente`, type: 'success' });
      setBeneficiaryToDelete(null);
      await fetchData();
    } catch (err: any) {
      setToast({ message: err.response?.data?.detail || err.message || 'Error al eliminar beneficiario', type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto min-w-0 pb-20 space-y-6 animate-in fade-in duration-300">
      
      {/* 🏛️ 1. Encabezado de Página (Estándar Soporte en Tickets) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight font-montserrat flex items-center gap-2.5">
            <span className="p-2 bg-brand-50 text-brand-600 border border-brand-200 rounded-2xl inline-flex shadow-xs">
              <HeartHandshake className="w-6 h-6" />
            </span>
            Beneficiarios
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Gestiona las personas asignadas para la distribución legal de tus contratos e inversiones
          </p>
        </div>

        {/* Acciones y Badges del Header */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {totalPercentage === 100 ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-2xl border border-emerald-200 font-montserrat">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              Cobertura 100%
            </span>
          ) : totalPercentage > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-2xl border border-amber-200 font-montserrat">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              Asignado {totalPercentage.toFixed(0)}% de 100%
            </span>
          ) : null}

          <button
            onClick={handleCreate}
            disabled={availablePercentage <= 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-600 to-amber-600 hover:from-brand-700 hover:to-amber-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-brand-500/20 transition-all cursor-pointer font-montserrat disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Beneficiario</span>
          </button>

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

      {/* 📊 2. Cuadrícula de Métricas KPI (4-Stat Cards exactas al Mercado de Acciones) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Porcentaje Asignado */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Porcentaje Asignado</span>
            <Percent className="w-4 h-4 text-brand-600" />
          </div>
          <span className="text-2xl font-black text-slate-900 font-mono block">
            {totalPercentage.toFixed(2)}%
          </span>
          <span className="text-[11px] text-slate-500 font-medium block">
            {totalPercentage === 100 ? 'Distribución legal al 100%' : `${availablePercentage.toFixed(2)}% restante por asignar`}
          </span>
        </div>

        {/* Card 2: Porcentaje Disponible */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Porcentaje Disponible</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <span className={`text-2xl font-black font-mono block ${availablePercentage === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
            {availablePercentage.toFixed(2)}%
          </span>
          <span className="text-[11px] text-slate-500 font-medium block">
            {availablePercentage === 0 ? 'Cupo totalmente cubierto' : 'Cupo libre para beneficiarios'}
          </span>
        </div>

        {/* Card 3: Total Beneficiarios */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Beneficiarios</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <span className="text-2xl font-black text-slate-900 font-mono block">
            {beneficiaries.length}
          </span>
          <span className="text-[11px] text-slate-500 font-medium block">
            {beneficiaries.length === 1 ? '1 persona vinculada' : `${beneficiaries.length} personas vinculadas`}
          </span>
        </div>

        {/* Card 4: Estado Legal */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Estado Legal</span>
            <CheckCircle className="w-4 h-4 text-purple-600" />
          </div>
          <span className={`text-xl font-black font-montserrat block ${totalPercentage === 100 ? 'text-emerald-700' : 'text-amber-700'}`}>
            {totalPercentage === 100 ? 'Completado' : 'Incompleto'}
          </span>
          <span className="text-[11px] text-slate-500 font-medium block">
            {totalPercentage === 100 ? 'Cobertura jurídica óptima' : 'Requiere completar el 100%'}
          </span>
        </div>

      </div>

      {/* 📈 3. Tarjeta de Progreso y Distribución de Porcentaje */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xs border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center border border-brand-200/60">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-sm sm:text-base font-montserrat">
                Distribución de Porcentajes de Ley
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                La suma de las cuotas de tus beneficiarios debe totalizar exactamente el 100%
              </p>
            </div>
          </div>
          <div className="text-xs font-mono font-bold flex items-center gap-2 self-start sm:self-auto">
            <span className="text-slate-500">Asignado: <strong className="text-slate-900">{totalPercentage.toFixed(2)}%</strong></span>
            <span className={`px-2.5 py-1 rounded-xl border ${availablePercentage === 0 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-amber-800 bg-amber-50 border-amber-200'}`}>
              Libre: {availablePercentage.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Barra de Progreso */}
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
          <div 
            className={`h-3 rounded-full transition-all duration-500 ${
              totalPercentage === 100 
                ? 'bg-emerald-500' 
                : totalPercentage > 0 
                  ? 'bg-amber-500' 
                  : 'bg-slate-300'
            }`}
            style={{ width: `${Math.min(100, totalPercentage)}%` }}
          />
        </div>

        {/* Llamado de Estado */}
        {totalPercentage === 100 ? (
          <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-emerald-900 font-semibold animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Distribución legal completa: El 100% de los derechos se encuentra asignado correctamente.</span>
            </div>
            <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full uppercase shrink-0">
              Válido 100%
            </span>
          </div>
        ) : beneficiaries.length > 0 ? (
          <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 font-medium animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-950 font-montserrat">Distribución Incompleta ({totalPercentage.toFixed(2)}% de 100%)</p>
                <p className="text-amber-800 text-xs mt-0.5">
                  Falta asignar el <strong>{availablePercentage.toFixed(2)}%</strong> restante para que la cobertura legal de tus contratos sea del 100%.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCreate}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer flex items-center gap-1.5 self-start sm:self-center font-montserrat"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Asignar {availablePercentage.toFixed(2)}%</span>
            </button>
          </div>
        ) : null}
      </div>

      {/* 📑 4. Tabla de Beneficiarios Registrados */}
      <div className="bg-white rounded-3xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/75 text-slate-400 font-bold border-b border-slate-100 uppercase text-[10px] tracking-wider font-montserrat">
              <tr>
                <th className="px-6 py-4">Nombre Completo</th>
                <th className="px-6 py-4">Documento</th>
                <th className="px-6 py-4">Parentesco</th>
                <th className="px-6 py-4">Porcentaje</th>
                <th className="px-6 py-4">Datos de Contacto</th>
                <th className="px-6 py-4 text-right pr-6 whitespace-nowrap min-w-[180px]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {isLoading ? (
                <BeneficiaryTableSkeleton />
              ) : beneficiaries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-14 h-14 rounded-3xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto">
                        <HeartHandshake className="w-7 h-7" />
                      </div>
                      <h3 className="text-base font-bold text-slate-800 font-montserrat">
                        No tienes beneficiarios registrados aún
                      </h3>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
                        Agrega a tus herederos o contactos para formalizar la cobertura jurídica de tus cuentas e inversiones.
                      </p>
                      <button 
                        onClick={handleCreate} 
                        className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-2xl text-xs font-bold transition-all shadow-sm shadow-brand-500/20 inline-flex items-center gap-2 cursor-pointer font-montserrat mt-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Agregar tu primer beneficiario</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                beneficiaries.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 text-sm font-montserrat">{b.name}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-600">
                      {b.document_number || <span className="text-slate-400 italic">No registrado</span>}
                    </td>
                    <td className="px-6 py-4 text-slate-700 font-medium">
                      {b.relationship || <span className="text-slate-400 italic">No especificado</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200/60 font-mono">
                        <Percent className="w-3 h-3 text-brand-500" />
                        {Number(b.percentage).toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs space-y-0.5">
                      {b.phone && <div>Tel: <span className="text-slate-800 font-bold font-mono">{b.phone}</span></div>}
                      {b.email && <div>Email: <span className="text-slate-800 font-medium">{b.email}</span></div>}
                      {!b.phone && !b.email && <span className="text-slate-400 italic">Sin datos</span>}
                    </td>
                    <td className="px-6 py-4 text-right pr-6 whitespace-nowrap min-w-[180px]">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(b)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-all border border-slate-200 hover:border-brand-200 cursor-pointer font-montserrat"
                          title="Editar Beneficiario"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>
                        <button
                          onClick={() => setBeneficiaryToDelete(b)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all border border-rose-200 hover:border-rose-300 cursor-pointer font-montserrat"
                          title="Eliminar Beneficiario"
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

      {/* Modal Agregar / Editar Beneficiario */}
      <BeneficiaryModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={fetchData}
        beneficiary={editingBeneficiary}
        availablePercentage={editingBeneficiary ? availablePercentage + Number(editingBeneficiary.percentage) : availablePercentage}
      />

      {/* Modal de Confirmación de Eliminación */}
      <DeleteConfirmationModal 
        isOpen={!!beneficiaryToDelete}
        onClose={() => setBeneficiaryToDelete(null)}
        onConfirm={handleDeleteConfirm}
        beneficiaryName={beneficiaryToDelete?.name}
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
