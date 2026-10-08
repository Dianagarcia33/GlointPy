import React, { useState } from 'react';
import { 
  X, 
  Landmark, 
  Zap, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Calendar, 
  Percent, 
  DollarSign, 
  ShieldAlert, 
  User, 
  Mail, 
  Phone
} from 'lucide-react';
import { Credit, CreditConfig, approveCredit } from '../../../../services/credits';

interface ApproveCreditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  credit: Credit;
  config: CreditConfig | null;
}

export const ApproveCreditModal: React.FC<ApproveCreditModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  credit,
  config
}) => {
  const [approvedAmount, setApprovedAmount] = useState<number>(credit.requested_amount);
  const [termMonths, setTermMonths] = useState<number>(credit.term_months);
  const [interestRate, setInterestRate] = useState<number>(
    credit.interest_rate || config?.default_interest_rate_monthly || 1.80
  );
  
  // Fecha tentativa de primer cobro (1 mes en el futuro)
  const defaultNextMonth = new Date();
  defaultNextMonth.setMonth(defaultNextMonth.getMonth() + 1);
  const [firstPaymentDate, setFirstPaymentDate] = useState<string>(
    defaultNextMonth.toISOString().split('T')[0]
  );
  
  const [adminNotes, setAdminNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any | null>(null);

  if (!isOpen) return null;

  const maxUsuryMonthly = config?.max_usury_rate_monthly || 1.98;
  const isUsuryViolation = interestRate > maxUsuryMonthly;

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isUsuryViolation) {
      setError(`La tasa (${interestRate}% M.V.) no puede exceder el tope de usura legal de ${maxUsuryMonthly}% M.V.`);
      return;
    }

    try {
      setLoading(true);
      const res = await approveCredit(credit.id, {
        approved_amount: approvedAmount,
        term_months: termMonths,
        interest_rate: interestRate,
        first_payment_date: firstPaymentDate,
        admin_notes: adminNotes.trim() || undefined
      });

      setSuccessData(res);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2500);
    } catch (err: any) {
      setError(err.message || 'Error al aprobar el crédito o enviar la dispersión a Yoint.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center shadow-xs">
              <Zap className="w-5 h-5 text-amber-500 fill-amber-500/20" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-montserrat">
                Aprobar y Desembolsar Crédito #{credit.id}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Dispersión automática en 1 Clic con Yoint
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

          {/* Ficha rápida del Solicitante */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-slate-800 font-montserrat">Datos del Solicitante</span>
              <span className="text-[11px] text-slate-500 font-mono">ID Usuario #{credit.user_id}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Nombre Completo</span>
                <span className="font-bold text-slate-900">{credit.user_name || 'Inversionista'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Documento</span>
                <span className="font-semibold text-slate-800">{credit.user_document || 'No registrado'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Correo</span>
                <span className="font-medium text-slate-700 truncate block">{credit.user_email || '-'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Teléfono</span>
                <span className="font-medium text-slate-700">{credit.user_phone || '-'}</span>
              </div>
            </div>

            {credit.purpose && (
              <div className="pt-2 border-t border-slate-200 text-xs text-slate-600">
                <strong className="text-slate-800 block text-[10px]">Motivo:</strong>
                {credit.purpose}
              </div>
            )}
          </div>

          {/* Ficha Bancaria de Destino (Para Yoint) */}
          <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-2 text-xs">
            <div className="flex items-center justify-between font-bold text-slate-900 font-montserrat">
              <span className="flex items-center gap-1.5 text-amber-700">
                <Landmark className="w-4 h-4" />
                Cuenta Bancaria de Desembolso
              </span>
              <span className="text-[11px] text-slate-500">{credit.tipo_cuenta}</span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="font-bold text-slate-900 text-sm">{credit.banco}</span>
              <span className="font-mono text-sm font-black text-slate-900 tracking-wider">
                {credit.numero_cuenta}
              </span>
            </div>

            <p className="text-[11px] text-slate-500 pt-1 border-t border-amber-500/10">
              ⚡ Al confirmar, Yoint enviará los fondos directamente a esta cuenta bancaria.
            </p>
          </div>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successData && (
            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h4 className="text-base font-bold text-slate-900 font-montserrat">¡Crédito Aprobado y Dispersado!</h4>
              <p className="text-xs text-slate-600">
                Se generaron {successData.installments_count} cuotas de amortización. Orden de dispersión Yoint: <strong>{successData.disbursement_reference}</strong>.
              </p>
            </div>
          )}

          {!successData && (
            <form onSubmit={handleApprove} className="space-y-4">
              
              {/* Monto Aprobado */}
              <div>
                <label className="text-xs font-bold text-slate-800 font-montserrat uppercase tracking-wider block mb-1">
                  Monto a Desembolsar (COP)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    required
                    min={10000}
                    step={10000}
                    value={approvedAmount}
                    onChange={(e) => setApprovedAmount(Number(e.target.value))}
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500 font-montserrat"
                  />
                </div>
              </div>

              {/* Plazo y Tasa */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-800 font-montserrat uppercase tracking-wider block mb-1">
                    Plazo (Meses)
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={48}
                    value={termMonths}
                    onChange={(e) => setTermMonths(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500 font-montserrat"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-800 font-montserrat uppercase tracking-wider block">
                      Tasa Mensual (%)
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Tope: {maxUsuryMonthly}%
                    </span>
                  </div>
                  <input
                    type="number"
                    required
                    step={0.01}
                    min={0}
                    max={20}
                    value={interestRate}
                    onChange={(e) => setInterestRate(Number(e.target.value))}
                    className={`w-full px-3 py-2.5 bg-slate-50 border rounded-2xl text-xs font-bold focus:bg-white focus:outline-none font-montserrat ${
                      isUsuryViolation 
                        ? 'border-rose-400 text-rose-700 bg-rose-50' 
                        : 'border-slate-200 text-slate-900 focus:border-amber-500'
                    }`}
                  />
                </div>
              </div>

              {/* Alerta de Usura si aplica */}
              {isUsuryViolation && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>
                    La tasa configurada supera el límite de usura legal ({maxUsuryMonthly}% M.V.). Ajusta la tasa para poder continuar.
                  </span>
                </div>
              )}

              {/* Fecha primer corte */}
              <div>
                <label className="text-xs font-bold text-slate-800 font-montserrat uppercase tracking-wider block mb-1">
                  Fecha de Primer Cobro (Vencimiento Cuota #1)
                </label>
                <input
                  type="date"
                  required
                  value={firstPaymentDate}
                  onChange={(e) => setFirstPaymentDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Notas de Admin */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Notas Administrativas (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Detalles de evaluación crediticia o garantías..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>

              {/* Botón de Aprobación en 1 Clic */}
              <button
                type="submit"
                disabled={loading || isUsuryViolation}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs font-montserrat uppercase tracking-wider transition-all shadow-md shadow-amber-500/25 active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Dispersando con Yoint y Aprobando...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-white" />
                    <span>Aprobar y Desembolsar vía Yoint</span>
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
