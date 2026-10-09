import React from 'react';
import { X, History, UserCheck, Calendar } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0 bg-violet-600">
              <History className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 font-montserrat">
                Historial de Custodia: {asset.asset_code}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500">
                {asset.name} • Marca: {asset.brand || 'N/A'} • Serial: {asset.serial_number || 'N/A'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto">
          {asset.assignments.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <UserCheck className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-1" />
              <p className="text-xs font-bold text-slate-700 font-montserrat">Este activo no registra custodias previas</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Ha permanecido disponible en bodega desde su alta.</p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {asset.assignments.map((asg) => (
                <div key={asg.id} className="relative">
                  <span
                    className={`absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full ring-4 ring-white ${
                      asg.is_current ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                    }`}
                  />
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 font-montserrat">
                          {asg.user_name || 'Usuario desconocido'}
                        </span>
                        {asg.is_current && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 font-montserrat">
                            Custodio Actual
                          </span>
                        )}
                      </div>
                      <span className="text-[10.5px] text-slate-400 flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3" />
                        {new Date(asg.assigned_date).toLocaleDateString('es-CO')}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-montserrat">Condición Entrega:</span>
                        <span className="font-semibold text-slate-800">
                          {asg.condition_on_assignment}
                        </span>
                        {asg.assignment_notes && (
                          <p className="text-[11px] text-slate-500 mt-0.5 italic">"{asg.assignment_notes}"</p>
                        )}
                      </div>

                      {asg.returned_date && (
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-montserrat">Fecha Devolución:</span>
                          <span className="font-semibold text-slate-800">
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
                      <span className="text-[10px] text-slate-400 block pt-1 border-t border-slate-200">
                        Entregado por: {asg.assigned_by_name}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-slate-100 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl sm:rounded-2xl transition-colors cursor-pointer font-montserrat"
            >
              Cerrar Historial
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
