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
  getMyCreditBankAccounts,
  CreditSimulationResponse 
} from '../../../services/credits';

interface RequestCreditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  config: CreditConfig | null;
  bankAccounts: UserBankAccountOption[];
}

export const RequestCreditModal: React.FC<RequestCreditModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  config,
  bankAccounts
}) => {
  // Cantidades y Plazos autorizados por el Administrador
  const adminAmounts = React.useMemo(() => {
    if (config?.allowed_amounts) {
      const parsed = config.allowed_amounts
        .split(',')
        .map(s => Number(s.trim()))
        .filter(n => !isNaN(n) && n > 0);
      if (parsed.length > 0) return parsed;
    }
    return [500000, 1000000, 2000000, 5000000, 10000000];
  }, [config?.allowed_amounts]);

  const adminTerms = React.useMemo(() => {
    if (config?.allowed_terms) {
      const parsed = config.allowed_terms
        .split(',')
        .map(s => Number(s.trim()))
        .filter(n => !isNaN(n) && n > 0);
      if (parsed.length > 0) return parsed;
    }
    return [3, 6, 12, 18, 24];
  }, [config?.allowed_terms]);

  const [amount, setAmount] = useState<number>(adminAmounts[0] || 1000000);
  const [termMonths, setTermMonths] = useState<number>(adminTerms[0] || 6);

  // Cuentas locales sincronizadas activamente con Bóveda Bancaria
  const [localAccounts, setLocalAccounts] = useState<UserBankAccountOption[]>(bankAccounts);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
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
  const [lastCreatedCredit, setLastCreatedCredit] = useState<any | null>(null);

  // Actualizar valores cuando cargan las opciones del admin
  useEffect(() => {
    if (adminAmounts.length > 0 && !adminAmounts.includes(amount)) {
      setAmount(adminAmounts[0]);
    }
  }, [adminAmounts]);

  useEffect(() => {
    if (adminTerms.length > 0 && !adminTerms.includes(termMonths)) {
      setTermMonths(adminTerms[0]);
    }
  }, [adminTerms]);

  // Sincronizar cuentas cuando cambian los props
  useEffect(() => {
    if (bankAccounts && bankAccounts.length > 0) {
      setLocalAccounts(bankAccounts);
      if (selectedBankAccountId === 'manual' || !bankAccounts.some(b => b.id === selectedBankAccountId)) {
        setSelectedBankAccountId(bankAccounts[0].id);
      }
    }
  }, [bankAccounts]);

  // Al abrir el modal, consultar activamente Bóveda Bancaria para garantizar que siempre salga la cuenta
  useEffect(() => {
    if (isOpen) {
      setLoadingAccounts(true);
      getMyCreditBankAccounts()
        .then(res => {
          if (res && res.length > 0) {
            setLocalAccounts(res);
            setSelectedBankAccountId(prev => {
              if (prev === 'manual' || !res.some(b => b.id === prev)) {
                return res[0].id;
              }
              return prev;
            });
          }
        })
        .catch(err => console.warn('Aviso: Error cargando cuentas bancarias en modal:', err))
        .finally(() => setLoadingAccounts(false));
    }
  }, [isOpen]);

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

  const handleResetForm = () => {
    setSuccess(false);
    setLastCreatedCredit(null);
    setPurpose('');
    setTermsAccepted(false);
    setError(null);
    if (adminAmounts.length > 0) setAmount(adminAmounts[0]);
    if (adminTerms.length > 0) setTermMonths(adminTerms[0]);
  };

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
      const selectedAcc = localAccounts.find(a => a.id === selectedBankAccountId);
      payload.user_bank_account_id = selectedBankAccountId;
      if (selectedAcc) {
        payload.banco = selectedAcc.banco;
        payload.tipo_cuenta = selectedAcc.tipo_cuenta;
        payload.numero_cuenta = selectedAcc.numero_cuenta;
      }
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
      const res = await requestCredit(payload);
      setLastCreatedCredit(res);
      setSuccess(true);
      
      // RECARGA EL COMPONENTE INMEDIATAMENTE (sin cerrar el modal)
      onSuccess();
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
                Desembolso directo a tu cuenta bancaria registrada
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
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
              <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-3xl text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-900 font-montserrat">
                    ¡Solicitud Radicada con Éxito!
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
                    Tu solicitud fue radicada correctamente y el componente de créditos ha sido actualizado en tiempo real.
                  </p>
                </div>
              </div>

              {/* Resumen de Radicación */}
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-xs">
                <div className="flex items-center justify-between font-bold text-slate-800 font-montserrat pb-2 border-b border-slate-200">
                  <span>Detalles de tu Solicitud</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    En Estudio Administrativo
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-slate-700">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">No. Radicado</span>
                    <span className="font-bold text-slate-900 font-mono text-sm">
                      #{lastCreatedCredit?.id || 'Generado'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Monto Solicitado</span>
                    <span className="font-bold text-slate-900 font-montserrat text-sm">
                      ${amount.toLocaleString('es-CO')} COP
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Plazo Solicitado</span>
                    <span className="font-semibold text-slate-800">{termMonths} meses</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Cuenta de Desembolso</span>
                    <span className="font-semibold text-slate-800 truncate block">
                      {selectedBankAccountId !== 'manual' 
                        ? (localAccounts.find(b => b.id === selectedBankAccountId)?.banco + ' • ' + localAccounts.find(b => b.id === selectedBankAccountId)?.numero_cuenta)
                        : (manualBank + ' • ' + manualAccountNumber)}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500">
                  📌 El administrador evaluará tu perfil y definirá las cantidades y plazos definitivos al momento de la aprobación.
                </div>
              </div>

              {/* Botones de acción dentro del modal abierto */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs font-montserrat uppercase tracking-wider transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  Radicar Otra Solicitud
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs font-montserrat uppercase tracking-wider transition-all cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}

          {!success && (
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Cantidades Autorizadas por el Administrador */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-slate-800 font-montserrat uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                    Cantidad a Solicitar (COP)
                  </label>
                  <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    Definida por Administración
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                  {adminAmounts.map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmount(val)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        amount === val
                          ? 'bg-amber-500/10 border-amber-500 text-amber-950 shadow-xs ring-1 ring-amber-500/20'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-[10px] text-slate-400 block font-semibold">Monto Autorizado</span>
                      <span className="text-sm font-black font-montserrat tracking-tight block text-slate-900">
                        ${val.toLocaleString('es-CO')}
                      </span>
                      <span className="text-[10px] font-bold text-amber-600 block mt-0.5">COP</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Plazos Autorizados por el Administrador */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-slate-800 font-montserrat uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-600" />
                    Plazo en Meses
                  </label>
                  <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    Definido por Administración
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 pt-1">
                  {adminTerms.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => setTermMonths(term)}
                      className={`py-3 px-2 rounded-2xl text-xs font-bold transition-all cursor-pointer border text-center ${
                        termMonths === term
                          ? 'bg-amber-500/10 border-amber-500 text-amber-900 shadow-2xs ring-1 ring-amber-500/20'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <span className="block font-black text-sm text-slate-900">{term}</span>
                      <span className="text-[10px] text-slate-500">{term === 1 ? 'mes' : 'meses'}</span>
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
                    Misma cuenta de Bóveda Bancaria utilizada para retiros
                  </span>
                </div>

                {/* Indicador de carga de cuentas */}
                {loadingAccounts && localAccounts.length === 0 && (
                  <div className="flex items-center gap-2.5 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-500 animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-500 shrink-0" />
                    <span>Consultando tus cuentas registradas en Bóveda Bancaria...</span>
                  </div>
                )}

                {/* Lista de cuentas registradas en Bóveda Bancaria */}
                {localAccounts.length > 0 && (
                  <div className="space-y-2">
                    {localAccounts.map((acc) => (
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
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 block font-montserrat">
                                {acc.banco} • {acc.tipo_cuenta}
                              </span>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Bóveda Bancaria (Retiros)
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                              N° {acc.numero_cuenta}
                            </span>
                          </div>
                        </div>
                        <Landmark className="w-4 h-4 text-amber-600" />
                      </label>
                    ))}
                  </div>
                )}

                {/* Aviso si no tiene ninguna cuenta registrada en la bóveda */}
                {!loadingAccounts && localAccounts.length === 0 && (
                  <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">
                      Aún no tienes una cuenta registrada en tu Bóveda Bancaria para retiros. Puedes ingresar los datos de tu cuenta bancaria a continuación.
                    </span>
                  </div>
                )}

                {/* Opción de ingresar otra cuenta bancaria manual */}
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
                    Ingresar otra cuenta bancaria para este desembolso
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
                  Certifico que la cuenta bancaria indicada es de mi titularidad y autorizo que, en caso de ser aprobado, el crédito sea desembolsado por transferencia automática a mi cuenta bancaria registrada.
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
