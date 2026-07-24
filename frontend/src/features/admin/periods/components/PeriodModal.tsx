import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { periodsService, Period } from '../../../../services/periods';
import { X, CalendarDays, Loader2 } from 'lucide-react';

interface PeriodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  period: Period | null;
}

export const PeriodModal: React.FC<PeriodModalProps> = ({ isOpen, onClose, onSaved, period }) => {
  const [formData, setFormData] = useState({
    percentage: 0,
    months: 0,
    days: 0,
    is_active: true,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (period) {
      setFormData({
        percentage: period.percentage,
        months: period.months,
        days: period.days,
        is_active: period.is_active,
      });
    } else {
      setFormData({
        percentage: 0,
        months: 0,
        days: 0,
        is_active: true,
      });
    }
    setError(null);
  }, [period, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (period) {
        await periodsService.updatePeriod(period.id, formData);
      } else {
        await periodsService.createPeriod(formData);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Hubo un error al guardar el periodo.');
    } finally {
      setIsLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200" style={{ margin: 0 }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header Estandarizado */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-100 text-brand-700 rounded-xl">
              <CalendarDays className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 font-montserrat">
                {period ? 'Editar Periodo de Inversión' : 'Nuevo Periodo de Inversión'}
              </h3>
              <p className="text-xs text-slate-500">Configura la rentabilidad y plazo del periodo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form id="period-form" onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-600">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Rentabilidad Mensual (%) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.percentage}
              onChange={(e) => setFormData({ ...formData, percentage: parseFloat(e.target.value) || 0 })}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none text-sm font-bold text-slate-900 font-montserrat"
              placeholder="Ej. 1.5"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Plazo en Meses <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                value={formData.months}
                onChange={(e) => setFormData({ ...formData, months: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none text-sm font-semibold text-slate-900"
                placeholder="Ej. 12"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Días Calendario Totales <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                value={formData.days}
                onChange={(e) => setFormData({ ...formData, days: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none text-sm font-semibold text-slate-900"
                placeholder="Ej. 360"
              />
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between mt-2">
            <div>
              <span className="text-xs font-bold text-slate-800 block font-montserrat">Estado del Periodo</span>
              <span className="text-xs text-slate-500">Si está inactivo, no estará disponible para nuevas inversiones.</span>
            </div>
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-brand-600 border-slate-300 rounded focus:ring-brand-500 cursor-pointer"
            />
          </div>
        </form>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-5 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-200 transition-all text-sm cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="period-form"
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-brand-500 hover:bg-brand-600 rounded-xl shadow-md shadow-brand-500/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Guardar Periodo
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
