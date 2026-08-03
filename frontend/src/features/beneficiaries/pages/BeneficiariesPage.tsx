import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Beneficiary, beneficiariesService } from '../../../services/beneficiaries';
import { BeneficiaryModal } from '../components/BeneficiaryModal';
import { Plus, Edit2, Trash2, HeartHandshake, Loader2, AlertCircle, CheckCircle, X, Percent, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, beneficiaryName, isDeleting }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl border border-slate-100">
        <div className="p-6">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-rose-100 mb-4 mx-auto">
            <Trash2 className="w-6 h-6 text-rose-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 text-center mb-2 font-montserrat">Eliminar Beneficiario</h2>
          <p className="text-slate-500 text-center text-xs mb-6">
            ¿Estás seguro de que deseas eliminar a <span className="font-bold text-slate-700">{beneficiaryName}</span> como beneficiario? Esta acción actualizará tu porcentaje disponible.
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

const BeneficiaryTableSkeleton = () => {
  return (
    <>
      {[...Array(3)].map((_, i) => (
        <tr key={i} className="animate-pulse">
          <td className="px-6 py-4"><div className="h-4 w-36 bg-slate-200 rounded"></div></td>
          <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-200 rounded"></div></td>
          <td className="px-6 py-4"><div className="h-4 w-20 bg-slate-200 rounded"></div></td>
          <td className="px-6 py-4"><div className="h-5 w-16 bg-slate-200 rounded-md"></div></td>
          <td className="px-6 py-4"><div className="h-4 w-32 bg-slate-200 rounded"></div></td>
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

export const BeneficiariesPage = () => {
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
      const timer = setTimeout(() => setToast(null), 3000);
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
            <HeartHandshake className="w-4 h-4 text-emerald-400" /> Registro Legal de Beneficiarios
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight font-montserrat">
            Beneficiarios
          </h1>
          <p className="text-slate-300 text-sm max-w-xl">
            Gestiona las personas asignadas para la distribución legal de tus contratos e inversiones (Total 100%).
          </p>
        </div>
        
        <div className="relative z-10 flex items-center gap-3 shrink-0">
          <button 
            onClick={handleCreate}
            disabled={availablePercentage <= 0}
            className="flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-2xl transition-all shadow-lg shadow-brand-500/30 text-sm font-bold cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Beneficiario</span>
          </button>
        </div>
      </div>

      {/* Tarjeta de Progreso de Porcentaje Total */}
      <div className="bg-white p-6 rounded-3xl shadow-xs border border-slate-200 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-brand-600" />
            <h3 className="font-bold text-slate-800 text-sm font-montserrat">Distribución de Porcentajes</h3>
          </div>
          <div className="text-xs font-extrabold font-montserrat flex items-center gap-3">
            <span className="text-slate-500">Asignado: <span className="text-slate-900">{totalPercentage.toFixed(2)}%</span></span>
            <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              Disponible: {availablePercentage.toFixed(2)}%
            </span>
          </div>
        </div>

        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
          <div 
            className={`h-3 rounded-full transition-all duration-500 ${
              totalPercentage === 100 
                ? 'bg-emerald-500' 
                : totalPercentage > 0 
                  ? 'bg-brand-500' 
                  : 'bg-slate-300'
            }`}
            style={{ width: `${Math.min(100, totalPercentage)}%` }}
          />
        </div>
      </div>

      {/* Tabla de Beneficiarios */}
      <div className="bg-white rounded-3xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider font-montserrat">
              <tr>
                <th className="px-6 py-4">Nombre Completo</th>
                <th className="px-6 py-4">Documento</th>
                <th className="px-6 py-4">Parentesco</th>
                <th className="px-6 py-4">Porcentaje</th>
                <th className="px-6 py-4">Contacto</th>
                <th className="px-6 py-4 text-center whitespace-nowrap min-w-[200px]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-xs">
              {isLoading ? (
                <BeneficiaryTableSkeleton />
              ) : beneficiaries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <HeartHandshake className="w-8 h-8 text-slate-300" />
                      <p>No tienes beneficiarios registrados aún.</p>
                      <button onClick={handleCreate} className="text-brand-600 font-bold hover:underline text-xs mt-1 cursor-pointer">
                        Agrega tu primer beneficiario
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                beneficiaries.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800 text-sm">{b.name}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-600">
                      {b.document_number || <span className="text-slate-400 font-sans italic">No registrado</span>}
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      {b.relationship || <span className="text-slate-400 italic">No especificado</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-extrabold bg-brand-50 text-brand-700 border border-brand-200/60 font-montserrat">
                        <Percent className="w-3.5 h-3.5 text-brand-500" />
                        {Number(b.percentage).toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-[11px] space-y-0.5">
                      {b.phone && <div>Tel: <span className="text-slate-700 font-bold">{b.phone}</span></div>}
                      {b.email && <div>Email: <span className="text-slate-700 font-bold">{b.email}</span></div>}
                      {!b.phone && !b.email && <span className="text-slate-400 italic">Sin datos</span>}
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap min-w-[200px]">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(b)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-xl transition-all border border-brand-200 cursor-pointer"
                          title="Editar Beneficiario"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>
                        <button
                          onClick={() => setBeneficiaryToDelete(b)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all border border-rose-200 cursor-pointer"
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
    </div>
  );
};
