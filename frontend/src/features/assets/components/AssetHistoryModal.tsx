import React from 'react';
import { X, History, UserCheck, Calendar, FileText, CheckCircle2, CornerDownLeft } from 'lucide-react';
import { CompanyAsset } from '../../../services/companyAssetService';

interface AssetHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: CompanyAsset | null;
}

export const AssetHistoryModal: React.FC<AssetHistoryModalProps> = ({
  isOpen,
  onClose,
  asset,
}) => {
  if (!isOpen || !asset) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-violet-500/10 text-violet-500 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white font-montserrat">
                Historial de Custodias: {asset.asset_code}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {asset.name} • Marca: {asset.brand || 'N/A'} • Serial: {asset.serial_number || 'N/A'}
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

        <div className="p-6">
          {asset.assignments.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <UserCheck className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
              <p className="text-xs font-semibold">Este activo no registra custodias previas</p>
              <p className="text-[11px] text-slate-400">Ha permanecido disponible en bodega desde su alta.</p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
              {asset.assignments.map((asg, idx) => (
                <div key={asg.id} className="relative">
                  <span
                    className={`absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full ring-4 ring-white dark:ring-slate-900 ${
                      asg.is_current ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  />
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                          {asg.user_name || 'Usuario desconocido'}
                        </span>
                        {asg.is_current && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                            Custodio Actual
                          </span>
                        )}
                      </div>
                      <span className="text-[10.5px] text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(asg.assigned_date).toLocaleDateString('es-CO')}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Condición Entrega:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {asg.condition_on_assignment}
                        </span>
                        {asg.assignment_notes && (
                          <p className="text-[11px] text-slate-500 mt-0.5 italic">"{asg.assignment_notes}"</p>
                        )}
                      </div>

                      {asg.returned_date && (
                        <div>
                          <span className="text-[10px] text-slate-400 block">Fecha Devolución:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {new Date(asg.returned_date).toLocaleDateString('es-CO')}
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            Condición al volver: <strong>{asg.condition_on_return || 'N/A'}</strong>
                          </span>
                          {asg.return_notes && (
                            <p className="text-[11px] text-slate-500 mt-0.5 italic">"{asg.return_notes}"</p>
                          )}
                        </div>
                      )}
                    </div>

                    {asg.assigned_by_name && (
                      <span className="text-[10px] text-slate-400 block pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                        Entregado por: {asg.assigned_by_name}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800 mt-6">
            <button
              onClick={onClose}
              className="px-5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cerrar Historial
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
