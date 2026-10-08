import React, { useState, useEffect } from 'react';
import { 
  X, 
  Settings, 
  Percent, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  DollarSign, 
  Calendar 
} from 'lucide-react';
import { CreditConfig, updateCreditConfig } from '../../../../services/credits';

interface CreditConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: CreditConfig) => void;
  currentConfig: CreditConfig | null;
}

export const CreditConfigModal: React.FC<CreditConfigModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentConfig
}) => {
  const [usuryEa, setUsuryEa] = useState<number>(26.50);
  const [usuryMonthly, setUsuryMonthly] = useState<number>(1.98);
  const [defaultRateMonthly, setDefaultRateMonthly] = useState<number>(1.80);
  const [minAmount, setMinAmount] = useState<number>(100000);
  const [maxAmount, setMaxAmount] = useState<number>(20000000);
  const [minTerm, setMinTerm] = useState<number>(1);
  const [maxTerm, setMaxTerm] = useState<number>(24);
  const [allowedAmounts, setAllowedAmounts] = useState<string>("500000, 1000000, 2000000, 5000000, 10000000");
  const [allowedTerms, setAllowedTerms] = useState<string>("3, 6, 12, 18, 24");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (currentConfig) {
      setUsuryEa(currentConfig.max_usury_rate_ea);
      setUsuryMonthly(currentConfig.max_usury_rate_monthly);
      setDefaultRateMonthly(currentConfig.default_interest_rate_monthly);
      setMinAmount(currentConfig.min_amount);
      setMaxAmount(currentConfig.max_amount);
      setMinTerm(currentConfig.min_term_months);
      setMaxTerm(currentConfig.max_term_months);
      if (currentConfig.allowed_amounts) setAllowedAmounts(currentConfig.allowed_amounts);
      if (currentConfig.allowed_terms) setAllowedTerms(currentConfig.allowed_terms);
    }
  }, [currentConfig, isOpen]);

  if (!isOpen) return null;

  // Conversión bidireccional entre EA y Mensual
  const handleEaChange = (val: number) => {
    setUsuryEa(val);
    if (val > 0) {
      const eaFloat = val / 100.0;
      const calcM = ((Math.pow(1.0 + eaFloat, 1.0 / 12.0) - 1.0) * 100.0);
      setUsuryMonthly(parseFloat(calcM.toFixed(2)));
    }
  };

  const handleMonthlyChange = (val: number) => {
    setUsuryMonthly(val);
    if (val > 0) {
      const mFloat = val / 100.0;
      const calcEa = ((Math.pow(1.0 + mFloat, 12.0) - 1.0) * 100.0);
      setUsuryEa(parseFloat(calcEa.toFixed(2)));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (defaultRateMonthly > usuryMonthly) {
      setError(`La tasa comercial de Gloint (${defaultRateMonthly}%) no puede superar la tasa de usura legal (${usuryMonthly}% M.V.).`);
      return;
    }

    try {
      setLoading(true);
      const updated = await updateCreditConfig({
        max_usury_rate_ea: usuryEa,
        max_usury_rate_monthly: usuryMonthly,
        default_interest_rate_monthly: defaultRateMonthly,
        min_amount: minAmount,
        max_amount: maxAmount,
        min_term_months: minTerm,
        max_term_months: maxTerm,
        allowed_amounts: allowedAmounts.trim(),
        allowed_terms: allowedTerms.trim()
      });

      setSuccess(true);
      setTimeout(() => {
        onSuccess(updated);
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Error al actualizar la configuración crediticia.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center shadow-xs">
              <Percent className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-montserrat">
                Configuración y Tasa de Usura
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Parámetros regulatorios y límites fintech en Colombia
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2.5 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Configuración y tasa de usura actualizada correctamente.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Tasa de Usura Legal Superfinanciera */}
            <div className="p-4 bg-amber-50/50 border border-amber-200/80 rounded-2xl space-y-3">
              <span className="text-xs font-bold text-slate-900 font-montserrat uppercase tracking-wider block">
                Tasa de Usura Legal (Superfinanciera)
              </span>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    % Efectivo Anual (E.A.)
                  </label>
                  <input
                    type="number"
                    step={0.01}
                    min={1}
                    max={100}
                    value={usuryEa}
                    onChange={(e) => handleEaChange(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 font-montserrat"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    % Mensual Vencido (M.V.)
                  </label>
                  <input
                    type="number"
                    step={0.01}
                    min={0.1}
                    max={15}
                    value={usuryMonthly}
                    onChange={(e) => handleMonthlyChange(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 font-montserrat"
                  />
                </div>
              </div>

              <p className="text-[10px] text-slate-500">
                El sistema valida automáticamente que ningún crédito aprobado supere este límite legal certificado.
              </p>
            </div>

            {/* Tasa Estándar Gloint */}
            <div>
              <label className="text-xs font-bold text-slate-800 font-montserrat uppercase tracking-wider block mb-1">
                Tasa de Interés Estándar Gloint (% Mensual)
              </label>
              <input
                type="number"
                step={0.01}
                min={0}
                max={usuryMonthly}
                value={defaultRateMonthly}
                onChange={(e) => setDefaultRateMonthly(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500 font-montserrat"
              />
            </div>

            {/* Monto Min / Max */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Monto Mínimo (COP)
                </label>
                <input
                  type="number"
                  step={10000}
                  value={minAmount}
                  onChange={(e) => setMinAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Monto Máximo (COP)
                </label>
                <input
                  type="number"
                  step={100000}
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>

            {/* Plazos Min / Max */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Plazo Mínimo (Meses)
                </label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={minTerm}
                  onChange={(e) => setMinTerm(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Plazo Máximo (Meses)
                </label>
                <input
                  type="number"
                  min={1}
                  max={48}
                  value={maxTerm}
                  onChange={(e) => setMaxTerm(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Cantidades y Plazos definidos por el Admin */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block font-montserrat">
                🎯 Cantidades & Plazos que el Admin Autoriza al Cliente
              </span>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Cantidades fijas autorizadas (separadas por coma en COP)
                </label>
                <input
                  type="text"
                  value={allowedAmounts}
                  onChange={(e) => setAllowedAmounts(e.target.value)}
                  placeholder="500000, 1000000, 2000000, 5000000, 10000000"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-900 focus:outline-none focus:border-amber-500"
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Ej: 500000, 1000000, 2000000, 5000000, 10000000
                </span>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Plazos fijos autorizados (separados por coma en meses)
                </label>
                <input
                  type="text"
                  value={allowedTerms}
                  onChange={(e) => setAllowedTerms(e.target.value)}
                  placeholder="3, 6, 12, 18, 24"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-900 focus:outline-none focus:border-amber-500"
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Ej: 3, 6, 12, 18, 24
                </span>
              </div>
            </div>

            {/* Botón Guardar */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs font-montserrat uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Guardando Cambios...</span>
                </>
              ) : (
                <span>Actualizar Parámetros & Tasa de Usura</span>
              )}
            </button>

          </form>

        </div>

      </div>
    </div>
  );
};
