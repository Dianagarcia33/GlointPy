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
  if (!isOpen) return null;
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 pt-20" style={{ margin: 0 }}>
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-100 text-brand-600 rounded-lg">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                {period ? 'Editar Periodo' : 'Nuevo Periodo'}
              </h2>
              <p className="text-xs text-slate-500">Configura la rentabilidad y duración</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Rentabilidad Mensual (%) *
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.percentage}
              onChange={(e) => setFormData({ ...formData, percentage: parseFloat(e.target.value) || 0 })}
              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              placeholder="Ej. 1.5"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Meses *
              </label>
              <input
                type="number"
                required
                value={formData.months}
                onChange={(e) => setFormData({ ...formData, months: parseInt(e.target.value) || 0 })}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                placeholder="Ej. 12"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Días Totales *
              </label>
              <input
                type="number"
                required
                value={formData.days}
                onChange={(e) => setFormData({ ...formData, days: parseInt(e.target.value) || 0 })}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                placeholder="Ej. 360"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-brand-600 border-slate-300 rounded focus:ring-brand-500"
              />
              <span className="text-sm font-medium text-slate-700">Periodo Activo</span>
            </label>
          </div>

          <div className="p-4 border-t bg-slate-50 flex justify-end gap-3 shrink-0 -mx-6 -mb-6 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-xl transition-all"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-lg shadow-brand-500/30 transition-all disabled:opacity-50 disabled:shadow-none"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Guardar Periodo
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
