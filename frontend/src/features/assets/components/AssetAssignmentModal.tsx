import React, { useState, useEffect } from 'react';
import { X, UserCheck, AlertCircle, Check, Laptop } from 'lucide-react';
import { CompanyAsset, AssignAssetPayload } from '../../../services/companyAssetService';
import { usersService, User } from '../../../services/users';

interface AssetAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: CompanyAsset | null;
  onAssign: (data: AssignAssetPayload) => Promise<void>;
}

export const AssetAssignmentModal: React.FC<AssetAssignmentModalProps> = ({
  isOpen,
  onClose,
  asset,
  onAssign,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [userId, setUserId] = useState<number | ''>('');
  const [condition, setCondition] = useState('GOOD');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      usersService.getUsers({ limit: 150 })
        .then((res: any) => {
          const list = Array.isArray(res) ? res : res.items || [];
          setUsers(list);
        })
        .catch(console.error);

      setUserId('');
      setCondition(asset?.current_condition || 'GOOD');
      setNotes('');
      setError(null);
    }
  }, [isOpen, asset]);

  if (!isOpen || !asset) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      setError('Por favor selecciona el colaborador que recibirá la custodia del activo.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onAssign({
        user_id: Number(userId),
        condition_on_assignment: condition,
        assignment_notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al asignar el activo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-brand-50/40 dark:bg-brand-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white font-montserrat">
                Asignar Custodia
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                [{asset.asset_code}] {asset.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl flex items-center gap-2.5 text-xs text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Colaborador o Directivo Receptor *
            </label>
            <select
              required
              value={userId}
              onChange={(e) => setUserId(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:outline-hidden dark:text-white cursor-pointer"
            >
              <option value="">-- Seleccionar Persona --</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Condición Física al Entregar
            </label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:outline-hidden dark:text-white cursor-pointer"
            >
              <option value="EXCELLENT">Excelente / Impecable</option>
              <option value="GOOD">Bueno / Normal</option>
              <option value="FAIR">Aceptable / Detalles cosméticos</option>
              <option value="POOR">Malo / Regular</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Acta de Entrega / Notas & Periféricos
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalla accesorios entregados (cargador, mouse, estuche, clave temporal, etc.)..."
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 rounded-xl shadow-xs shadow-brand-500/20 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" />
              {loading ? 'Asignando...' : 'Confirmar Asignación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
