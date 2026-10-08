import React, { useState, useEffect } from 'react';
import { 
  X, 
  Landmark, 
  HelpCircle, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  CreditCard, 
  Calculator, 
  ChevronRight,
  ShieldCheck,
  Percent,
  Calendar,
  DollarSign
} from 'lucide-react';
import { 
  CreditConfig, 
  UserBankAccountOption, 
  simulateCredit, 
  requestCredit, 
  CreditSimulationResponse 
} from '../../../services/credits';

interface RequestCreditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  config: CreditConfig | null;
  bankAccounts: UserBankAccountOption[];
}

const PRESET_AMOUNTS = [
  500000,
  1000000,
  2000000,
  5000000,
  10000000
];

const PRESET_TERMS = [3, 6, 12, 18, 24];

export const RequestCreditModal: React.FC<RequestCreditModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  config,
  bankAccounts
}) => {
  const [amount, setAmount] = useState<number>(1000000);
  const [termMonths, setTermMonths] = useState<number>(6);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<number | 'manual'>(
    bankAccounts.length > 0 ? bankAccounts[0].id : 'manual'
  );
  
  // Datos manuales si elige escribir cuenta
  const [manualBank, setManualBank] = useState('');
  const [manualAccountType, setManualAccountType] = useState('Ahorros');
  const [manualAccountNumber, setManualAccountNumber] = useState('');
  const [purpose, setPurpose] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Simulación
  const [simulation, setSimulation] = useState<CreditSimulationResponse | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Inicializar cuenta seleccionada cuando carguen las cuentas
  useEffect(() => {
    if (bankAccounts.length > 0 && selectedBankAccountId === 'manual') {
      setSelectedBankAccountId(bankAccounts[0].id);
    }
  }, [bankAccounts]);

  // Ejecutar simulación cuando cambia monto o plazo
  useEffect(() => {
    if (!isOpen || !amount || amount < 10000 || !termMonths) return;

    const timer = setTimeout(() => {
      setIsSimulating(true);
      const appliedRate = config?.default_interest_rate_monthly;
      simulateCredit(amount, termMonths, appliedRate)
        .then(res => setSimulation(res))
        .catch(err => console.warn('Error simulando crédito:', err))
        .finally(() => setIsSimulating(false));
    }, 250);

    return () => clearTimeout(timer);
  }, [isOpen, amount, termMonths, config]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const minAmount = config?.min_amount || 100000;
    const maxAmount = config?.max_amount || 20000000;

    if (amount < minAmount) {
      setError(`El monto mínimo permitido es de $${minAmount.toLocaleString('es-CO')} COP.`);
      return;
    }
    if (amount > maxAmount) {
      setError(`El monto máximo permitido es de $${maxAmount.toLocaleString('es-CO')} COP.`);
      return;
    }

    if (!termsAccepted) {
      setError('Debes aceptar los términos y certificar la titularidad de tu cuenta bancaria.');
      return;
    }

    let payload: any = {
      amount,
      term_months: termMonths,
      purpose: purpose.trim() || undefined
    };

    if (selectedBankAccountId !== 'manual') {
      payload.user_bank_account_id = selectedBankAccountId;
    } else {
      if (!manualBank.trim() || !manualAccountNumber.trim()) {
        setError('Por favor completa todos los datos de tu cuenta bancaria de desembolso.');
        return;
      }
      payload.banco = manualBank.trim();
      payload.tipo_cuenta = manualAccountType.trim();
      payload.numero_cuenta = manualAccountNumber.trim();
    }

    try {
      setIsSubmitting(true);
      await requestCredit(payload);
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Error al radicar la solicitud de crédito.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center shadow-xs">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-montserrat">
                Solicitar Línea de Crédito
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Desembolso directo a tu cuenta bancaria vía Yoint
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
        <div className="overflow-y-auto p-6 space-y-6">
          
          {/* Banner Tasa de Usura Legal */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 flex items-start gap-3 text-xs text-slate-700">
            <Percent className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-slate-900 block font-montserrat">
                Tasa Regulada & Transparente
              </span>
              <p className="text-slate-600 leading-relaxed">
                Tasa de la plataforma: <strong className="text-amber-700">{config?.default_interest_rate_monthly || 1.80}% M.V.</strong> Tope de usura legal vigente certificado en Colombia: <strong className="text-slate-800">{config?.max_usury_rate_monthly || 1.98}% M.V. ({config?.max_usury_rate_ea || 26.50}% E.A.)</strong>.
              </p>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h4 className="text-base font-bold text-slate-900 font-montserrat">¡Solicitud Radicada con Éxito!</h4>
              <p className="text-xs text-slate-600">
                Tu solicitud ha ingresado a estudio. Un administrador validará los datos para el desembolso automático a tu cuenta bancaria.
              </p>
            </div>
          )}

          {!success && (
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Monto */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-slate-800 font-montserrat uppercase tracking-wider">
                    Monto a Solicitar (COP)
                  </label>
                  <span className="text-slate-400">
                    Mín: ${(config?.min_amount || 100000).toLocaleString('es-CO')}
                  </span>
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 font-bold">
                    $
                  </div>
                  <input
                    type="number"
                    min={config?.min_amount || 100000}
                    max={config?.max_amount || 20000000}
                    step={50000}
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-base font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                  />
                </div>

                {/* Presets de monto */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {PRESET_AMOUNTS.map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmount(val)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        amount === val
                          ? 'bg-amber-500 text-white shadow-xs font-bold'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      ${(val / 1000000).toFixed(val % 1000000 === 0 ? 0 : 1)}M
                    </button>
                  ))}
                </div>
              </div>

              {/* Plazo en Meses */}
              <div className="space-y-2">
                <label className="font-bold text-slate-800 text-xs font-montserrat uppercase tracking-wider block">
                  Plazo en Meses
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {PRESET_TERMS.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => setTermMonths(term)}
                      className={`py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer border ${
                        termMonths === term
                          ? 'bg-amber-500/10 border-amber-500 text-amber-800 shadow-2xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {term} {term === 1 ? 'mes' : 'meses'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Resumen del Simulador en Vivo */}
              {simulation && (
                <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3 relative overflow-hidden shadow-lg">
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
                  
                  <div className="flex items-center justify-between text-xs text-amber-400 font-bold uppercase tracking-wider font-montserrat">
                    <span className="flex items-center gap-1.5">
                      <Calculator className="w-3.5 h-3.5" />
                      Plan de Amortización Estimado
                    </span>
                    <span>{simulation.term_months} Cuotas Mensuales</span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-1">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Cuota Mensual</span>
                      <span className="text-base font-extrabold text-white font-montserrat">
                        ${simulation.monthly_installment.toLocaleString('es-CO')}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block">Total Intereses</span>
                      <span className="text-xs font-bold text-amber-300">
                        ${simulation.total_interest.toLocaleString('es-CO')}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block">Total a Pagar</span>
                      <span className="text-xs font-bold text-slate-200">
                        ${simulation.total_payment.toLocaleString('es-CO')}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Selección de Cuenta Bancaria para Desembolso */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 text-xs font-montserrat uppercase tracking-wider block">
                    Cuenta Bancaria para Recibir los Fondos
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Misma cuenta utilizada para retiros
                  </span>
                </div>

                {bankAccounts.length > 0 && (
                  <div className="space-y-2">
                    {bankAccounts.map((acc) => (
                      <label
                        key={acc.id}
                        className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                          selectedBankAccountId === acc.id
                            ? 'bg-amber-50/70 border-amber-500 shadow-2xs'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="bank_account_choice"
                            checked={selectedBankAccountId === acc.id}
                            onChange={() => setSelectedBankAccountId(acc.id)}
                            className="w-4 h-4 text-amber-500 border-slate-300 focus:ring-amber-400 cursor-pointer"
                          />
                          <div>
                            <span className="text-xs font-bold text-slate-900 block font-montserrat">
                              {acc.banco} • {acc.tipo_cuenta}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              N° {acc.numero_cuenta}
                            </span>
                          </div>
                        </div>
                        <Landmark className="w-4 h-4 text-slate-400" />
                      </label>
                    ))}
                  </div>
                )}

                <label
                  className={`p-3.5 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all ${
                    selectedBankAccountId === 'manual'
                      ? 'bg-amber-50/70 border-amber-500 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                  }`}
                >
                  <input
                    type="radio"
                    name="bank_account_choice"
                    checked={selectedBankAccountId === 'manual'}
                    onChange={() => setSelectedBankAccountId('manual')}
                    className="w-4 h-4 text-amber-500 border-slate-300 focus:ring-amber-400 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-800">
                    Ingresar otra cuenta bancaria
                  </span>
                </label>

                {selectedBankAccountId === 'manual' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 animate-in fade-in">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Banco</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Bancolombia"
                        value={manualBank}
                        onChange={(e) => setManualBank(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Tipo de Cuenta</label>
                      <select
                        value={manualAccountType}
                        onChange={(e) => setManualAccountType(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500 font-medium cursor-pointer"
                      >
                        <option value="Ahorros">Ahorros</option>
                        <option value="Corriente">Corriente</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">N° de Cuenta</label>
                      <input
                        type="text"
                        required
                        placeholder="000-000000-00"
                        value={manualAccountNumber}
                        onChange={(e) => setManualAccountNumber(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500 font-medium font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Motivo (Opcional) */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Motivo / Destino del Crédito (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Ej. Capital de trabajo, inversión comercial o libre destino..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium"
                />
              </div>

              {/* Términos y titularidad */}
              <label className="flex items-start gap-3 p-3 bg-amber-50/50 border border-amber-200/60 rounded-2xl text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-amber-400 mt-0.5 cursor-pointer"
                />
                <span className="leading-relaxed font-medium">
                  Certifico que la cuenta bancaria indicada es de mi titularidad y autorizo que, en caso de ser aprobado, el crédito sea desembolsado por dispersión automática mediante la pasarela bancaria oficial de Gloint (Yoint).
                </span>
              </label>

              {/* Botón de Enviar */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs font-montserrat uppercase tracking-wider transition-all shadow-md shadow-amber-500/25 active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Radicando Solicitud...</span>
                  </>
                ) : (
                  <>
                    <span>Confirmar y Radicar Solicitud</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>

            </form>
          )}

        </div>

      </div>
    </div>
  );
};
